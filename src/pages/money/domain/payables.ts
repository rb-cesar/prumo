import { describeDay } from "../../../shared/day-labels";
import { Money } from "../../../shared/finance/domain/money";
import type { Task } from "../../../shared/tasks/domain/task";

export type PayableRowView = {
  id: string;
  title: string;
  dayText: string;
  amountText: string;
  direction: "expense" | "income";
};

/** BR-F10: as pendências abertas que têm valor, a pagar ou a receber. Imutável. */
export class Payables {
  private readonly openTasksWithMoney: readonly Task[];

  constructor(tasks: readonly Task[]) {
    this.openTasksWithMoney = tasks.filter((task) => task.stage !== "done" && task.money !== null);
  }

  /** Por prazo; as sem prazo por último. */
  toRowViews(today: string): PayableRowView[] {
    return [...this.openTasksWithMoney]
      .sort((first, second) => (first.dueDate ?? "9").localeCompare(second.dueDate ?? "9"))
      .flatMap((task) =>
        task.money === null
          ? []
          : [
              {
                id: task.id,
                title: task.title,
                dayText: task.dueDate === null ? "Sem prazo" : describeDay(task.dueDate, today),
                amountText: Money.ofCents(task.money.amountInCents).format(),
                direction: task.money.direction,
              },
            ],
      );
  }
}
