import { daysInMonth } from "../../iso-date";
import type { Envelope } from "./envelope";

/** Em "perto do limite" a partir de 85% do plano, como nos envelopes (BR-F04). */
const NEAR_LIMIT_PERCENT = 85;

export type WeeklySpendingTone = "ok" | "near" | "over";

/**
 * O plano de gasto semanal do dia a dia (doc/business-rules/history.md, BR-H03): a soma dos
 * envelopes do dia a dia, dividida pelos dias do mês e multiplicada por 7, arredondada para baixo.
 * Imutável.
 */
export class WeeklyPlan {
  readonly everydayEnvelopeIds: string[];
  readonly perWeekInCents: number;

  /** `dayInMonth` é um dia do mês a que o plano se refere. */
  constructor(envelopes: readonly Envelope[], dayInMonth: string) {
    const everydayEnvelopes = envelopes.filter((envelope) => !envelope.isFixed);
    this.everydayEnvelopeIds = everydayEnvelopes.map((envelope) => envelope.id);
    const monthlyBudgetInCents = everydayEnvelopes.reduce(
      (total, envelope) => total + envelope.budgetInCents,
      0,
    );
    this.perWeekInCents = Math.floor((monthlyBudgetInCents * 7) / daysInMonth(dayInMonth));
  }

  /** Verde até 85% do plano, amarelo a partir daí, vermelho acima do plano. */
  toneFor(spentInCents: number): WeeklySpendingTone {
    if (spentInCents > this.perWeekInCents) return "over";
    const isNearLimit = spentInCents * 100 >= this.perWeekInCents * NEAR_LIMIT_PERCENT;
    return isNearLimit && this.perWeekInCents > 0 ? "near" : "ok";
  }

  /** De 0 a 1, para a barra; sem plano, a barra fica vazia. */
  fillRatioFor(spentInCents: number): number {
    if (this.perWeekInCents === 0) return 0;
    return Math.min(1, spentInCents / this.perWeekInCents);
  }
}
