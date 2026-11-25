import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { createFakeTasksData, type TasksData } from "../../data/tasks";
import {
  createFakeTransactionsData,
  type FakeTransactionsSeed,
  type TransactionsData,
} from "../../data/transactions";
import { createFixedClock } from "../../infra/clock";
import { Envelope } from "../../shared/finance/domain/envelope";
import { Transaction } from "../../shared/finance/domain/transaction";
import { Task } from "../../shared/tasks/domain/task";
import { type MoneyModelDeps, useMoneyModel } from "./model";

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

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

function renderModel(transactions: TransactionsData, tasks: TasksData = createFakeTasksData()) {
  let nextId = 1;
  const deps: MoneyModelDeps = {
    tasks,
    transactions,
    clock: createFixedClock(today),
    generateId: () => `new-${nextId++}`,
  };
  return renderHook(() => useMoneyModel(deps), { wrapper: createWrapper() });
}

function fakeData(seed: FakeTransactionsSeed = {}) {
  return createFakeTransactionsData({ envelopes: [housing, groceries], ...seed });
}

function createFailingTransactionsData(): TransactionsData {
  const fail = async () => {
    throw new Error("banco indisponível");
  };
  return {
    listEnvelopes: fail,
    listTransactions: fail,
    saveTransaction: fail,
    removeTransaction: fail,
    removeTransactionsOfTask: fail,
    getOpeningBalanceInCents: fail,
    saveOpeningBalanceInCents: fail,
  };
}

const buyGroceries = Transaction.create({
  id: "tx-1",
  kind: "expense",
  amountInCents: 55000,
  date: today,
  description: "Supermercado",
  envelopeId: "groceries",
});

describe("useMoneyModel: os quatro estados", () => {
  it("começa carregando", async () => {
    const { result } = renderModel(fakeData());

    expect(result.current.state.status).toBe("loading");
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
  });

  it("mostra o erro quando os dados não carregam", async () => {
    const { result } = renderModel(createFailingTransactionsData());

    await waitFor(() => expect(result.current.state.status).toBe("error"));
  });

  it("mostra os envelopes, sem erro, mesmo sem nenhum lançamento", async () => {
    const { result } = renderModel(fakeData());

    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.state).toMatchObject({
      monthText: "Novembro de 2026",
      monthName: "novembro",
      dayGroups: [],
      payables: [],
      envelopes: [{ name: "Moradia" }, { name: "Mercado" }],
    });
  });

  it("mostra lançamentos, totais, saldo e pendências a pagar", async () => {
    const payInternet = Task.create({
      id: "bill",
      title: "Pagar a internet",
      money: { amountInCents: 11990, direction: "expense", envelopeId: null },
    });
    const { result } = renderModel(
      fakeData({ transactions: [buyGroceries], openingBalanceInCents: 420000 }),
      createFakeTasksData([payInternet]),
    );

    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.state).toMatchObject({
      summary: { expenseText: "R$ 550", accountBalanceText: "R$ 3.650,00" },
      needsOpeningBalance: false,
      dayGroups: [{ dayText: "Hoje", rows: [{ description: "Supermercado" }] }],
      payables: [{ title: "Pagar a internet", amountText: "R$ 119,90" }],
    });
  });
});

describe("useMoneyModel: ações", () => {
  it("registra um gasto com a data de hoje e o envelope escolhido", async () => {
    const data = fakeData();
    const { result } = renderModel(data);
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.actions.addTransaction({
        kind: "expense",
        amountText: "42,90",
        description: "Almoço",
        envelopeId: "groceries",
      });
    });

    expect(outcome).toEqual({ ok: true });
    expect((await data.listTransactions())[0]?.toRecord()).toEqual({
      id: "new-1",
      kind: "expense",
      amountInCents: 4290,
      date: today,
      description: "Almoço",
      envelopeId: "groceries",
      taskId: null,
      goalId: null,
    });
  });

  it("registra uma receita sem envelope, mesmo que um envelope esteja escolhido", async () => {
    const data = fakeData();
    const { result } = renderModel(data);
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    await act(async () => {
      await result.current.actions.addTransaction({
        kind: "income",
        amountText: "800",
        description: "Freela",
        envelopeId: "groceries",
      });
    });

    expect((await data.listTransactions())[0]?.envelopeId).toBeNull();
  });

  it("recusa gasto sem envelope escolhido", async () => {
    const { result } = renderModel(fakeData());
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.actions.addTransaction({
        kind: "expense",
        amountText: "10",
        description: "Café",
        envelopeId: "",
      });
    });

    expect(outcome).toEqual({ ok: false, reason: "expense-needs-envelope" });
  });

  it.each([
    ["abc", "amount-not-a-number"],
    ["0", "invalid-amount"],
  ])("recusa o valor %j", async (amountText, reason) => {
    const { result } = renderModel(fakeData());
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.actions.addTransaction({
        kind: "expense",
        amountText,
        description: "Café",
        envelopeId: "groceries",
      });
    });

    expect(outcome).toEqual({ ok: false, reason });
  });

  it("exclui um lançamento e o gasto do envelope volta a cair", async () => {
    const { result } = renderModel(fakeData({ transactions: [buyGroceries] }));
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    act(() => result.current.actions.removeTransaction("tx-1"));

    await waitFor(() =>
      expect(result.current.state).toMatchObject({
        dayGroups: [],
        envelopes: [{ name: "Moradia" }, { spentText: "R$ 0" }],
      }),
    );
  });

  it("filtra os lançamentos por envelope e limpa tocando de novo", async () => {
    const { result } = renderModel(fakeData({ transactions: [buyGroceries] }));
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    act(() => result.current.controls.toggleEnvelopeFilter("housing"));
    expect(result.current.state).toMatchObject({
      envelopeFilter: { id: "housing", name: "Moradia" },
      dayGroups: [],
    });

    act(() => result.current.controls.toggleEnvelopeFilter("housing"));
    expect(result.current.state).toMatchObject({ envelopeFilter: null });
  });

  it("pede o saldo inicial até ele ser informado, e aceita zero", async () => {
    const data = fakeData();
    const { result } = renderModel(data);
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.state).toMatchObject({ needsOpeningBalance: true });

    await act(async () => {
      await result.current.actions.saveOpeningBalance("0");
    });

    await waitFor(() => expect(result.current.state).toMatchObject({ needsOpeningBalance: false }));
    expect(await data.getOpeningBalanceInCents()).toBe(0);
  });

  it("recusa um saldo inicial que não é número", async () => {
    const { result } = renderModel(fakeData());
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.actions.saveOpeningBalance("abc");
    });

    expect(outcome).toEqual({ ok: false, reason: "amount-not-a-number" });
  });
});
