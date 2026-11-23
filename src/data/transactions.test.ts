import { describe, expect, it } from "vitest";
import { createFixedClock } from "../infra/clock";
import { createTestDatabase } from "../infra/test-database";
import { Envelope } from "../shared/finance/domain/envelope";
import { Transaction } from "../shared/finance/domain/transaction";
import {
  createFakeTransactionsData,
  createSqliteTransactionsData,
  type TransactionsData,
} from "./transactions";

const clock = createFixedClock("2026-11-13");

const groceries = Envelope.fromRecord({
  id: "groceries",
  name: "Mercado",
  budgetInCents: 110000,
  isFixed: false,
});

const buyGroceries = Transaction.create({
  id: "tx-1",
  kind: "expense",
  amountInCents: 14160,
  date: "2026-11-12",
  description: "Mercado do bairro",
  envelopeId: "groceries",
});

const receiveSalary = Transaction.create({
  id: "tx-2",
  kind: "income",
  amountInCents: 620000,
  date: "2026-11-05",
  description: "Salário",
});

const adapters: Array<[string, () => Promise<TransactionsData>]> = [
  [
    "SQLite em memória",
    async () => {
      const database = await createTestDatabase();
      return createSqliteTransactionsData(database, clock);
    },
  ],
  ["fake", async () => createFakeTransactionsData({ envelopes: [groceries] })],
];

describe.each(adapters)("TransactionsData (%s)", (_name, createAdapter) => {
  it("devolve o lançamento que foi gravado, igual", async () => {
    const data = await createAdapter();

    await data.saveTransaction(buyGroceries);
    await data.saveTransaction(receiveSalary);

    const stored = await data.listTransactions();
    expect(stored.map((transaction) => transaction.toRecord())).toEqual(
      expect.arrayContaining([buyGroceries.toRecord(), receiveSalary.toRecord()]),
    );
    expect(stored).toHaveLength(2);
  });

  it("grava de novo o mesmo lançamento sem duplicar", async () => {
    const data = await createAdapter();
    await data.saveTransaction(buyGroceries);

    await data.saveTransaction(
      Transaction.create({ ...buyGroceries.toRecord(), description: "Mercado corrigido" }),
    );

    const stored = await data.listTransactions();
    expect(stored.map((transaction) => transaction.description)).toEqual(["Mercado corrigido"]);
  });

  it("não lista o lançamento removido", async () => {
    const data = await createAdapter();
    await data.saveTransaction(buyGroceries);

    await data.removeTransaction(buyGroceries.id);

    expect(await data.listTransactions()).toEqual([]);
  });

  it("começa sem saldo inicial e guarda o que for informado", async () => {
    const data = await createAdapter();
    expect(await data.getOpeningBalanceInCents()).toBeNull();

    await data.saveOpeningBalanceInCents(420000);
    await data.saveOpeningBalanceInCents(500000);

    expect(await data.getOpeningBalanceInCents()).toBe(500000);
  });

  it("aceita saldo inicial zero", async () => {
    const data = await createAdapter();

    await data.saveOpeningBalanceInCents(0);

    expect(await data.getOpeningBalanceInCents()).toBe(0);
  });
});

describe("TransactionsData (SQLite em memória): o que só o banco faz", () => {
  it("já traz os envelopes do app, na ordem, com Moradia fixo", async () => {
    const data = createSqliteTransactionsData(await createTestDatabase(), clock);

    const envelopes = await data.listEnvelopes();

    expect(envelopes.map((envelope) => envelope.name)).toEqual([
      "Moradia",
      "Mercado",
      "Transporte",
      "Lazer",
      "Saúde",
      "Assinaturas",
      "Restaurantes",
    ]);
    expect(envelopes.filter((envelope) => envelope.isFixed).map((envelope) => envelope.id)).toEqual(
      ["housing"],
    );
  });

  it("marca a exclusão em vez de apagar a linha", async () => {
    const database = await createTestDatabase();
    const data = createSqliteTransactionsData(database, clock);
    await data.saveTransaction(buyGroceries);

    await data.removeTransaction(buyGroceries.id);

    const rows = await database.queryAll<{ deleted_at: string | null }>(
      "SELECT deleted_at FROM transactions",
    );
    expect(rows[0]?.deleted_at).not.toBeNull();
  });

  it("registra quando o lançamento foi gravado", async () => {
    const database = await createTestDatabase();
    const data = createSqliteTransactionsData(database, clock);

    await data.saveTransaction(buyGroceries);

    const rows = await database.queryAll<{ updated_at: string }>(
      "SELECT updated_at FROM transactions",
    );
    expect(rows[0]?.updated_at).toBe(clock.now().toISOString());
  });

  it("recusa, em voz alta, uma linha que quebra a regra", async () => {
    const database = await createTestDatabase();
    await database.run(
      `INSERT INTO transactions (id, kind, amount_in_cents, date, description, envelope_id, updated_at)
       VALUES ('bad', 'income', 100, '2026-11-13', '   ', NULL, 'agora')`,
    );
    const data = createSqliteTransactionsData(database, clock);

    await expect(data.listTransactions()).rejects.toThrow();
  });

  it("o banco recusa gasto sem envelope", async () => {
    const database = await createTestDatabase();

    const insertExpenseWithoutEnvelope = database.run(
      `INSERT INTO transactions (id, kind, amount_in_cents, date, description, envelope_id, updated_at)
       VALUES ('bad', 'expense', 100, '2026-11-13', 'Sem envelope', NULL, 'agora')`,
    );

    await expect(insertExpenseWithoutEnvelope).rejects.toThrow();
  });
});
