import { describe, expect, it } from "vitest";
import { Envelope } from "../../../shared/finance/domain/envelope";
import { Transaction } from "../../../shared/finance/domain/transaction";
import { EverydayBudget } from "./everyday-budget";
import { Ledger } from "./ledger";

const today = "2026-11-13";

const housing = Envelope.fromRecord({
  id: "housing",
  name: "Moradia",
  budgetInCents: 220000,
  isFixed: true,
});
const groceries = Envelope.fromRecord({
  id: "groceries",
  name: "Mercado",
  budgetInCents: 110000,
  isFixed: false,
});
const leisure = Envelope.fromRecord({
  id: "leisure",
  name: "Lazer",
  budgetInCents: 40000,
  isFixed: false,
});
const envelopes = [housing, groceries, leisure];

function expense(id: string, envelopeId: string, amountInCents: number, date = today) {
  return Transaction.create({
    id,
    kind: "expense",
    amountInCents,
    date,
    description: id,
    envelopeId,
  });
}

function budgetOf(
  transactions: Transaction[] = [],
  givenEnvelopes: Envelope[] = envelopes,
  onDay = today,
) {
  return new EverydayBudget(givenEnvelopes, new Ledger(transactions), onDay);
}

describe("EverydayBudget: pode gastar hoje (BR-F06 a BR-F08)", () => {
  it("divide o restante do dia a dia pelos dias que faltam, contando hoje", () => {
    const budget = budgetOf([expense("a", "groceries", 10000)]);

    expect(budget).toMatchObject({
      budgetInCents: 150000,
      spentInCents: 10000,
      remainingInCents: 140000,
      daysLeftInMonth: 18,
      hasRoomToSpend: true,
      allowancePerDayInCents: 7777,
    });
  });

  it("arredonda para baixo, em centavos", () => {
    const only = [Envelope.fromRecord({ ...groceries.toRecord(), budgetInCents: 10000 })];

    expect(budgetOf([], only, "2026-11-28").allowancePerDayInCents).toBe(3333);
  });

  it("dá zero quando sobra menos de um centavo por dia", () => {
    const only = [Envelope.fromRecord({ ...groceries.toRecord(), budgetInCents: 1 })];

    expect(budgetOf([], only, "2026-11-26").allowancePerDayInCents).toBe(0);
  });

  it("no último dia do mês, divide por 1", () => {
    const budget = budgetOf([], envelopes, "2026-11-30");

    expect(budget.daysLeftInMonth).toBe(1);
    expect(budget.allowancePerDayInCents).toBe(150000);
  });

  it.each([
    ["2027-02-01", 28],
    ["2028-02-01", 29],
    ["2027-02-28", 1],
  ])("usa os dias reais do mês em %s", (date, daysLeft) => {
    expect(budgetOf([], envelopes, date).daysLeftInMonth).toBe(daysLeft);
  });

  it("não deixa o dia a dia estourado prometer dinheiro: dá zero e sem folga", () => {
    const budget = budgetOf([expense("a", "groceries", 160000)]);

    expect(budget).toMatchObject({
      remainingInCents: -10000,
      hasRoomToSpend: false,
      allowancePerDayInCents: 0,
    });
  });

  it("um envelope estourado reduz o que sobra nos outros", () => {
    const untouched = budgetOf();
    const overspent = budgetOf([expense("a", "groceries", 120000)]);

    expect(overspent.remainingInCents).toBe(untouched.remainingInCents - 120000);
  });

  it("restante exatamente zero também não tem folga", () => {
    const budget = budgetOf([expense("a", "groceries", 150000)]);

    expect(budget).toMatchObject({
      remainingInCents: 0,
      hasRoomToSpend: false,
      allowancePerDayInCents: 0,
    });
  });

  it("gasto em envelope fixo não muda o valor", () => {
    const budget = budgetOf([expense("rent", "housing", 165000)]);

    expect(budget.remainingInCents).toBe(150000);
  });

  it("gasto de outro mês não conta", () => {
    const budget = budgetOf([expense("a", "groceries", 90000, "2026-10-31")]);

    expect(budget.spentInCents).toBe(0);
  });

  it("sem envelope do dia a dia, o valor é zero", () => {
    expect(budgetOf([], [housing])).toMatchObject({
      hasRoomToSpend: false,
      allowancePerDayInCents: 0,
    });
  });
});
