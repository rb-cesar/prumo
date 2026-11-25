import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { CyclesData } from "../../data/cycles";
import { type TasksData, tasksKeys } from "../../data/tasks";
import type { TransactionsData } from "../../data/transactions";
import type { Clock } from "../../infra/clock";
import { financeSnapshotQuery } from "../../shared/finance/finance-snapshot";
import { Cycle } from "../../shared/tasks/domain/cycle";
import { loadSettledTasks } from "../../shared/tasks/settle-ended-cycles";
import {
  CycleHistory,
  type CycleRowView,
  type InsightView,
  MonthlyHistory,
  type MonthRowView,
  type ReviewView,
  Timeline,
  type TimelineDayGroup,
} from "./domain";

/** BR-H05: a cronologia mostra 30 eventos por vez. */
const TIMELINE_PAGE_SIZE = 30;

export type HistoryModelDeps = {
  cycles: CyclesData;
  tasks: TasksData;
  transactions: TransactionsData;
  clock: Clock;
};

export type HistoryView = "months" | "cycles" | "timeline";

export type HistoryScreenState =
  | { status: "loading" }
  | { status: "error"; reason: "data-unavailable" }
  | {
      status: "ready";
      view: HistoryView;
      months: { rows: MonthRowView[]; partialNote: string | null; insights: InsightView[] };
      cycles: {
        rows: CycleRowView[];
        insights: InsightView[];
        reviews: ReviewView[];
        weeklyPlanText: string;
      };
      timeline: { groups: TimelineDayGroup[]; hasMore: boolean };
    };

export function useHistoryModel({
  cycles: cyclesData,
  tasks: tasksData,
  transactions: transactionsData,
  clock,
}: HistoryModelDeps) {
  const [view, setView] = useState<HistoryView>("months");
  const [timelineLimit, setTimelineLimit] = useState(TIMELINE_PAGE_SIZE);
  const today = clock.today();

  const financeQuery = useQuery(financeSnapshotQuery(transactionsData));
  // As pendências vêm já acertadas (BR-T08), e só depois se leem os fechamentos (BR-H08), que a
  // própria leitura anota.
  const cyclesQuery = useQuery({
    queryKey: tasksKeys.forHistory,
    queryFn: async () => {
      const tasks = await loadSettledTasks(
        { tasks: tasksData, cycles: cyclesData },
        Cycle.containing(clock.today()),
      );
      const [closings, reviews] = await Promise.all([
        cyclesData.listClosings(),
        cyclesData.listReviews(),
      ]);
      return { tasks, closings, reviews };
    },
  });

  const state: HistoryScreenState = (() => {
    if (financeQuery.isPending || cyclesQuery.isPending) return { status: "loading" } as const;
    if (financeQuery.isError || cyclesQuery.isError) {
      return { status: "error", reason: "data-unavailable" } as const;
    }

    const { envelopes, transactions } = financeQuery.data;
    const { tasks, closings, reviews } = cyclesQuery.data;
    const monthly = new MonthlyHistory(transactions, envelopes, today);
    const cycleHistory = new CycleHistory({
      tasks,
      closings,
      transactions,
      envelopes,
      reviews,
      today,
    });
    const timeline = new Timeline(transactions, envelopes, tasks, today);
    return {
      status: "ready",
      view,
      months: {
        rows: monthly.toRowViews(),
        partialNote: monthly.partialMonthNote(),
        insights: monthly.insights(),
      },
      cycles: {
        rows: cycleHistory.toRowViews(),
        insights: cycleHistory.insights(),
        reviews: cycleHistory.toReviewViews(),
        weeklyPlanText: cycleHistory.weeklyPlanText,
      },
      timeline: {
        groups: timeline.toDayGroups(timelineLimit),
        hasMore: timeline.count > timelineLimit,
      },
    } as const;
  })();

  return {
    state,
    controls: {
      selectView: setView,
      /** BR-H05: "Ver mais" traz mais 30 eventos. */
      showMoreTimeline: () => setTimelineLimit((current) => current + TIMELINE_PAGE_SIZE),
    },
  };
}
