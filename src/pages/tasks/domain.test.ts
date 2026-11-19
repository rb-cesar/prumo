import { describe, expect, it } from "vitest";
import { Cycle } from "../../shared/tasks/domain/cycle";
import { type NewTaskInput, Task } from "../../shared/tasks/domain/task";
import {
  describeDay,
  formatMoneyFromCents,
  parseMoneyToCents,
  tasksInBacklog,
  tasksInCycle,
  toTaskRowView,
  visibleTasks,
} from "./domain";

const today = "2026-11-13";
const currentCycle = Cycle.containing(today);

function makeTask(overrides: Partial<NewTaskInput> = {}): Task {
  return Task.create({ id: "task-1", title: "Pagar conta de luz", ...overrides });
}

describe("describeDay", () => {
  it("usa Hoje, Ontem e Amanhã para os dias vizinhos", () => {
    expect([
      describeDay("2026-11-13", today),
      describeDay("2026-11-12", today),
      describeDay("2026-11-14", today),
    ]).toEqual(["Hoje", "Ontem", "Amanhã"]);
  });

  it("escreve os outros dias com o dia da semana", () => {
    expect(describeDay("2026-11-18", today)).toBe("qua, 18 nov");
  });
});

describe("formatMoneyFromCents", () => {
  it("formata em real, com vírgula nos centavos e ponto nos milhares", () => {
    expect([
      formatMoneyFromCents(18740),
      formatMoneyFromCents(120050),
      formatMoneyFromCents(5),
    ]).toEqual(["R$ 187,40", "R$ 1.200,50", "R$ 0,05"]);
  });
});

describe("parseMoneyToCents", () => {
  it("entende vírgula decimal e ponto de milhar", () => {
    expect([
      parseMoneyToCents("45,90"),
      parseMoneyToCents("1.200"),
      parseMoneyToCents("3.000,00"),
    ]).toEqual([4590, 120000, 300000]);
  });

  it("recusa texto, zero e vazio", () => {
    expect([parseMoneyToCents("abc"), parseMoneyToCents("0"), parseMoneyToCents("  ")]).toEqual([
      null,
      null,
      null,
    ]);
  });
});

describe("toTaskRowView", () => {
  it("mostra o atraso, a prioridade alta e o valor a pagar", () => {
    const late = makeTask({
      dueDate: "2026-11-11",
      priority: "high",
      money: { amountInCents: 18740, direction: "expense", envelopeId: null },
    });

    const view = toTaskRowView(late, today);

    expect(view.chips).toEqual([
      { text: "Atrasada 2 dias", tone: "neg" },
      { text: "Alta", tone: "near" },
    ]);
    expect(view.money).toEqual({ amountText: "R$ 187,40", label: "a pagar", direction: "expense" });
  });

  it("destaca o prazo de hoje sem chamá-lo de atraso", () => {
    expect(toTaskRowView(makeTask({ dueDate: today }), today).chips).toEqual([
      { text: "Hoje", tone: "near" },
    ]);
  });

  it("esconde prazo e prioridade quando a pendência está feita", () => {
    const done = makeTask({ dueDate: "2026-11-11", priority: "high" }).toggleDone(today);

    const view = toTaskRowView(done, today);

    expect([view.isDone, view.chips]).toEqual([true, []]);
  });

  it("troca o rótulo do valor quando a pendência está feita", () => {
    const received = makeTask({
      money: { amountInCents: 60000, direction: "income", envelopeId: null },
    }).toggleDone(today);

    expect(toTaskRowView(received, today).money?.label).toBe("recebido");
  });
});

describe("listas da tela", () => {
  it("separa o ciclo atual do backlog", () => {
    const inCycle = makeTask({ id: "a", cycle: currentCycle });
    const inBacklog = makeTask({ id: "b" });

    expect([
      tasksInCycle([inCycle, inBacklog], currentCycle),
      tasksInBacklog([inCycle, inBacklog]),
    ]).toEqual([[inCycle], [inBacklog]]);
  });

  it("filtra por valor e por prioridade alta, na ordem da lista", () => {
    const plain = makeTask({ id: "plain" });
    const withMoney = makeTask({
      id: "money",
      money: { amountInCents: 100, direction: "expense", envelopeId: null },
    });
    const high = makeTask({ id: "high", priority: "high" });

    expect([
      visibleTasks([plain, withMoney, high], "money").map((task) => task.id),
      visibleTasks([plain, withMoney, high], "high").map((task) => task.id),
    ]).toEqual([["money"], ["high"]]);
  });
});
