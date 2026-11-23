/** Regra de envelopes (doc/business-rules/finances.md, BR-F01 e BR-F04). Regra pura: sem tela, banco ou relógio. */

import { FinanceRuleViolation } from "./finance-rule-violation";

/** Em "perto do limite" a partir de 85% do valor gasto. */
const NEAR_LIMIT_PERCENT = 85;

export type EnvelopeStatus = "ok" | "near-limit" | "over-budget";

/** O estado completo de um envelope, sem comportamento: o que a camada de dados grava e lê. */
export type EnvelopeRecord = {
  id: string;
  name: string;
  /** Valor mensal do envelope. */
  budgetInCents: number;
  /** Fixo (aluguel) ou do dia a dia (mercado); só o do dia a dia entra no "pode gastar hoje". */
  isFixed: boolean;
};

/** Envelope imutável. O gasto do mês vem dos lançamentos, nunca é guardado aqui. */
export class Envelope {
  private readonly snapshot: EnvelopeRecord;

  private constructor(snapshot: EnvelopeRecord) {
    const name = snapshot.name.trim();
    if (name === "") throw new FinanceRuleViolation("name-required");
    const budgetIsPositiveWholeCents =
      Number.isInteger(snapshot.budgetInCents) && snapshot.budgetInCents > 0;
    if (!budgetIsPositiveWholeCents) throw new FinanceRuleViolation("invalid-amount");
    this.snapshot = Object.freeze({ ...snapshot, name });
  }

  /** Para a camada de dados reconstruir um envelope gravado. */
  static fromRecord(snapshot: EnvelopeRecord): Envelope {
    return new Envelope(snapshot);
  }

  toRecord(): EnvelopeRecord {
    return { ...this.snapshot };
  }

  get id(): string {
    return this.snapshot.id;
  }
  get name(): string {
    return this.snapshot.name;
  }
  get budgetInCents(): number {
    return this.snapshot.budgetInCents;
  }
  get isFixed(): boolean {
    return this.snapshot.isFixed;
  }

  /** Quanto ainda cabe no envelope; negativo quando estourou. */
  remainingAfterSpending(spentInCents: number): number {
    return this.budgetInCents - spentInCents;
  }

  /** BR-F04: estourado só quando passa do valor; gastar exatamente o valor é "perto do limite". */
  statusAfterSpending(spentInCents: number): EnvelopeStatus {
    if (spentInCents > this.budgetInCents) return "over-budget";
    if (spentInCents * 100 >= this.budgetInCents * NEAR_LIMIT_PERCENT) return "near-limit";
    return "ok";
  }
}
