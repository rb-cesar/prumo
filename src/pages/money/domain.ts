/**
 * Regras de cálculo e de exibição da tela de finanças (doc/business-rules/finances.md).
 * Regra pura (sem tela, banco ou relógio); "hoje" entra por parâmetro.
 */
import type { Envelope, EnvelopeStatus } from "../../shared/finance/domain/envelope";
import type { Transaction, TransactionKind } from "../../shared/finance/domain/transaction";
import { daysBetween, parseIsoDate } from "../../shared/iso-date";
import type { Task } from "../../shared/tasks/domain/task";

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

export type PayableRowView = {
  id: string;
  title: string;
  dayText: string;
  amountText: string;
  direction: "expense" | "income";
};

export type MonthSummaryView = {
  incomeText: string;
  expenseText: string;
  savedText: string;
  accountBalanceText: string;
};

const MONTH_NAMES_SHORT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];
const MONTH_NAMES_LONG = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];
const WEEKDAY_NAMES_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

// ---------------------------------------------------------------- calendário

/** O mês de um dia, no formato `AAAA-MM`. */
export function monthOf(isoDate: string): string {
  return isoDate.slice(0, 7);
}

function daysInMonthOf(isoDate: string): number {
  const date = parseIsoDate(isoDate);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
}

/** "novembro de 2026". */
export function describeMonth(isoDate: string): string {
  const date = parseIsoDate(isoDate);
  return `${MONTH_NAMES_LONG[date.getUTCMonth()]} de ${date.getUTCFullYear()}`;
}

/** Nome do mês sozinho, para títulos como "Envelopes de novembro". */
export function monthName(isoDate: string): string {
  return MONTH_NAMES_LONG[parseIsoDate(isoDate).getUTCMonth()] ?? "";
}

/** "Hoje", "Ontem", "Amanhã" ou, por exemplo, "qua, 18 nov". */
export function describeDay(isoDate: string, today: string): string {
  const daysFromToday = daysBetween(today, isoDate);
  if (daysFromToday === 0) return "Hoje";
  if (daysFromToday === -1) return "Ontem";
  if (daysFromToday === 1) return "Amanhã";
  const date = parseIsoDate(isoDate);
  return `${WEEKDAY_NAMES_SHORT[date.getUTCDay()]}, ${date.getUTCDate()} ${MONTH_NAMES_SHORT[date.getUTCMonth()]}`;
}

// ---------------------------------------------------------------- dinheiro

/** "R$ 1.234,56", ou "−R$ 12,00" se negativo, a partir de centavos inteiros. */
export function formatMoneyFromCents(amountInCents: number): string {
  const sign = amountInCents < 0 ? "−" : "";
  const absolute = Math.abs(amountInCents);
  const reais = Math.floor(absolute / 100);
  const cents = String(absolute % 100).padStart(2, "0");
  return `${sign}R$ ${reais.toLocaleString("pt-BR")},${cents}`;
}

