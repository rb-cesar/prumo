import { describe, expect, it } from "vitest";
import { createFixedClock } from "../infra/clock";
import { createTestDatabase } from "../infra/test-database";
import { Cycle } from "../shared/tasks/domain/cycle";
import { Task } from "../shared/tasks/domain/task";
import { createFakeTasksData, createSqliteTasksData, type TasksData } from "./tasks";

const today = "2026-11-13";
const clock = createFixedClock(today);
const currentCycle = Cycle.containing(today);

const payElectricityBill = Task.create({
  id: "task-1",
  title: "Pagar conta de luz",
  priority: "high",
  dueDate: today,
  cycle: currentCycle,
  money: { amountInCents: 18740, direction: "expense", envelopeId: "housing" },
});

const adapters: Array<[string, () => Promise<TasksData>]> = [
  ["SQLite em memória", async () => createSqliteTasksData(await createTestDatabase(), clock)],
  ["fake", async () => createFakeTasksData()],
];

describe.each(adapters)("TasksData (%s)", (_name, createAdapter) => {
  it("devolve a pendência que foi gravada, igual", async () => {
    const tasksData = await createAdapter();

    await tasksData.save(payElectricityBill);

    const [stored] = await tasksData.list();
    expect(stored?.toRecord()).toEqual(payElectricityBill.toRecord());
  });

  it("grava de novo a mesma pendência sem duplicar", async () => {
    const tasksData = await createAdapter();
    await tasksData.save(payElectricityBill);

    await tasksData.save(payElectricityBill.toggleDone(today));

    const stored = await tasksData.list();
    expect(stored.map((task) => task.stage)).toEqual(["done"]);
  });

  it("não lista a pendência removida", async () => {
    const tasksData = await createAdapter();
    await tasksData.save(payElectricityBill);

    await tasksData.remove(payElectricityBill.id);

    expect(await tasksData.list()).toEqual([]);
  });

  it("guarda pendência sem valor, sem prazo e no backlog", async () => {
    const tasksData = await createAdapter();
    const plain = Task.create({ id: "task-2", title: "Cancelar o streaming" });

    await tasksData.save(plain);

    const [stored] = await tasksData.list();
    expect(stored?.toRecord()).toEqual(plain.toRecord());
  });
});

describe("TasksData (SQLite em memória): o que só o banco faz", () => {
  it("marca a exclusão em vez de apagar a linha", async () => {
    const database = await createTestDatabase();
    const tasksData = createSqliteTasksData(database, clock);
    await tasksData.save(payElectricityBill);

    await tasksData.remove(payElectricityBill.id);

    const rows = await database.queryAll<{ deleted_at: string | null }>(
      "SELECT deleted_at FROM tasks",
    );
    expect(rows[0]?.deleted_at).not.toBeNull();
  });

  it("registra quando a pendência foi gravada", async () => {
    const database = await createTestDatabase();
    const tasksData = createSqliteTasksData(database, clock);

    await tasksData.save(payElectricityBill);

    const rows = await database.queryAll<{ updated_at: string }>("SELECT updated_at FROM tasks");
    expect(rows[0]?.updated_at).toBe(clock.now().toISOString());
  });

  it("recusa, em voz alta, uma linha que quebra a regra", async () => {
    const database = await createTestDatabase();
    await database.run(
      `INSERT INTO tasks (id, title, stage, priority, updated_at) VALUES ('bad', '   ', 'todo', 'medium', 'agora')`,
    );
    const tasksData = createSqliteTasksData(database, clock);

    await expect(tasksData.list()).rejects.toThrow();
  });
});
