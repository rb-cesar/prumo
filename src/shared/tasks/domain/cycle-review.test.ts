import { describe, expect, it } from "vitest";
import { CycleReview } from "./cycle-review";
import { TaskRuleViolation } from "./task-rule-violation";

const validInput = {
  cycleStart: "2026-11-22",
  worked: "Planejei na segunda",
  hindered: "Gastei demais no fim de semana",
  changeNext: "Planejar no máximo 7 pendências",
  savedOn: "2026-11-27",
};

describe("CycleReview.create (BR-H06)", () => {
  it("guarda as três respostas sem os espaços das pontas", () => {
    const review = CycleReview.create({ ...validInput, worked: "  Planejei na segunda  " });

    expect(review.toRecord()).toEqual(validInput);
  });

  it("aceita uma resposta só e grava as outras como traço", () => {
    const review = CycleReview.create({ ...validInput, hindered: "", changeNext: "   " });

    expect([review.worked, review.hindered, review.changeNext]).toEqual([
      "Planejei na segunda",
      "—",
      "—",
    ]);
  });

  it("recusa a revisão sem nenhuma resposta", () => {
    const build = () =>
      CycleReview.create({ ...validInput, worked: "", hindered: " ", changeNext: "" });

    expect(build).toThrow(new TaskRuleViolation("review-needs-an-answer"));
  });

  it("recusa um ciclo que não começa no domingo", () => {
    const build = () => CycleReview.create({ ...validInput, cycleStart: "2026-11-23" });

    expect(build).toThrow(new TaskRuleViolation("cycle-must-start-on-sunday"));
  });

  it("recusa um dia de gravação que não é uma data", () => {
    const build = () => CycleReview.create({ ...validInput, savedOn: "ontem" });

    expect(build).toThrow(new TaskRuleViolation("invalid-date"));
  });

  it("entrega o ciclo revisado", () => {
    expect(CycleReview.create(validInput).cycle.label).toBe("22 a 28 nov");
  });
});
