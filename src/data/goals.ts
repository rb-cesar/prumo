import { z } from "zod";
import type { Clock } from "../infra/clock";
import type { SqlDatabase } from "../infra/sqlite";
import { Goal } from "../shared/goals/domain/goal";

/** O que as telas enxergam das metas guardadas. O guardado não está aqui: sai dos aportes (lançamentos). */
export type GoalsData = {
  listGoals(): Promise<Goal[]>;
  saveGoal(goal: Goal): Promise<void>;
  /** Apaga marcando `deletedAt`: os aportes da meta continuam nos lançamentos (BR-M07). */
  removeGoal(goalId: string): Promise<void>;
};

/** Chaves das consultas: quem lê (o model) e quem invalida (a ação) usam as mesmas. */
export const goalsKeys = { all: ["goals"] as const };

// ---------------------------------------------------------------- linha do banco

const goalRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  target_in_cents: z.number().int(),
  initial_saved_in_cents: z.number().int(),
  due_date: z.string(),
});

/** Lê uma linha do banco como entrada não confiável: valida o formato e depois a regra. */
function goalFromRow(unknownRow: unknown): Goal {
  const row = goalRowSchema.parse(unknownRow);
  return Goal.fromRecord({
    id: row.id,
    title: row.title,
    targetInCents: row.target_in_cents,
    initialSavedInCents: row.initial_saved_in_cents,
    dueDate: row.due_date,
  });
}

// ---------------------------------------------------------------- adaptador SQLite

export function createSqliteGoalsData(database: SqlDatabase, clock: Clock): GoalsData {
  return {
    async listGoals() {
      const rows = await database.queryAll<unknown>(
        `SELECT id, title, target_in_cents, initial_saved_in_cents, due_date
           FROM goals WHERE deleted_at IS NULL ORDER BY rowid`,
      );
      return rows.map(goalFromRow);
    },

    async saveGoal(goal) {
      const record = goal.toRecord();
      await database.run(
        `INSERT INTO goals (id, title, target_in_cents, initial_saved_in_cents, due_date,
                            updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL)
         ON CONFLICT (id) DO UPDATE SET
           title = excluded.title, target_in_cents = excluded.target_in_cents,
           initial_saved_in_cents = excluded.initial_saved_in_cents,
           due_date = excluded.due_date, updated_at = excluded.updated_at, deleted_at = NULL`,
        [
          record.id,
          record.title,
          record.targetInCents,
          record.initialSavedInCents,
          record.dueDate,
          clock.now().toISOString(),
        ],
      );
    },

    async removeGoal(goalId) {
      const removedAt = clock.now().toISOString();
      await database.run("UPDATE goals SET deleted_at = ?, updated_at = ? WHERE id = ?", [
        removedAt,
        removedAt,
        goalId,
      ]);
    },
  };
}

// ---------------------------------------------------------------- fake para testes

export function createFakeGoalsData(seed: Goal[] = []): GoalsData {
  const goalsById = new Map(seed.map((goal) => [goal.id, goal]));
  return {
    async listGoals() {
      return [...goalsById.values()];
    },
    async saveGoal(goal) {
      goalsById.set(goal.id, goal);
    },
    async removeGoal(goalId) {
      goalsById.delete(goalId);
    },
  };
}
