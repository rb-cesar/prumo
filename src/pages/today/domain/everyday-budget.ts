import type { Envelope } from "../../../shared/finance/domain/envelope";
import type { Ledger } from "../../../shared/finance/domain/ledger";
import { Money } from "../../../shared/finance/domain/money";
import { daysInMonth, monthOf, parseIsoDate } from "../../../shared/iso-date";

/**
 * O orçamento do dia a dia (BR-F06 e BR-F08): os envelopes que não são fixos, somados, e quanto dá
 * para gastar hoje sem passar deles. Imutável; "hoje" entra por parâmetro.
 *
 * Cópia da classe de `pages/money/domain/`, com a parte que só a tela Hoje usa: o painel e o ritmo
 * (§6.3: a segunda tela copia; a regra sobe para `shared/` na terceira).
 */
export type AllowanceHeroView = {
  allowanceText: string;
  detailText: string;
  paceCaption: string;
  /** O dia a dia está sendo gasto mais rápido do que o mês passa. */
  paceIsAhead: boolean;
  /** De 0 a 100, para a largura da barra. */
  spentPercent: number;
  /** De 0 a 100, para a posição da marca de hoje. */
  monthElapsedPercent: number;
};

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

  // ------------------------------------------------------------ o que a tela mostra

  /** O painel "Pode gastar hoje": o valor, o que sobra e o ritmo de gasto contra o do mês. */
  toHeroView(today: string): AllowanceHeroView {
    const spentRatio = this.budgetInCents === 0 ? 0 : this.spentInCents / this.budgetInCents;
    const monthElapsedRatio = parseIsoDate(today).getUTCDate() / daysInMonth(today);
    const paceIsAhead = spentRatio > monthElapsedRatio;
    const spentText = `${toWholePercent(spentRatio)}%`;
    const elapsedText = `${toWholePercent(monthElapsedRatio)}%`;
    const daysText = `${this.daysLeftInMonth} ${this.daysLeftInMonth === 1 ? "dia" : "dias"}`;
    return {
      allowanceText: Money.ofCents(this.allowancePerDayInCents).format(),
      detailText: this.hasRoomToSpend
        ? `${Money.ofCents(this.remainingInCents).formatWhole()} livres no dia a dia, para ${daysText} até o fim do mês.`
        : "O dia a dia já passou do orçamento deste mês. Segure os gastos ou ajuste os envelopes.",
      paceCaption: paceIsAhead
        ? `Você gastou ${spentText} do dia a dia com ${elapsedText} do mês.`
        : `No ritmo: ${spentText} gasto com ${elapsedText} do mês.`,
      paceIsAhead,
      spentPercent: Math.min(100, toWholePercent(spentRatio)),
      monthElapsedPercent: toWholePercent(monthElapsedRatio),
    };
  }
}

function toWholePercent(ratio: number): number {
  return Math.round(ratio * 100);
}
