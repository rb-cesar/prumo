import { describe, expect, it } from "vitest";
import { Envelope } from "./envelope";
import { FinanceRuleViolation } from "./finance-rule-violation";

const groceries = Envelope.fromRecord({
  id: "groceries",
  name: "Mercado",
  budgetInCents: 110000,
  isFixed: false,
});

describe("Envelope: criação", () => {
  it("guarda o nome sem espaços nas pontas", () => {
    const envelope = Envelope.fromRecord({ ...groceries.toRecord(), name: "  Mercado  " });

    expect(envelope.name).toBe("Mercado");
  });

  it("recusa envelope sem nome", () => {
    const build = () => Envelope.fromRecord({ ...groceries.toRecord(), name: "   " });

    expect(build).toThrow(new FinanceRuleViolation("name-required"));
  });

  it.each([0, -100, 10.5])("recusa valor mensal %s", (budgetInCents) => {
    const build = () => Envelope.fromRecord({ ...groceries.toRecord(), budgetInCents });

    expect(build).toThrow(new FinanceRuleViolation("invalid-amount"));
  });

  it("devolve o mesmo registro que recebeu", () => {
    expect(groceries.toRecord()).toEqual({
      id: "groceries",
      name: "Mercado",
      budgetInCents: 110000,
      isFixed: false,
    });
  });
});

describe("Envelope: situação (BR-F04)", () => {
  it("está ok bem abaixo do limite", () => {
    expect(groceries.statusAfterSpending(50000)).toBe("ok");
  });

  it("fica perto do limite a partir de 85% do valor", () => {
    expect(groceries.statusAfterSpending(93499)).toBe("ok");
    expect(groceries.statusAfterSpending(93500)).toBe("near-limit");
  });

  it("gastar exatamente o valor é perto do limite, não estouro", () => {
    expect(groceries.statusAfterSpending(110000)).toBe("near-limit");
    expect(groceries.remainingAfterSpending(110000)).toBe(0);
  });

  it("estoura só quando passa do valor, e o restante fica negativo", () => {
    expect(groceries.statusAfterSpending(110001)).toBe("over-budget");
    expect(groceries.remainingAfterSpending(113500)).toBe(-3500);
  });

  it("calcula o que ainda cabe", () => {
    expect(groceries.remainingAfterSpending(40000)).toBe(70000);
  });
});
