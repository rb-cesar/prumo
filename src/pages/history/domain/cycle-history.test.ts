import { describe, expect, it } from "vitest";
import { Envelope } from "../../../shared/finance/domain/envelope";
import { Transaction } from "../../../shared/finance/domain/transaction";
import { Cycle } from "../../../shared/tasks/domain/cycle";
import { CycleReview } from "../../../shared/tasks/domain/cycle-review";
import { Task } from "../../../shared/tasks/domain/task";
import { CycleHistory, type CycleHistoryInput } from "./cycle-history";

const today = "2026-11-25";
const currentCycle = Cycle.containing(today);

// Plano semanal: (1.100 + 400) ÷ 30 × 7 = R$ 350.
const envelopes = [
  Envelope.fromRecord({ id: "housing", name: "Moradia", budgetInCents: 220000, isFixed: true }),
  Envelope.fromRecord({ id: "groceries", name: "Mercado", budgetInCents: 110000, isFixed: false }),
  Envelope.fromRecord({ id: "leisure", name: "Lazer", budgetInCents: 40000, isFixed: false }),
];

let nextId = 0;
function tasksOf(cycle: Cycle, doneCount: number, plannedCount: number): Task[] {
  return Array.from({ length: plannedCount }, (_, index) => {
    const task = Task.create({ id: `task-${nextId++}`, title: "Tarefa", cycle });
    return index < doneCount ? task.moveToStage("done", cycle.start) : task;
  });
}
function spendInCycle(cycle: Cycle, reais: number, envelopeId = "groceries") {
  return Transaction.create({
    id: `tx-${nextId++}`,
    kind: "expense",
    amountInCents: reais * 100,
    date: cycle.start,
    description: "Gasto",
    envelopeId,
  });
}

function historyOf(overrides: Partial<CycleHistoryInput> = {}) {
  return new CycleHistory({
    tasks: [],
    closings: [],
    transactions: [],
    envelopes,
    reviews: [],
    today,
    ...overrides,
  });
}

const weekOf = (daysBack: number) => Cycle.containing(`2026-11-${25 - daysBack}`);
const week1 = weekOf(14);
const week2 = weekOf(7);

describe("CycleHistory: lista de ciclos (BR-H03)", () => {
  it("mostra o ciclo de hoje primeiro, com as concluídas, o gasto do dia a dia e o tom", () => {
    const history = historyOf({
      tasks: tasksOf(currentCycle, 3, 9),
      transactions: [
        spendInCycle(currentCycle, 200),
        spendInCycle(currentCycle, 100, "leisure"),
        spendInCycle(currentCycle, 900, "housing"),
      ],
    });

    expect(history.toRowViews()).toEqual([
      {
        cycleStart: "2026-11-22",
        title: "Ciclo 22 a 28 nov",
        isCurrent: true,
        doneText: "3/9",
        doneRatio: 1 / 3,
        isAllDone: false,
        spentText: "R$ 300",
        spentRatio: 300 / 350,
        spentTone: "near",
      },
    ]);
  });

  it("lista os fechados do mais novo para o mais antigo, com o planejado do fechamento", () => {
    const history = historyOf({
      tasks: [...tasksOf(week1, 6, 6), ...tasksOf(week2, 5, 5)],
      closings: [
        { cycleStart: week1.start, plannedCount: 6 },
        { cycleStart: week2.start, plannedCount: 8 },
      ],
    });

    const [, newestClosed, oldestClosed] = history.toRowViews();

    expect(newestClosed).toMatchObject({
      title: "Ciclo 15 a 21 nov",
      doneText: "5/8",
      isAllDone: false,
    });
    expect(oldestClosed).toMatchObject({
      title: "Ciclo 8 a 14 nov",
      doneText: "6/6",
      isAllDone: true,
    });
  });

  it("não mostra ciclo fechado com fechamento desconhecido ou sem pendências planejadas", () => {
    const history = historyOf({
      closings: [
        { cycleStart: week1.start, plannedCount: null },
        { cycleStart: week2.start, plannedCount: 0 },
      ],
    });

    expect(history.toRowViews()).toHaveLength(1);
  });

  it("o gasto de um ciclo conta os gastos dos dias dele, de domingo a sábado", () => {
    const edges = [
      Transaction.create({
        id: "before",
        kind: "expense",
        amountInCents: 10000,
        date: "2026-11-21",
        description: "Sábado antes",
        envelopeId: "groceries",
      }),
      Transaction.create({
        id: "saturday",
        kind: "expense",
        amountInCents: 2000,
        date: "2026-11-28",
        description: "Sábado do ciclo",
        envelopeId: "groceries",
      }),
      Transaction.create({
        id: "after",
        kind: "expense",
        amountInCents: 40000,
        date: "2026-11-29",
        description: "Domingo depois",
        envelopeId: "groceries",
      }),
    ];

    expect(historyOf({ transactions: edges }).toRowViews()[0]?.spentText).toBe("R$ 20");
  });

  it("diz o plano semanal do dia a dia", () => {
    expect(historyOf().weeklyPlanText).toBe("Plano do dia a dia: R$ 350 por semana, fora moradia.");
  });
});

