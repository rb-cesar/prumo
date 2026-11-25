import { describeDay } from "../../day-labels";
import { Money } from "../../finance/domain/money";
import type { Transaction } from "../../finance/domain/transaction";
import { daysBetween } from "../../iso-date";
import type { Goal } from "./goal";

/** Prazos a partir daqui são mostrados em meses; o dia do mês é 30,4 (como no artefato). */
const DAYS_FROM_WHICH_TIME_LEFT_IS_IN_MONTHS = 60;
const TENTHS_OF_DAY_IN_A_MONTH = 304;

/**
 * Quanto de uma meta já foi guardado (BR-M02): valor inicial mais os aportes dela. Recebe todos os
 * lançamentos e separa os aportes desta meta; o guardado nunca é gravado. Imutável.
 */
export class GoalProgress {
  readonly goal: Goal;
  readonly savedInCents: number;

  constructor(goal: Goal, transactions: Transaction[]) {
    this.goal = goal;
    const contributionsInCents = transactions
      .filter((transaction) => transaction.kind === "saving" && transaction.goalId === goal.id)
      .reduce((total, transaction) => total + transaction.amountInCents, 0);
    this.savedInCents = goal.initialSavedInCents + contributionsInCents;
  }

  get remainingInCents(): number {
    return Math.max(0, this.goal.targetInCents - this.savedInCents);
  }

  get isCompleted(): boolean {
    return this.savedInCents >= this.goal.targetInCents;
  }

  /** De 0 a 1. */
  get ratio(): number {
    return Math.min(1, this.savedInCents / this.goal.targetInCents);
  }

  get percentText(): string {
    return `${Math.round(this.ratio * 100)}%`;
  }

  /** "R$ 1.800,00 de R$ 5.000,00". */
  get savedText(): string {
    const saved = Money.ofCents(this.savedInCents).format();
    return `${saved} de ${Money.ofCents(this.goal.targetInCents).format()}`;
  }

  /** Dias de hoje até o prazo; negativo se já venceu. */
  daysLeft(today: string): number {
    return daysBetween(today, this.goal.dueDate);
  }

  /** "vence hoje", "faltam 12 dias", "faltam 5 meses" ou "prazo vencido" (BR-M05). */
  timeLeftText(today: string): string {
    const days = this.daysLeft(today);
    if (days < 0) return "prazo vencido";
    if (days === 0) return "vence hoje";
    if (days < DAYS_FROM_WHICH_TIME_LEFT_IS_IN_MONTHS) {
      return `faltam ${days} ${days === 1 ? "dia" : "dias"}`;
    }
    return `faltam ${Math.round((days * 10) / TENTHS_OF_DAY_IN_A_MONTH)} meses`;
  }

  /** "até qua, 18 nov · faltam 5 dias", ou só "vence hoje". */
  dueText(today: string): string {
    if (this.daysLeft(today) === 0) return this.timeLeftText(today);
    const day = describeDay(this.goal.dueDate, today).toLowerCase();
    return `até ${day} · ${this.timeLeftText(today)}`;
  }
}
