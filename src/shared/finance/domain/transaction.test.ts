import { describe, expect, it } from "vitest";
import { FinanceRuleViolation } from "./finance-rule-violation";
import { Transaction } from "./transaction";

const buyGroceries = {
  id: "tx-1",
  kind: "expense",
  amountInCents: 14160,
  date: "2026-11-12",
  description: "Mercado do bairro",
  envelopeId: "groceries",
} as const;

describe("Transaction: criação (BR-F03)", () => {
  it("cria um gasto com envelope", () => {
    const transaction = Transaction.create(buyGroceries);

    expect(transaction.toRecord()).toEqual({ ...buyGroceries, taskId: null, goalId: null });
  });

  it("guarda de qual meta o aporte é", () => {
    const transaction = Transaction.create({
      id: "tx-9",
      kind: "saving",
      amountInCents: 10000,
      date: "2026-11-12",
      description: "Aporte: Viagem",
      goalId: "trip",
    });

    expect(transaction.goalId).toBe("trip");
  });

  it.each(["expense", "income"] as const)("recusa meta em %s", (kind) => {
    const build = () =>
      Transaction.create({
        ...buyGroceries,
        kind,
        envelopeId: kind === "expense" ? "groceries" : null,
        goalId: "trip",
      });

    expect(build).toThrow(new FinanceRuleViolation("goal-only-for-saving"));
  });

  it("guarda de qual pendência o lançamento veio", () => {
    const transaction = Transaction.create({ ...buyGroceries, taskId: "task-1" });

    expect(transaction.taskId).toBe("task-1");
  });

  it("cria uma entrada sem envelope", () => {
    const transaction = Transaction.create({
      id: "tx-2",
      kind: "income",
      amountInCents: 620000,
      date: "2026-11-05",
      description: "Salário",
    });

    expect(transaction.envelopeId).toBeNull();
  });

  it("cria um aporte sem envelope", () => {
    const transaction = Transaction.create({
      id: "tx-3",
      kind: "saving",
      amountInCents: 60000,
      date: "2026-11-06",
      description: "Aporte: Reserva",
    });

    expect(transaction.kind).toBe("saving");
  });

  it("guarda a descrição sem espaços nas pontas", () => {
    const transaction = Transaction.create({ ...buyGroceries, description: "  Padaria " });

    expect(transaction.description).toBe("Padaria");
  });

  it("recusa lançamento sem descrição", () => {
    const build = () => Transaction.create({ ...buyGroceries, description: "  " });

    expect(build).toThrow(new FinanceRuleViolation("description-required"));
  });

  it.each([0, -1, 12.5])("recusa o valor %s", (amountInCents) => {
    const build = () => Transaction.create({ ...buyGroceries, amountInCents });

    expect(build).toThrow(new FinanceRuleViolation("invalid-amount"));
  });

  it("recusa data que não existe", () => {
    const build = () => Transaction.create({ ...buyGroceries, date: "2026-02-30" });

    expect(build).toThrow(new FinanceRuleViolation("invalid-date"));
  });

  it("recusa gasto sem envelope", () => {
    const build = () => Transaction.create({ ...buyGroceries, envelopeId: null });

    expect(build).toThrow(new FinanceRuleViolation("expense-needs-envelope"));
  });

  it.each(["income", "saving"] as const)("recusa envelope em %s", (kind) => {
    const build = () => Transaction.create({ ...buyGroceries, kind });

    expect(build).toThrow(new FinanceRuleViolation("envelope-only-for-expense"));
  });
});
