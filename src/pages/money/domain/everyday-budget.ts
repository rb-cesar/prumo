import type { Envelope } from "../../../shared/finance/domain/envelope";
import { daysInMonth, monthOf, parseIsoDate } from "../../../shared/iso-date";
import type { Ledger } from "./ledger";

/**
 * O orçamento do dia a dia (BR-F06 e BR-F08): os envelopes que não são fixos, somados, e quanto dá
 * para gastar hoje sem passar deles. Imutável; "hoje" entra por parâmetro.
 */
export class EverydayBudget {
  readonly budgetInCents: number;
  readonly spentInCents: number;
  readonly daysLeftInMonth: number;

  constructor(envelopes: readonly Envelope[], ledger: Ledger, today: string) {
    const month = monthOf(today);
    const everydayEnvelopes = envelopes.filter((envelope) => !envelope.isFixed);
    this.budgetInCents = everydayEnvelopes.reduce(
      (total, envelope) => total + envelope.budgetInCents,
      0,
    );
    this.spentInCents = everydayEnvelopes.reduce(
      (total, envelope) => total + ledger.spentInEnvelope(envelope.id, month),
      0,
    );
    // Conta o dia de hoje: no último dia do mês, falta 1.
    this.daysLeftInMonth = daysInMonth(today) - parseIsoDate(today).getUTCDate() + 1;
  }

  /** Negativo quando o dia a dia já passou do orçamento. */
  get remainingInCents(): number {
    return this.budgetInCents - this.spentInCents;
  }

  /** Falso quando o dia a dia já gastou tudo (restante zero ou negativo). */
  get hasRoomToSpend(): boolean {
    return this.remainingInCents > 0;
  }

  /** Arredondado para baixo, em centavos; nunca negativo. */
  get allowancePerDayInCents(): number {
    return this.hasRoomToSpend ? Math.floor(this.remainingInCents / this.daysLeftInMonth) : 0;
  }
}
