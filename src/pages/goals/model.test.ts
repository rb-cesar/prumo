import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { createFakeGoalsData, type GoalsData } from "../../data/goals";
import { createFakeTransactionsData, type TransactionsData } from "../../data/transactions";
import { createFixedClock } from "../../infra/clock";
import { Ledger } from "../../shared/finance/domain/ledger";
import { Goal } from "../../shared/goals/domain/goal";
import { type GoalsModelDeps, useGoalsModel } from "./model";

const today = "2026-11-13";

const trip = Goal.fromRecord({
  id: "trip",
  title: "Viagem de julho",
  targetInCents: 500000,
  initialSavedInCents: 180000,
  dueDate: "2027-06-30",
});
const dentist = Goal.fromRecord({
  id: "dentist",
  title: "Dentista",
  targetInCents: 80000,
  initialSavedInCents: 0,
  dueDate: "2026-12-20",
});

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

function renderModel(
  goals: GoalsData = createFakeGoalsData(),
  transactions: TransactionsData = createFakeTransactionsData(),
) {
  const deps: GoalsModelDeps = {
    goals,
    transactions,
    clock: createFixedClock(today),
    generateId: () => "new-id",
  };
  return renderHook(() => useGoalsModel(deps), { wrapper: createWrapper() });
}

function createFailingGoalsData(): GoalsData {
  const fail = async () => {
    throw new Error("banco indisponível");
  };
  return { listGoals: fail, saveGoal: fail, removeGoal: fail };
}

describe("useGoalsModel: os três estados", () => {
  it("começa carregando e depois mostra as metas da aba de curto prazo", async () => {
    const { result } = renderModel(createFakeGoalsData([trip, dentist]));

    expect(result.current.state.status).toBe("loading");
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.state).toMatchObject({
      horizon: "short",
      cards: [{ id: "dentist", savedText: "R$ 0,00 de R$ 800,00" }],
    });
  });

  it("mostra o erro quando os dados não carregam", async () => {
    const { result } = renderModel(createFailingGoalsData());

    await waitFor(() => expect(result.current.state.status).toBe("error"));
  });

  it("sem metas, mostra a aba de curto prazo vazia, sem erro", async () => {
    const { result } = renderModel();

    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.state).toMatchObject({ horizon: "short", cards: [] });
  });

  it("troca de aba e mostra as metas de longo prazo", async () => {
    const { result } = renderModel(createFakeGoalsData([trip, dentist]));
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    act(() => result.current.controls.selectHorizon("long"));

    expect(result.current.state).toMatchObject({ horizon: "long", cards: [{ id: "trip" }] });
  });
});

describe("useGoalsModel: criar meta", () => {
  it("cria a meta e ela aparece na lista", async () => {
    const goals = createFakeGoalsData();
    const { result } = renderModel(goals);
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    let outcome: Awaited<ReturnType<typeof result.current.actions.createGoal>> | undefined;
    await act(async () => {
      outcome = await result.current.actions.createGoal({
        title: "Notebook",
        targetText: "4.000,00",
        initialSavedText: "",
        dueDate: "2026-12-30",
      });
    });

    expect(outcome).toEqual({ ok: true });
    expect((await goals.listGoals()).map((goal) => goal.toRecord())).toEqual([
      {
        id: "new-id",
        title: "Notebook",
        targetInCents: 400000,
        initialSavedInCents: 0,
        dueDate: "2026-12-30",
      },
    ]);
    await waitFor(() =>
      expect(result.current.state).toMatchObject({ cards: [{ title: "Notebook" }] }),
    );
  });

  it("guarda o valor que a pessoa já tem", async () => {
    const goals = createFakeGoalsData();
    const { result } = renderModel(goals);
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    await act(async () => {
      await result.current.actions.createGoal({
        title: "Notebook",
        targetText: "4000",
        initialSavedText: "1.500,50",
        dueDate: "2026-12-30",
      });
    });

    expect((await goals.listGoals())[0]?.initialSavedInCents).toBe(150050);
  });

  it.each([
    ["título vazio", { title: " " }, "title-required"],
    ["valor que não é número", { targetText: "abc" }, "target-not-a-number"],
    ["valor zero", { targetText: "0" }, "invalid-target"],
    ["valor inicial que não é número", { initialSavedText: "x" }, "initial-saved-not-a-number"],
    ["prazo vazio", { dueDate: "" }, "invalid-due-date"],
    ["prazo no passado", { dueDate: "2026-11-12" }, "due-date-in-past"],
  ])("recusa %s e não grava nada", async (_name, change, reason) => {
    const goals = createFakeGoalsData();
    const { result } = renderModel(goals);
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    let outcome: Awaited<ReturnType<typeof result.current.actions.createGoal>> | undefined;
    await act(async () => {
      outcome = await result.current.actions.createGoal({
        title: "Notebook",
        targetText: "4000",
        initialSavedText: "",
        dueDate: "2026-12-30",
        ...change,
      });
    });

    expect(outcome).toEqual({ ok: false, reason });
    expect(await goals.listGoals()).toEqual([]);
  });
});

