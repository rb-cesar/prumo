import { describe, expect, it } from "vitest";
import { Envelope } from "../../../shared/finance/domain/envelope";
import { Transaction } from "../../../shared/finance/domain/transaction";
import { Ledger } from "./ledger";

const today = "2026-11-13";
const month = "2026-11";

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
function income(id: string, amountInCents: number, date = today) {
  return Transaction.create({ id, kind: "income", amountInCents, date, description: id });
}
function saving(id: string, amountInCents: number, date = today) {
  return Transaction.create({ id, kind: "saving", amountInCents, date, description: id });
}

describe("Ledger: filtros encadeados", () => {
  const ledger = new Ledger([
    expense("a", "groceries", 10000),
    expense("b", "groceries", 5000, "2026-11-02"),
    expense("c", "leisure", 7000),
    expense("d", "groceries", 9000, "2026-10-30"),
    income("e", 99900),
  ]);

  it("soma tudo quando não há filtro", () => {
    expect(ledger.totalInCents()).toBe(10000 + 5000 + 7000 + 9000 + 99900);
  });

  it("encadeia mês, tipo e envelope", () => {
    expect(ledger.inMonth(month).ofKind("expense").ofEnvelope("groceries").totalInCents()).toBe(
      15000,
    );
  });

  it("não altera o original ao filtrar", () => {
    ledger.inMonth(month).ofKind("income");

    expect(ledger.totalInCents()).toBe(10000 + 5000 + 7000 + 9000 + 99900);
  });
});

describe("Ledger: gasto do envelope (BR-F04)", () => {
  it("soma só os gastos do envelope no mês", () => {
    const ledger = new Ledger([
      expense("a", "groceries", 10000),
      expense("b", "groceries", 5000, "2026-11-02"),
      expense("c", "leisure", 7000),
      expense("d", "groceries", 9000, "2026-10-30"),
      income("e", 99900),
    ]);

    expect(ledger.spentInEnvelope("groceries", month)).toBe(15000);
  });

  it("mostra quanto resta e a barra proporcional", () => {
    const view = new Ledger([expense("a", "groceries", 55000)]).toEnvelopeRowView(groceries, month);

    expect(view).toMatchObject({
      spentText: "R$ 550",
      budgetText: "R$ 1.100",
      fillRatio: 0.5,
      status: "ok",
      statusChip: { text: "Restam R$ 550,00", tone: null },
    });
  });

  it("avisa quando está perto do limite", () => {
    const view = new Ledger([expense("a", "groceries", 95000)]).toEnvelopeRowView(groceries, month);

    expect(view.statusChip).toEqual({ text: "Restam R$ 150,00", tone: "near" });
  });

  it("mostra o excesso, positivo, quando estoura, com a barra cheia", () => {
    const view = new Ledger([expense("a", "groceries", 113500)]).toEnvelopeRowView(
      groceries,
      month,
    );

    expect(view.statusChip).toEqual({ text: "Estourou R$ 35,00", tone: "neg" });
    expect(view.fillRatio).toBe(1);
  });

  it("gastar exatamente o valor deixa R$ 0,00 sem estouro", () => {
    const view = new Ledger([expense("a", "groceries", 110000)]).toEnvelopeRowView(
      groceries,
      month,
    );

    expect(view.statusChip).toEqual({ text: "Restam R$ 0,00", tone: "near" });
  });
});

describe("Ledger: totais e saldo (BR-F05)", () => {
  const ledger = new Ledger([
    income("salary", 620000, "2026-11-05"),
    expense("rent", "housing", 165000, "2026-11-05"),
    saving("reserve", 60000, "2026-11-06"),
    income("old-pay", 500000, "2026-10-05"),
    expense("old-rent", "housing", 165000, "2026-10-05"),
  ]);

  it("resume só o mês pedido, em reais inteiros", () => {
    expect(ledger.toMonthSummaryView(0, month)).toMatchObject({
      incomeText: "R$ 6.200",
      expenseText: "R$ 1.650",
      savedText: "R$ 600",
    });
  });

  it("calcula o saldo desde o início, sem reiniciar a cada mês", () => {
    expect(ledger.accountBalanceInCents(100000)).toBe(
      100000 + 620000 + 500000 - 165000 - 165000 - 60000,
    );
  });

  it("sem lançamentos, o saldo é o saldo inicial", () => {
    expect(new Ledger([]).accountBalanceInCents(420000)).toBe(420000);
  });

  it("mostra o saldo com centavos no resumo", () => {
    expect(new Ledger([]).toMonthSummaryView(420000, month).accountBalanceText).toBe("R$ 4.200,00");
  });
});

describe("Ledger: lista de lançamentos (BR-F09)", () => {
  const ledger = new Ledger([
    expense("old", "groceries", 1000, "2026-11-10"),
    income("pay", 50000, "2026-11-12"),
    expense("a", "leisure", 2000, "2026-11-12"),
    saving("goal", 30000, "2026-11-13"),
  ]);

  it("agrupa por dia, do mais novo para o mais antigo, com nome do dia", () => {
    const groups = ledger.groupedByDay(envelopes, today, null);

    expect(groups.map((group) => group.dayText)).toEqual(["Hoje", "Ontem", "ter, 10 nov"]);
    expect(groups[1]?.rows.map((row) => row.id)).toEqual(["pay", "a"]);
  });

  it("mostra a categoria e o sinal de cada tipo", () => {
    const rows = ledger.groupedByDay(envelopes, today, null).flatMap((group) => group.rows);

    expect(rows.map((row) => [row.categoryName, row.signedAmountText])).toEqual([
      ["Aporte em meta", "− R$ 300,00"],
      ["Receita", "+ R$ 500,00"],
      ["Lazer", "− R$ 20,00"],
      ["Mercado", "− R$ 10,00"],
    ]);
  });

  it("filtra por envelope", () => {
    const groups = ledger.groupedByDay(envelopes, today, "leisure");

    expect(groups.flatMap((group) => group.rows.map((row) => row.id))).toEqual(["a"]);
  });
});
