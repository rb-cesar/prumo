import { describe, expect, it } from "vitest";
import { Cycle } from "./cycle";
import { type NewTaskInput, sortTasksForList, Task } from "./task";
import { TaskRuleViolation, type TaskRuleViolationReason } from "./task-rule-violation";

const today = "2026-11-13";
const currentCycle = Cycle.containing(today);

function makeTask(overrides: Partial<NewTaskInput> = {}): Task {
  return Task.create({ id: "task-1", title: "Pagar conta de luz", ...overrides });
}

function reasonOf(action: () => unknown): TaskRuleViolationReason | undefined {
  try {
    action();
  } catch (error) {
    return error instanceof TaskRuleViolation ? error.reason : undefined;
  }
  return undefined;
}

describe("Task: criar", () => {
  it("nasce em A fazer, com prioridade média e no backlog", () => {
    const task = makeTask();

    expect([task.stage, task.priority, task.isInBacklog]).toEqual(["todo", "medium", true]);
  });

  it("guarda o título sem espaços nas pontas", () => {
    expect(makeTask({ title: "  Pagar a internet  " }).title).toBe("Pagar a internet");
  });

  it("recusa título vazio ou só com espaços", () => {
    expect(reasonOf(() => makeTask({ title: "   " }))).toBe("title-required");
  });

  it("recusa valor zero ou com fração de centavo", () => {
    const zero = { amountInCents: 0, direction: "expense", envelopeId: null } as const;
    const fractional = { amountInCents: 10.5, direction: "expense", envelopeId: null } as const;

    expect([
      reasonOf(() => makeTask({ money: zero })),
      reasonOf(() => makeTask({ money: fractional })),
    ]).toEqual(["invalid-amount", "invalid-amount"]);
  });

  it("aceita envelope só para valor a pagar", () => {
    const incomeWithEnvelope = {
      amountInCents: 60000,
      direction: "income",
      envelopeId: "housing",
    } as const;

    expect(reasonOf(() => makeTask({ money: incomeWithEnvelope }))).toBe(
      "envelope-only-for-expense",
    );
  });

  it("recusa prazo que não é uma data", () => {
    expect(reasonOf(() => makeTask({ dueDate: "2026-02-30" }))).toBe("invalid-date");
  });
});

describe("Task: etapas", () => {
  it("conclui uma pendência aberta e guarda o dia", () => {
    const done = makeTask().toggleDone(today);

    expect([done.stage, done.doneDate]).toEqual(["done", today]);
  });

  it("reabre uma feita em A fazer e apaga a data de conclusão", () => {
    const reopened = makeTask().toggleDone(today).toggleDone("2026-11-14");

    expect([reopened.stage, reopened.doneDate]).toEqual(["todo", null]);
  });

  it("troca de etapa em qualquer direção", () => {
    const inCycle = makeTask({ cycle: currentCycle });

    const doing = inCycle.moveToStage("doing", today);
    const backToTodo = doing.moveToStage("todo", today);

    expect([doing.stage, backToTodo.stage]).toEqual(["doing", "todo"]);
  });

  it("não deixa uma pendência do backlog ficar em Fazendo", () => {
    expect(reasonOf(() => makeTask().moveToStage("doing", today))).toBe("doing-only-in-cycle");
  });

  it("devolve outra instância e deixa a original como estava", () => {
    const original = makeTask();

    original.toggleDone(today);

    expect(original.stage).toBe("todo");
  });
});

describe("Task: atrasada", () => {
  it("não está atrasada com prazo hoje", () => {
    expect(makeTask({ dueDate: today }).isOverdue(today)).toBe(false);
  });

  it("está atrasada 1 dia com prazo ontem, mesmo em Fazendo", () => {
    const doing = makeTask({ dueDate: "2026-11-12", cycle: currentCycle }).moveToStage(
      "doing",
      today,
    );

    expect(doing.overdueDays(today)).toBe(1);
  });

  it("não está atrasada se já está feita", () => {
    expect(makeTask({ dueDate: "2026-11-12" }).toggleDone(today).isOverdue(today)).toBe(false);
  });

  it("não fica atrasada sem prazo", () => {
    expect(makeTask().isOverdue(today)).toBe(false);
  });

  it("conta os dias de atraso", () => {
    expect(makeTask({ dueDate: "2026-11-11" }).overdueDays(today)).toBe(2);
  });
});

