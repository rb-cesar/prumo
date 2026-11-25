import { describe, expect, it } from "vitest";
import { createFakeCyclesData } from "../../data/cycles";
import { createFakeTasksData } from "../../data/tasks";
import { Cycle } from "./domain/cycle";
import { Task } from "./domain/task";
import { loadSettledTasks } from "./settle-ended-cycles";

const today = "2026-11-25";
const currentCycle = Cycle.containing(today);
const lastWeek = Cycle.containing("2026-11-18");
const twoWeeksAgo = Cycle.containing("2026-11-11");

function inCycle(id: string, cycle: Cycle) {
  return Task.create({ id, title: id, cycle });
}

describe("loadSettledTasks", () => {
  it("anota quantas pendências o ciclo que acabou tinha, concluídas ou não", async () => {
    const cycles = createFakeCyclesData();
    const tasks = createFakeTasksData([
      inCycle("a", lastWeek),
      inCycle("b", lastWeek).moveToStage("done", "2026-11-19"),
      inCycle("c", lastWeek).moveToStage("doing", "2026-11-19"),
      inCycle("d", twoWeeksAgo).moveToStage("done", "2026-11-12"),
      inCycle("e", currentCycle),
    ]);

    await loadSettledTasks({ tasks, cycles }, currentCycle);

    expect(await cycles.listClosings()).toEqual([
      { cycleStart: lastWeek.start, plannedCount: 3 },
      { cycleStart: twoWeeksAgo.start, plannedCount: 1 },
    ]);
  });

  it("devolve ao backlog, gravando, o que sobrou e mantém o concluído no ciclo", async () => {
    const tasks = createFakeTasksData([
      inCycle("open", lastWeek),
      inCycle("done", lastWeek).moveToStage("done", "2026-11-19"),
    ]);

    await loadSettledTasks({ tasks, cycles: createFakeCyclesData() }, currentCycle);

    const stored = await tasks.list();
    expect(stored.find((task) => task.id === "open")?.isInBacklog).toBe(true);
    expect(stored.find((task) => task.id === "done")?.cycle?.start).toBe(lastWeek.start);
  });

  it("não sobrescreve o fechamento já anotado, mesmo rodando de novo", async () => {
    const cycles = createFakeCyclesData();
    const tasks = createFakeTasksData([
      inCycle("open", lastWeek),
      inCycle("done", lastWeek).moveToStage("done", "2026-11-19"),
    ]);

    await loadSettledTasks({ tasks, cycles }, currentCycle);
    await loadSettledTasks({ tasks, cycles }, currentCycle);

    expect(await cycles.listClosings()).toEqual([{ cycleStart: lastWeek.start, plannedCount: 2 }]);
  });

  it("não anota o ciclo de hoje nem pendências do backlog", async () => {
    const cycles = createFakeCyclesData();
    const tasks = createFakeTasksData([
      inCycle("now", currentCycle),
      Task.create({ id: "x", title: "x" }),
    ]);

    await loadSettledTasks({ tasks, cycles }, currentCycle);

    expect(await cycles.listClosings()).toEqual([]);
  });
});
