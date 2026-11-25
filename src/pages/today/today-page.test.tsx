import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

function renderPage(tasks: Task[] = [], cycles = createFakeCyclesData()) {
  return renderPageWith({ tasks, cycles });
}

function renderPageWith({
  tasks = [],
  cycles = createFakeCyclesData(),
  transactions = createFakeTransactionsData({
    envelopes: [groceries],
    openingBalanceInCents: 0,
  }),
}: {
  tasks?: Task[];
  cycles?: ReturnType<typeof createFakeCyclesData>;
  transactions?: ReturnType<typeof createFakeTransactionsData>;
}) {
  const services = {
    cycles,
    goals: createFakeGoalsData(),
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
  it("mostra o gasto do dia a dia na semana contra o plano semanal", async () => {
    const transactions = createFakeTransactionsData({
      envelopes: [groceries],
      transactions: [
        Transaction.create({
          id: "tx-1",
          kind: "expense",
          amountInCents: 30000,
          date: "2026-11-10",
          description: "Mercado",
          envelopeId: "groceries",
        }),
      ],
      openingBalanceInCents: 0,
    });
    renderPageWith({ transactions });

    expect(await screen.findByText("Gasto do dia a dia na semana")).not.toBeNull();
    // Plano: R$ 1.100 ÷ 30 × 7 = R$ 256,66, mostrado como R$ 257.
    expect(screen.getByText("R$ 300 de R$ 257")).not.toBeNull();
  });

  it("revisa o ciclo: pede pelo menos uma resposta, salva e troca o botão pelo aviso", async () => {
    const cycles = createFakeCyclesData();
    renderPage([], cycles);
    fireEvent.click(await screen.findByRole("button", { name: "Fazer a revisão do ciclo" }));
    const sheet = await screen.findByRole("dialog", { name: "Revisão do ciclo 8 a 14 nov" });

    fireEvent.click(within(sheet).getByRole("button", { name: "Salvar revisão" }));
    expect((await within(sheet).findByRole("alert")).textContent).toBe(
      "Responda pelo menos uma pergunta para salvar a revisão.",
    );

    fireEvent.change(within(sheet).getByLabelText("O que funcionou?"), {
      target: { value: "Planejei na segunda" },
    });
    fireEvent.click(within(sheet).getByRole("button", { name: "Salvar revisão" }));

    expect(await screen.findByText("Revisão do ciclo salva.")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Fazer a revisão do ciclo" })).toBeNull();
    const [review] = await cycles.listReviews();
    expect(review?.toRecord()).toEqual({
      cycleStart: "2026-11-08",
      worked: "Planejei na segunda",
      hindered: "—",
      changeNext: "—",
      savedOn: today,
    });
  });
});
