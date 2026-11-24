/** Regra de lançamentos (doc/business-rules/finances.md, BR-F03). Regra pura: sem tela, banco ou relógio. */

import { isValidIsoDate } from "../../iso-date";
import { FinanceRuleViolation } from "./finance-rule-violation";

/** Gasto, entrada, ou aporte (dinheiro guardado numa meta; só a tela de metas cria). */
export type TransactionKind = "expense" | "income" | "saving";

/** O estado completo de um lançamento, sem comportamento: o que a camada de dados grava e lê. */
export type TransactionRecord = {
  id: string;
  kind: TransactionKind;
  amountInCents: number;
  /** Dia do lançamento, `AAAA-MM-DD`. */
  date: string;
  description: string;
  /** Só o gasto tem envelope. */
  envelopeId: string | null;
};

export type NewTransactionInput = Omit<TransactionRecord, "envelopeId"> & {
  envelopeId?: string | null;
};

function validatedSnapshot(snapshot: TransactionRecord): TransactionRecord {
  const description = snapshot.description.trim();
  if (description === "") throw new FinanceRuleViolation("description-required");

  const amountIsPositiveWholeCents =
    Number.isInteger(snapshot.amountInCents) && snapshot.amountInCents > 0;
  if (!amountIsPositiveWholeCents) throw new FinanceRuleViolation("invalid-amount");

  if (!isValidIsoDate(snapshot.date)) throw new FinanceRuleViolation("invalid-date");

  const isExpense = snapshot.kind === "expense";
  if (isExpense && snapshot.envelopeId === null) {
    throw new FinanceRuleViolation("expense-needs-envelope");
  }
  if (!isExpense && snapshot.envelopeId !== null) {
    throw new FinanceRuleViolation("envelope-only-for-expense");
  }

  return { ...snapshot, description };
}

/** Lançamento imutável. */
export class Transaction {
  private readonly snapshot: TransactionRecord;

  private constructor(snapshot: TransactionRecord) {
    this.snapshot = Object.freeze(validatedSnapshot(snapshot));
  }

  static create(input: NewTransactionInput): Transaction {
    return new Transaction({ ...input, envelopeId: input.envelopeId ?? null });
  }

  /** Para a camada de dados reconstruir um lançamento gravado. */
  static fromRecord(snapshot: TransactionRecord): Transaction {
    return new Transaction(snapshot);
  }

  toRecord(): TransactionRecord {
    return { ...this.snapshot };
  }

  get id(): string {
    return this.snapshot.id;
  }
  get kind(): TransactionKind {
    return this.snapshot.kind;
  }
  get amountInCents(): number {
    return this.snapshot.amountInCents;
  }
  get date(): string {
    return this.snapshot.date;
  }
  get description(): string {
    return this.snapshot.description;
  }
  get envelopeId(): string | null {
    return this.snapshot.envelopeId;
  }
}
