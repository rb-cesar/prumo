import { describe, expect, it } from "vitest";
import { Transaction } from "../../finance/domain/transaction";
import { Goal } from "./goal";
import { GoalProgress } from "./goal-progress";

const today = "2026-11-13";

function goalDueIn(
  daysFromToday: number,
  overrides: Partial<Parameters<typeof Goal.create>[0]> = {},
) {
  const due = new Date(Date.UTC(2026, 10, 13 + daysFromToday)).toISOString().slice(0, 10);
  return Goal.fromRecord({
    id: "trip",
    title: "Viagem",
    targetInCents: 500000,
    initialSavedInCents: 0,
    dueDate: due,
    ...overrides,
  });
}

function contribution(amountInCents: number, goalId: string | null = "trip") {
  return Transaction.create({
    id: `tx-${amountInCents}-${goalId}`,
    kind: "saving",
    amountInCents,
    date: today,
    description: "Aporte",
    goalId,
  });
}

describe("GoalProgress: guardado (BR-M02)", () => {
  it("soma o valor inicial e os aportes desta meta, e ignora os de outras", () => {
    const goal = goalDueIn(100, { initialSavedInCents: 180000 });

    const progress = new GoalProgress(goal, [
      contribution(10000),
      contribution(5000),
      contribution(99999, "other-goal"),
      contribution(77777, null),
    ]);

    expect(progress.savedInCents).toBe(195000);
    expect(progress.savedText).toBe("R$ 1.950,00 de R$ 5.000,00");
  });

  it("não conta gasto nem entrada, mesmo que apontem para a meta", () => {
    const income = Transaction.create({
      id: "tx-in",
      kind: "income",
      amountInCents: 90000,
      date: today,
      description: "Salário",
    });

    expect(new GoalProgress(goalDueIn(100), [income]).savedInCents).toBe(0);
  });

  it("mostra a porcentagem arredondada e limita a 100%", () => {
    const goal = goalDueIn(100);

    expect(new GoalProgress(goal, [contribution(166667)]).percentText).toBe("33%");
    expect(new GoalProgress(goal, [contribution(900000)]).percentText).toBe("100%");
    expect(new GoalProgress(goal, []).percentText).toBe("0%");
  });

  it("está concluída quando o guardado alcança o alvo, e a falta nunca é negativa", () => {
    const goal = goalDueIn(100);

    const exact = new GoalProgress(goal, [contribution(500000)]);
    const beyond = new GoalProgress(goal, [contribution(600000)]);
    const short = new GoalProgress(goal, [contribution(499999)]);

    expect([exact.isCompleted, beyond.isCompleted, short.isCompleted]).toEqual([true, true, false]);
    expect([exact.remainingInCents, beyond.remainingInCents, short.remainingInCents]).toEqual([
      0, 0, 1,
    ]);
  });

  it("o valor inicial maior que o alvo já conclui a meta", () => {
    const goal = goalDueIn(100, { initialSavedInCents: 800000 });

    expect(new GoalProgress(goal, []).isCompleted).toBe(true);
  });
});

describe("GoalProgress: prazo (BR-M05)", () => {
  it.each([
    [-3, "prazo vencido"],
    [0, "vence hoje"],
    [1, "faltam 1 dia"],
    [59, "faltam 59 dias"],
    [60, "faltam 2 meses"],
    [304, "faltam 10 meses"],
  ])("com prazo em %s dias diz %s", (days, text) => {
    expect(new GoalProgress(goalDueIn(days), []).timeLeftText(today)).toBe(text);
  });

  it("junta o dia do prazo e o que falta", () => {
    expect(new GoalProgress(goalDueIn(5), []).dueText(today)).toBe(
      "até qua, 18 nov · faltam 5 dias",
    );
    expect(new GoalProgress(goalDueIn(1), []).dueText(today)).toBe("até amanhã · faltam 1 dia");
    expect(new GoalProgress(goalDueIn(0), []).dueText(today)).toBe("vence hoje");
  });
});
