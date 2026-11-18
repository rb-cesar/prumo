import { describe, expect, it } from "vitest";
import { Cycle } from "./cycle";
import { TaskRuleViolation, type TaskRuleViolationReason } from "./task-rule-violation";

const currentCycle = Cycle.containing("2026-11-13");

function reasonOf(action: () => unknown): TaskRuleViolationReason | undefined {
  try {
    action();
  } catch (error) {
    return error instanceof TaskRuleViolation ? error.reason : undefined;
  }
  return undefined;
}

describe("Cycle", () => {
  it("vai de domingo a sábado e conta o dia dado", () => {
    expect(currentCycle.start).toBe("2026-11-08");
    expect(currentCycle.end).toBe("2026-11-14");
  });

  it("se identifica só pelas datas", () => {
    expect(currentCycle.label).toBe("8 a 14 nov");
  });

  it("escreve os dois meses quando a semana atravessa a virada", () => {
    expect(Cycle.containing("2026-12-01").label).toBe("29 nov a 5 dez");
  });

  it("começa um novo ciclo no domingo", () => {
    expect(Cycle.containing("2026-11-15").start).toBe("2026-11-15");
  });

  it("inclui só os dias da própria semana", () => {
    expect(currentCycle.includes("2026-11-14")).toBe(true);
    expect(currentCycle.includes("2026-11-15")).toBe(false);
  });

  it("recusa um início que não seja domingo", () => {
    expect(reasonOf(() => Cycle.startingOn("2026-11-09"))).toBe("cycle-must-start-on-sunday");
  });
});