/** Lê o que a pessoa digitou ("45,90", "1.200", "120.5") e devolve centavos, ou `null` se não for um valor. */
export function parseMoneyToCents(text: string): number | null {
  const cleaned = text.trim().replace(/[^\d,.]/g, "");
  if (cleaned === "") return null;
  const usesThousandsDots = /^\d{1,3}(\.\d{3})+$/.test(cleaned);
  const hasDecimalComma = cleaned.includes(",");
  let normalized = cleaned;
  if (hasDecimalComma) normalized = cleaned.replace(/\./g, "").replace(",", ".");
  else if (usesThousandsDots) normalized = cleaned.replace(/\./g, "");
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

// ---------------------------------------------------------------- contas do mês

function sumAmounts(transactions: readonly Transaction[]): number {
  return transactions.reduce((total, transaction) => total + transaction.amountInCents, 0);
}

/** BR-F04: gasto de um envelope no mês. */
export function spentInEnvelope(
  transactions: readonly Transaction[],
  envelopeId: string,
  month: string,
): number {
  return sumAmounts(
    transactions.filter(
      (transaction) =>
        transaction.kind === "expense" &&
        transaction.envelopeId === envelopeId &&
        monthOf(transaction.date) === month,
    ),
  );
}

/** BR-F05: o que entrou, saiu e foi guardado no mês. */
export function monthlyTotals(transactions: readonly Transaction[], month: string) {
  const inMonth = transactions.filter((transaction) => monthOf(transaction.date) === month);
  const totalOf = (kind: TransactionKind) =>
    sumAmounts(inMonth.filter((transaction) => transaction.kind === kind));
  return {
    incomeInCents: totalOf("income"),
    expenseInCents: totalOf("expense"),
    savedInCents: totalOf("saving"),
  };
}

/** BR-F05: saldo inicial mais tudo que entrou, menos tudo que saiu e foi guardado, sem reiniciar por mês. */
export function accountBalanceInCents(
  openingBalanceInCents: number,
  transactions: readonly Transaction[],
): number {
  const totalOf = (kind: TransactionKind) =>
    sumAmounts(transactions.filter((transaction) => transaction.kind === kind));
  return openingBalanceInCents + totalOf("income") - totalOf("expense") - totalOf("saving");
}

export type EverydayAllowance = {
  budgetInCents: number;
  spentInCents: number;
  remainingInCents: number;
  daysLeftInMonth: number;
  /** Falso quando o dia a dia já gastou tudo (restante zero ou negativo). */
  hasRoomToSpend: boolean;
  allowancePerDayInCents: number;
};

/** BR-F06 e BR-F08: quanto dá para gastar hoje nos envelopes do dia a dia, somados. */
export function everydayAllowance(
  envelopes: readonly Envelope[],
  transactions: readonly Transaction[],
  today: string,
): EverydayAllowance {
  const month = monthOf(today);
  const everydayEnvelopes = envelopes.filter((envelope) => !envelope.isFixed);
  const budgetInCents = everydayEnvelopes.reduce(
    (total, envelope) => total + envelope.budgetInCents,
    0,
  );
  const spentInCents = everydayEnvelopes.reduce(
    (total, envelope) => total + spentInEnvelope(transactions, envelope.id, month),
    0,
  );
  const remainingInCents = budgetInCents - spentInCents;
  const daysLeftInMonth = daysInMonthOf(today) - parseIsoDate(today).getUTCDate() + 1;
  const hasRoomToSpend = remainingInCents > 0;
  return {
    budgetInCents,
    spentInCents,
    remainingInCents,
    daysLeftInMonth,
    hasRoomToSpend,
    allowancePerDayInCents: hasRoomToSpend ? Math.floor(remainingInCents / daysLeftInMonth) : 0,
  };
}

// ---------------------------------------------------------------- o que a tela mostra

export function toMonthSummaryView(
  transactions: readonly Transaction[],
  openingBalanceInCents: number,
  month: string,
): MonthSummaryView {
  const totals = monthlyTotals(transactions, month);
  return {
    incomeText: formatMoneyFromCents(totals.incomeInCents),
    expenseText: formatMoneyFromCents(totals.expenseInCents),
    savedText: formatMoneyFromCents(totals.savedInCents),
    accountBalanceText: formatMoneyFromCents(
      accountBalanceInCents(openingBalanceInCents, transactions),
    ),
  };
}

export function toEnvelopeRowView(
  envelope: Envelope,
  transactions: readonly Transaction[],
  month: string,
): EnvelopeRowView {
  const spentInCents = spentInEnvelope(transactions, envelope.id, month);
  const status = envelope.statusAfterSpending(spentInCents);
  const remainingInCents = envelope.remainingAfterSpending(spentInCents);
  const statusChip: ChipView =
    status === "over-budget"
      ? { text: `Estourou ${formatMoneyFromCents(-remainingInCents)}`, tone: "neg" }
      : {
          text: `Restam ${formatMoneyFromCents(remainingInCents)}`,
          tone: status === "near-limit" ? "near" : null,
        };
  return {
    id: envelope.id,
    name: envelope.name,
    isFixed: envelope.isFixed,
    spentText: formatMoneyFromCents(spentInCents),
    budgetText: formatMoneyFromCents(envelope.budgetInCents),
    fillRatio: Math.min(1, spentInCents / envelope.budgetInCents),
    status,
    statusChip,
  };
}

function toTransactionRowView(
  transaction: Transaction,
  envelopes: readonly Envelope[],
): TransactionRowView {
  const envelopeName = envelopes.find((envelope) => envelope.id === transaction.envelopeId)?.name;
  const categoryByKind = { income: "Receita", saving: "Aporte em meta", expense: "Sem envelope" };
  const sign = transaction.kind === "income" ? "+" : "−";
  return {
    id: transaction.id,
    kind: transaction.kind,
    description: transaction.description,
    categoryName: envelopeName ?? categoryByKind[transaction.kind],
    signedAmountText: `${sign} ${formatMoneyFromCents(transaction.amountInCents)}`,
  };
}

/** BR-F09: lançamentos agrupados por dia, do mais novo para o mais antigo, com filtro opcional por envelope. */
export function groupTransactionsByDay(
  transactions: readonly Transaction[],
  envelopes: readonly Envelope[],
  today: string,
  envelopeFilterId: string | null,
): TransactionDayGroup[] {
  const shown = transactions
    .filter(
      (transaction) => envelopeFilterId === null || transaction.envelopeId === envelopeFilterId,
    )
    .sort((first, second) => second.date.localeCompare(first.date));
  const groups: Array<TransactionDayGroup & { date: string }> = [];
  for (const transaction of shown) {
    const row = toTransactionRowView(transaction, envelopes);
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

/** BR-F10: pendências abertas com valor, por prazo (sem prazo por último). */
export function toPayableRowViews(tasks: readonly Task[], today: string): PayableRowView[] {
  const openTasksWithMoney = tasks.filter((task) => task.stage !== "done" && task.money !== null);
  return [...openTasksWithMoney]
    .sort((first, second) => (first.dueDate ?? "9").localeCompare(second.dueDate ?? "9"))
    .flatMap((task) =>
      task.money === null
        ? []
        : [
            {
              id: task.id,
              title: task.title,
              dayText: task.dueDate === null ? "Sem prazo" : describeDay(task.dueDate, today),
              amountText: formatMoneyFromCents(task.money.amountInCents),
              direction: task.money.direction,
            },
          ],
    );
}
