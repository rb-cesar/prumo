import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { createFakeCyclesData } from "../../data/cycles";
import { createFakeTasksData, type TasksData } from "../../data/tasks";
import { createFakeTransactionsData } from "../../data/transactions";
import { createFixedClock } from "../../infra/clock";
import { Envelope } from "../../shared/finance/domain/envelope";
import { Transaction } from "../../shared/finance/domain/transaction";
import { Cycle } from "../../shared/tasks/domain/cycle";
import { CycleReview } from "../../shared/tasks/domain/cycle-review";
import { Task } from "../../shared/tasks/domain/task";
import { type HistoryModelDeps, useHistoryModel } from "./model";

const today = "2026-11-25";
const currentCycle = Cycle.containing(today);
const lastWeek = Cycle.containing("2026-11-18");

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

function renderModel({
  tasks = createFakeTasksData(),
  cycles = createFakeCyclesData(),
  transactions = [] as Transaction[],
}: {
  tasks?: TasksData;
  cycles?: ReturnType<typeof createFakeCyclesData>;
  transactions?: Transaction[];
} = {}) {
  const deps: HistoryModelDeps = {
    cycles,
    tasks,
    transactions: createFakeTransactionsData({ envelopes: [groceries], transactions }),
    clock: createFixedClock(today),
  };
  return renderHook(() => useHistoryModel(deps), { wrapper: createWrapper() });
}

function createFailingTasksData(): TasksData {
  const fail = async () => {
    throw new Error("banco indisponível");
  };
  return { list: fail, save: fail, remove: fail };
}

function groceriesSpending(id: string, date: string) {
  return Transaction.create({
    id,
    kind: "expense",
    amountInCents: 5000,
    date,
    description: "Mercado",
    envelopeId: "groceries",
  });
}

describe("useHistoryModel: os três estados", () => {
  it("começa carregando e depois abre na visão Meses", async () => {
    const { result } = renderModel();

    expect(result.current.state.status).toBe("loading");
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.state).toMatchObject({ view: "months" });
  });

  it("mostra o erro quando os dados não carregam", async () => {
    const { result } = renderModel({ tasks: createFailingTasksData() });

    await waitFor(() => expect(result.current.state.status).toBe("error"));
  });

  it("histórico vazio: sem meses, só o ciclo de hoje, sem cronologia", async () => {
    const { result } = renderModel();

    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.state).toMatchObject({
      months: { rows: [], insights: [] },
      cycles: { rows: [{ isCurrent: true, doneText: "0/0" }], reviews: [] },
      timeline: { groups: [], hasMore: false },
    });
  });
});

describe("useHistoryModel: o que mostra", () => {
  it("anota o fechamento do ciclo que acabou e o mostra na lista de ciclos", async () => {
    const tasks = createFakeTasksData([
      Task.create({ id: "a", title: "A", cycle: lastWeek }).moveToStage("done", "2026-11-19"),
      Task.create({ id: "b", title: "B", cycle: lastWeek }),
    ]);

    const { result } = renderModel({ tasks });

    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.state).toMatchObject({
      cycles: {
        rows: [
          { isCurrent: true },
          { title: "Ciclo 15 a 21 nov", doneText: "1/2", isCurrent: false },
        ],
      },
    });
  });

  it("junta os meses, as revisões e a cronologia", async () => {
    const review = CycleReview.create({
      cycleStart: currentCycle.start,
      worked: "Planejei",
      hindered: "",
      changeNext: "",
      savedOn: today,
    });
    const { result } = renderModel({
      cycles: createFakeCyclesData({ reviews: [review] }),
      transactions: [groceriesSpending("tx-1", "2026-11-20")],
    });

    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.state).toMatchObject({
      months: {
        rows: [{ label: "nov", expenseText: "R$ 50" }],
        partialNote: "* Novembro até o dia 25.",
      },
      cycles: { reviews: [{ title: "Revisão do ciclo 22 a 28 nov · hoje" }] },
      timeline: { groups: [{ dayText: "sex, 20 nov" }] },
    });
  });
});

describe("useHistoryModel: controles", () => {
  it("troca a visão", async () => {
    const { result } = renderModel();
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    act(() => result.current.controls.selectView("timeline"));

    expect(result.current.state).toMatchObject({ view: "timeline" });
  });

  it("a cronologia mostra 30 eventos e o Ver mais traz mais 30", async () => {
    const manySpendings = Array.from({ length: 45 }, (_, index) =>
      groceriesSpending(`tx-${index}`, "2026-11-20"),
    );
    const { result } = renderModel({ transactions: manySpendings });
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    const shownCount = () =>
      result.current.state.status === "ready"
        ? result.current.state.timeline.groups.flatMap((group) => group.rows).length
        : 0;

    expect([
      shownCount(),
      (result.current.state as { timeline: { hasMore: boolean } }).timeline.hasMore,
    ]).toEqual([30, true]);

    act(() => result.current.controls.showMoreTimeline());

    expect([
      shownCount(),
      (result.current.state as { timeline: { hasMore: boolean } }).timeline.hasMore,
    ]).toEqual([45, false]);
  });
});
