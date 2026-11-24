import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { createFakeTasksData, type TasksData } from "../../data/tasks";
import { createFakeTransactionsData } from "../../data/transactions";
import { createFixedClock } from "../../infra/clock";
import { Cycle } from "../../shared/tasks/domain/cycle";
import { Task } from "../../shared/tasks/domain/task";
import { type TasksModelDeps, useTasksModel } from "./model";

const today = "2026-11-13";
const currentCycle = Cycle.containing(today);

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

function createDeps(tasks: TasksData): TasksModelDeps {
  let nextId = 1;
  return {
    tasks,
    transactions: createFakeTransactionsData(),
    clock: createFixedClock(today),
    generateId: () => `new-${nextId++}`,
  };
}

function renderModel(tasks: TasksData) {
  return renderHook(() => useTasksModel(createDeps(tasks)), { wrapper: createWrapper() });
}

function createFailingTasksData(): TasksData {
  const fail = async () => {
    throw new Error("banco indisponível");
  };
  return { list: fail, save: fail, remove: fail };
}

const emptyForm = {
  title: "Pagar a internet",
  dueDate: "",
  priority: "medium",
  placement: "cycle",
  amountText: "",
  direction: "expense",
} as const;

describe("useTasksModel", () => {
  it("começa carregando e depois mostra as pendências do ciclo", async () => {
    const tasks = createFakeTasksData([
      Task.create({ id: "a", title: "Pagar conta de luz", cycle: currentCycle }),
    ]);

    const { result } = renderModel(tasks);

    expect(result.current.state.status).toBe("loading");
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.state).toMatchObject({
      status: "ready",
      cycleLabel: "8 a 14 nov",
      rows: [{ title: "Pagar conta de luz" }],
    });
  });

  it("mostra o erro quando a lista não carrega", async () => {
    const { result } = renderModel(createFailingTasksData());

    await waitFor(() => expect(result.current.state.status).toBe("error"));
  });

  it("mostra a lista vazia, sem erro, quando não há pendências", async () => {
    const { result } = renderModel(createFakeTasksData());

    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.state).toMatchObject({ rows: [], counts: { cycle: 0, backlog: 0 } });
  });

  it("devolve ao backlog, na carga, o que sobrou de um ciclo que acabou", async () => {
    const lastWeek = Cycle.containing("2026-11-03");
    const leftover = Task.create({ id: "old", title: "Sobrou", cycle: lastWeek }).moveToStage(
      "doing",
      "2026-11-03",
    );
    const tasks = createFakeTasksData([leftover]);

    const { result } = renderModel(tasks);

    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.state).toMatchObject({ counts: { cycle: 0, backlog: 1 } });
    expect((await tasks.list())[0]?.isInBacklog).toBe(true);
  });

  it("conclui a pendência ao tocar no círculo", async () => {
    const tasks = createFakeTasksData([
      Task.create({ id: "a", title: "Pagar", cycle: currentCycle }),
    ]);
    const { result } = renderModel(tasks);
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    act(() => result.current.actions.toggleDone("a"));

    await waitFor(() =>
      expect(result.current.state).toMatchObject({ counts: { todo: 0, done: 1 } }),
    );
  });

  it("puxa uma pendência do backlog para o ciclo", async () => {
    const tasks = createFakeTasksData([Task.create({ id: "a", title: "Pagar" })]);
    const { result } = renderModel(tasks);
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    act(() => result.current.actions.pullToCycle("a"));

    await waitFor(() =>
      expect(result.current.state).toMatchObject({ counts: { cycle: 1, backlog: 0 } }),
    );
  });

  it("cria uma pendência no ciclo com valor a pagar", async () => {
    const tasks = createFakeTasksData();
    const { result } = renderModel(tasks);
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.actions.create({ ...emptyForm, amountText: "119,90" });
    });

    expect(outcome).toEqual({ ok: true });
    expect((await tasks.list())[0]?.money?.amountInCents).toBe(11990);
  });

  it("recusa criar sem título e avisa o motivo", async () => {
    const { result } = renderModel(createFakeTasksData());
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.actions.create({ ...emptyForm, title: "   " });
    });

    expect(outcome).toEqual({ ok: false, reason: "title-required" });
  });

  it("recusa criar com um valor que não é número", async () => {
    const { result } = renderModel(createFakeTasksData());
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.actions.create({ ...emptyForm, amountText: "abc" });
    });

    expect(outcome).toEqual({ ok: false, reason: "amount-not-a-number" });
  });
});