describe("useGoalsModel: aporte", () => {
  it("o aporte atualiza o guardado da meta e vira lançamento de hoje que sai do saldo", async () => {
    const transactions = createFakeTransactionsData({ openingBalanceInCents: 100000 });
    const { result } = renderModel(createFakeGoalsData([dentist]), transactions);
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    let outcome: Awaited<ReturnType<typeof result.current.actions.contribute>> | undefined;
    await act(async () => {
      outcome = await result.current.actions.contribute("dentist", "200");
    });

    expect(outcome).toEqual({ ok: true });
    await waitFor(() =>
      expect(result.current.state).toMatchObject({
        cards: [{ savedText: "R$ 200,00 de R$ 800,00", percentText: "25%" }],
      }),
    );
    const [contribution] = await transactions.listTransactions();
    expect(contribution?.toRecord()).toMatchObject({
      kind: "saving",
      amountInCents: 20000,
      date: today,
      description: "Aporte: Dentista",
      goalId: "dentist",
    });
    expect(new Ledger(await transactions.listTransactions()).accountBalanceInCents(100000)).toBe(
      80000,
    );
  });

  it.each(["abc", "0", ""])("recusa o aporte %j e não grava nada", async (amountText) => {
    const transactions = createFakeTransactionsData();
    const { result } = renderModel(createFakeGoalsData([dentist]), transactions);
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    let outcome: Awaited<ReturnType<typeof result.current.actions.contribute>> | undefined;
    await act(async () => {
      outcome = await result.current.actions.contribute("dentist", amountText);
    });

    expect(outcome?.ok).toBe(false);
    expect(await transactions.listTransactions()).toEqual([]);
  });

  it("uma meta concluída ainda aceita aporte", async () => {
    const done = Goal.fromRecord({ ...dentist.toRecord(), initialSavedInCents: 80000 });
    const transactions = createFakeTransactionsData();
    const { result } = renderModel(createFakeGoalsData([done]), transactions);
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    await act(async () => {
      await result.current.actions.contribute("dentist", "50");
    });

    expect(await transactions.listTransactions()).toHaveLength(1);
  });
});

describe("useGoalsModel: excluir meta", () => {
  it("a meta some da lista e os aportes continuam no financeiro", async () => {
    const transactions = createFakeTransactionsData();
    const { result } = renderModel(createFakeGoalsData([dentist]), transactions);
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    await act(async () => {
      await result.current.actions.contribute("dentist", "100");
    });

    act(() => result.current.actions.removeGoal("dentist"));

    await waitFor(() => expect(result.current.state).toMatchObject({ cards: [] }));
    expect(await transactions.listTransactions()).toHaveLength(1);
  });
});