describe("sortTasksForList", () => {
  it("ordena por prazo e deixa as sem prazo por último", () => {
    const withoutDue = makeTask({ id: "a" });
    const later = makeTask({ id: "b", dueDate: "2026-11-20" });
    const sooner = makeTask({ id: "c", dueDate: "2026-11-14" });

    expect(sortTasksForList([withoutDue, later, sooner]).map((task) => task.id)).toEqual([
      "c",
      "b",
      "a",
    ]);
  });

  it("desempata pela prioridade: alta, média, baixa", () => {
    const low = makeTask({ id: "low", dueDate: today, priority: "low" });
    const high = makeTask({ id: "high", dueDate: today, priority: "high" });
    const medium = makeTask({ id: "medium", dueDate: today });

    expect(sortTasksForList([low, high, medium]).map((task) => task.id)).toEqual([
      "high",
      "medium",
      "low",
    ]);
  });
});

describe("Task: ciclo e backlog", () => {
  it("puxa uma pendência do backlog para o ciclo", () => {
    const pulled = makeTask().pullToCycle(currentCycle);

    expect(pulled.cycle?.start).toBe(currentCycle.start);
  });

  it("volta ao backlog em A fazer quando estava em Fazendo", () => {
    const doing = makeTask({ cycle: currentCycle }).moveToStage("doing", today);

    const back = doing.moveToBacklog();

    expect([back.isInBacklog, back.stage]).toEqual([true, "todo"]);
  });

  it("não move uma pendência feita para o backlog", () => {
    const done = makeTask({ cycle: currentCycle }).toggleDone(today);

    expect(reasonOf(() => done.moveToBacklog())).toBe("done-task-stays-in-cycle");
  });

  it("devolve ao backlog, na virada, o que não foi concluído no ciclo que acabou", () => {
    const oldCycle = Cycle.containing("2026-11-01");
    const doingLastWeek = makeTask({ cycle: oldCycle }).moveToStage("doing", "2026-11-03");

    const settled = doingLastWeek.settledFor(currentCycle);

    expect([settled.isInBacklog, settled.stage]).toEqual([true, "todo"]);
  });

  it("deixa a concluída no ciclo em que foi feita", () => {
    const oldCycle = Cycle.containing("2026-11-01");
    const doneLastWeek = makeTask({ cycle: oldCycle }).toggleDone("2026-11-03");

    expect(doneLastWeek.settledFor(currentCycle).cycle?.start).toBe(oldCycle.start);
  });

  it("não mexe no que está no ciclo atual nem no backlog", () => {
    const inCurrentCycle = makeTask({ cycle: currentCycle });
    const inBacklog = makeTask();

    expect([inCurrentCycle.settledFor(currentCycle), inBacklog.settledFor(currentCycle)]).toEqual([
      inCurrentCycle,
      inBacklog,
    ]);
  });

  it("devolve tudo de uma vez quando o app ficou fechado por duas semanas", () => {
    const twoWeeksAgo = Cycle.containing("2026-10-25");
    const forgotten = makeTask({ cycle: twoWeeksAgo });

    expect(forgotten.settledFor(currentCycle).isInBacklog).toBe(true);
  });
});

describe("Task: registro", () => {
  it("reconstrói a mesma pendência que foi gravada", () => {
    const original = makeTask({
      cycle: currentCycle,
      dueDate: today,
      priority: "high",
    }).moveToStage("doing", today);

    expect(Task.fromRecord(original.toRecord()).toRecord()).toEqual(original.toRecord());
  });

  it("recusa um snapshot inconsistente: Feito sem data de conclusão", () => {
    const inconsistent = { ...makeTask().toRecord(), stage: "done" as const };

    expect(reasonOf(() => Task.fromRecord(inconsistent))).toBe("done-date-mismatch");
  });
});
