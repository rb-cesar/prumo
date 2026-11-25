import { z } from "zod";
import type { Clock } from "../infra/clock";
import type { SqlDatabase } from "../infra/sqlite";
import { CycleReview } from "../shared/tasks/domain/cycle-review";

/** Quantas pendências um ciclo tinha quando acabou; `null` se não se sabe (ciclos anteriores à fatia 6). */
export type CycleClosing = { cycleStart: string; plannedCount: number | null };

/** O que as telas enxergam do histórico dos ciclos: o fechamento de cada um e as revisões. */
export type CyclesData = {
  listClosings(): Promise<CycleClosing[]>;
  /** Anota os fechamentos que ainda não existem; nunca sobrescreve um que já está anotado. */
  recordClosings(closings: CycleClosing[]): Promise<void>;
  listReviews(): Promise<CycleReview[]>;
  saveReview(review: CycleReview): Promise<void>;
};

/** Chaves das consultas: quem lê (o model) e quem invalida (a ação) usam as mesmas. */
export const cyclesKeys = {
  all: ["cycles"] as const,
  closings: ["cycles", "closings"] as const,
  reviews: ["cycles", "reviews"] as const,
};

// ---------------------------------------------------------------- linhas do banco

const closingRowSchema = z.object({
  cycle_start: z.string(),
  planned_count: z.number().int().nullable(),
});

const reviewRowSchema = z.object({
  cycle_start: z.string(),
  worked: z.string(),
  hindered: z.string(),
  change_next: z.string(),
  saved_on: z.string(),
});

function closingFromRow(unknownRow: unknown): CycleClosing {
  const row = closingRowSchema.parse(unknownRow);
  return { cycleStart: row.cycle_start, plannedCount: row.planned_count };
}

function reviewFromRow(unknownRow: unknown): CycleReview {
  const row = reviewRowSchema.parse(unknownRow);
  return CycleReview.fromRecord({
    cycleStart: row.cycle_start,
    worked: row.worked,
    hindered: row.hindered,
    changeNext: row.change_next,
    savedOn: row.saved_on,
  });
}

// ---------------------------------------------------------------- adaptador SQLite

export function createSqliteCyclesData(database: SqlDatabase, clock: Clock): CyclesData {
  return {
    async listClosings() {
      const rows = await database.queryAll<unknown>(
        "SELECT cycle_start, planned_count FROM cycle_closings ORDER BY cycle_start",
      );
      return rows.map(closingFromRow);
    },

    async recordClosings(closings) {
      for (const closing of closings) {
        await database.run(
          `INSERT OR IGNORE INTO cycle_closings (cycle_start, planned_count, updated_at)
           VALUES (?, ?, ?)`,
          [closing.cycleStart, closing.plannedCount, clock.now().toISOString()],
        );
      }
    },

    async listReviews() {
      const rows = await database.queryAll<unknown>(
        `SELECT cycle_start, worked, hindered, change_next, saved_on
           FROM cycle_reviews WHERE deleted_at IS NULL ORDER BY cycle_start`,
      );
      return rows.map(reviewFromRow);
    },

    async saveReview(review) {
      const record = review.toRecord();
      await database.run(
        `INSERT INTO cycle_reviews (cycle_start, worked, hindered, change_next, saved_on,
                                    updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL)
         ON CONFLICT (cycle_start) DO UPDATE SET
           worked = excluded.worked, hindered = excluded.hindered,
           change_next = excluded.change_next, saved_on = excluded.saved_on,
           updated_at = excluded.updated_at, deleted_at = NULL`,
        [
          record.cycleStart,
          record.worked,
          record.hindered,
          record.changeNext,
          record.savedOn,
          clock.now().toISOString(),
        ],
      );
    },
  };
}

// ---------------------------------------------------------------- fake para testes

export type FakeCyclesSeed = { closings?: CycleClosing[]; reviews?: CycleReview[] };

export function createFakeCyclesData(seed: FakeCyclesSeed = {}): CyclesData {
  const closingsByStart = new Map(
    (seed.closings ?? []).map((closing) => [closing.cycleStart, closing]),
  );
  const reviewsByStart = new Map(
    (seed.reviews ?? []).map((review) => [review.toRecord().cycleStart, review]),
  );
  return {
    async listClosings() {
      return [...closingsByStart.values()];
    },
    async recordClosings(closings) {
      for (const closing of closings) {
        if (!closingsByStart.has(closing.cycleStart)) {
          closingsByStart.set(closing.cycleStart, closing);
        }
      }
    },
    async listReviews() {
      return [...reviewsByStart.values()];
    },
    async saveReview(review) {
      reviewsByStart.set(review.toRecord().cycleStart, review);
    },
  };
}
