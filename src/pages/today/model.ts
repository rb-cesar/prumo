import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type CyclesData, cyclesKeys } from "../../data/cycles";
import { type GoalsData, goalsKeys } from "../../data/goals";
import { type TasksData, tasksKeys } from "../../data/tasks";
import type { TransactionsData } from "../../data/transactions";
import type { Clock } from "../../infra/clock";
import { monthName } from "../../shared/day-labels";
import { Ledger } from "../../shared/finance/domain/ledger";
import { Money } from "../../shared/finance/domain/money";
import { financeSnapshotQuery } from "../../shared/finance/finance-snapshot";
import type { IdGenerator } from "../../shared/ids";
import { monthOf, parseIsoDate } from "../../shared/iso-date";
import { Cycle } from "../../shared/tasks/domain/cycle";
import { CycleReview } from "../../shared/tasks/domain/cycle-review";
import {
  TaskRuleViolation,
  type TaskRuleViolationReason,
} from "../../shared/tasks/domain/task-rule-violation";
import { loadSettledTasks } from "../../shared/tasks/settle-ended-cycles";
import { useCompleteTask } from "../../shared/tasks/use-complete-task";
import {
  type AllowanceHeroView,
  CycleProgress,
  type CycleProgressView,
  EverydayBudget,
  FocusGoal,
  type FocusGoalView,
  type FocusRowView,
  TodayAgenda,
  type UpcomingRowView,
  WeeklySpending,
  type WeeklySpendingView,
} from "./domain";

export type TodayModelDeps = {
  cycles: CyclesData;
  goals: GoalsData;
  tasks: TasksData;
  transactions: TransactionsData;
  clock: Clock;
  generateId: IdGenerator;
};

export type TodayScreenState =
  | { status: "loading" }
  | { status: "error"; reason: "data-unavailable" }
  | {
      status: "ready";
      /** "13 de novembro" */
      dateText: string;
      hero: AllowanceHeroView;
      stats: { accountBalanceText: string; dueSoonText: string; savedText: string };
      focusRows: FocusRowView[];
      cycle: CycleProgressView & {
        /** BR-H07: o gasto do dia a dia na semana contra o plano. */
        weeklySpending: WeeklySpendingView;
        /** BR-H06: o ciclo de hoje já tem revisão salva. */
        isReviewed: boolean;
      };
      upcomingRows: UpcomingRowView[];
      focusGoal: FocusGoalView;
    };

/** O que a pessoa preenche ao revisar o ciclo (BR-H06). */
export type ReviewForm = { worked: string; hindered: string; changeNext: string };

export type SaveReviewResult = { ok: true } | { ok: false; reason: TaskRuleViolationReason };

export function useTodayModel({
  cycles: cyclesData,
  goals: goalsData,
  tasks: tasksData,
  transactions: transactionsData,
  clock,
  generateId,
}: TodayModelDeps) {
  const completeTask = useCompleteTask({
    tasks: tasksData,
    transactions: transactionsData,
    clock,
    generateId,
  });
  const queryClient = useQueryClient();
  const today = clock.today();

  const financeQuery = useQuery(financeSnapshotQuery(transactionsData));
  const tasksQuery = useQuery({
    queryKey: tasksKeys.forToday,
    queryFn: () =>
      loadSettledTasks({ tasks: tasksData, cycles: cyclesData }, Cycle.containing(clock.today())),
  });

  const goalsQuery = useQuery({ queryKey: goalsKeys.all, queryFn: () => goalsData.listGoals() });
  const reviewsQuery = useQuery({
    queryKey: cyclesKeys.reviews,
    queryFn: () => cyclesData.listReviews(),
  });
  const saveReview = useMutation({
    mutationFn: (review: CycleReview) => cyclesData.saveReview(review),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cyclesKeys.reviews }),
  });

  // BR-T08 e BR-H08: a leitura já devolve ao backlog o que sobrou de um ciclo que acabou e anota
  // o fechamento dele; aqui só se usa o resultado.
  const settledTasks = tasksQuery.data ?? [];

  const state: TodayScreenState = (() => {
    if (
      financeQuery.isPending ||
      tasksQuery.isPending ||
      goalsQuery.isPending ||
      reviewsQuery.isPending
    ) {
      return { status: "loading" } as const;
    }
    if (financeQuery.isError || tasksQuery.isError || goalsQuery.isError || reviewsQuery.isError) {
      return { status: "error", reason: "data-unavailable" } as const;
    }

    const { envelopes, transactions, openingBalanceInCents } = financeQuery.data;
    const ledger = new Ledger(transactions);
    const agenda = new TodayAgenda(settledTasks, today);
    const savedThisMonth = ledger.inMonth(monthOf(today)).ofKind("saving").totalInCents();
    return {
      status: "ready",
      dateText: `${parseIsoDate(today).getUTCDate()} de ${monthName(today)}`,
      hero: new EverydayBudget(envelopes, ledger, today).toHeroView(today),
      stats: {
        // Sem saldo inicial não há saldo a mostrar (BR-F05): a tela de finanças é que pede.
        accountBalanceText:
          openingBalanceInCents === null
            ? "—"
            : Money.ofCents(ledger.accountBalanceInCents(openingBalanceInCents)).formatWhole(),
        dueSoonText: Money.ofCents(agenda.amountDueSoonInCents).formatWhole(),
        savedText: Money.ofCents(savedThisMonth).formatWhole(),
      },
      focusRows: agenda.toFocusRowViews(),
      cycle: {
        ...new CycleProgress(settledTasks, today).toView(),
        weeklySpending: new WeeklySpending(envelopes, ledger, today).toView(),
        isReviewed: reviewsQuery.data.some(
          (review) => review.cycle.start === Cycle.containing(today).start,
        ),
      },
      upcomingRows: agenda.toUpcomingRowViews(),
      focusGoal: new FocusGoal(goalsQuery.data, transactions, today).toView(),
    } as const;
  })();

  return {
    state,
    today,
    /** A pergunta "lançar no financeiro?" quando se conclui uma pendência com valor. */
    completion: {
      pending: completeTask.pending,
      choose: completeTask.confirm,
      cancel: completeTask.cancel,
    },
    actions: {
      /** Tocar no círculo conclui; se a pendência tem valor, a pergunta de lançar abre antes. */
      completeTask(taskId: string): void {
        const task = settledTasks.find((candidate) => candidate.id === taskId);
        if (task !== undefined) void completeTask.changeStage(task, "done");
      },
      /** BR-H06: revisa o ciclo de hoje; pelo menos uma resposta, e depois de salva não se edita. */
      async saveReview(form: ReviewForm): Promise<SaveReviewResult> {
        try {
          const review = CycleReview.create({
            cycleStart: Cycle.containing(today).start,
            worked: form.worked,
            hindered: form.hindered,
            changeNext: form.changeNext,
            savedOn: today,
          });
          await saveReview.mutateAsync(review);
          return { ok: true };
        } catch (error) {
          if (error instanceof TaskRuleViolation) return { ok: false, reason: error.reason };
          throw error;
        }
      },
    },
  };
}
