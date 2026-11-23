import { describe, expect, it } from "vitest";
import { Envelope } from "../../shared/finance/domain/envelope";
import { Transaction } from "../../shared/finance/domain/transaction";
import { Task } from "../../shared/tasks/domain/task";
import {
  accountBalanceInCents,
  describeMonth,
  everydayAllowance,
  formatMoneyFromCents,
  groupTransactionsByDay,
  monthlyTotals,
  parseMoneyToCents,
  spentInEnvelope,
  toEnvelopeRowView,
  toPayableRowViews,
} from "./domain";

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

describe("dinheiro", () => {
  it("formata centavos em reais", () => {
    expect(formatMoneyFromCents(123456)).toBe("R$ 1.234,56");
    expect(formatMoneyFromCents(5)).toBe("R$ 0,05");
    expect(formatMoneyFromCents(0)).toBe("R$ 0,00");
  });

  it("formata valor negativo com sinal na frente", () => {
    expect(formatMoneyFromCents(-1200)).toBe("−R$ 12,00");
  });

  it.each([
    ["45,90", 4590],
    ["1.200", 120000],
    ["120.5", 12050],
    ["R$ 3,50", 350],
    ["0", 0],
  ])("lê %s como %s centavos", (text, expected) => {
    expect(parseMoneyToCents(text)).toBe(expected);
  });

  it.each(["", "abc"])("não lê %j como valor", (text) => {
    expect(parseMoneyToCents(text)).toBeNull();
  });
});

describe("gasto do envelope (BR-F04)", () => {
  it("soma só os gastos do envelope no mês", () => {
    const transactions = [
      expense("a", "groceries", 10000),
      expense("b", "groceries", 5000, "2026-11-02"),
      expense("c", "leisure", 7000),
      expense("d", "groceries", 9000, "2026-10-30"),
      income("e", 99900),
    ];

    expect(spentInEnvelope(transactions, "groceries", month)).toBe(15000);
  });

  it("mostra quanto resta e a barra proporcional", () => {
    const view = toEnvelopeRowView(groceries, [expense("a", "groceries", 55000)], month);

    expect(view).toMatchObject({
      spentText: "R$ 550,00",
      budgetText: "R$ 1.100,00",
      fillRatio: 0.5,
      status: "ok",
      statusChip: { text: "Restam R$ 550,00", tone: null },
    });
  });

  it("avisa quando está perto do limite", () => {
    const view = toEnvelopeRowView(groceries, [expense("a", "groceries", 95000)], month);

    expect(view.statusChip).toEqual({ text: "Restam R$ 150,00", tone: "near" });
  });

  it("mostra o excesso, positivo, quando estoura, com a barra cheia", () => {
    const view = toEnvelopeRowView(groceries, [expense("a", "groceries", 113500)], month);

    expect(view.statusChip).toEqual({ text: "Estourou R$ 35,00", tone: "neg" });
    expect(view.fillRatio).toBe(1);
  });

  it("gastar exatamente o valor deixa R$ 0,00 sem estouro", () => {
    const view = toEnvelopeRowView(groceries, [expense("a", "groceries", 110000)], month);

    expect(view.statusChip).toEqual({ text: "Restam R$ 0,00", tone: "near" });
  });
});

describe("totais e saldo (BR-F05)", () => {
  const transactions = [
    income("salary", 620000, "2026-11-05"),
    expense("rent", "housing", 165000, "2026-11-05"),
    saving("reserve", 60000, "2026-11-06"),
    income("old-pay", 500000, "2026-10-05"),
    expense("old-rent", "housing", 165000, "2026-10-05"),
  ];

  it("totaliza só o mês pedido", () => {
    expect(monthlyTotals(transactions, month)).toEqual({
      incomeInCents: 620000,
      expenseInCents: 165000,
      savedInCents: 60000,
    });
  });

  it("calcula o saldo desde o início, sem reiniciar a cada mês", () => {
    expect(accountBalanceInCents(100000, transactions)).toBe(
      100000 + 620000 + 500000 - 165000 - 165000 - 60000,
    );
  });

  it("sem lançamentos, o saldo é o saldo inicial", () => {
    expect(accountBalanceInCents(420000, [])).toBe(420000);
  });
});

