import { describe, expect, it } from "vitest";
import { Envelope } from "./envelope";
import { WeeklyPlan } from "./weekly-plan";

function envelope(id: string, budgetInReais: number, isFixed = false) {
  return Envelope.fromRecord({ id, name: id, budgetInCents: budgetInReais * 100, isFixed });
}

const novemberEnvelopes = [
  envelope("housing", 2200, true),
  envelope("groceries", 1100),
  envelope("transport", 450),
  envelope("leisure", 400),
  envelope("health", 300),
  envelope("subscriptions", 150),
  envelope("dining", 450),
];

describe("WeeklyPlan (BR-H03)", () => {
  it("é a soma dos envelopes do dia a dia ÷ dias do mês × 7, sem contar os fixos", () => {
    const plan = new WeeklyPlan(novemberEnvelopes, "2026-11-25");

    expect(plan.perWeekInCents).toBe(66500);
    expect(plan.everydayEnvelopeIds).not.toContain("housing");
    expect(plan.everydayEnvelopeIds).toHaveLength(6);
  });

  it("usa os dias reais do mês e arredonda para baixo", () => {
    expect(new WeeklyPlan([envelope("groceries", 1000)], "2027-02-10").perWeekInCents).toBe(25000);
    expect(new WeeklyPlan([envelope("groceries", 1000)], "2026-11-10").perWeekInCents).toBe(23333);
  });

  it("sem envelope do dia a dia, o plano é zero", () => {
    const plan = new WeeklyPlan([envelope("housing", 2200, true)], "2026-11-25");

    expect(plan.perWeekInCents).toBe(0);
    expect(plan.toneFor(0)).toBe("ok");
    expect(plan.fillRatioFor(5000)).toBe(0);
  });

  it("é verde, amarelo a partir de 85% e vermelho acima do plano", () => {
    const plan = new WeeklyPlan([envelope("groceries", 1000)], "2027-02-10");

    expect(plan.toneFor(21249)).toBe("ok");
    expect(plan.toneFor(21250)).toBe("near");
    expect(plan.toneFor(25000)).toBe("near");
    expect(plan.toneFor(25001)).toBe("over");
  });

  it("enche a barra no máximo até o fim", () => {
    const plan = new WeeklyPlan([envelope("groceries", 1000)], "2027-02-10");

    expect(plan.fillRatioFor(12500)).toBe(0.5);
    expect(plan.fillRatioFor(99999)).toBe(1);
  });
});
