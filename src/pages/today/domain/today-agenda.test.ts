import { describe, expect, it } from "vitest";
import { Cycle } from "../../../shared/tasks/domain/cycle";
import { Task } from "../../../shared/tasks/domain/task";
import { TodayAgenda } from "./today-agenda";

const today = "2026-11-13";
const currentCycle = Cycle.containing(today);

function taskDueOn(
  id: string,
  dueDate: string | null,
  extra: Partial<Parameters<typeof Task.create>[0]> = {},
) {
  return Task.create({ id, title: `Pendência ${id}`, dueDate, cycle: currentCycle, ...extra });
}

function agendaOf(...tasks: Task[]) {
  return new TodayAgenda(tasks, today);
}

describe("TodayAgenda: para hoje", () => {
  it("junta as de prazo vencido ou de hoje e as que estão em Fazendo, por prazo", () => {
    const overdue = taskDueOn("overdue", "2026-11-10");
    const dueToday = taskDueOn("today", today);
    const doing = taskDueOn("doing", null).moveToStage("doing", today);
    const later = taskDueOn("later", "2026-11-14");

    const ids = agendaOf(later, dueToday, doing, overdue).focusTasks.map((task) => task.id);

    expect(ids).toEqual(["overdue", "today", "doing"]);
  });

  it("não mostra pendência concluída, mesmo vencida", () => {
    const done = taskDueOn("done", "2026-11-10").moveToStage("done", today);

    expect(agendaOf(done).focusTasks).toEqual([]);
  });

  it("não mostra pendência sem prazo que não está em Fazendo", () => {
    expect(agendaOf(taskDueOn("none", null)).focusTasks).toEqual([]);
  });

  it("descreve a linha: prazo, prioridade e valor", () => {
    const overdueBill = taskDueOn("bill", "2026-11-11", {
      priority: "high",
      money: { amountInCents: 18740, direction: "expense", envelopeId: null },
    });

    expect(agendaOf(overdueBill).toFocusRowViews()).toEqual([
      {
        id: "bill",
        title: "Pendência bill",
        stage: "todo",
        chips: [
          { text: "Atrasada 2 dias", tone: "neg" },
          { text: "Alta", tone: "near" },
        ],
        money: { amountText: "R$ 187,40", label: "a pagar", direction: "expense" },
      },
    ]);
  });

  it("destaca em amarelo o que vence hoje", () => {
    const [row] = agendaOf(taskDueOn("a", today)).toFocusRowViews();

    expect(row?.chips).toEqual([{ text: "Hoje", tone: "near" }]);
  });
});

describe("TodayAgenda: próximos 7 dias", () => {
  it("pega os prazos de amanhã até daqui a 7 dias, por prazo", () => {
    const inEightDays = taskDueOn("far", "2026-11-21");
    const inSevenDays = taskDueOn("seven", "2026-11-20");
    const tomorrow = taskDueOn("tomorrow", "2026-11-14");

    const ids = agendaOf(inEightDays, inSevenDays, tomorrow).upcomingTasks.map((task) => task.id);

    expect(ids).toEqual(["tomorrow", "seven"]);
  });

  it("não repete o que já está em 'Para hoje'", () => {
    const doingTomorrow = taskDueOn("doing", "2026-11-14").moveToStage("doing", today);

    expect(agendaOf(doingTomorrow).upcomingTasks).toEqual([]);
  });

  it("mostra o dia e o valor, com + nas entradas", () => {
    const salary = taskDueOn("salary", "2026-11-14", {
      money: { amountInCents: 620000, direction: "income", envelopeId: null },
    });
    const noMoney = taskDueOn("plain", "2026-11-15");

    expect(agendaOf(salary, noMoney).toUpcomingRowViews()).toEqual([
      {
        id: "salary",
        title: "Pendência salary",
        dayText: "Amanhã",
        amountText: "+R$ 6.200,00",
        direction: "income",
      },
      {
        id: "plain",
        title: "Pendência plain",
        dayText: "dom, 15 nov",
        amountText: null,
        direction: null,
      },
    ]);
  });
});

describe("TodayAgenda: a pagar em 7 dias", () => {
  const expenseOf = (id: string, dueDate: string | null, amountInCents: number) =>
    taskDueOn(id, dueDate, { money: { amountInCents, direction: "expense", envelopeId: null } });

  it("soma os gastos vencidos e os que vencem na semana", () => {
    const overdue = expenseOf("a", "2026-11-10", 10000);
    const dueSoon = expenseOf("b", "2026-11-20", 2500);

    expect(agendaOf(overdue, dueSoon).amountDueSoonInCents).toBe(12500);
  });

  it("deixa de fora o que vence depois, o que não tem prazo, as entradas e as concluídas", () => {
    const later = expenseOf("later", "2026-11-21", 9999);
    const noDueDate = expenseOf("none", null, 9999);
    const income = taskDueOn("income", "2026-11-14", {
      money: { amountInCents: 9999, direction: "income", envelopeId: null },
    });
    const done = expenseOf("done", "2026-11-14", 9999).moveToStage("done", today);

    expect(agendaOf(later, noDueDate, income, done).amountDueSoonInCents).toBe(0);
  });
});
