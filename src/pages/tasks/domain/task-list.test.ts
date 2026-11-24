import { describe, expect, it } from "vitest";
import { Cycle } from "../../../shared/tasks/domain/cycle";
import { type NewTaskInput, Task } from "../../../shared/tasks/domain/task";
import { TaskList } from "./task-list";

const today = "2026-11-13";
const currentCycle = Cycle.containing(today);

function makeTask(overrides: Partial<NewTaskInput> = {}): Task {
  return Task.create({ id: "task-1", title: "Pagar conta de luz", ...overrides });
}

function idsOf(list: TaskList): string[] {
  return list.toRowViews(today).map((row) => row.id);
}

describe("TaskList: recortes", () => {
  it("separa o ciclo atual do backlog", () => {
    const inCycle = makeTask({ id: "a", cycle: currentCycle });
    const inBacklog = makeTask({ id: "b" });
    const list = new TaskList([inCycle, inBacklog]);

    expect([idsOf(list.inCycle(currentCycle)), idsOf(list.inBacklog())]).toEqual([["a"], ["b"]]);
  });

  it("separa por etapa", () => {
    const todo = makeTask({ id: "todo", cycle: currentCycle });
    const done = makeTask({ id: "done", cycle: currentCycle }).toggleDone(today);

    const list = new TaskList([todo, done]).inCycle(currentCycle);

    expect([list.inStage("todo").count, list.inStage("done").count]).toEqual([1, 1]);
  });

  it("filtra por valor e por prioridade alta", () => {
    const plain = makeTask({ id: "plain" });
    const withMoney = makeTask({
      id: "money",
      money: { amountInCents: 100, direction: "expense", envelopeId: null },
    });
    const high = makeTask({ id: "high", priority: "high" });
    const list = new TaskList([plain, withMoney, high]);

    expect([
      idsOf(list.matching("money")),
      idsOf(list.matching("high")),
      idsOf(list.matching("all")),
    ]).toEqual([["money"], ["high"], ["plain", "money", "high"]]);
  });

  it("encadeia os recortes e na ordem da lista a de prioridade alta vem antes", () => {
    const normal = makeTask({ id: "normal", cycle: currentCycle });
    const high = makeTask({ id: "high", cycle: currentCycle, priority: "high" });

    const shown = new TaskList([normal, high]).inCycle(currentCycle).inStage("todo").inListOrder();

    expect(idsOf(shown)).toEqual(["high", "normal"]);
  });

  it("não altera a lista original ao recortar", () => {
    const list = new TaskList([makeTask({ id: "a" }), makeTask({ id: "b", cycle: currentCycle })]);

    list.inBacklog();

    expect(list.count).toBe(2);
  });
});
