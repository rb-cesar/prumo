export type TaskRuleViolationReason =
  | "title-required"
  | "invalid-date"
  | "invalid-amount"
  | "envelope-only-for-expense"
  | "doing-only-in-cycle"
  | "done-date-mismatch"
  | "done-task-stays-in-cycle"
  | "cycle-must-start-on-sunday"
  | "review-needs-an-answer";

/** Erro de regra, nomeado: a tela traduz o motivo em texto (R5). */
export class TaskRuleViolation extends Error {
  readonly reason: TaskRuleViolationReason;

  constructor(reason: TaskRuleViolationReason) {
    super(reason);
    this.name = "TaskRuleViolation";
    this.reason = reason;
  }
}
