import { describe, expect, it } from "vitest";
import { type NewTaskInput, Task } from "../../../shared/tasks/domain/task";
import { TaskDisplay } from "./task-display";

const today = "2026-11-13";

function makeTask(overrides: Partial<NewTaskInput> = {}): Task {
  return Task.create({ id: "task-1", title: "Pagar conta de luz", ...overrides });
}

describe("TaskDisplay.toRowView", () => {
  it("mostra o atraso, a prioridade alta e o valor a pagar", () => {
    const late = makeTask({
      dueDate: "2026-11-11",
      priority: "high",
      money: { amountInCents: 18740, direction: "expense", envelopeId: null },
    });

    const view = new TaskDisplay(late).toRowView(today);

    expect(view.chips).toEqual([
      { text: "Atrasada 2 dias", tone: "neg" },
      { text: "Alta", tone: "near" },
    ]);
    expect(view.money).toEqual({ amountText: "R$ 187,40", label: "a pagar", direction: "expense" });
  });

  it("destaca o prazo de hoje sem chamá-lo de atraso", () => {
    const view = new TaskDisplay(makeTask({ dueDate: today })).toRowView(today);

    expect(view.chips).toEqual([{ text: "Hoje", tone: "near" }]);
  });

  it("esconde prazo e prioridade quando a pendência está feita", () => {
    const done = makeTask({ dueDate: "2026-11-11", priority: "high" }).toggleDone(today);

    const view = new TaskDisplay(done).toRowView(today);

    expect([view.isDone, view.chips]).toEqual([true, []]);
  });

  it("troca o rótulo do valor quando a pendência está feita", () => {
    const received = makeTask({
      money: { amountInCents: 60000, direction: "income", envelopeId: null },
    }).toggleDone(today);

    expect(new TaskDisplay(received).toRowView(today).money?.label).toBe("recebido");
  });
});

describe("TaskDisplay.toDetailView", () => {
  it("lista prazo, prioridade, onde está e o valor, e marca a atrasada", () => {
    const late = makeTask({
      dueDate: "2026-11-11",
      money: { amountInCents: 18740, direction: "expense", envelopeId: null },
    });

    const view = new TaskDisplay(late).toDetailView(today);

    expect(view.rows).toEqual([
      ["Prazo", "qua, 11 nov (atrasada)"],
      ["Prioridade", "Média"],
      ["Onde está", "Backlog"],
      ["Valor", "R$ 187,40 a pagar"],
    ]);
    expect([view.isInBacklog, view.canBeDoing, view.canMoveToBacklog]).toEqual([
      true,
      false,
      false,
    ]);
  });

  it("sem prazo nem valor, mostra só o que a pendência tem", () => {
    const view = new TaskDisplay(makeTask()).toDetailView(today);

    expect(view.rows.map(([term]) => term)).toEqual(["Prazo", "Prioridade", "Onde está"]);
    expect(view.rows[0]).toEqual(["Prazo", "Sem prazo"]);
  });
});
