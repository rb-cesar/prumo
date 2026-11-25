export type FinanceRuleViolationReason =
  | "name-required"
  | "invalid-amount"
  | "invalid-date"
  | "description-required"
  | "expense-needs-envelope"
  | "envelope-only-for-expense"
  | "goal-only-for-saving";

/** Erro de regra, nomeado: a tela traduz o motivo em texto (R5). */
export class FinanceRuleViolation extends Error {
  readonly reason: FinanceRuleViolationReason;

  constructor(reason: FinanceRuleViolationReason) {
    super(reason);
    this.name = "FinanceRuleViolation";
    this.reason = reason;
  }
}
