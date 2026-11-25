import { describe, expect, it } from "vitest";
import { Transaction } from "../../../shared/finance/domain/transaction";
import { Goal } from "../../../shared/goals/domain/goal";
import { GoalBoard } from "./goal-board";

const today = "2026-11-13";

function goalDueIn(id: string, daysFromToday: number, targetInCents = 500000) {
  const due = new Date(Date.UTC(2026, 10, 13 + daysFromToday)).toISOString().slice(0, 10);
  return Goal.fromRecord({
    id,
    title: `Meta ${id}`,
    targetInCents,
    initialSavedInCents: 0,
    dueDate: due,
  });
}

function contribution(goalId: string, amountInCents: number) {
  return Transaction.create({
    id: `tx-${goalId}`,
    kind: "saving",
    amountInCents,
    date: today,
    description: "Aporte",
    goalId,
  });
}

describe("GoalBoard: abas e ordem (BR-M06)", () => {
  it("separa curto prazo (até 90 dias) e longo prazo (mais que isso)", () => {
    const board = new GoalBoard(
      [goalDueIn("a", 90), goalDueIn("b", 91), goalDueIn("c", 10)],
      [],
      today,
    );

    expect(board.toCardViews("short").map((card) => card.id)).toEqual(["c", "a"]);
    expect(board.toCardViews("long").map((card) => card.id)).toEqual(["b"]);
  });

  it("ordena pelo prazo mais próximo, mesmo se a meta já venceu", () => {
    const board = new GoalBoard(
      [goalDueIn("late", 40), goalDueIn("soon", 5), goalDueIn("overdue", -2)],
      [],
      today,
    );

    expect(board.toCardViews("short").map((card) => card.id)).toEqual(["overdue", "soon", "late"]);
  });

  it("abre no curto prazo, e no longo só se for a única aba com metas", () => {
    const onlyLong = new GoalBoard([goalDueIn("a", 200)], [], today);
    const both = new GoalBoard([goalDueIn("a", 200), goalDueIn("b", 20)], [], today);
    const empty = new GoalBoard([], [], today);

    expect([onlyLong.initialHorizon, both.initialHorizon, empty.initialHorizon]).toEqual([
      "long",
      "short",
      "short",
    ]);
  });
});

describe("GoalBoard: o cartão de cada meta", () => {
  it("mostra o guardado, a porcentagem e o ritmo necessário", () => {
    const board = new GoalBoard(
      [goalDueIn("trip", 30, 100000)],
      [contribution("trip", 30000)],
      today,
    );

    expect(board.toCardViews("short")).toEqual([
      {
        id: "trip",
        title: "Meta trip",
        dueText: "até dom, 13 dez · faltam 30 dias",
        percentText: "30%",
        ratio: 0.3,
        isCompleted: false,
        savedText: "R$ 300,00 de R$ 1.000,00",
        paceText: "R$ 164 por semana",
      },
    ]);
  });

  it("meta concluída fica a 100%, sem ritmo", () => {
    const board = new GoalBoard(
      [goalDueIn("trip", 30, 100000)],
      [contribution("trip", 100000)],
      today,
    );

    expect(board.toCardViews("short")[0]).toMatchObject({
      percentText: "100%",
      isCompleted: true,
      paceText: null,
    });
  });
});
