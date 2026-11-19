import { z } from "zod";
import type { Clock } from "../infra/clock";
import type { SqlDatabase } from "../infra/sqlite";
import { Task, type TaskRecord } from "../shared/tasks/domain/task";

/** O que as telas enxergam das pendências guardadas. A tela não sabe se por trás há SQL ou memória. */
export type TasksData = {
  list(): Promise<Task[]>;
  save(task: Task): Promise<void>;
  /** Apaga marcando `deletedAt`, para a exclusão poder viajar numa sincronização futura. */
  remove(taskId: string): Promise<void>;
};

/** Chaves das consultas: quem lê (o model) e quem invalida (a ação) usam as mesmas. */
export const tasksKeys = { all: ["tasks"] as const };

// ---------------------------------------------------------------- linha do banco

const taskRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  stage: z.enum(["todo", "doing", "done"]),
  priority: z.enum(["high", "medium", "low"]),
  due_date: z.string().nullable(),
  cycle_start: z.string().nullable(),
  amount_in_cents: z.number().int().nullable(),
  money_direction: z.enum(["expense", "income"]).nullable(),
  envelope_id: z.string().nullable(),
  done_date: z.string().nullable(),
});

type TaskRow = z.infer<typeof taskRowSchema>;

function recordFromRow(row: TaskRow): TaskRecord {
  const hasMoney = row.amount_in_cents !== null;
  if (hasMoney && row.money_direction === null) {
    throw new Error(`A pendência ${row.id} tem valor sem sentido (a pagar ou a receber).`);
  }
  return {
    id: row.id,
    title: row.title,
    stage: row.stage,
    priority: row.priority,
    dueDate: row.due_date,
    cycleStart: row.cycle_start,
    money:
      row.amount_in_cents !== null && row.money_direction !== null
        ? {
            amountInCents: row.amount_in_cents,
            direction: row.money_direction,
            envelopeId: row.envelope_id,
          }
        : null,
    doneDate: row.done_date,
  };
}

/** Lê uma linha do banco como entrada não confiável: valida o formato e depois a regra. */
function taskFromRow(unknownRow: unknown): Task {
  return Task.fromRecord(recordFromRow(taskRowSchema.parse(unknownRow)));
}

// ---------------------------------------------------------------- adaptador SQLite

export function createSqliteTasksData(database: SqlDatabase, clock: Clock): TasksData {
  return {
    async list() {
      const rows = await database.queryAll<unknown>(
        `SELECT id, title, stage, priority, due_date, cycle_start, amount_in_cents,
                money_direction, envelope_id, done_date
           FROM tasks WHERE deleted_at IS NULL`,
      );
      return rows.map(taskFromRow);
    },

    async save(task) {
      const record = task.toRecord();
      await database.run(
        `INSERT INTO tasks (id, title, stage, priority, due_date, cycle_start, amount_in_cents,
                            money_direction, envelope_id, done_date, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
         ON CONFLICT (id) DO UPDATE SET
           title = excluded.title, stage = excluded.stage, priority = excluded.priority,
           due_date = excluded.due_date, cycle_start = excluded.cycle_start,
           amount_in_cents = excluded.amount_in_cents, money_direction = excluded.money_direction,
           envelope_id = excluded.envelope_id, done_date = excluded.done_date,
           updated_at = excluded.updated_at, deleted_at = NULL`,
        [
          record.id,
          record.title,
          record.stage,
          record.priority,
          record.dueDate,
          record.cycleStart,
          record.money?.amountInCents ?? null,
          record.money?.direction ?? null,
          record.money?.envelopeId ?? null,
          record.doneDate,
          clock.now().toISOString(),
        ],
      );
    },

    async remove(taskId) {
      await database.run("UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE id = ?", [
        clock.now().toISOString(),
        clock.now().toISOString(),
        taskId,
      ]);
    },
  };
}

// ---------------------------------------------------------------- fake para testes

export function createFakeTasksData(seed: Task[] = []): TasksData {
  const tasksById = new Map(seed.map((task) => [task.id, task]));
  return {
    async list() {
      return [...tasksById.values()];
    },
    async save(task) {
      tasksById.set(task.id, task);
    },
    async remove(taskId) {
      tasksById.delete(taskId);
    },
  };
}
