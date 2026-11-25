import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createFakeTasksData } from "../../data/tasks";
import { createFakeTransactionsData } from "../../data/transactions";
import { createFixedClock } from "../../infra/clock";
import { Envelope } from "../../shared/finance/domain/envelope";
import { ServicesProvider } from "../../shared/services";
import { Cycle } from "../../shared/tasks/domain/cycle";
import { Task } from "../../shared/tasks/domain/task";
import { TodayPage } from "./today-page";

afterEach(cleanup);

const today = "2026-11-13";
const groceries = Envelope.fromRecord({
  id: "groceries",
  name: "Mercado",
  budgetInCents: 110000,
  isFixed: false,
});

function renderPage(tasks: Task[] = []) {
  const transactions = createFakeTransactionsData({
    envelopes: [groceries],
    openingBalanceInCents: 0,
  });
  const services = {
    tasks: createFakeTasksData(tasks),
    transactions,
    clock: createFixedClock(today),
    generateId: () => "new-id",
  };
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ServicesProvider services={services}>
        <TodayPage />
      </ServicesProvider>
    </QueryClientProvider>,
  );
  return transactions;
}

function taskDueToday(money: Task["money"] = null) {
  return Task.create({
    id: "luz",
    title: "Pagar conta de luz",
    dueDate: today,
    cycle: Cycle.containing(today),
    money,
  });
}

describe("TodayPage", () => {
  it("mostra o pode gastar hoje, o ciclo e os avisos de dia vazio", async () => {
    renderPage();

    expect(await screen.findByText("Pode gastar hoje")).not.toBeNull();
    expect(screen.getByText("R$ 61,11")).not.toBeNull();
    expect(screen.getByText("Nada pendente para hoje")).not.toBeNull();
    expect(screen.getByText("Nenhum vencimento nos próximos 7 dias")).not.toBeNull();
    expect(screen.getByText("Nenhuma meta ainda")).not.toBeNull();
    expect(screen.getByText("Ciclo 8 a 14 nov")).not.toBeNull();
  });

  it("lista o que vence hoje e conclui ao tocar no círculo", async () => {
    renderPage([taskDueToday()]);
    fireEvent.click(await screen.findByRole("button", { name: "Concluir: Pagar conta de luz" }));

    await waitFor(() => expect(screen.getByText("Nada pendente para hoje")).not.toBeNull());
    expect(screen.getByText("1 de 1")).not.toBeNull();
  });

  it("concluir uma pendência com valor pergunta e, se lançar, o gasto entra no financeiro", async () => {
    const transactions = renderPage([
      taskDueToday({ amountInCents: 18740, direction: "expense", envelopeId: "groceries" }),
    ]);
    fireEvent.click(await screen.findByRole("button", { name: "Concluir: Pagar conta de luz" }));

    fireEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Lançar e concluir" }),
    );

    await waitFor(async () => expect(await transactions.listTransactions()).toHaveLength(1));
    await waitFor(() => expect(screen.getByText("Nada pendente para hoje")).not.toBeNull());
  });

  it("mostra o que vence nos próximos dias, com o valor", async () => {
    renderPage([
      Task.create({
        id: "salary",
        title: "Receber o freela",
        dueDate: "2026-11-15",
        money: { amountInCents: 80000, direction: "income", envelopeId: null },
      }),
    ]);

    expect(await screen.findByText("Receber o freela")).not.toBeNull();
    expect(screen.getByText("+R$ 800,00")).not.toBeNull();
  });
});
