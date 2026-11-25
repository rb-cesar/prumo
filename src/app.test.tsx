import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./app";
import { createFakeCyclesData } from "./data/cycles";
import { createFakeGoalsData } from "./data/goals";
import { createFakeTasksData } from "./data/tasks";
import { createFakeTransactionsData } from "./data/transactions";
import { createFixedClock } from "./infra/clock";
import { ServicesProvider } from "./shared/services";

afterEach(cleanup);

describe("App", () => {
  it("abre na tela Hoje", () => {
    const services = {
      cycles: createFakeCyclesData(),
      goals: createFakeGoalsData(),
      tasks: createFakeTasksData(),
      transactions: createFakeTransactionsData(),
      clock: createFixedClock("2026-11-13"),
      generateId: () => "id-1",
    };
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <ServicesProvider services={services}>
          <App />
        </ServicesProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByRole("heading", { name: "Hoje" })).not.toBeNull();
  });
});
