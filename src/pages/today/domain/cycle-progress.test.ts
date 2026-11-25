import { describe, expect, it } from "vitest";
import { Cycle } from "../../../shared/tasks/domain/cycle";
import { Task } from "../../../shared/tasks/domain/task";
import { CycleProgress } from "./cycle-progress";

const today = "2026-11-13";
const currentCycle = Cycle.containing(today);

function taskIn(id: string, cycle: Cycle | null) {
  return Task.create({ id, title: id, cycle });
}

describe("CycleProgress", () => {
  it("conta as concluídas do ciclo de hoje, ignorando backlog e outros ciclos", () => {
    const done = taskIn("done", currentCycle).moveToStage("done", today);
    const open = taskIn("open", currentCycle);
    const inBacklog = taskIn("backlog", null);
    const lastWeek = taskIn("old", Cycle.containing("2026-11-06"));

    const view = new CycleProgress([done, open, inBacklog, lastWeek], today).toView();

    expect(view).toEqual({
      cycleLabel: "8 a 14 nov",
      endsText: "termina em 1 dia",
      summaryText: "1 de 2",
      doneRatio: 0.5,
      donePercentText: "50",
    });
  });

  it("sem pendências no ciclo, o progresso é zero e não divide por zero", () => {
    const view = new CycleProgress([], today).toView();

    expect(view).toMatchObject({ summaryText: "0 de 0", doneRatio: 0, donePercentText: "0" });
  });

  it.each([
    ["2026-11-08", "termina em 6 dias"],
    ["2026-11-14", "termina hoje"],
  ])("em %s, diz '%s'", (day, expectedText) => {
    expect(new CycleProgress([], day).toView().endsText).toBe(expectedText);
  });
});
