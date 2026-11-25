import type { Envelope } from "../../../shared/finance/domain/envelope";
import type { Ledger } from "../../../shared/finance/domain/ledger";
import { Money } from "../../../shared/finance/domain/money";
import { WeeklyPlan, type WeeklySpendingTone } from "../../../shared/finance/domain/weekly-plan";
import { Cycle } from "../../../shared/tasks/domain/cycle";

/** A barra "Gasto do dia a dia na semana" do cartão do ciclo (BR-H07). */
export type WeeklySpendingView = {
  /** "R$ 412". */
  spentText: string;
  /** "R$ 665". */
  planText: string;
  /** De 0 a 1, para a barra. */
  fillRatio: number;
  tone: WeeklySpendingTone;
};

/** Quanto do dia a dia já foi gasto no ciclo de hoje, contra o plano semanal. Imutável. */
export class WeeklySpending {
  private readonly spentInCents: number;
  private readonly plan: WeeklyPlan;

  constructor(envelopes: readonly Envelope[], ledger: Ledger, today: string) {
    const cycle = Cycle.containing(today);
    this.plan = new WeeklyPlan(envelopes, cycle.start);
    this.spentInCents = ledger
      .ofKind("expense")
      .ofEnvelopes(this.plan.everydayEnvelopeIds)
      .between(cycle.start, cycle.end)
      .totalInCents();
  }

  toView(): WeeklySpendingView {
    return {
      spentText: Money.ofCents(this.spentInCents).formatWhole(),
      planText: Money.ofCents(this.plan.perWeekInCents).formatWhole(),
      fillRatio: this.plan.fillRatioFor(this.spentInCents),
      tone: this.plan.toneFor(this.spentInCents),
    };
  }
}
