/** Regra de meta de guardar (doc/business-rules/goals.md, BR-M01). Regra pura: sem tela, banco ou relógio. */

import { daysBetween, isValidIsoDate } from "../../iso-date";
import { GoalRuleViolation } from "./goal-rule-violation";

/** O estado completo de uma meta, sem comportamento: o que a camada de dados grava e lê. */
export type GoalRecord = {
  id: string;
  title: string;
  targetInCents: number;
  /** Quanto a pessoa já tinha guardado ao criar a meta; os aportes somam por cima. */
  initialSavedInCents: number;
  /** Prazo, `AAAA-MM-DD`. */
  dueDate: string;
};

export type NewGoalInput = Omit<GoalRecord, "initialSavedInCents"> & {
  initialSavedInCents?: number;
};

const isPositiveWholeCents = (cents: number) => Number.isInteger(cents) && cents > 0;
const isNonNegativeWholeCents = (cents: number) => Number.isInteger(cents) && cents >= 0;

function validatedSnapshot(snapshot: GoalRecord): GoalRecord {
  const title = snapshot.title.trim();
  if (title === "") throw new GoalRuleViolation("title-required");
  if (!isPositiveWholeCents(snapshot.targetInCents)) throw new GoalRuleViolation("invalid-target");
  if (!isNonNegativeWholeCents(snapshot.initialSavedInCents)) {
    throw new GoalRuleViolation("invalid-initial-saved");
  }
  if (!isValidIsoDate(snapshot.dueDate)) throw new GoalRuleViolation("invalid-due-date");
  return { ...snapshot, title };
}

/** Meta imutável. */
export class Goal {
  private readonly snapshot: GoalRecord;

  private constructor(snapshot: GoalRecord) {
    this.snapshot = Object.freeze(validatedSnapshot(snapshot));
  }

  /** Meta nova: o prazo é hoje ou depois. `today` entra por parâmetro. */
  static create(input: NewGoalInput, today: string): Goal {
    const goal = new Goal({ ...input, initialSavedInCents: input.initialSavedInCents ?? 0 });
    if (daysBetween(today, goal.dueDate) < 0) throw new GoalRuleViolation("due-date-in-past");
    return goal;
  }

  /** Para a camada de dados reconstruir uma meta gravada (que pode já ter vencido). */
  static fromRecord(snapshot: GoalRecord): Goal {
    return new Goal(snapshot);
  }

  toRecord(): GoalRecord {
    return { ...this.snapshot };
  }

  get id(): string {
    return this.snapshot.id;
  }
  get title(): string {
    return this.snapshot.title;
  }
  get targetInCents(): number {
    return this.snapshot.targetInCents;
  }
  get initialSavedInCents(): number {
    return this.snapshot.initialSavedInCents;
  }
  get dueDate(): string {
    return this.snapshot.dueDate;
  }
}
