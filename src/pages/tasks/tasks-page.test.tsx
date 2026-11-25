import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createFakeGoalsData } from "../../data/goals";
import { createFakeTasksData } from "../../data/tasks";
import { createFakeTransactionsData } from "../../data/transactions";
import { createFixedClock } from "../../infra/clock";
import { Envelope } from "../../shared/finance/domain/envelope";
import { ServicesProvider } from "../../shared/services";
import { Cycle } from "../../shared/tasks/domain/cycle";
import { Task } from "../../shared/tasks/domain/task";
import { TasksPage } from "./tasks-page";

afterEach(cleanup);

const today = "2026-11-13";

const groceries = Envelope.fromRecord({
  id: "groceries",
  name: "Mercado",
  budgetInCents: 110000,
  isFixed: false,
});

function renderPage(seed: Task[] = []) {
  const tasks = createFakeTasksData(seed);
  const transactions = createFakeTransactionsData({ envelopes: [groceries] });
  const services = {
    goals: createFakeGoalsData(),
    tasks,
    transactions,
    clock: createFixedClock(today),
    generateId: () => "new-id",
  };
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ServicesProvider services={services}>
        <TasksPage />
      </ServicesProvider>
    </QueryClientProvider>,
  );
  return { tasks, transactions };
}

function paidTask(envelopeId: string | null) {
  return Task.create({
    id: "feira",
    title: "Fazer a feira",
    cycle: Cycle.containing(today),
    money: { amountInCents: 18420, direction: "expense", envelopeId },
  });
}

describe("TasksPage", () => {
  it("mostra as pendências do ciclo e o intervalo do ciclo", async () => {
    renderPage([
      Task.create({ id: "a", title: "Pagar conta de luz", cycle: Cycle.containing(today) }),
    ]);

    expect(await screen.findByText("Pagar conta de luz")).not.toBeNull();
    expect(screen.getByText("Ciclo 8 a 14 nov")).not.toBeNull();
  });

  it("explica o que fazer quando não há nada a fazer", async () => {
    renderPage();

    expect(await screen.findByText("Nada a fazer neste filtro")).not.toBeNull();
  });

  it("conclui uma pendência ao tocar no círculo", async () => {
    renderPage([
      Task.create({ id: "a", title: "Pagar conta de luz", cycle: Cycle.containing(today) }),
    ]);

    fireEvent.click(await screen.findByRole("button", { name: "Concluir: Pagar conta de luz" }));

    await waitFor(() =>
      expect(screen.getByRole("tab", { name: /Feito/ }).textContent).toContain("1"),
    );
  });

  it("concluir uma pendência com valor pergunta e, se lançar, cria o gasto no envelope", async () => {
    const { transactions } = renderPage([paidTask("groceries")]);

    fireEvent.click(await screen.findByRole("button", { name: "Concluir: Fazer a feira" }));
    const sheet = within(await screen.findByRole("dialog"));
    expect(sheet.getByText("Mercado depois de lançar")).not.toBeNull();
    fireEvent.click(sheet.getByRole("button", { name: "Lançar e concluir" }));

    await waitFor(() =>
      expect(screen.getByRole("tab", { name: /Feito/ }).textContent).toContain("1"),
    );
    const [transaction] = await transactions.listTransactions();
    expect(transaction?.toRecord()).toMatchObject({
      kind: "expense",
      amountInCents: 18420,
      envelopeId: "groceries",
      taskId: "feira",
      date: today,
    });
  });

  it("'Só concluir' conclui sem lançar nada", async () => {
    const { transactions } = renderPage([paidTask("groceries")]);

    fireEvent.click(await screen.findByRole("button", { name: "Concluir: Fazer a feira" }));
    fireEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Só concluir" }),
    );

    await waitFor(() =>
      expect(screen.getByRole("tab", { name: /Feito/ }).textContent).toContain("1"),
    );
    expect(await transactions.listTransactions()).toEqual([]);
  });

  it("deixa escolher o envelope quando a pendência a pagar ainda não tem um", async () => {
    const { transactions } = renderPage([paidTask(null)]);

    fireEvent.click(await screen.findByRole("button", { name: "Concluir: Fazer a feira" }));
    const sheet = within(await screen.findByRole("dialog"));
    fireEvent.change(sheet.getByLabelText("Envelope"), { target: { value: "groceries" } });
    fireEvent.click(sheet.getByRole("button", { name: "Lançar e concluir" }));

    await waitFor(async () =>
      expect((await transactions.listTransactions())[0]?.envelopeId).toBe("groceries"),
    );
  });

  it("fechar a pergunta não conclui nem lança", async () => {
    const { transactions } = renderPage([paidTask("groceries")]);

    fireEvent.click(await screen.findByRole("button", { name: "Concluir: Fazer a feira" }));
    fireEvent.click(await screen.findByRole("button", { name: "Fechar" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("tab", { name: /A fazer/ }).textContent).toContain("1");
    expect(await transactions.listTransactions()).toEqual([]);
  });

  it("a pergunta de concluir abre por cima da folha de detalhes", async () => {
    renderPage([paidTask("groceries")]);
    fireEvent.click(await screen.findByText("Fazer a feira"));
    const detailSheet = within(await screen.findByRole("dialog", { name: "Fazer a feira" }));

    fireEvent.click(detailSheet.getByRole("button", { name: "Feito" }));

    await waitFor(() => {
      const openSheets = screen.getAllByRole("dialog");
      const topSheet = openSheets[openSheets.length - 1];
      expect(topSheet?.getAttribute("aria-label")).toBe("Concluir e lançar no financeiro?");
    });
  });

  it("reabrir a pendência remove o lançamento que ela gerou", async () => {
    const { transactions } = renderPage([paidTask("groceries")]);
    fireEvent.click(await screen.findByRole("button", { name: "Concluir: Fazer a feira" }));
    fireEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Lançar e concluir" }),
    );
    fireEvent.click(await screen.findByRole("tab", { name: /Feito/ }));

    fireEvent.click(await screen.findByRole("button", { name: "Reabrir: Fazer a feira" }));

    await waitFor(async () => expect(await transactions.listTransactions()).toEqual([]));
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: /A fazer/ }).textContent).toContain("1"),
    );
  });

  it("cria uma pendência pela folha Adicionar", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Adicionar" }));

    fireEvent.change(screen.getByLabelText("O que precisa ser feito?"), {
      target: { value: "Pagar a internet" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Pagar a internet")).not.toBeNull();
  });

  it("avisa quando o título está vazio", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Adicionar" }));

    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect((await screen.findByRole("alert")).textContent).toBe("Escreva o que precisa ser feito.");
  });

  it("puxa uma pendência do backlog para o ciclo", async () => {
    renderPage([Task.create({ id: "a", title: "Renovar o passaporte" })]);
    fireEvent.click(await screen.findByRole("tab", { name: /Backlog/ }));

    fireEvent.click(await screen.findByRole("button", { name: "Puxar" }));

    await waitFor(() =>
      expect(screen.getByRole("tab", { name: /Ciclo/ }).textContent).toContain("1"),
    );
  });

  it("muda a etapa pela folha de detalhes", async () => {
    renderPage([
      Task.create({ id: "a", title: "Revisar o orçamento", cycle: Cycle.containing(today) }),
    ]);
    fireEvent.click(await screen.findByText("Revisar o orçamento"));

    const sheet = within(screen.getByRole("dialog"));
    fireEvent.click(sheet.getByRole("button", { name: "Fazendo" }));

    await waitFor(() =>
      expect(screen.getByRole("tab", { name: /Fazendo/ }).textContent).toContain("1"),
    );
  });
});
