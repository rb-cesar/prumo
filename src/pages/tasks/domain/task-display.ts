import { describeDay } from "../../../shared/day-labels";
import type { MoneyDirection, Task, TaskStage } from "../../../shared/tasks/domain/task";
import { Money } from "./money";

export type ChipView = { text: string; tone: "neg" | "near" | "pos" | "steel" | null };

export type TaskRowView = {
  id: string;
  title: string;
  stage: TaskStage;
  isDone: boolean;
  chips: ChipView[];
  money: { amountText: string; label: string; direction: MoneyDirection } | null;
};

export type TaskDetailView = {
  title: string;
  stage: TaskStage;
  /** Fazendo só existe dentro de um ciclo. */
  canBeDoing: boolean;
  isInBacklog: boolean;
  canMoveToBacklog: boolean;
  /** Pares de termo e valor, só do que a pendência tem. */
  rows: Array<[term: string, value: string]>;
};

const PRIORITY_NAMES: Record<string, string> = { high: "Alta", medium: "Média", low: "Baixa" };

/** O que a tela mostra de uma pendência: a linha da lista e a folha de detalhes, já decididas. */
export class TaskDisplay {
  private readonly task: Task;

  constructor(task: Task) {
    this.task = task;
  }

  /** Tudo o que a linha de uma pendência mostra. A linha só desenha. */
  toRowView(today: string): TaskRowView {
    const { task } = this;
    return {
      id: task.id,
      title: task.title,
      stage: task.stage,
      isDone: this.isDone,
      chips: this.rowChips(today),
      money: this.rowMoney(),
    };
  }

  /** Tudo o que a folha de detalhes mostra. */
  toDetailView(today: string): TaskDetailView {
    const { task } = this;
    const dueText =
      task.dueDate === null
        ? "Sem prazo"
        : `${describeDay(task.dueDate, today)}${task.isOverdue(today) ? " (atrasada)" : ""}`;
    const rows: TaskDetailView["rows"] = [
      ["Prazo", dueText],
      ["Prioridade", PRIORITY_NAMES[task.priority] ?? task.priority],
      ["Onde está", task.cycle === null ? "Backlog" : `Ciclo ${task.cycle.label}`],
    ];
    if (task.money !== null) {
      const directionText = task.money.direction === "income" ? "a receber" : "a pagar";
      rows.push(["Valor", `${Money.ofCents(task.money.amountInCents).format()} ${directionText}`]);
    }
    return {
      title: task.title,
      stage: task.stage,
      canBeDoing: !task.isInBacklog,
      isInBacklog: task.isInBacklog,
      canMoveToBacklog: !task.isInBacklog && task.stage !== "done",
      rows,
    };
  }

  private get isDone(): boolean {
    return this.task.stage === "done";
  }

  /** Prazo e prioridade só aparecem enquanto a pendência está aberta. */
  private rowChips(today: string): ChipView[] {
    const { task } = this;
    if (this.isDone) return [];

    const chips: ChipView[] = [];
    if (task.dueDate !== null) {
      const overdueDays = task.overdueDays(today);
      if (overdueDays !== null) {
        chips.push({
          text: `Atrasada ${overdueDays} ${overdueDays === 1 ? "dia" : "dias"}`,
          tone: "neg",
        });
      } else {
        const dueToday = task.dueDate === today;
        chips.push({ text: describeDay(task.dueDate, today), tone: dueToday ? "near" : null });
      }
    }
    if (task.priority === "high") chips.push({ text: "Alta", tone: "near" });
    return chips;
  }

  private rowMoney(): TaskRowView["money"] {
    const { money } = this.task;
    if (money === null) return null;
    return {
      amountText: Money.ofCents(money.amountInCents).format(),
      label: this.moneyLabel(money.direction),
      direction: money.direction,
    };
  }

  private moneyLabel(direction: MoneyDirection): string {
    if (direction === "income") return this.isDone ? "recebido" : "a receber";
    return this.isDone ? "pago" : "a pagar";
  }
}
