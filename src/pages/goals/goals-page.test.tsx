import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createFakeGoalsData } from "../../data/goals";
import { createFakeTasksData } from "../../data/tasks";
import { createFakeTransactionsData } from "../../data/transactions";
import { createFixedClock } from "../../infra/clock";
import { Goal } from "../../shared/goals/domain/goal";
import { ServicesProvider } from "../../shared/services";
import { GoalsPage } from "./goals-page";

afterEach(cleanup);

const today = "2026-11-13";
const dentist = Goal.fromRecord({
  id: "dentist",
  title: "Dentista",
  targetInCents: 80000,
  initialSavedInCents: 0,
  dueDate: "2026-12-13",
});
const trip = Goal.fromRecord({
  id: "trip",
  title: "Viagem de julho",
  targetInCents: 500000,
  initialSavedInCents: 180000,
  dueDate: "2027-06-30",
});

function renderPage(seedGoals: Goal[] = []) {
  const transactions = createFakeTransactionsData();
  const services = {
    goals: createFakeGoalsData(seedGoals),
    tasks: createFakeTasksData(),
    transactions,
    clock: createFixedClock(today),
    generateId: () => "new-id",
  };
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ServicesProvider services={services}>
        <GoalsPage />
      </ServicesProvider>
    </QueryClientProvider>,
  );
  return transactions;
}

describe("GoalsPage", () => {
  it("sem metas, mostra o aviso de lista vazia", async () => {
    renderPage();

    expect(await screen.findByText("Nenhuma meta aqui")).not.toBeNull();
  });

  it("mostra o progresso e o ritmo necessário da meta de curto prazo", async () => {
    renderPage([dentist, trip]);

    expect(await screen.findByText("Dentista")).not.toBeNull();
    expect(screen.getByText("0%")).not.toBeNull();
    expect(screen.getByText("R$ 0,00 de R$ 800,00")).not.toBeNull();
    expect(screen.getByText("R$ 187 por semana")).not.toBeNull();
    expect(screen.queryByText("Viagem de julho")).toBeNull();
  });

  it("a aba de longo prazo mostra as metas com mais de 3 meses", async () => {
    renderPage([dentist, trip]);
    await screen.findByText("Dentista");

    fireEvent.click(screen.getByRole("tab", { name: "Longo prazo" }));

    expect(screen.getByText("Viagem de julho")).not.toBeNull();
    expect(screen.getByText("R$ 1.800,00 de R$ 5.000,00")).not.toBeNull();
    expect(screen.getByText("R$ 400 por mês")).not.toBeNull();
  });

  it("cria uma meta pela folha Nova meta", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /Nova meta/ }));
    const sheet = await screen.findByRole("dialog", { name: "Nova meta" });

    fireEvent.change(within(sheet).getByLabelText("Nome da meta"), {
      target: { value: "Notebook" },
    });
    fireEvent.change(within(sheet).getByLabelText("Quanto quero juntar"), {
      target: { value: "4.000,00" },
    });
    fireEvent.change(within(sheet).getByLabelText("Prazo"), { target: { value: "2026-12-30" } });
    fireEvent.click(within(sheet).getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Notebook")).not.toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("avisa quando o prazo da meta já passou", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /Nova meta/ }));
    const sheet = await screen.findByRole("dialog", { name: "Nova meta" });

    fireEvent.change(within(sheet).getByLabelText("Nome da meta"), { target: { value: "X" } });
    fireEvent.change(within(sheet).getByLabelText("Quanto quero juntar"), {
      target: { value: "100" },
    });
    fireEvent.change(within(sheet).getByLabelText("Prazo"), { target: { value: "2026-11-12" } });
    fireEvent.click(within(sheet).getByRole("button", { name: "Salvar" }));

    expect((await within(sheet).findByRole("alert")).textContent).toBe(
      "O prazo precisa ser hoje ou depois.",
    );
  });

  it("registra um aporte e a meta mostra o novo guardado", async () => {
    const transactions = renderPage([dentist]);
    fireEvent.click(await screen.findByRole("button", { name: /Dentista/ }));

    fireEvent.click(screen.getByRole("button", { name: "+ R$ 100" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("R$ 100,00 de R$ 800,00")).not.toBeNull();
    expect(screen.getByText("13%")).not.toBeNull();
    const [contribution] = await transactions.listTransactions();
    expect(contribution?.toRecord()).toMatchObject({ kind: "saving", amountInCents: 10000 });
  });

  it("recusa um aporte que não é um valor", async () => {
    renderPage([dentist]);
    fireEvent.click(await screen.findByRole("button", { name: /Dentista/ }));

    fireEvent.change(screen.getByLabelText(/Guardar agora/), { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect((await screen.findByRole("alert")).textContent).toBe(
      "O valor não parece certo. Use um formato como 120,50.",
    );
  });

  it("marca como concluída a meta que chegou ao alvo", async () => {
    renderPage([Goal.fromRecord({ ...dentist.toRecord(), initialSavedInCents: 80000 })]);

    expect(await screen.findByText("Concluída")).not.toBeNull();
    expect(screen.getByText("100%")).not.toBeNull();
    expect(screen.queryByText("Ritmo necessário")).toBeNull();
  });

  it("exclui a meta em dois passos", async () => {
    renderPage([dentist]);
    fireEvent.click(await screen.findByRole("button", { name: /Dentista/ }));

    fireEvent.click(screen.getByRole("button", { name: "Excluir meta" }));
    expect(screen.getByText("Dentista")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }));

    await waitFor(() => expect(screen.queryByText("Dentista")).toBeNull());
  });
});
