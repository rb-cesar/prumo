import { describe, expect, it } from "vitest";
import { Goal, type NewGoalInput } from "./goal";
import { GoalRuleViolation, type GoalRuleViolationReason } from "./goal-rule-violation";

const today = "2026-11-13";
const validInput: NewGoalInput = {
  id: "trip",
  title: "Viagem de julho",
  targetInCents: 500000,
  dueDate: "2027-06-30",
};

function reasonOfRejection(input: NewGoalInput): GoalRuleViolationReason | undefined {
  try {
    Goal.create(input, today);
  } catch (error) {
    if (error instanceof GoalRuleViolation) return error.reason;
    throw error;
  }
  return undefined;
}

describe("Goal.create", () => {
  it("cria a meta com o valor inicial em zero quando não é informado", () => {
    expect(Goal.create(validInput, today).toRecord()).toEqual({
      ...validInput,
      initialSavedInCents: 0,
    });
  });

  it("guarda o título sem os espaços das pontas", () => {
    expect(Goal.create({ ...validInput, title: "  Viagem  " }, today).title).toBe("Viagem");
  });

  it("recusa título vazio ou só com espaços", () => {
    expect(reasonOfRejection({ ...validInput, title: "   " })).toBe("title-required");
  });

  it.each([0, -100, 10.5])("recusa valor-alvo %s", (targetInCents) => {
    expect(reasonOfRejection({ ...validInput, targetInCents })).toBe("invalid-target");
  });

  it("aceita valor inicial zero ou maior que o alvo, e recusa negativo", () => {
    expect(reasonOfRejection({ ...validInput, initialSavedInCents: 0 })).toBeUndefined();
    expect(reasonOfRejection({ ...validInput, initialSavedInCents: 900000 })).toBeUndefined();
    expect(reasonOfRejection({ ...validInput, initialSavedInCents: -1 })).toBe(
      "invalid-initial-saved",
    );
  });

  it("recusa prazo que não é uma data", () => {
    expect(reasonOfRejection({ ...validInput, dueDate: "30/06/2027" })).toBe("invalid-due-date");
  });

  it("aceita prazo hoje e recusa prazo no passado", () => {
    expect(reasonOfRejection({ ...validInput, dueDate: today })).toBeUndefined();
    expect(reasonOfRejection({ ...validInput, dueDate: "2026-11-12" })).toBe("due-date-in-past");
  });
});

describe("Goal.fromRecord", () => {
  it("reconstrói uma meta gravada cujo prazo já passou", () => {
    const record = { ...validInput, initialSavedInCents: 0, dueDate: "2020-01-01" };

    expect(Goal.fromRecord(record).toRecord()).toEqual(record);
  });
});
