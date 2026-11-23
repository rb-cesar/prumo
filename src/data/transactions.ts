import { z } from "zod";
import type { Clock } from "../infra/clock";
import type { SqlDatabase } from "../infra/sqlite";
import { Envelope } from "../shared/finance/domain/envelope";
import { Transaction } from "../shared/finance/domain/transaction";

/** O que as telas enxergam do dinheiro guardado. A tela não sabe se por trás há SQL ou memória. */
export type TransactionsData = {
  listEnvelopes(): Promise<Envelope[]>;
  listTransactions(): Promise<Transaction[]>;
  saveTransaction(transaction: Transaction): Promise<void>;
  /** Apaga marcando `deletedAt`, para a exclusão poder viajar numa sincronização futura. */
  removeTransaction(transactionId: string): Promise<void>;
  /** `null` enquanto a pessoa ainda não informou o saldo inicial. */
  getOpeningBalanceInCents(): Promise<number | null>;
  saveOpeningBalanceInCents(amountInCents: number): Promise<void>;
};

/** Chaves das consultas: quem lê (o model) e quem invalida (a ação) usam as mesmas. */
export const transactionsKeys = { all: ["transactions"] as const };

// ---------------------------------------------------------------- linhas do banco

const envelopeRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  budget_in_cents: z.number().int(),
  is_fixed: z.union([z.literal(0), z.literal(1)]),
});

const transactionRowSchema = z.object({
  id: z.string(),
  kind: z.enum(["expense", "income", "saving"]),
  amount_in_cents: z.number().int(),
  date: z.string(),
  description: z.string(),
  envelope_id: z.string().nullable(),
});

const openingBalanceRowSchema = z.object({ opening_balance_in_cents: z.number().int() });

/** Lê uma linha do banco como entrada não confiável: valida o formato e depois a regra. */
function envelopeFromRow(unknownRow: unknown): Envelope {
  const row = envelopeRowSchema.parse(unknownRow);
  return Envelope.fromRecord({
    id: row.id,
    name: row.name,
    budgetInCents: row.budget_in_cents,
    isFixed: row.is_fixed === 1,
  });
}

function transactionFromRow(unknownRow: unknown): Transaction {
  const row = transactionRowSchema.parse(unknownRow);
  return Transaction.fromRecord({
    id: row.id,
    kind: row.kind,
    amountInCents: row.amount_in_cents,
    date: row.date,
    description: row.description,
    envelopeId: row.envelope_id,
  });
}

// ---------------------------------------------------------------- adaptador SQLite

export function createSqliteTransactionsData(
  database: SqlDatabase,
  clock: Clock,
): TransactionsData {
  return {
    async listEnvelopes() {
      const rows = await database.queryAll<unknown>(
        `SELECT id, name, budget_in_cents, is_fixed
           FROM envelopes WHERE deleted_at IS NULL ORDER BY rowid`,
      );
      return rows.map(envelopeFromRow);
    },

    async listTransactions() {
      const rows = await database.queryAll<unknown>(
        `SELECT id, kind, amount_in_cents, date, description, envelope_id
           FROM transactions WHERE deleted_at IS NULL`,
      );
      return rows.map(transactionFromRow);
    },

    async saveTransaction(transaction) {
      const record = transaction.toRecord();
      await database.run(
        `INSERT INTO transactions (id, kind, amount_in_cents, date, description, envelope_id,
                                   updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
         ON CONFLICT (id) DO UPDATE SET
           kind = excluded.kind, amount_in_cents = excluded.amount_in_cents, date = excluded.date,
           description = excluded.description, envelope_id = excluded.envelope_id,
           updated_at = excluded.updated_at, deleted_at = NULL`,
        [
          record.id,
          record.kind,
          record.amountInCents,
          record.date,
          record.description,
          record.envelopeId,
          clock.now().toISOString(),
        ],
      );
    },

    async removeTransaction(transactionId) {
      const removedAt = clock.now().toISOString();
      await database.run("UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE id = ?", [
        removedAt,
        removedAt,
        transactionId,
      ]);
    },

    async getOpeningBalanceInCents() {
      const rows = await database.queryAll<unknown>(
        "SELECT opening_balance_in_cents FROM account_settings WHERE id = 1",
      );
      const [row] = rows;
      return row === undefined ? null : openingBalanceRowSchema.parse(row).opening_balance_in_cents;
    },

    async saveOpeningBalanceInCents(amountInCents) {
      await database.run(
        `INSERT INTO account_settings (id, opening_balance_in_cents, updated_at)
         VALUES (1, ?, ?)
         ON CONFLICT (id) DO UPDATE SET
           opening_balance_in_cents = excluded.opening_balance_in_cents,
           updated_at = excluded.updated_at`,
        [amountInCents, clock.now().toISOString()],
      );
    },
  };
}

// ---------------------------------------------------------------- fake para testes

export type FakeTransactionsSeed = {
  envelopes?: Envelope[];
  transactions?: Transaction[];
  openingBalanceInCents?: number | null;
};

export function createFakeTransactionsData(seed: FakeTransactionsSeed = {}): TransactionsData {
  const envelopes = seed.envelopes ?? [];
  const transactionsById = new Map(
    (seed.transactions ?? []).map((transaction) => [transaction.id, transaction]),
  );
  let openingBalanceInCents = seed.openingBalanceInCents ?? null;

  return {
    async listEnvelopes() {
      return [...envelopes];
    },
    async listTransactions() {
      return [...transactionsById.values()];
    },
    async saveTransaction(transaction) {
      transactionsById.set(transaction.id, transaction);
    },
    async removeTransaction(transactionId) {
      transactionsById.delete(transactionId);
    },
    async getOpeningBalanceInCents() {
      return openingBalanceInCents;
    },
    async saveOpeningBalanceInCents(amountInCents) {
      openingBalanceInCents = amountInCents;
    },
  };
}
