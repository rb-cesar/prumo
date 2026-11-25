import { describe, expect, it } from "vitest";
import { createFixedClock } from "../infra/clock";
import { bundledMigrations, runMigrations } from "../infra/sqlite";
import { createTestDatabase } from "../infra/test-database";
import { Cycle } from "../shared/tasks/domain/cycle";
import { CycleReview } from "../shared/tasks/domain/cycle-review";
import { Task } from "../shared/tasks/domain/task";
import { type CyclesData, createFakeCyclesData, createSqliteCyclesData } from "./cycles";
import { createSqliteTasksData } from "./tasks";

const clock = createFixedClock("2026-11-25");

const review = CycleReview.create({
  cycleStart: "2026-11-15",
  worked: "Planejei na segunda",
  hindered: "Contas no último dia",
  changeNext: "Pagar assim que chegar",
  savedOn: "2026-11-21",
});

const adapters: Array<[string, () => Promise<CyclesData>]> = [
  ["SQLite em memória", async () => createSqliteCyclesData(await createTestDatabase(), clock)],
  ["fake", async () => createFakeCyclesData()],
];

describe.each(adapters)("CyclesData (%s)", (_name, createAdapter) => {
  it("começa sem fechamentos nem revisões", async () => {
    const data = await createAdapter();

    expect(await data.listClosings()).toEqual([]);
    expect(await data.listReviews()).toEqual([]);
  });

  it("anota os fechamentos e nunca sobrescreve um que já existe", async () => {
    const data = await createAdapter();
    await data.recordClosings([
      { cycleStart: "2026-11-08", plannedCount: 6 },
      { cycleStart: "2026-11-15", plannedCount: null },
    ]);

    await data.recordClosings([{ cycleStart: "2026-11-08", plannedCount: 99 }]);

    expect(await data.listClosings()).toEqual([
      { cycleStart: "2026-11-08", plannedCount: 6 },
      { cycleStart: "2026-11-15", plannedCount: null },
    ]);
  });

  it("devolve a revisão que foi gravada, igual", async () => {
    const data = await createAdapter();

    await data.saveReview(review);

    const stored = await data.listReviews();
    expect(stored.map((storedReview) => storedReview.toRecord())).toEqual([review.toRecord()]);
  });
});

describe("migração 0005 (SQLite)", () => {
  it("marca como desconhecido o ciclo que já tinha acabado e deixa o de hoje de fora", async () => {
    const database = await createTestDatabase([]);
    await runMigrations(
      database,
      bundledMigrations.filter((migration) => !migration.name.startsWith("0005")),
    );
    const tasks = createSqliteTasksData(database, clock);
    const lastWeek = Cycle.containing("2000-01-05");
    await tasks.save(Task.create({ id: "old", title: "Antiga", cycle: lastWeek }));
    await tasks.save(
      Task.create({ id: "now", title: "De agora", cycle: Cycle.containing(todayOnDevice()) }),
    );

    await runMigrations(database, bundledMigrations);

    const closings = await createSqliteCyclesData(database, clock).listClosings();
    expect(closings).toEqual([{ cycleStart: lastWeek.start, plannedCount: null }]);
  });
});

/** O dia de hoje no aparelho, como a migração o calcula (`date('now', 'localtime')`). */
function todayOnDevice(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
