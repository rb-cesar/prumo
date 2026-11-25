import { describe, expect, it } from "vitest";
import { Envelope } from "../../../shared/finance/domain/envelope";
import { Transaction } from "../../../shared/finance/domain/transaction";
import { MonthlyHistory } from "./monthly-history";

const today = "2026-11-25";

function envelope(id: string, name: string, budgetInReais: number, isFixed = false) {
  return Envelope.fromRecord({ id, name, budgetInCents: budgetInReais * 100, isFixed });
}
const housing = envelope("housing", "Moradia", 2200, true);
const leisure = envelope("leisure", "Lazer", 400);
const groceries = envelope("groceries", "Mercado", 1100);
const envelopes = [housing, leisure, groceries];

let nextId = 0;
function income(date: string, reais: number) {
  return Transaction.create({
    id: `tx-${nextId++}`,
    kind: "income",
    amountInCents: reais * 100,
    date,
    description: "Salário",
  });
}
function expense(date: string, reais: number, envelopeId = "groceries") {
  return Transaction.create({
    id: `tx-${nextId++}`,
    kind: "expense",
    amountInCents: reais * 100,
    date,
    description: "Gasto",
    envelopeId,
  });
}
function saving(date: string, reais: number) {
  return Transaction.create({
    id: `tx-${nextId++}`,
    kind: "saving",
    amountInCents: reais * 100,
    date,
    description: "Aporte",
  });
}

describe("MonthlyHistory: meses (BR-H01)", () => {
  it("sem lançamentos, não há meses", () => {
    const history = new MonthlyHistory([], envelopes, today);

    expect(history.toRowViews()).toEqual([]);
    expect(history.partialMonthNote()).toBeNull();
    expect(history.insights()).toEqual([]);
  });

  it("soma o que entrou, saiu e foi guardado em cada mês, com a taxa de guardado", () => {
    const history = new MonthlyHistory(
      [
        income("2026-10-05", 7000),
        expense("2026-10-10", 5140),
        saving("2026-10-12", 500),
        income("2026-11-05", 6200),
        expense("2026-11-10", 3000),
        saving("2026-11-12", 1550),
      ],
      envelopes,
      today,
    );

    const [october, november] = history.toRowViews();

    expect(october).toMatchObject({
      label: "out",
      isPartial: false,
      incomeText: "R$ 7.000",
      expenseText: "R$ 5.140",
      savedText: "R$ 500",
      rateText: "7%",
    });
    expect(november).toMatchObject({ label: "nov", isPartial: true, rateText: "25%" });
  });

  it("começa no primeiro mês com lançamento e mostra no máximo os últimos 6", () => {
    const history = new MonthlyHistory(
      [income("2026-03-05", 100), income("2026-11-05", 100)],
      envelopes,
      today,
    );

    expect(history.toRowViews().map((row) => row.label)).toEqual([
      "jun",
      "jul",
      "ago",
      "set",
      "out",
      "nov",
    ]);
  });

  it("mostra com zeros o mês do meio que não teve lançamento", () => {
    const history = new MonthlyHistory(
      [income("2026-09-05", 100), income("2026-11-05", 100)],
      envelopes,
      today,
    );

    expect(history.toRowViews()[1]).toMatchObject({
      label: "out",
      incomeInCents: 0,
      rateText: "—",
    });
  });

  it("atravessa a virada do ano", () => {
    const history = new MonthlyHistory([income("2026-11-05", 100)], envelopes, "2027-02-10");

    expect(history.toRowViews().map((row) => row.month)).toEqual([
      "2026-11",
      "2026-12",
      "2027-01",
      "2027-02",
    ]);
  });

  it("avisa até que dia vai o mês atual", () => {
    const history = new MonthlyHistory([income("2026-11-05", 100)], envelopes, today);

    expect(history.partialMonthNote()).toBe("* Novembro até o dia 25.");
  });
});

describe("MonthlyHistory: insights (BR-H02)", () => {
  const closedMonths = [
    income("2026-08-05", 6900),
    saving("2026-08-10", 600),
    income("2026-09-05", 6200),
    saving("2026-09-10", 1000),
    income("2026-10-05", 7000),
    saving("2026-10-10", 500),
  ];

  it("só aparecem com pelo menos 2 meses fechados com entrada", () => {
    const oneClosedMonth = [income("2026-10-05", 7000), income("2026-11-05", 6200)];

    expect(new MonthlyHistory(oneClosedMonth, envelopes, today).insights()).toEqual([]);
  });

  it("diz quanto da renda se guarda em média e qual foi o pior mês", () => {
    const [insight] = new MonthlyHistory(closedMonths, envelopes, today).insights();

    expect(insight).toEqual({
      tone: "steel",
      title: "Você guarda 11% da renda",
      text: "Média dos últimos 3 meses fechados. O pior foi out, com 7%.",
    });
  });

  it("aponta o envelope do dia a dia que passou do limite em 3 ou mais meses", () => {
    const overspending = [
      expense("2026-08-12", 450, "leisure"),
      expense("2026-09-12", 520, "leisure"),
      expense("2026-10-12", 610, "leisure"),
      expense("2026-10-13", 500, "groceries"),
    ];

    const insights = new MonthlyHistory(
      [...closedMonths, ...overspending],
      envelopes,
      today,
    ).insights();

    expect(insights[1]).toEqual({
      tone: "near",
      title: "Lazer passou do limite em 3 de 4 meses",
      text: "O limite é R$ 400. Vale subir o limite ou rever esses gastos, em vez de estourar de novo.",
    });
  });

  it("não aponta envelope que estourou em menos de 3 meses nem envelope fixo", () => {
    const overspending = [
      expense("2026-08-12", 450, "leisure"),
      expense("2026-09-12", 520, "leisure"),
      expense("2026-08-01", 3000, "housing"),
      expense("2026-09-01", 3000, "housing"),
      expense("2026-10-01", 3000, "housing"),
    ];

    const insights = new MonthlyHistory(
      [...closedMonths, ...overspending],
      envelopes,
      today,
    ).insights();

    expect(insights).toHaveLength(1);
  });
});
