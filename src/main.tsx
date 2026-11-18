import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/inter";
import "./styles/globals.css";
import "./styles/components.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import { createSqliteTasksData } from "./data/tasks";
import { systemClock } from "./infra/clock";
import { openDeviceDatabase } from "./infra/device-database";
import { bundledMigrations, runMigrations } from "./infra/sqlite";
import { generateId } from "./shared/ids";
import { ServicesProvider } from "./shared/services";

/** Único lugar que liga o mundo real: abre o banco, roda as migrações e entrega os serviços às telas. */
async function start(rootElement: HTMLElement): Promise<void> {
  const root = createRoot(rootElement);
  try {
    const database = await openDeviceDatabase();
    await runMigrations(database, bundledMigrations);
    const services = {
      tasks: createSqliteTasksData(database, systemClock),
      clock: systemClock,
      generateId,
    };
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    root.render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <ServicesProvider services={services}>
            <App />
          </ServicesProvider>
        </QueryClientProvider>
      </StrictMode>,
    );
  } catch (error) {
    console.error(error);
    root.render(
      <main className="p-4">
        <h1 className="font-display text-app-title">Prumo</h1>
        <p className="text-small text-ink-2">Não foi possível abrir os dados do app.</p>
      </main>,
    );
  }
}

const rootElement = document.getElementById("root");
if (rootElement === null) {
  throw new Error("Elemento #root não encontrado em index.html.");
}
void start(rootElement);
