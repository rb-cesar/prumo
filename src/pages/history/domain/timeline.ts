import { describeDay } from "../../../shared/day-labels";
import type { Envelope } from "../../../shared/finance/domain/envelope";
import { Ledger } from "../../../shared/finance/domain/ledger";
import type { Transaction, TransactionKind } from "../../../shared/finance/domain/transaction";
import type { Task } from "../../../shared/tasks/domain/task";

export type TimelineRowView = {
  id: string;
  kind: TransactionKind | "task";
  title: string;
  /** O envelope, "Receita", "Aporte em meta" ou "Pendência concluída". */
  detail: string;
  /** "− R$ 38,40"; `null` para a pendência concluída sem valor lançado. */
  signedAmountText: string | null;
  /** O lançamento veio de uma pendência concluída. */
  isFromTask: boolean;
};

export type TimelineDayGroup = { dayText: string; rows: TimelineRowView[] };

type TimelineEvent = { date: string; row: TimelineRowView };

/**
 * A cronologia (BR-H05): lançamentos e pendências concluídas na mesma linha do tempo, do mais novo
 * para o mais antigo. A pendência que gerou um lançamento aparece só pelo lançamento. Imutável.
 */
export class Timeline {
  private readonly eventsNewestFirst: TimelineEvent[];
  private readonly today: string;

  constructor(
    transactions: readonly Transaction[],
    envelopes: readonly Envelope[],
    tasks: readonly Task[],
    today: string,
  ) {
    this.today = today;
    const moneyEvents: TimelineEvent[] = new Ledger(transactions)
      .toDatedRowViews(envelopes)
      .map(({ date, row }) => ({
        date,
        row: {
          id: row.id,
          kind: row.kind,
          title: row.description,
          detail: row.categoryName,
          signedAmountText: row.signedAmountText,
          isFromTask: row.isFromTask,
        },
      }));

    const taskIdsWithTransaction = new Set(
      transactions.map((transaction) => transaction.taskId).filter((id) => id !== null),
    );
    const taskEvents: TimelineEvent[] = tasks
      .filter(
        (task) =>
          task.stage === "done" && task.doneDate !== null && !taskIdsWithTransaction.has(task.id),
      )
      .map((task) => ({
        date: task.doneDate ?? today,
        row: {
          id: task.id,
          kind: "task",
          title: task.title,
          detail: "Pendência concluída",
          signedAmountText: null,
          isFromTask: false,
        },
      }));

    this.eventsNewestFirst = [...moneyEvents, ...taskEvents].sort((first, second) =>
      second.date.localeCompare(first.date),
    );
  }

  get count(): number {
    return this.eventsNewestFirst.length;
  }

  /** Os `limit` eventos mais recentes, agrupados por dia. */
  toDayGroups(limit: number): TimelineDayGroup[] {
    const groups: Array<TimelineDayGroup & { date: string }> = [];
    for (const event of this.eventsNewestFirst.slice(0, limit)) {
      const lastGroup = groups.at(-1);
      if (lastGroup?.date === event.date) lastGroup.rows.push(event.row);
      else {
        groups.push({
          date: event.date,
          dayText: describeDay(event.date, this.today),
          rows: [event.row],
        });
      }
    }
    return groups.map(({ dayText, rows }) => ({ dayText, rows }));
  }
}
