import { describeDay } from "../../../shared/day-labels";
import type { Envelope } from "../../../shared/finance/domain/envelope";
import { Ledger } from "../../../shared/finance/domain/ledger";
import { Money } from "../../../shared/finance/domain/money";
import type { Transaction } from "../../../shared/finance/domain/transaction";
import { WeeklyPlan, type WeeklySpendingTone } from "../../../shared/finance/domain/weekly-plan";
import { Cycle } from "../../../shared/tasks/domain/cycle";
import type { CycleReview } from "../../../shared/tasks/domain/cycle-review";
import type { Task } from "../../../shared/tasks/domain/task";
import type { InsightView } from "./insight";

/** BR-H04: sem pelo menos 3 ciclos fechados, não há insight. */
const MIN_CLOSED_CYCLES_FOR_INSIGHTS = 3;

/** O fechamento anotado de um ciclo (BR-H08); `plannedCount` nulo = desconhecido. */
export type CycleClosingInput = { cycleStart: string; plannedCount: number | null };

export type CycleRowView = {
  /** O domingo que começa o ciclo. */
  cycleStart: string;
  /** "Ciclo 22 a 28 nov". */
  title: string;
  isCurrent: boolean;
  /** "3/9". */
  doneText: string;
  doneRatio: number;
  /** Todas as pendências do ciclo foram concluídas. */
  isAllDone: boolean;
  /** "R$ 412", o gasto do dia a dia no ciclo. */
  spentText: string;
  spentRatio: number;
  spentTone: WeeklySpendingTone;
};

export type ReviewView = {
  cycleStart: string;
  /** "Revisão do ciclo 22 a 28 nov · sáb, 28 nov". */
  title: string;
  worked: string;
  hindered: string;
  changeNext: string;
};

type CycleNumbers = {
  cycle: Cycle;
  isCurrent: boolean;
  plannedCount: number;
  doneCount: number;
  spentInCents: number;
};

export type CycleHistoryInput = {
  tasks: readonly Task[];
  closings: readonly CycleClosingInput[];
  transactions: readonly Transaction[];
  envelopes: readonly Envelope[];
  reviews: readonly CycleReview[];
  today: string;
};

function averageOf(numbers: readonly number[]): number {
  return numbers.reduce((total, value) => total + value, 0) / numbers.length;
}

/** Os ciclos derivados das pendências, do fechamento anotado e dos lançamentos (BR-H03, BR-H04 e BR-H06). Imutável. */
export class CycleHistory {
  private readonly input: CycleHistoryInput;
  private readonly ledger: Ledger;
  private readonly currentCycle: Cycle;

  constructor(input: CycleHistoryInput) {
    this.input = input;
    this.ledger = new Ledger(input.transactions);
    this.currentCycle = Cycle.containing(input.today);
  }

  /** O ciclo de hoje primeiro, depois os fechados do mais novo para o mais antigo. */
  toRowViews(): CycleRowView[] {
    return this.allCycleNumbers().map((numbers) => this.rowViewOf(numbers));
  }

  /** BR-H04: só com 3 ciclos fechados. */
  insights(): InsightView[] {
    const closed = this.allCycleNumbers().filter((numbers) => !numbers.isCurrent);
    if (closed.length < MIN_CLOSED_CYCLES_FOR_INSIGHTS) return [];

    const totalPlanned = closed.reduce((total, numbers) => total + numbers.plannedCount, 0);
    const totalDone = closed.reduce((total, numbers) => total + numbers.doneCount, 0);
    const bestThroughput = Math.max(...closed.map((numbers) => numbers.doneCount));
    const insights: InsightView[] = [
      {
        tone: "steel",
        title: `Você concluiu ${Math.round((totalDone / totalPlanned) * 100)}% do que planejou`,
        text: `Nos últimos ${closed.length} ciclos. Seu melhor ciclo fechou ${bestThroughput} pendências; planejar bem mais que isso costuma não fechar.`,
      },
    ];

    const completed = closed.filter((numbers) => numbers.doneCount === numbers.plannedCount);
    const unfinished = closed.filter((numbers) => numbers.doneCount < numbers.plannedCount);
    if (completed.length > 0 && unfinished.length > 0) {
      const spendingDifferenceInCents =
        averageOf(unfinished.map((numbers) => numbers.spentInCents)) -
        averageOf(completed.map((numbers) => numbers.spentInCents));
      if (spendingDifferenceInCents > 0) {
        insights.push({
          tone: "pos",
          title: "Semana organizada, gasto menor",
          text: `Nos ${completed.length} ciclos em que você fechou tudo, o gasto do dia a dia foi em média ${Money.ofCents(Math.round(spendingDifferenceInCents)).formatWhole()} menor.`,
        });
      }
    }
    return insights;
  }

