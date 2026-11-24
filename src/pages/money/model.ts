import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { type TasksData, tasksKeys } from "../../data/tasks";
import { type TransactionsData, transactionsKeys } from "../../data/transactions";
import type { Clock } from "../../infra/clock";
import { describeMonth, monthName } from "../../shared/day-labels";
import {
  FinanceRuleViolation,
  type FinanceRuleViolationReason,
} from "../../shared/finance/domain/finance-rule-violation";
import {
  type EnvelopeRowView,
  Ledger,
  type MonthSummaryView,
  type TransactionDayGroup,
  type TransactionRowView,
} from "../../shared/finance/domain/ledger";
import { Money } from "../../shared/finance/domain/money";
import { Transaction } from "../../shared/finance/domain/transaction";
import { financeSnapshotQuery } from "../../shared/finance/finance-snapshot";
import type { IdGenerator } from "../../shared/ids";
import { monthOf } from "../../shared/iso-date";
import { useCompleteTask } from "../../shared/tasks/use-complete-task";
import { type PayableRowView, Payables } from "./domain";

export type MoneyModelDeps = {
  tasks: TasksData;
  transactions: TransactionsData;
  clock: Clock;
  generateId: IdGenerator;
};

export type MoneyScreenState =
  | { status: "loading" }
  | { status: "error"; reason: "data-unavailable" }
  | {
      status: "ready";
      /** "novembro de 2026" */
      monthText: string;
      /** "novembro", para "Envelopes de novembro". */
      monthName: string;
      summary: MonthSummaryView;
      /** Verdadeiro até a pessoa informar o saldo inicial (BR-F05). */
      needsOpeningBalance: boolean;
      envelopes: EnvelopeRowView[];
      /** Envelope que filtra a lista de lançamentos; `null` mostra todos. */
      envelopeFilter: { id: string; name: string } | null;
      payables: PayableRowView[];
      dayGroups: TransactionDayGroup[];
    };

/** O que a pessoa preenche ao registrar um gasto ou uma receita. */
export type NewTransactionForm = {
  kind: "expense" | "income";
  amountText: string;
  description: string;
  envelopeId: string;
};

export type SaveResult =
  | { ok: true }
  | { ok: false; reason: FinanceRuleViolationReason | "amount-not-a-number" };

export function useMoneyModel({
  tasks: tasksData,
  transactions: transactionsData,
  clock,
  generateId,
}: MoneyModelDeps) {
  const queryClient = useQueryClient();
  const completeTask = useCompleteTask({
    tasks: tasksData,
    transactions: transactionsData,
    clock,
    generateId,
  });
  const [envelopeFilterId, setEnvelopeFilterId] = useState<string | null>(null);
  const today = clock.today();
  const month = monthOf(today);

  const financeQuery = useQuery(financeSnapshotQuery(transactionsData));
  const tasksQuery = useQuery({
    queryKey: tasksKeys.withMoney,
    queryFn: () => tasksData.list(),
  });

  const refreshFinance = () => queryClient.invalidateQueries({ queryKey: transactionsKeys.all });
  const saveTransaction = useMutation({
    mutationFn: (transaction: Transaction) => transactionsData.saveTransaction(transaction),
    onSuccess: refreshFinance,
  });
  const removeTransaction = useMutation({
    mutationFn: (transactionId: string) => transactionsData.removeTransaction(transactionId),
    onSuccess: refreshFinance,
  });
  const saveOpeningBalance = useMutation({
    mutationFn: (amountInCents: number) =>
      transactionsData.saveOpeningBalanceInCents(amountInCents),
    onSuccess: refreshFinance,
  });

  const state: MoneyScreenState = (() => {
    if (financeQuery.isPending || tasksQuery.isPending) return { status: "loading" } as const;
    if (financeQuery.isError || tasksQuery.isError) {
      return { status: "error", reason: "data-unavailable" } as const;
    }

    const { envelopes, transactions, openingBalanceInCents } = financeQuery.data;
    const ledger = new Ledger(transactions);
    const filterEnvelope = envelopes.find((envelope) => envelope.id === envelopeFilterId);
    return {
      status: "ready",
      monthText: describeMonth(today),
      monthName: monthName(today),
      summary: ledger.toMonthSummaryView(openingBalanceInCents ?? 0, month),
      needsOpeningBalance: openingBalanceInCents === null,
      envelopes: envelopes.map((envelope) => ledger.toEnvelopeRowView(envelope, month)),
      envelopeFilter:
        filterEnvelope === undefined ? null : { id: filterEnvelope.id, name: filterEnvelope.name },
      payables: new Payables(tasksQuery.data).toRowViews(today),
      dayGroups: ledger.groupedByDay(envelopes, today, envelopeFilterId),
    } as const;
  })();

  const envelopeOptions = (financeQuery.data?.envelopes ?? []).map((envelope) => ({
    id: envelope.id,
    name: envelope.name,
  }));

  function findTransactionRow(transactionId: string): TransactionRowView | undefined {
    if (state.status !== "ready") return undefined;
    return state.dayGroups.flatMap((group) => group.rows).find((row) => row.id === transactionId);
  }

  return {
    state,
    today,
    envelopeOptions,
    findTransactionRow,
    /** A pergunta "lançar no financeiro?" quando se conclui uma pendência com valor. */
    completion: {
      pending: completeTask.pending,
      choose: completeTask.confirm,
      cancel: completeTask.cancel,
    },
    controls: {
      /** Tocar no envelope filtra a lista; tocar de novo limpa o filtro (BR-F09). */
      toggleEnvelopeFilter: (envelopeId: string) =>
        setEnvelopeFilterId((current) => (current === envelopeId ? null : envelopeId)),
    },
    actions: {
      /** BR-F03: a data é sempre a de hoje. */
      async addTransaction(form: NewTransactionForm): Promise<SaveResult> {
        const amountInCents = Money.parse(form.amountText)?.cents ?? null;
        if (amountInCents === null) return { ok: false, reason: "amount-not-a-number" };
        const chosenEnvelopeId = form.envelopeId === "" ? null : form.envelopeId;
        try {
          const transaction = Transaction.create({
            id: generateId(),
            kind: form.kind,
            amountInCents,
            date: today,
            description: form.description,
            envelopeId: form.kind === "expense" ? chosenEnvelopeId : null,
          });
          await saveTransaction.mutateAsync(transaction);
          return { ok: true };
        } catch (error) {
          if (error instanceof FinanceRuleViolation) return { ok: false, reason: error.reason };
          throw error;
        }
      },
      removeTransaction: (transactionId: string) => removeTransaction.mutate(transactionId),
      /** BR-F10: tocar no círculo de uma pendência a pagar ou a receber pergunta se lança. */
      completePayable(taskId: string): void {
        const task = tasksQuery.data?.find((candidate) => candidate.id === taskId);
        if (task !== undefined) void completeTask.changeStage(task, "done");
      },
      /** BR-F05: o saldo inicial pode ser zero, nunca negativo. */
      async saveOpeningBalance(amountText: string): Promise<SaveResult> {
        const amountInCents = Money.parse(amountText)?.cents ?? null;
        if (amountInCents === null) return { ok: false, reason: "amount-not-a-number" };
        await saveOpeningBalance.mutateAsync(amountInCents);
        return { ok: true };
      },
    },
  };
}
