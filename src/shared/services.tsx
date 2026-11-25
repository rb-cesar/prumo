import { createContext, type ReactNode, useContext } from "react";
import type { CyclesData } from "../data/cycles";
import type { GoalsData } from "../data/goals";
import type { TasksData } from "../data/tasks";
import type { TransactionsData } from "../data/transactions";
import type { Clock } from "../infra/clock";
import type { IdGenerator } from "./ids";

/** O mundo real, criado uma vez no `main.tsx`. Os testes entregam um fake no mesmo ponto. */
export type Services = {
  cycles: CyclesData;
  goals: GoalsData;
  tasks: TasksData;
  transactions: TransactionsData;
  clock: Clock;
  generateId: IdGenerator;
};

const ServicesContext = createContext<Services | null>(null);

export function ServicesProvider({
  services,
  children,
}: {
  services: Services;
  children: ReactNode;
}) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices(): Services {
  const services = useContext(ServicesContext);
  if (services === null) throw new Error("useServices fora do ServicesProvider.");
  return services;
}
