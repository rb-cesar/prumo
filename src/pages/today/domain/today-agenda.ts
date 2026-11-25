import { describeDay } from "../../../shared/day-labels";
import { Money } from "../../../shared/finance/domain/money";
import { daysBetween } from "../../../shared/iso-date";
import type { MoneyDirection, Task, TaskStage } from "../../../shared/tasks/domain/task";

/** Quantos dias à frente a tela Hoje olha: vencimentos e contas a pagar. */
const UPCOMING_WINDOW_IN_DAYS = 7;

export type ChipView = { text: string; tone: "neg" | "near" | null };

/** A linha de "Para hoje": a pendência com círculo para concluir. */
export type FocusRowView = {
  id: string;
  title: string;
  stage: TaskStage;
  chips: ChipView[];
  money: { amountText: string; label: string; direction: MoneyDirection } | null;
};

/** A linha de "Próximos 7 dias": só leitura. */
export type UpcomingRowView = {
  id: string;
  title: string;
  dayText: string;
  /** Com sinal "+" nas entradas; `null` quando a pendência não tem valor. */
  amountText: string | null;
  direction: MoneyDirection | null;
};

/**
 * O que a pessoa vê da agenda no dia: o que pede atenção hoje e o que vence na semana. Só pendências
 * abertas. Imutável; "hoje" entra por parâmetro.
 */
export class TodayAgenda {
  private readonly openTasks: readonly Task[];
  private readonly today: string;

  constructor(tasks: readonly Task[], today: string) {
    this.openTasks = tasks.filter((task) => task.stage !== "done");
    this.today = today;
  }

  /** Para hoje: com prazo vencido ou de hoje, mais as que estão em Fazendo. Por prazo. */
  get focusTasks(): Task[] {
    return this.openTasks.filter((task) => this.isInFocus(task)).sort(byDueDate);
  }

  /** Com prazo nos próximos 7 dias, sem repetir as de "Para hoje". Por prazo. */
  get upcomingTasks(): Task[] {
    return this.openTasks
      .filter((task) => this.isDueAfterTodayWithinWindow(task) && !this.isInFocus(task))
      .sort(byDueDate);
  }

  /** A pagar em 7 dias: gastos com prazo vencido ou dentro da janela, somados. */
  get amountDueSoonInCents(): number {
    return this.openTasks
      .filter((task) => task.money?.direction === "expense" && this.isDueWithinWindow(task))
      .reduce((total, task) => total + (task.money?.amountInCents ?? 0), 0);
  }

  toFocusRowViews(): FocusRowView[] {
    return this.focusTasks.map((task) => ({
      id: task.id,
      title: task.title,
      stage: task.stage,
      chips: this.chipsOf(task),
      money: this.focusMoneyOf(task),
    }));
  }

  toUpcomingRowViews(): UpcomingRowView[] {
    return this.upcomingTasks.map((task) => ({
      id: task.id,
      title: task.title,
      dayText: task.dueDate === null ? "" : describeDay(task.dueDate, this.today),
      amountText: this.signedAmountOf(task),
      direction: task.money?.direction ?? null,
    }));
  }

  // ------------------------------------------------------------ prazos

  private isInFocus(task: Task): boolean {
    const isDueByToday = task.dueDate !== null && task.dueDate <= this.today;
    return isDueByToday || task.stage === "doing";
  }

  /** Vencida ou dentro dos próximos 7 dias. */
  private isDueWithinWindow(task: Task): boolean {
    return (
      task.dueDate !== null && daysBetween(this.today, task.dueDate) <= UPCOMING_WINDOW_IN_DAYS
    );
  }

  private isDueAfterTodayWithinWindow(task: Task): boolean {
    return task.dueDate !== null && task.dueDate > this.today && this.isDueWithinWindow(task);
  }

  // ------------------------------------------------------------ textos

  private chipsOf(task: Task): ChipView[] {
    const chips: ChipView[] = [];
    if (task.dueDate !== null) {
      const overdueDays = task.overdueDays(this.today);
      if (overdueDays !== null) {
        chips.push({
          text: `Atrasada ${overdueDays} ${overdueDays === 1 ? "dia" : "dias"}`,
          tone: "neg",
        });
      } else {
        const isDueToday = task.dueDate === this.today;
        chips.push({
          text: describeDay(task.dueDate, this.today),
          tone: isDueToday ? "near" : null,
        });
      }
    }
    if (task.priority === "high") chips.push({ text: "Alta", tone: "near" });
    return chips;
  }

  private focusMoneyOf(task: Task): FocusRowView["money"] {
    if (task.money === null) return null;
    return {
      amountText: Money.ofCents(task.money.amountInCents).format(),
      label: task.money.direction === "income" ? "a receber" : "a pagar",
      direction: task.money.direction,
    };
  }

  private signedAmountOf(task: Task): string | null {
    if (task.money === null) return null;
    const amountText = Money.ofCents(task.money.amountInCents).format();
    return task.money.direction === "income" ? `+${amountText}` : amountText;
  }
}

/** Por prazo; as sem prazo por último. */
function byDueDate(first: Task, second: Task): number {
  return (first.dueDate ?? "9").localeCompare(second.dueDate ?? "9");
}
