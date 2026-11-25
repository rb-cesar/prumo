import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { createFakeTasksData, type TasksData } from "../../data/tasks";
import { createFakeTransactionsData, type TransactionsData } from "../../data/transactions";
import { createFixedClock } from "../../infra/clock";
import { Envelope } from "../../shared/finance/domain/envelope";
import { Transaction } from "../../shared/finance/domain/transaction";
import { Cycle } from "../../shared/tasks/domain/cycle";
import { Task } from "../../shared/tasks/domain/task";
import { type TodayModelDeps, useTodayModel } from "./model";

const today = "2026-11-13";
const currentCycle = Cycle.containing(today);

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

function renderModel(tasks: TasksData, transactions: TransactionsData = fakeFinance()) {
  const deps: TodayModelDeps = {
    tasks,
    transactions,
    clock: createFixedClock(today),
    generateId: () => "new-id",
  };
  return renderHook(() => useTodayModel(deps), { wrapper: createWrapper() });
}

function fakeFinance(seed: Parameters<typeof createFakeTransactionsData>[0] = {}) {
  return createFakeTransactionsData({ envelopes: [groceries], ...seed });
}

function createFailingTasksData(): TasksData {
  const fail = async () => {
    throw new Error("banco indisponível");
  };
  return { list: fail, save: fail, remove: fail };
}

const buyGroceries = Transaction.create({
  id: "tx-1",
  kind: "expense",
  amountInCents: 10000,
  date: today,
  description: "Mercado",
  envelopeId: "groceries",
});
const saveForTrip = Transaction.create({
  id: "tx-2",
  kind: "saving",
  amountInCents: 60000,
  date: today,
  description: "Aporte",
});

describe("useTodayModel: os três estados", () => {
  it("começa carregando e depois mostra o dia", async () => {
    const { result } = renderModel(createFakeTasksData());

    expect(result.current.state.status).toBe("loading");
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.state).toMatchObject({ dateText: "13 de novembro" });
  });

  it("mostra o erro quando os dados não carregam", async () => {
    const { result } = renderModel(createFailingTasksData());

    await waitFor(() => expect(result.current.state.status).toBe("error"));
  });

  it("mostra o dia vazio, sem erro, quando não há pendências nem lançamentos", async () => {
    const { result } = renderModel(createFakeTasksData());

    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.state).toMatchObject({
      focusRows: [],
      upcomingRows: [],
      cycle: { summaryText: "0 de 0" },
    });
  });
});

describe("useTodayModel: o que mostra", () => {
  it("junta o pode gastar hoje, os números, a agenda e o ciclo", async () => {
    const dueToday = Task.create({
      id: "bill",
      title: "Pagar a internet",
      dueDate: today,
      cycle: currentCycle,
      money: { amountInCents: 11990, direction: "expense", envelopeId: null },
    });
    const dueSoon = Task.create({ id: "later", title: "Dentista", dueDate: "2026-11-15" });
    const finance = fakeFinance({
      transactions: [buyGroceries, saveForTrip],
      openingBalanceInCents: 420000,
    });

    const { result } = renderModel(createFakeTasksData([dueToday, dueSoon]), finance);

    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.state).toMatchObject({
      hero: { allowanceText: "R$ 55,55" },
      stats: {
        accountBalanceText: "R$ 3.500",
        dueSoonText: "R$ 120",
        savedText: "R$ 600",
      },
      focusRows: [{ title: "Pagar a internet" }],
      upcomingRows: [{ title: "Dentista", dayText: "dom, 15 nov" }],
      cycle: { cycleLabel: "8 a 14 nov", summaryText: "0 de 1" },
    });
  });

  it("sem saldo inicial, não inventa saldo em conta", async () => {
    const { result } = renderModel(createFakeTasksData());

    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.state).toMatchObject({ stats: { accountBalanceText: "—" } });
  });

  it("trata como backlog o que sobrou de um ciclo que acabou, sem gravar", async () => {
    const lastWeek = Cycle.containing("2026-11-03");
    const leftover = Task.create({
      id: "old",
      title: "Sobrou",
      cycle: lastWeek,
    }).moveToStage("doing", "2026-11-03");
    const tasks = createFakeTasksData([leftover]);

    const { result } = renderModel(tasks);

    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.state).toMatchObject({ focusRows: [] });
    expect((await tasks.list())[0]?.isInBacklog).toBe(false);
  });
});

describe("useTodayModel: concluir", () => {
  it("concluir uma pendência sem valor tira da lista e conta no ciclo", async () => {
    const task = Task.create({ id: "a", title: "Ligar", dueDate: today, cycle: currentCycle });
    const { result } = renderModel(createFakeTasksData([task]));
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    act(() => result.current.actions.completeTask("a"));

    await waitFor(() =>
      expect(result.current.state).toMatchObject({
        focusRows: [],
        cycle: { summaryText: "1 de 1" },
      }),
    );
  });

  it("concluir uma pendência com valor abre a pergunta de lançar antes", async () => {
    const task = Task.create({
      id: "bill",
      title: "Pagar",
      dueDate: today,
      cycle: currentCycle,
      money: { amountInCents: 5000, direction: "expense", envelopeId: "groceries" },
    });
    const { result } = renderModel(createFakeTasksData([task]));
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    act(() => result.current.actions.completeTask("bill"));

    await waitFor(() => expect(result.current.completion.pending).not.toBeNull());
    expect(result.current.state).toMatchObject({ focusRows: [{ title: "Pagar" }] });
  });
});
