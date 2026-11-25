import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createFakeCyclesData } from "../../data/cycles";
import { createFakeGoalsData } from "../../data/goals";
import { createFakeTasksData } from "../../data/tasks";
import { createFakeTransactionsData } from "../../data/transactions";
import { createFixedClock } from "../../infra/clock";
import { Envelope } from "../../shared/finance/domain/envelope";
import { Transaction } from "../../shared/finance/domain/transaction";
import { ServicesProvider } from "../../shared/services";
import { Cycle } from "../../shared/tasks/domain/cycle";
import { CycleReview } from "../../shared/tasks/domain/cycle-review";
import type { Task } from "../../shared/tasks/domain/task";
import { HistoryPage } from "./history-page";

afterEach(cleanup);

const today = "2026-11-25";
const groceries = Envelope.fromRecord({
  id: "groceries",
  name: "Mercado",
  budgetInCents: 110000,
  isFixed: false,
});

function renderPage({
  transactions = [] as Transaction[],
  tasks = [] as Task[],
  cycles = createFakeCyclesData(),
} = {}) {
  const services = {
    cycles,
    goals: createFakeGoalsData(),
    tasks: createFakeTasksData(tasks),
    transactions: createFakeTransactionsData({ envelopes: [groceries], transactions }),
    clock: createFixedClock(today),
    generateId: () => "new-id",
  };
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ServicesProvider services={services}>
        <HistoryPage />
      </ServicesProvider>
    </QueryClientProvider>,
  );
}

function transaction(
  id: string,
  kind: "income" | "expense" | "saving",
  reais: number,
  date: string,
) {
  return Transaction.create({
    id,
    kind,
    amountInCents: reais * 100,
    date,
    description: kind === "income" ? "Salário" : "Movimento",
    envelopeId: kind === "expense" ? "groceries" : null,
  });
}

describe("HistoryPage", () => {
  it("sem movimento, a visão Meses avisa que ainda não há nada", async () => {
    renderPage();

    expect(await screen.findByText("Ainda não há movimento")).not.toBeNull();
  });

  it("mostra a tabela dos meses com a taxa de guardado e a nota do mês parcial", async () => {
    renderPage({
      transactions: [
        transaction("a", "income", 6200, "2026-11-05"),
        transaction("b", "saving", 1550, "2026-11-12"),
      ],
    });

    expect(await screen.findByText("R$ 6.200")).not.toBeNull();
    expect(screen.getByText("25%")).not.toBeNull();
    expect(screen.getByText("* Novembro até o dia 25.")).not.toBeNull();
  });

  it("na visão Ciclos mostra o ciclo de hoje e as revisões salvas", async () => {
    const review = CycleReview.create({
      cycleStart: Cycle.containing(today).start,
      worked: "Planejei na segunda",
      hindered: "",
      changeNext: "",
      savedOn: today,
    });
    renderPage({ cycles: createFakeCyclesData({ reviews: [review] }) });
    fireEvent.click(await screen.findByRole("tab", { name: "Ciclos" }));

    expect(screen.getByText("Ciclo 22 a 28 nov")).not.toBeNull();
    expect(screen.getByText("em andamento")).not.toBeNull();
    expect(screen.getByText("Revisão do ciclo 22 a 28 nov · hoje")).not.toBeNull();
    expect(screen.getByText("Planejei na segunda")).not.toBeNull();
  });

  it("na visão Cronologia lista os lançamentos por dia, com o valor", async () => {
    renderPage({ transactions: [transaction("a", "expense", 38.4, "2026-11-24")] });
    fireEvent.click(await screen.findByRole("tab", { name: "Cronologia" }));

    expect(screen.getByText("Ontem")).not.toBeNull();
    expect(screen.getByText("− R$ 38,40")).not.toBeNull();
  });
});
