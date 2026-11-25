export type GoalRuleViolationReason =
  | "title-required"
  | "invalid-target"
  | "invalid-initial-saved"
  | "invalid-due-date"
  | "due-date-in-past";

/** Erro de regra, nomeado: a tela traduz o motivo em texto. */
export class GoalRuleViolation extends Error {
  readonly reason: GoalRuleViolationReason;

  constructor(reason: GoalRuleViolationReason) {
    super(reason);
    this.name = "GoalRuleViolation";
    this.reason = reason;
  }
}
