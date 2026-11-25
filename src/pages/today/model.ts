import { useQuery } from "@tanstack/react-query";
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
import { useCompleteTask } from "../../shared/tasks/use-complete-task";
import {
  type AllowanceHeroView,
  CycleProgress,
  type CycleProgressView,
  EverydayBudget,
  type FocusRowView,
  TodayAgenda,
  type UpcomingRowView,
} from "./domain";

export type TodayModelDeps = {
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
      cycle: CycleProgressView;
      upcomingRows: UpcomingRowView[];
    };

export function useTodayModel({
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
  const today = clock.today();

  const financeQuery = useQuery(financeSnapshotQuery(transactionsData));
  const tasksQuery = useQuery({
    queryKey: tasksKeys.forToday,
    queryFn: () => tasksData.list(),
  });

  // BR-T08: o que sobrou de um ciclo que acabou já conta como backlog. Aqui só se lê; quem grava a
  // devolução é a tela de pendências.
  const currentCycle = Cycle.containing(today);
  const settledTasks = (tasksQuery.data ?? []).map((task) => task.settledFor(currentCycle));

  const state: TodayScreenState = (() => {
    if (financeQuery.isPending || tasksQuery.isPending) return { status: "loading" } as const;
    if (financeQuery.isError || tasksQuery.isError) {
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
      cycle: new CycleProgress(settledTasks, today).toView(),
      upcomingRows: agenda.toUpcomingRowViews(),
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
    },
  };
}
