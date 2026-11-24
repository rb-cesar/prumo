import { describe, expect, it } from "vitest";
import { Task } from "../../../shared/tasks/domain/task";
import { Payables } from "./payables";

const today = "2026-11-13";

function payableTask(
  id: string,
  title: string,
  direction: "expense" | "income",
  amountInCents: number,
  dueDate?: string,
) {
  return Task.create({
    id,
    title,
    ...(dueDate === undefined ? {} : { dueDate }),
    money: { amountInCents, direction, envelopeId: null },
  });
}

describe("Payables (BR-F10)", () => {
  it("lista as abertas com valor, por prazo, sem prazo por último", () => {
    const noDate = payableTask("no-date", "Sem data", "expense", 1000);
    const soon = payableTask("soon", "Luz", "expense", 18740, "2026-11-15");
    const receivable = payableTask("receive", "Freela", "income", 80000, "2026-11-14");
    const withoutMoney = Task.create({ id: "plain", title: "Ligar" });
    const finished = payableTask("done", "Paga", "expense", 500).toggleDone(today);

    const rows = new Payables([noDate, soon, receivable, withoutMoney, finished]).toRowViews(today);

    expect(rows.map((row) => [row.id, row.dayText, row.amountText])).toEqual([
      ["receive", "Amanhã", "R$ 800,00"],
      ["soon", "dom, 15 nov", "R$ 187,40"],
      ["no-date", "Sem prazo", "R$ 10,00"],
    ]);
  });

  it("guarda o sentido do valor, a pagar ou a receber", () => {
    const rows = new Payables([payableTask("a", "Luz", "expense", 100)]).toRowViews(today);

    expect(rows[0]?.direction).toBe("expense");
  });

  it("fica vazia quando não há pendência com valor", () => {
    expect(new Payables([Task.create({ id: "plain", title: "Ligar" })]).toRowViews(today)).toEqual(
      [],
    );
  });
});
