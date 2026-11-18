import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createFakeTasksData } from "../../data/tasks";
import { createFixedClock } from "../../infra/clock";
import { ServicesProvider } from "../../shared/services";
import { Cycle } from "../../shared/tasks/domain/cycle";
import { Task } from "../../shared/tasks/domain/task";
import { TasksPage } from "./tasks-page";

afterEach(cleanup);

const today = "2026-11-13";

function renderPage(seed: Task[] = []) {
  const tasks = createFakeTasksData(seed);
  const services = { tasks, clock: createFixedClock(today), generateId: () => "new-id" };
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ServicesProvider services={services}>
        <TasksPage />
      </ServicesProvider>
    </QueryClientProvider>,
  );
  return tasks;
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