  /** As revisões salvas, da mais nova para a mais antiga. */
  toReviewViews(): ReviewView[] {
    return [...this.input.reviews]
      .sort((first, second) => second.cycle.start.localeCompare(first.cycle.start))
      .map((review) => ({
        cycleStart: review.cycle.start,
        title: `Revisão do ciclo ${review.cycle.label} · ${describeDay(review.savedOn, this.input.today).toLowerCase()}`,
        worked: review.worked,
        hindered: review.hindered,
        changeNext: review.changeNext,
      }));
  }

  /** "Plano do dia a dia: R$ 665 por semana, fora moradia." */
  get weeklyPlanText(): string {
    const plan = new WeeklyPlan(this.input.envelopes, this.input.today);
    return `Plano do dia a dia: ${Money.ofCents(plan.perWeekInCents).formatWhole()} por semana, fora moradia.`;
  }

  // ------------------------------------------------------------ por dentro

  private allCycleNumbers(): CycleNumbers[] {
    const closedNumbers = this.input.closings
      .filter(
        (closing) =>
          closing.plannedCount !== null &&
          closing.plannedCount > 0 &&
          closing.cycleStart < this.currentCycle.start,
      )
      .sort((first, second) => second.cycleStart.localeCompare(first.cycleStart))
      .map((closing) =>
        this.numbersOf(Cycle.startingOn(closing.cycleStart), false, closing.plannedCount ?? 0),
      );
    const currentPlanned = this.tasksInCycle(this.currentCycle).length;
    return [this.numbersOf(this.currentCycle, true, currentPlanned), ...closedNumbers];
  }

  private tasksInCycle(cycle: Cycle): Task[] {
    return this.input.tasks.filter((task) => task.cycle?.start === cycle.start);
  }

  private numbersOf(cycle: Cycle, isCurrent: boolean, plannedCount: number): CycleNumbers {
    const plan = new WeeklyPlan(this.input.envelopes, cycle.start);
    return {
      cycle,
      isCurrent,
      plannedCount,
      doneCount: this.tasksInCycle(cycle).filter((task) => task.stage === "done").length,
      spentInCents: this.ledger
        .ofKind("expense")
        .ofEnvelopes(plan.everydayEnvelopeIds)
        .between(cycle.start, cycle.end)
        .totalInCents(),
    };
  }

  private rowViewOf(numbers: CycleNumbers): CycleRowView {
    const plan = new WeeklyPlan(this.input.envelopes, numbers.cycle.start);
    const doneRatio = numbers.plannedCount === 0 ? 0 : numbers.doneCount / numbers.plannedCount;
    return {
      cycleStart: numbers.cycle.start,
      title: `Ciclo ${numbers.cycle.label}`,
      isCurrent: numbers.isCurrent,
      doneText: `${numbers.doneCount}/${numbers.plannedCount}`,
      doneRatio,
      isAllDone: numbers.plannedCount > 0 && numbers.doneCount === numbers.plannedCount,
      spentText: Money.ofCents(numbers.spentInCents).formatWhole(),
      spentRatio: plan.fillRatioFor(numbers.spentInCents),
      spentTone: plan.toneFor(numbers.spentInCents),
    };
  }
}
