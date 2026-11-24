import { describeDay } from "../../../shared/day-labels";
import type { Envelope, EnvelopeStatus } from "../../../shared/finance/domain/envelope";
import type { Transaction, TransactionKind } from "../../../shared/finance/domain/transaction";
import { monthOf } from "../../../shared/iso-date";
import { Money } from "./money";

export type ChipView = { text: string; tone: "neg" | "near" | null };

export type EnvelopeRowView = {
  id: string;
  name: string;
  isFixed: boolean;
  spentText: string;
  budgetText: string;
  /** De 0 a 1: o quanto da barra fica preenchido (estourado enche a barra). */
  fillRatio: number;
  status: EnvelopeStatus;
  statusChip: ChipView;
};

export type TransactionRowView = {
  id: string;
  kind: TransactionKind;
  description: string;
  categoryName: string;
  signedAmountText: string;
};

export type TransactionDayGroup = { dayText: string; rows: TransactionRowView[] };

export type MonthSummaryView = {
  incomeText: string;
  expenseText: string;
  savedText: string;
  accountBalanceText: string;
};

/**
 * Os lançamentos, com as contas que se fazem sobre eles (doc/business-rules/finances.md, BR-F04,
 * BR-F05 e BR-F09). Imutável: cada filtro devolve outro `Ledger`, então dá para encadear:
 * `ledger.inMonth(month).ofKind("expense").ofEnvelope(id).totalInCents()`.
 */
export class Ledger {
  private readonly transactions: readonly Transaction[];

  constructor(transactions: readonly Transaction[]) {
    this.transactions = transactions;
  }

  // ------------------------------------------------------------ filtros

  inMonth(month: string): Ledger {
    return this.keeping((transaction) => monthOf(transaction.date) === month);
  }

  ofKind(kind: TransactionKind): Ledger {
    return this.keeping((transaction) => transaction.kind === kind);
  }

  ofEnvelope(envelopeId: string): Ledger {
    return this.keeping((transaction) => transaction.envelopeId === envelopeId);
  }

  // ------------------------------------------------------------ contas

  totalInCents(): number {
    return this.transactions.reduce((total, transaction) => total + transaction.amountInCents, 0);
  }

  /** BR-F04: gasto de um envelope no mês. */
  spentInEnvelope(envelopeId: string, month: string): number {
    return this.inMonth(month).ofKind("expense").ofEnvelope(envelopeId).totalInCents();
  }

  /** BR-F05: saldo inicial mais tudo que entrou, menos tudo que saiu e foi guardado, sem reiniciar por mês. */
  accountBalanceInCents(openingBalanceInCents: number): number {
    return (
      openingBalanceInCents +
      this.ofKind("income").totalInCents() -
      this.ofKind("expense").totalInCents() -
      this.ofKind("saving").totalInCents()
    );
  }

  // ------------------------------------------------------------ o que a tela mostra

  /** BR-F05: o que entrou, saiu e foi guardado no mês, e o saldo em conta. */
  toMonthSummaryView(openingBalanceInCents: number, month: string): MonthSummaryView {
    const monthLedger = this.inMonth(month);
    const whole = (kind: TransactionKind) =>
      Money.ofCents(monthLedger.ofKind(kind).totalInCents()).formatWhole();
    return {
      incomeText: whole("income"),
      expenseText: whole("expense"),
      savedText: whole("saving"),
      accountBalanceText: Money.ofCents(this.accountBalanceInCents(openingBalanceInCents)).format(),
    };
  }

  /** BR-F04: a linha de um envelope, com o gasto do mês, a barra e a situação. */
  toEnvelopeRowView(envelope: Envelope, month: string): EnvelopeRowView {
    const spentInCents = this.spentInEnvelope(envelope.id, month);
    const status = envelope.statusAfterSpending(spentInCents);
    const remainingInCents = envelope.remainingAfterSpending(spentInCents);
    const statusChip: ChipView =
      status === "over-budget"
        ? { text: `Estourou ${Money.ofCents(-remainingInCents).format()}`, tone: "neg" }
        : {
            text: `Restam ${Money.ofCents(remainingInCents).format()}`,
            tone: status === "near-limit" ? "near" : null,
          };
    return {
      id: envelope.id,
      name: envelope.name,
      isFixed: envelope.isFixed,
      spentText: Money.ofCents(spentInCents).formatWhole(),
      budgetText: Money.ofCents(envelope.budgetInCents).formatWhole(),
      fillRatio: Math.min(1, spentInCents / envelope.budgetInCents),
      status,
      statusChip,
    };
  }

  /** BR-F09: agrupados por dia, do mais novo para o mais antigo, com filtro opcional por envelope. */
  groupedByDay(
    envelopes: readonly Envelope[],
    today: string,
    envelopeFilterId: string | null,
  ): TransactionDayGroup[] {
    const shown = (envelopeFilterId === null ? this : this.ofEnvelope(envelopeFilterId))
      .transactions;
    const newestFirst = [...shown].sort((first, second) => second.date.localeCompare(first.date));

    const groups: Array<TransactionDayGroup & { date: string }> = [];
    for (const transaction of newestFirst) {
      const row = this.rowViewOf(transaction, envelopes);
      const lastGroup = groups.at(-1);
      if (lastGroup?.date === transaction.date) lastGroup.rows.push(row);
      else
        groups.push({
          date: transaction.date,
          dayText: describeDay(transaction.date, today),
          rows: [row],
        });
    }
    return groups.map(({ dayText, rows }) => ({ dayText, rows }));
  }

  // ------------------------------------------------------------ por dentro

  private keeping(shouldKeep: (transaction: Transaction) => boolean): Ledger {
    return new Ledger(this.transactions.filter(shouldKeep));
  }

  private rowViewOf(transaction: Transaction, envelopes: readonly Envelope[]): TransactionRowView {
    const envelopeName = envelopes.find((envelope) => envelope.id === transaction.envelopeId)?.name;
    const categoryByKind = { income: "Receita", saving: "Aporte em meta", expense: "Sem envelope" };
    const sign = transaction.kind === "income" ? "+" : "−";
    return {
      id: transaction.id,
      kind: transaction.kind,
      description: transaction.description,
      categoryName: envelopeName ?? categoryByKind[transaction.kind],
      signedAmountText: `${sign} ${Money.ofCents(transaction.amountInCents).format()}`,
    };
  }
}