describe("pode gastar hoje (BR-F06 a BR-F08)", () => {
  it("divide o restante do dia a dia pelos dias que faltam, contando hoje", () => {
    const allowance = everydayAllowance(envelopes, [expense("a", "groceries", 10000)], today);

    expect(allowance).toMatchObject({
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

    expect(everydayAllowance(only, [], "2026-11-28").allowancePerDayInCents).toBe(3333);
  });

  it("dá zero quando sobra menos de um centavo por dia", () => {
    const only = [Envelope.fromRecord({ ...groceries.toRecord(), budgetInCents: 1 })];

    expect(everydayAllowance(only, [], "2026-11-26").allowancePerDayInCents).toBe(0);
  });

  it("no último dia do mês, divide por 1", () => {
    const allowance = everydayAllowance(envelopes, [], "2026-11-30");

    expect(allowance.daysLeftInMonth).toBe(1);
    expect(allowance.allowancePerDayInCents).toBe(150000);
  });

  it.each([
    ["2027-02-01", 28],
    ["2028-02-01", 29],
    ["2027-02-28", 1],
  ])("usa os dias reais do mês em %s", (date, daysLeft) => {
    expect(everydayAllowance(envelopes, [], date).daysLeftInMonth).toBe(daysLeft);
  });

  it("não deixa o dia a dia estourado prometer dinheiro: dá zero e sem folga", () => {
    const allowance = everydayAllowance(envelopes, [expense("a", "groceries", 160000)], today);

    expect(allowance).toMatchObject({
      remainingInCents: -10000,
      hasRoomToSpend: false,
      allowancePerDayInCents: 0,
    });
  });

  it("um envelope estourado reduz o que sobra nos outros", () => {
    const withoutOverspending = everydayAllowance(envelopes, [], today);
    const withOverspending = everydayAllowance(
      envelopes,
      [expense("a", "groceries", 120000)],
      today,
    );

    expect(withOverspending.remainingInCents).toBe(withoutOverspending.remainingInCents - 120000);
  });

  it("restante exatamente zero também não tem folga", () => {
    const allowance = everydayAllowance(envelopes, [expense("a", "groceries", 150000)], today);

    expect(allowance).toMatchObject({
      remainingInCents: 0,
      hasRoomToSpend: false,
      allowancePerDayInCents: 0,
    });
  });

  it("gasto em envelope fixo não muda o valor", () => {
    const allowance = everydayAllowance(envelopes, [expense("rent", "housing", 165000)], today);

    expect(allowance.remainingInCents).toBe(150000);
  });

  it("gasto de outro mês não conta", () => {
    const allowance = everydayAllowance(
      envelopes,
      [expense("a", "groceries", 90000, "2026-10-31")],
      today,
    );

    expect(allowance.spentInCents).toBe(0);
  });

  it("sem envelope do dia a dia, o valor é zero", () => {
    expect(everydayAllowance([housing], [], today)).toMatchObject({
      hasRoomToSpend: false,
      allowancePerDayInCents: 0,
    });
  });
});

describe("lista de lançamentos (BR-F09)", () => {
  const transactions = [
    expense("old", "groceries", 1000, "2026-11-10"),
    income("pay", 50000, "2026-11-12"),
    expense("a", "leisure", 2000, "2026-11-12"),
    saving("goal", 30000, "2026-11-13"),
  ];

  it("agrupa por dia, do mais novo para o mais antigo, com nome do dia", () => {
    const groups = groupTransactionsByDay(transactions, envelopes, today, null);

    expect(groups.map((group) => group.dayText)).toEqual(["Hoje", "Ontem", "ter, 10 nov"]);
    expect(groups[1]?.rows.map((row) => row.id)).toEqual(["pay", "a"]);
  });

  it("mostra a categoria e o sinal de cada tipo", () => {
    const rows = groupTransactionsByDay(transactions, envelopes, today, null).flatMap(
      (group) => group.rows,
    );

    expect(rows.map((row) => [row.categoryName, row.signedAmountText])).toEqual([
      ["Aporte em meta", "− R$ 300,00"],
      ["Receita", "+ R$ 500,00"],
      ["Lazer", "− R$ 20,00"],
      ["Mercado", "− R$ 10,00"],
    ]);
  });

  it("filtra por envelope", () => {
    const groups = groupTransactionsByDay(transactions, envelopes, today, "leisure");

    expect(groups.flatMap((group) => group.rows.map((row) => row.id))).toEqual(["a"]);
  });
});

describe("a pagar e a receber (BR-F10)", () => {
  it("lista as abertas com valor, por prazo, sem prazo por último", () => {
    const noDate = Task.create({
      id: "no-date",
      title: "Sem data",
      money: { amountInCents: 1000, direction: "expense", envelopeId: null },
    });
    const soon = Task.create({
      id: "soon",
      title: "Luz",
      dueDate: "2026-11-15",
      money: { amountInCents: 18740, direction: "expense", envelopeId: null },
    });
    const receivable = Task.create({
      id: "receive",
      title: "Freela",
      dueDate: "2026-11-14",
      money: { amountInCents: 80000, direction: "income", envelopeId: null },
    });
    const withoutMoney = Task.create({ id: "plain", title: "Ligar" });
    const doneOne = Task.create({
      id: "done",
      title: "Paga",
      money: { amountInCents: 500, direction: "expense", envelopeId: null },
    }).toggleDone(today);

    const rows = toPayableRowViews([noDate, soon, receivable, withoutMoney, doneOne], today);

    expect(rows.map((row) => [row.id, row.dayText, row.amountText])).toEqual([
      ["receive", "Amanhã", "R$ 800,00"],
      ["soon", "dom, 15 nov", "R$ 187,40"],
      ["no-date", "Sem prazo", "R$ 10,00"],
    ]);
  });
});

describe("mês", () => {
  it("descreve o mês por extenso", () => {
    expect(describeMonth("2026-11-13")).toBe("novembro de 2026");
  });
});
