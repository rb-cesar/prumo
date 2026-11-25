import { describe, expect, it } from "vitest";
import { Transaction } from "../../../shared/finance/domain/transaction";
import { Goal } from "../../../shared/goals/domain/goal";
import { FocusGoal } from "./focus-goal";

const today = "2026-11-13";

function goal(id: string, dueDate: string, initialSavedInCents = 0) {
  return Goal.fromRecord({
    id,
    title: `Meta ${id}`,
    targetInCents: 100000,
    initialSavedInCents,
    dueDate,
  });
}

describe("FocusGoal (BR-M08)", () => {
  it("sem nenhuma meta, avisa que não há metas", () => {
    expect(new FocusGoal([], [], today).toView()).toEqual({ status: "no-goals" });
  });

  it("escolhe a meta não concluída com o prazo mais próximo", () => {
    const view = new FocusGoal(
      [goal("far", "2027-06-30"), goal("near", "2026-12-20"), goal("middle", "2027-01-31")],
      [],
      today,
    );

    expect(view.toView()).toMatchObject({ status: "in-focus", title: "Meta near" });
  });

  it("pula a meta concluída, mesmo com o prazo mais próximo", () => {
    const view = new FocusGoal(
      [goal("done", "2026-11-20", 100000), goal("open", "2027-03-01")],
      [],
      today,
    );

    expect(view.toView()).toMatchObject({ title: "Meta open" });
  });

  it("uma meta vencida e não concluída continua em foco", () => {
    const view = new FocusGoal([goal("late", "2026-11-01"), goal("open", "2027-03-01")], [], today);

    expect(view.toView()).toMatchObject({ title: "Meta late", timeLeftText: "prazo vencido" });
  });

  it("mostra o progresso com os aportes e o prazo", () => {
    const contribution = Transaction.create({
      id: "tx-1",
      kind: "saving",
      amountInCents: 25000,
      date: today,
      description: "Aporte",
      goalId: "trip",
    });

    const view = new FocusGoal([goal("trip", "2026-12-13")], [contribution], today).toView();

    expect(view).toEqual({
      status: "in-focus",
      title: "Meta trip",
      percentText: "25%",
      ratio: 0.25,
      savedText: "R$ 250,00 de R$ 1.000,00",
      timeLeftText: "faltam 30 dias",
    });
  });

  it("com todas as metas concluídas, avisa", () => {
    const view = new FocusGoal([goal("done", "2026-11-20", 100000)], [], today);

    expect(view.toView()).toEqual({ status: "all-completed" });
  });
});
