import { daysBetween } from "../../../shared/iso-date";
import { Cycle } from "../../../shared/tasks/domain/cycle";
import type { Task } from "../../../shared/tasks/domain/task";

export type CycleProgressView = {
  /** "22 a 28 nov" */
  cycleLabel: string;
  /** "termina em 3 dias" */
  endsText: string;
  /** "2 de 5" */
  summaryText: string;
  /** De 0 a 1. */
  doneRatio: number;
  /** "40" */
  donePercentText: string;
};

/** Quanto do ciclo de hoje já foi concluído. Imutável; "hoje" entra por parâmetro. */
export class CycleProgress {
  private readonly cycle: Cycle;
  private readonly today: string;
  private readonly plannedCount: number;
  private readonly doneCount: number;

  constructor(tasks: readonly Task[], today: string) {
    this.cycle = Cycle.containing(today);
    this.today = today;
    const cycleTasks = tasks.filter((task) => task.cycle?.equals(this.cycle) === true);
    this.plannedCount = cycleTasks.length;
    this.doneCount = cycleTasks.filter((task) => task.stage === "done").length;
  }

  toView(): CycleProgressView {
    const doneRatio = this.plannedCount === 0 ? 0 : this.doneCount / this.plannedCount;
    return {
      cycleLabel: this.cycle.label,
      endsText: this.endsText(),
      summaryText: `${this.doneCount} de ${this.plannedCount}`,
      doneRatio,
      donePercentText: String(Math.round(doneRatio * 100)),
    };
  }

  private endsText(): string {
    const daysLeft = daysBetween(this.today, this.cycle.end);
    if (daysLeft === 0) return "termina hoje";
    return `termina em ${daysLeft} ${daysLeft === 1 ? "dia" : "dias"}`;
  }
}
