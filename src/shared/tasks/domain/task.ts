/** Regra de pendências (doc/business-rules/tasks.md, BR-T01 a BR-T10). Regra pura: sem tela, banco ou relógio. */

import { Cycle } from "./cycle";
import { daysBetween, isValidIsoDate } from "./iso-date";
import { TaskRuleViolation } from "./task-rule-violation";

export type TaskStage = "todo" | "doing" | "done";
export type TaskPriority = "high" | "medium" | "low";
export type MoneyDirection = "expense" | "income";

export type TaskMoney = {
  amountInCents: number;
  direction: MoneyDirection;
  /** Só para valor a pagar. */
  envelopeId: string | null;
};

/** O estado completo de uma pendência, sem comportamento: o que a camada de dados grava e lê. */
export type TaskRecord = {
  id: string;
  title: string;
  stage: TaskStage;
  priority: TaskPriority;
  dueDate: string | null;
  /** Início (domingo) do ciclo em que está; `null` é o backlog. */
  cycleStart: string | null;
  money: TaskMoney | null;
  doneDate: string | null;
};

export type NewTaskInput = {
  id: string;
  title: string;
  priority?: TaskPriority;
  dueDate?: string | null;
  /** `null` ou ausente: entra no backlog. */
  cycle?: Cycle | null;
  money?: TaskMoney | null;
};

function validatedSnapshot(snapshot: TaskRecord): TaskRecord {
  const title = snapshot.title.trim();
  if (title === "") throw new TaskRuleViolation("title-required");

  if (snapshot.dueDate !== null && !isValidIsoDate(snapshot.dueDate)) {
    throw new TaskRuleViolation("invalid-date");
  }
  if (snapshot.cycleStart !== null) Cycle.startingOn(snapshot.cycleStart);

  const { money } = snapshot;
  if (money !== null) {
    const amountIsPositiveWholeCents =
      Number.isInteger(money.amountInCents) && money.amountInCents > 0;
    if (!amountIsPositiveWholeCents) throw new TaskRuleViolation("invalid-amount");
    if (money.direction === "income" && money.envelopeId !== null) {
      throw new TaskRuleViolation("envelope-only-for-expense");
    }
  }

  if (snapshot.stage === "doing" && snapshot.cycleStart === null) {
    throw new TaskRuleViolation("doing-only-in-cycle");
  }

  const isDone = snapshot.stage === "done";
  const doneDateMatchesStage = isDone ? snapshot.doneDate !== null : snapshot.doneDate === null;
  if (!doneDateMatchesStage) throw new TaskRuleViolation("done-date-mismatch");
  if (snapshot.doneDate !== null && !isValidIsoDate(snapshot.doneDate)) {
    throw new TaskRuleViolation("invalid-date");
  }

  return { ...snapshot, title };
}

const PRIORITY_RANK: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };

/** Pendência imutável: cada mudança devolve outra instância e a original fica como estava. */
export class Task {
  private readonly snapshot: TaskRecord;

  private constructor(snapshot: TaskRecord) {
    this.snapshot = Object.freeze(validatedSnapshot(snapshot));
  }

  /** BR-T01: título obrigatório; nasce em A fazer, com prioridade média. */
  static create(input: NewTaskInput): Task {
    return new Task({
      id: input.id,
      title: input.title,
      stage: "todo",
      priority: input.priority ?? "medium",
      dueDate: input.dueDate ?? null,
      cycleStart: input.cycle?.start ?? null,
      money: input.money ?? null,
      doneDate: null,
    });
  }

  /** Para a camada de dados reconstruir uma pendência gravada. */
  static fromRecord(snapshot: TaskRecord): Task {
    return new Task(snapshot);
  }

  toRecord(): TaskRecord {
    return { ...this.snapshot };
  }

  get id(): string {
    return this.snapshot.id;
  }
  get title(): string {
    return this.snapshot.title;
  }
  get stage(): TaskStage {
    return this.snapshot.stage;
  }
  get priority(): TaskPriority {
    return this.snapshot.priority;
  }
  get dueDate(): string | null {
    return this.snapshot.dueDate;
  }
  get money(): TaskMoney | null {
    return this.snapshot.money;
  }
  get doneDate(): string | null {
    return this.snapshot.doneDate;
  }
  /** `null` é o backlog. */
  get cycle(): Cycle | null {
    return this.snapshot.cycleStart === null ? null : Cycle.startingOn(this.snapshot.cycleStart);
  }

  get isInBacklog(): boolean {
    return this.snapshot.cycleStart === null;
  }

  /** BR-T04: tem prazo anterior a hoje e não está em Feito. */
  isOverdue(today: string): boolean {
    return this.overdueDays(today) !== null;
  }

  /** Quantos dias de atraso, ou `null` se não está atrasada. */
  overdueDays(today: string): number | null {
    const { dueDate, stage } = this.snapshot;
    if (dueDate === null || stage === "done" || dueDate >= today) return null;
    return daysBetween(dueDate, today);
  }

  /** BR-T02 e BR-T03: a troca de etapa é livre; Feito guarda o dia, sair de Feito apaga. */
  moveToStage(stage: TaskStage, today: string): Task {
    return new Task({ ...this.snapshot, stage, doneDate: stage === "done" ? today : null });
  }

  /** BR-T03: tocar no círculo conclui uma pendência aberta e reabre uma feita em A fazer. */
  toggleDone(today: string): Task {
    return this.moveToStage(this.snapshot.stage === "done" ? "todo" : "done", today);
  }

  /** BR-T07: "Puxar" leva a pendência ao ciclo. */
  pullToCycle(cycle: Cycle): Task {
    return new Task({ ...this.snapshot, cycleStart: cycle.start });
  }

  /** BR-T07: "Mover para o backlog". Fazendo só existe dentro de um ciclo, então volta para A fazer. */
  moveToBacklog(): Task {
    if (this.snapshot.stage === "done") throw new TaskRuleViolation("done-task-stays-in-cycle");
    const stage = this.snapshot.stage === "doing" ? "todo" : this.snapshot.stage;
    return new Task({ ...this.snapshot, stage, cycleStart: null });
  }

  /** BR-T08: o que não foi concluído num ciclo que já terminou volta ao backlog. */
  settledFor(currentCycle: Cycle): Task {
    const { cycleStart, stage } = this.snapshot;
    const cycleHasEnded = cycleStart !== null && cycleStart < currentCycle.start;
    return cycleHasEnded && stage !== "done" ? this.moveToBacklog() : this;
  }
}

/** BR-T05: por prazo (sem prazo por último) e, no empate, por prioridade. */
export function compareTasksForList(first: Task, second: Task): number {
  const firstDue = first.dueDate ?? "9999-12-31";
  const secondDue = second.dueDate ?? "9999-12-31";
  if (firstDue !== secondDue) return firstDue < secondDue ? -1 : 1;
  return PRIORITY_RANK[first.priority] - PRIORITY_RANK[second.priority];
}

export function sortTasksForList(tasks: readonly Task[]): Task[] {
  return [...tasks].sort(compareTasksForList);
}