describe("CycleHistory: insights (BR-H04)", () => {
  it("só aparecem com pelo menos 3 ciclos fechados", () => {
    const history = historyOf({
      tasks: [...tasksOf(week1, 6, 6), ...tasksOf(week2, 5, 5)],
      closings: [
        { cycleStart: week1.start, plannedCount: 6 },
        { cycleStart: week2.start, plannedCount: 5 },
      ],
    });

    expect(history.insights()).toEqual([]);
  });

  const cycles = [weekOf(21), weekOf(14), weekOf(7)];

  it("diz quanto do planejado foi concluído e o melhor ciclo", () => {
    const history = historyOf({
      tasks: [
        ...tasksOf(cycles[0] as Cycle, 6, 6),
        ...tasksOf(cycles[1] as Cycle, 6, 8),
        ...tasksOf(cycles[2] as Cycle, 3, 6),
      ],
      closings: [
        { cycleStart: (cycles[0] as Cycle).start, plannedCount: 6 },
        { cycleStart: (cycles[1] as Cycle).start, plannedCount: 8 },
        { cycleStart: (cycles[2] as Cycle).start, plannedCount: 6 },
      ],
    });

    expect(history.insights()[0]).toEqual({
      tone: "steel",
      title: "Você concluiu 75% do que planejou",
      text: "Nos últimos 3 ciclos. Seu melhor ciclo fechou 6 pendências; planejar bem mais que isso costuma não fechar.",
    });
  });

  it("mostra que a semana organizada gasta menos, quando é o caso", () => {
    const [first, second, third] = cycles as [Cycle, Cycle, Cycle];
    const history = historyOf({
      tasks: [...tasksOf(first, 5, 5), ...tasksOf(second, 3, 5), ...tasksOf(third, 4, 5)],
      closings: [first, second, third].map((cycle) => ({
        cycleStart: cycle.start,
        plannedCount: 5,
      })),
      transactions: [spendInCycle(first, 200), spendInCycle(second, 400), spendInCycle(third, 300)],
    });

    expect(history.insights()[1]).toEqual({
      tone: "pos",
      title: "Semana organizada, gasto menor",
      text: "Nos 1 ciclos em que você fechou tudo, o gasto do dia a dia foi em média R$ 150 menor.",
    });
  });

  it("não mostra esse insight se quem fechou tudo gastou mais", () => {
    const [first, second, third] = cycles as [Cycle, Cycle, Cycle];
    const history = historyOf({
      tasks: [...tasksOf(first, 5, 5), ...tasksOf(second, 3, 5), ...tasksOf(third, 4, 5)],
      closings: [first, second, third].map((cycle) => ({
        cycleStart: cycle.start,
        plannedCount: 5,
      })),
      transactions: [spendInCycle(first, 500), spendInCycle(second, 100), spendInCycle(third, 100)],
    });

    expect(history.insights()).toHaveLength(1);
  });
});

describe("CycleHistory: revisões (BR-H06)", () => {
  it("lista da mais nova para a mais antiga, com o dia em que foram salvas", () => {
    const older = CycleReview.create({
      cycleStart: week2.start,
      worked: "Planejei",
      hindered: "",
      changeNext: "",
      savedOn: "2026-11-21",
    });
    const newer = CycleReview.create({
      cycleStart: currentCycle.start,
      worked: "",
      hindered: "Contas no último dia",
      changeNext: "Pagar logo",
      savedOn: "2026-11-25",
    });

    const views = historyOf({ reviews: [older, newer] }).toReviewViews();

    expect(views).toEqual([
      {
        cycleStart: "2026-11-22",
        title: "Revisão do ciclo 22 a 28 nov · hoje",
        worked: "—",
        hindered: "Contas no último dia",
        changeNext: "Pagar logo",
      },
      {
        cycleStart: "2026-11-15",
        title: "Revisão do ciclo 15 a 21 nov · sáb, 21 nov",
        worked: "Planejei",
        hindered: "—",
        changeNext: "—",
      },
    ]);
  });
});
