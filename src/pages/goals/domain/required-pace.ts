import { Money } from "../../../shared/finance/domain/money";

/** Daqui para a frente o ritmo é por mês; antes disso, por semana (BR-M04). */
const DAYS_FROM_WHICH_PACE_IS_MONTHLY = 60;
const TENTHS_OF_DAY_IN_A_MONTH = 304;
const CENTS_IN_A_REAL = 100;

/**
 * Quanto guardar por semana ou por mês para chegar ao alvo no prazo (BR-M04). Imutável.
 * As contas usam só inteiros: a divisão de números inteiros que dá exato não sobra centavo.
 */
export class RequiredPace {
  private readonly remainingInCents: number;
  private readonly daysLeft: number;

  constructor(remainingInCents: number, daysLeft: number) {
    this.remainingInCents = remainingInCents;
    this.daysLeft = Math.max(0, daysLeft);
  }

  /** "R$ 70 por semana" ou "R$ 1.000 por mês"; `null` quando já não falta nada. */
  toText(): string | null {
    if (this.remainingInCents === 0) return null;
    if (this.daysLeft < DAYS_FROM_WHICH_PACE_IS_MONTHLY) {
      return `${this.wholeReaisText(this.perWeekInCents())} por semana`;
    }
    return `${this.wholeReaisText(this.perMonthInCents())} por mês`;
  }

  private perWeekInCents(): number {
    const daysCountedAsOneWeekAtLeast = Math.max(7, this.daysLeft);
    return (this.remainingInCents * 7) / daysCountedAsOneWeekAtLeast;
  }

  private perMonthInCents(): number {
    const monthsLeft = Math.max(1, Math.ceil((this.daysLeft * 10) / TENTHS_OF_DAY_IN_A_MONTH));
    return this.remainingInCents / monthsLeft;
  }

  /** Arredonda para cima, em reais inteiros, para que seguir o ritmo chegue ao alvo. */
  private wholeReaisText(amountInCents: number): string {
    const wholeReaisInCents = Math.ceil(amountInCents / CENTS_IN_A_REAL) * CENTS_IN_A_REAL;
    return Money.ofCents(wholeReaisInCents).formatWhole();
  }
}
