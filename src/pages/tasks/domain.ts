/**
 * Regras de exibição da tela de pendências: o que mostrar, em que ordem e com que texto.
 * Regra pura (sem tela, banco ou relógio); "hoje" entra por parâmetro.
 */

import { daysBetween, parseIsoDate } from "../../shared/iso-date";
import type { Cycle } from "../../shared/tasks/domain/cycle";
import {
  type MoneyDirection,
  sortTasksForList,
  type Task,
  type TaskStage,
} from "../../shared/tasks/domain/task";

export type TaskScope = "cycle" | "backlog";
export type TaskFilter = "all" | "money" | "high";

export type ChipView = { text: string; tone: "neg" | "near" | "pos" | "steel" | null };

export type TaskRowView = {
  id: string;
  title: string;
  stage: TaskStage;
  isDone: boolean;
  chips: ChipView[];
  money: { amountText: string; label: string; direction: MoneyDirection } | null;
};

const WEEKDAY_NAMES_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
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

/** "Hoje", "Ontem", "Amanhã" ou, por exemplo, "qua, 18 nov". */
export function describeDay(isoDate: string, today: string): string {
  const daysFromToday = daysBetween(today, isoDate);
  if (daysFromToday === 0) return "Hoje";
  if (daysFromToday === -1) return "Ontem";
  if (daysFromToday === 1) return "Amanhã";
  const date = parseIsoDate(isoDate);
  return `${WEEKDAY_NAMES_SHORT[date.getUTCDay()]}, ${date.getUTCDate()} ${MONTH_NAMES_SHORT[date.getUTCMonth()]}`;
}

/** "R$ 1.234,56", a partir de centavos inteiros. */
export function formatMoneyFromCents(amountInCents: number): string {
  const reais = Math.floor(amountInCents / 100);
  const cents = String(amountInCents % 100).padStart(2, "0");
  return `R$ ${reais.toLocaleString("pt-BR")},${cents}`;
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
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

export function applyTaskFilter(tasks: readonly Task[], filter: TaskFilter): Task[] {
  if (filter === "money") return tasks.filter((task) => task.money !== null);
  if (filter === "high") return tasks.filter((task) => task.priority === "high");
  return [...tasks];
}

export function tasksInCycle(tasks: readonly Task[], cycle: Cycle): Task[] {
  return tasks.filter((task) => task.cycle?.equals(cycle) === true);
}

export function tasksInBacklog(tasks: readonly Task[]): Task[] {
  return tasks.filter((task) => task.isInBacklog);
}

/** Pendências de uma etapa, no filtro escolhido, na ordem da lista (BR-T05). */
export function visibleTasks(tasks: readonly Task[], filter: TaskFilter): Task[] {
  return sortTasksForList(applyTaskFilter(tasks, filter));
}

function moneyLabel(direction: MoneyDirection, isDone: boolean): string {
  if (direction === "income") return isDone ? "recebido" : "a receber";
  return isDone ? "pago" : "a pagar";
}

/** Tudo o que a linha de uma pendência mostra, já decidido. A linha só desenha. */
export function toTaskRowView(task: Task, today: string): TaskRowView {
  const isDone = task.stage === "done";
  const chips: ChipView[] = [];

  if (task.dueDate !== null && !isDone) {
    const overdueDays = task.overdueDays(today);
    if (overdueDays !== null) {
      chips.push({
        text: `Atrasada ${overdueDays} ${overdueDays === 1 ? "dia" : "dias"}`,
        tone: "neg",
      });
    } else {
      const isToday = task.dueDate === today;
      chips.push({ text: describeDay(task.dueDate, today), tone: isToday ? "near" : null });
    }
  }
  if (task.priority === "high" && !isDone) chips.push({ text: "Alta", tone: "near" });

  const { money } = task;
  return {
    id: task.id,
    title: task.title,
    stage: task.stage,
    isDone,
    chips,
    money:
      money === null
        ? null
        : {
            amountText: formatMoneyFromCents(money.amountInCents),
            label: moneyLabel(money.direction, isDone),
            direction: money.direction,
          },
  };
}

export type TaskDetailView = {
  title: string;
  stage: TaskStage;
  /** Fazendo só existe dentro de um ciclo. */
  canBeDoing: boolean;
  isInBacklog: boolean;
  canMoveToBacklog: boolean;
  /** Pares de termo e valor, só do que a pendência tem. */
  rows: Array<[term: string, value: string]>;
};

const PRIORITY_NAMES: Record<string, string> = { high: "Alta", medium: "Média", low: "Baixa" };

/** Tudo o que a folha de detalhes mostra, já decidido. */
export function toTaskDetailView(task: Task, today: string): TaskDetailView {
  const dueText =
    task.dueDate === null
      ? "Sem prazo"
      : `${describeDay(task.dueDate, today)}${task.isOverdue(today) ? " (atrasada)" : ""}`;
  const rows: TaskDetailView["rows"] = [
    ["Prazo", dueText],
    ["Prioridade", PRIORITY_NAMES[task.priority] ?? task.priority],
    ["Onde está", task.cycle === null ? "Backlog" : `Ciclo ${task.cycle.label}`],
  ];
  if (task.money !== null) {
    const directionText = task.money.direction === "income" ? "a receber" : "a pagar";
    rows.push(["Valor", `${formatMoneyFromCents(task.money.amountInCents)} ${directionText}`]);
  }
  return {
    title: task.title,
    stage: task.stage,
    canBeDoing: !task.isInBacklog,
    isInBacklog: task.isInBacklog,
    canMoveToBacklog: !task.isInBacklog && task.stage !== "done",
    rows,
  };
}
