import { describe, expect, it } from "vitest";
import { createFixedClock } from "../infra/clock";
import { createTestDatabase } from "../infra/test-database";
import { Transaction } from "../shared/finance/domain/transaction";
import { Goal } from "../shared/goals/domain/goal";
import { createFakeGoalsData, createSqliteGoalsData, type GoalsData } from "./goals";
import { createSqliteTransactionsData } from "./transactions";

const clock = createFixedClock("2026-11-13");

const trip = Goal.create(
  {
    id: "trip",
    title: "Viagem de julho",
    targetInCents: 500000,
    initialSavedInCents: 180000,
    dueDate: "2027-06-30",
  },
  "2026-11-13",
);
const reserve = Goal.create(
  { id: "reserve", title: "Reserva", targetInCents: 1800000, dueDate: "2027-12-31" },
  "2026-11-13",
);

const adapters: Array<[string, () => Promise<GoalsData>]> = [
  ["SQLite em memória", async () => createSqliteGoalsData(await createTestDatabase(), clock)],
  ["fake", async () => createFakeGoalsData()],
];

describe.each(adapters)("GoalsData (%s)", (_name, createAdapter) => {
  it("devolve a meta que foi gravada, igual, e começa vazio", async () => {
    const data = await createAdapter();
    expect(await data.listGoals()).toEqual([]);

    await data.saveGoal(trip);
    await data.saveGoal(reserve);

    const stored = await data.listGoals();
    expect(stored.map((goal) => goal.toRecord())).toEqual([trip.toRecord(), reserve.toRecord()]);
  });

  it("grava de novo a mesma meta sem duplicar", async () => {
    const data = await createAdapter();
    await data.saveGoal(trip);

    await data.saveGoal(Goal.fromRecord({ ...trip.toRecord(), title: "Viagem corrigida" }));

    const stored = await data.listGoals();
    expect(stored.map((goal) => goal.title)).toEqual(["Viagem corrigida"]);
  });

  it("não lista a meta removida", async () => {
    const data = await createAdapter();
    await data.saveGoal(trip);

    await data.removeGoal(trip.id);

    expect(await data.listGoals()).toEqual([]);
  });
});

describe("GoalsData: aporte e meta excluída (SQLite)", () => {
  it("o aporte continua no financeiro depois de a meta ser excluída", async () => {
    const database = await createTestDatabase();
    const goals = createSqliteGoalsData(database, clock);
    const transactions = createSqliteTransactionsData(database, clock);
    await goals.saveGoal(trip);
    await transactions.saveTransaction(
      Transaction.create({
        id: "tx-1",
        kind: "saving",
        amountInCents: 10000,
        date: "2026-11-13",
        description: "Aporte: Viagem de julho",
        goalId: "trip",
      }),
    );

    await goals.removeGoal("trip");

    const stored = await transactions.listTransactions();
    expect(stored.map((transaction) => transaction.goalId)).toEqual(["trip"]);
  });
});
