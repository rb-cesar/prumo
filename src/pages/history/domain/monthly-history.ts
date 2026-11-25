import { describeMonth, shortMonthName } from "../../../shared/day-labels";
import type { Envelope } from "../../../shared/finance/domain/envelope";
import { Ledger } from "../../../shared/finance/domain/ledger";
import { Money } from "../../../shared/finance/domain/money";
import type { Transaction } from "../../../shared/finance/domain/transaction";
import { monthOf, parseIsoDate } from "../../../shared/iso-date";
import type { InsightView } from "./insight";

/** BR-H01: os últimos 6 meses com movimento. */
const MONTHS_SHOWN = 6;
/** BR-H02: sem pelo menos 2 meses fechados com entrada, não há insight. */
const MIN_CLOSED_MONTHS_FOR_INSIGHTS = 2;
/** BR-H02: o envelope só é apontado se passou do limite em 3 ou mais meses. */
const MIN_MONTHS_OVER_BUDGET_TO_POINT_OUT = 3;

/** Uma linha da visão Meses: o que entrou, saiu e foi guardado. */
export type MonthRowView = {
  /** `AAAA-MM`. */
  month: string;
  /** "nov". */
  label: string;
  /** O mês de hoje ainda não acabou. */
  isPartial: boolean;
  incomeInCents: number;
  expenseInCents: number;
  savedInCents: number;
  incomeText: string;
  expenseText: string;
  savedText: string;
  /** "63%", ou "—" se o mês não teve entrada. */
  rateText: string;
};

function nextMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number) as [number, number];
  return monthNumber === 12
    ? `${year + 1}-01`
    : `${year}-${String(monthNumber + 1).padStart(2, "0")}`;
}

function percentText(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

/** Os meses derivados dos lançamentos, e o que se tira deles (doc/business-rules/history.md, BR-H01 e BR-H02). Imutável. */
export class MonthlyHistory {
  private readonly ledger: Ledger;
  private readonly envelopes: readonly Envelope[];
  private readonly today: string;
  private readonly firstMonthWithMovement: string | null;

  constructor(transactions: readonly Transaction[], envelopes: readonly Envelope[], today: string) {
    this.ledger = new Ledger(transactions);
    this.envelopes = envelopes;
    this.today = today;
    this.firstMonthWithMovement =
      transactions.length === 0
        ? null
        : monthOf([...transactions].map((transaction) => transaction.date).sort()[0] ?? today);
  }

  /** Os últimos 6 meses a partir do primeiro com lançamento, do mais antigo ao atual. */
  toRowViews(): MonthRowView[] {
    if (this.firstMonthWithMovement === null) return [];
    const currentMonth = monthOf(this.today);
    const months: string[] = [];
    for (let month = this.firstMonthWithMovement; month <= currentMonth; month = nextMonth(month)) {
      months.push(month);
    }
    return months.slice(-MONTHS_SHOWN).map((month) => this.rowViewOf(month, currentMonth));
  }

  /** "* Novembro até o dia 25", ou `null` se o mês atual não aparece. */
  partialMonthNote(): string | null {
    const currentMonth = monthOf(this.today);
    if (!this.toRowViews().some((row) => row.month === currentMonth)) return null;
    const name = describeMonth(this.today).split(" de ")[0] ?? "";
    return `* ${name} até o dia ${parseIsoDate(this.today).getUTCDate()}.`;
  }

  /** BR-H02: só com 2 meses fechados com entrada. */
  insights(): InsightView[] {
    const rows = this.toRowViews();
    const closedRows = rows.filter((row) => !row.isPartial && row.incomeInCents > 0);
    if (closedRows.length < MIN_CLOSED_MONTHS_FOR_INSIGHTS) return [];

    const ratios = closedRows.map((row) => row.savedInCents / row.incomeInCents);
    const averageRatio = ratios.reduce((total, ratio) => total + ratio, 0) / ratios.length;
    const lowestRatio = Math.min(...ratios);
    const worstRow = closedRows[ratios.indexOf(lowestRatio)];
    const insights: InsightView[] = [
      {
        tone: "steel",
        title: `Você guarda ${percentText(averageRatio)} da renda`,
        text: `Média dos últimos ${closedRows.length} meses fechados. O pior foi ${worstRow?.label ?? ""}, com ${percentText(lowestRatio)}.`,
      },
    ];

    const mostOverBudget = this.envelopeThatMostOverran(rows);
    if (mostOverBudget !== null) {
      const { envelope, monthsOver } = mostOverBudget;
      insights.push({
        tone: "near",
        title: `${envelope.name} passou do limite em ${monthsOver} de ${rows.length} meses`,
        text: `O limite é ${Money.ofCents(envelope.budgetInCents).formatWhole()}. Vale subir o limite ou rever esses gastos, em vez de estourar de novo.`,
      });
    }
    return insights;
  }

  private rowViewOf(month: string, currentMonth: string): MonthRowView {
    const monthLedger = this.ledger.inMonth(month);
    const incomeInCents = monthLedger.ofKind("income").totalInCents();
    const expenseInCents = monthLedger.ofKind("expense").totalInCents();
    const savedInCents = monthLedger.ofKind("saving").totalInCents();
    const whole = (cents: number) => Money.ofCents(cents).formatWhole();
    return {
      month,
      label: shortMonthName(`${month}-01`),
      isPartial: month === currentMonth,
      incomeInCents,
      expenseInCents,
      savedInCents,
      incomeText: whole(incomeInCents),
      expenseText: whole(expenseInCents),
      savedText: whole(savedInCents),
      rateText: incomeInCents > 0 ? percentText(savedInCents / incomeInCents) : "—",
    };
  }

  /** O envelope do dia a dia que mais passou do limite, se foi em 3 ou mais meses. */
  private envelopeThatMostOverran(
    rows: readonly MonthRowView[],
  ): { envelope: Envelope; monthsOver: number } | null {
    let mostOverBudget: { envelope: Envelope; monthsOver: number } | null = null;
    for (const envelope of this.envelopes.filter((candidate) => !candidate.isFixed)) {
      const monthsOver = rows.filter(
        (row) => this.ledger.spentInEnvelope(envelope.id, row.month) > envelope.budgetInCents,
      ).length;
      const beatsCurrentWorst = monthsOver > (mostOverBudget?.monthsOver ?? 0);
      if (monthsOver >= MIN_MONTHS_OVER_BUDGET_TO_POINT_OUT && beatsCurrentWorst) {
        mostOverBudget = { envelope, monthsOver };
      }
    }
    return mostOverBudget;
  }
}
