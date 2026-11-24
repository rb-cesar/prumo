import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createFakeTasksData } from "../../data/tasks";
import { createFakeTransactionsData } from "../../data/transactions";
import { createFixedClock } from "../../infra/clock";
import { Envelope } from "../../shared/finance/domain/envelope";
import { Transaction } from "../../shared/finance/domain/transaction";
import { ServicesProvider } from "../../shared/services";
import { MoneyPage } from "./money-page";

afterEach(cleanup);

const today = "2026-11-13";
const groceries = Envelope.fromRecord({
  id: "groceries",
  name: "Mercado",
  budgetInCents: 110000,
  isFixed: false,
});

function renderPage(seed: { transactions?: Transaction[]; openingBalanceInCents?: number } = {}) {
  const transactions = createFakeTransactionsData({ envelopes: [groceries], ...seed });
  const services = {
    tasks: createFakeTasksData(),
    transactions,
    clock: createFixedClock(today),
    generateId: () => "new-id",
  };
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ServicesProvider services={services}>
        <MoneyPage />
      </ServicesProvider>
    </QueryClientProvider>,
  );
  return transactions;
}

const buyGroceries = Transaction.create({
  id: "tx-1",
  kind: "expense",
  amountInCents: 14160,
  date: today,
  description: "Mercado do bairro",
  envelopeId: "groceries",
});

describe("MoneyPage", () => {
  it("mostra o mês, os envelopes e explica quando não há lançamentos", async () => {
    renderPage({ openingBalanceInCents: 0 });

    expect(await screen.findByText("Novembro de 2026")).not.toBeNull();
    expect(screen.getByText("Envelopes de novembro")).not.toBeNull();
    expect(screen.getByText("Restam R$ 1.100,00")).not.toBeNull();
    expect(screen.getByText("Nenhum lançamento")).not.toBeNull();
  });

  it("pede o saldo inicial na primeira vez e guarda o que for informado", async () => {
    const data = renderPage();

    const sheet = within(await screen.findByRole("dialog", { name: "Saldo inicial" }));
    fireEvent.change(sheet.getByLabelText("Saldo hoje"), { target: { value: "4200" } });
    fireEvent.click(sheet.getByRole("button", { name: "Salvar" }));

    await waitFor(async () => expect(await data.getOpeningBalanceInCents()).toBe(420000));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByText("R$ 4.200,00")).not.toBeNull();
  });

  it("deixa fechar o pedido de saldo com Agora não", async () => {
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Agora não" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByRole("button", { name: "informar saldo inicial" })).not.toBeNull();
  });

  it("registra um gasto pela folha Adicionar", async () => {
    renderPage({ openingBalanceInCents: 0 });
    fireEvent.click(await screen.findByRole("button", { name: "Adicionar" }));

    fireEvent.change(screen.getByLabelText("Valor"), { target: { value: "42,90" } });
    fireEvent.change(screen.getByLabelText("Descrição"), { target: { value: "Almoço" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Almoço")).not.toBeNull();
    expect(screen.getByText("− R$ 42,90")).not.toBeNull();
  });

  it("avisa quando a descrição está vazia", async () => {
    renderPage({ openingBalanceInCents: 0 });
    fireEvent.click(await screen.findByRole("button", { name: "Adicionar" }));
    fireEvent.change(screen.getByLabelText("Valor"), { target: { value: "10" } });

    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect((await screen.findByRole("alert")).textContent).toBe("Escreva uma descrição curta.");
  });

  it("exclui um lançamento em dois passos", async () => {
    renderPage({ transactions: [buyGroceries], openingBalanceInCents: 0 });
    fireEvent.click(await screen.findByText("Mercado do bairro"));

    const sheet = within(screen.getByRole("dialog"));
    fireEvent.click(sheet.getByRole("button", { name: "Excluir lançamento" }));
    fireEvent.click(sheet.getByRole("button", { name: "Confirmar exclusão" }));

    await waitFor(() => expect(screen.queryByText("Mercado do bairro")).toBeNull());
  });

  it("filtra os lançamentos tocando no envelope", async () => {
    renderPage({ transactions: [buyGroceries], openingBalanceInCents: 0 });
    await screen.findByText("Mercado do bairro");

    fireEvent.click(screen.getByRole("button", { name: /^Mercado R/ }));

    expect(await screen.findByText("Mostrando Mercado · limpar")).not.toBeNull();
  });
});
