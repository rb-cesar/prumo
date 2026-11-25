import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { type GoalsData, goalsKeys } from "../../data/goals";
import { type TransactionsData, transactionsKeys } from "../../data/transactions";
import type { Clock } from "../../infra/clock";
import type { FinanceRuleViolationReason } from "../../shared/finance/domain/finance-rule-violation";
import { FinanceRuleViolation } from "../../shared/finance/domain/finance-rule-violation";
import { Money } from "../../shared/finance/domain/money";
import { Transaction } from "../../shared/finance/domain/transaction";
import { financeSnapshotQuery } from "../../shared/finance/finance-snapshot";
import { Goal } from "../../shared/goals/domain/goal";
import {
  GoalRuleViolation,
  type GoalRuleViolationReason,
} from "../../shared/goals/domain/goal-rule-violation";
import type { IdGenerator } from "../../shared/ids";
import { GoalBoard, type GoalCardView, type GoalHorizon } from "./domain";

export type GoalsModelDeps = {
  goals: GoalsData;
  transactions: TransactionsData;
  clock: Clock;
  generateId: IdGenerator;
};

export type GoalsScreenState =
  | { status: "loading" }
  | { status: "error"; reason: "data-unavailable" }
  | {
      status: "ready";
      horizon: GoalHorizon;
      cards: GoalCardView[];
    };

/** O que a pessoa preenche ao criar uma meta. */
export type NewGoalForm = {
  title: string;
  targetText: string;
  /** Opcional: vazio vale zero. */
  initialSavedText: string;
  /** `AAAA-MM-DD`. */
  dueDate: string;
};

export type SaveResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | GoalRuleViolationReason
        | FinanceRuleViolationReason
        | "target-not-a-number"
        | "initial-saved-not-a-number"
        | "amount-not-a-number";
    };

export function useGoalsModel({
  goals: goalsData,
  transactions: transactionsData,
  clock,
  generateId,
}: GoalsModelDeps) {
  const queryClient = useQueryClient();
  const [chosenHorizon, setChosenHorizon] = useState<GoalHorizon | null>(null);
  const today = clock.today();

  const goalsQuery = useQuery({ queryKey: goalsKeys.all, queryFn: () => goalsData.listGoals() });
  const financeQuery = useQuery(financeSnapshotQuery(transactionsData));

  const saveGoal = useMutation({
    mutationFn: (goal: Goal) => goalsData.saveGoal(goal),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: goalsKeys.all }),
  });
  const removeGoal = useMutation({
    mutationFn: (goalId: string) => goalsData.removeGoal(goalId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: goalsKeys.all }),
  });
  const saveContribution = useMutation({
    mutationFn: (contribution: Transaction) => transactionsData.saveTransaction(contribution),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: transactionsKeys.all }),
  });

  const state: GoalsScreenState = (() => {
    if (goalsQuery.isPending || financeQuery.isPending) return { status: "loading" } as const;
    if (goalsQuery.isError || financeQuery.isError) {
      return { status: "error", reason: "data-unavailable" } as const;
    }
    const board = new GoalBoard(goalsQuery.data, financeQuery.data.transactions, today);
    const horizon = chosenHorizon ?? board.initialHorizon;
    return { status: "ready", horizon, cards: board.toCardViews(horizon) } as const;
  })();

  return {
    state,
    today,
    controls: { selectHorizon: setChosenHorizon },
    actions: {
      /** BR-M01: o prazo é hoje ou depois; o valor inicial é opcional. */
      async createGoal(form: NewGoalForm): Promise<SaveResult> {
        const targetInCents = Money.parse(form.targetText)?.cents ?? null;
        if (targetInCents === null) return { ok: false, reason: "target-not-a-number" };
        const initialSavedInCents =
          form.initialSavedText.trim() === ""
            ? 0
            : (Money.parse(form.initialSavedText)?.cents ?? null);
        if (initialSavedInCents === null)
          return { ok: false, reason: "initial-saved-not-a-number" };
        try {
          const goal = Goal.create(
            {
              id: generateId(),
              title: form.title,
              targetInCents,
              initialSavedInCents,
              dueDate: form.dueDate,
            },
            today,
          );
          await saveGoal.mutateAsync(goal);
          return { ok: true };
        } catch (error) {
          if (error instanceof GoalRuleViolation) return { ok: false, reason: error.reason };
          throw error;
        }
      },

      /** BR-M03: o aporte é um lançamento de hoje, ligado à meta; sai do saldo em conta. */
      async contribute(goalId: string, amountText: string): Promise<SaveResult> {
        const goal = goalsQuery.data?.find((candidate) => candidate.id === goalId);
        if (goal === undefined) return { ok: false, reason: "amount-not-a-number" };
        const amountInCents = Money.parse(amountText)?.cents ?? null;
        if (amountInCents === null) return { ok: false, reason: "amount-not-a-number" };
        try {
          const contribution = Transaction.create({
            id: generateId(),
            kind: "saving",
            amountInCents,
            date: today,
            description: `Aporte: ${goal.title}`,
            goalId,
          });
          await saveContribution.mutateAsync(contribution);
          return { ok: true };
        } catch (error) {
          if (error instanceof FinanceRuleViolation) return { ok: false, reason: error.reason };
          throw error;
        }
      },

      removeGoal: (goalId: string) => removeGoal.mutate(goalId),
    },
  };
}
