import { describe, expect, it } from "vitest";
import { Envelope } from "../../../shared/finance/domain/envelope";
import { Transaction } from "../../../shared/finance/domain/transaction";
import { Task } from "../../../shared/tasks/domain/task";
import { Timeline } from "./timeline";

const today = "2026-11-25";
const envelopes = [
  Envelope.fromRecord({ id: "groceries", name: "Mercado", budgetInCents: 110000, isFixed: false }),
];

const bakery = Transaction.create({
  id: "tx-bakery",
  kind: "expense",
  amountInCents: 2390,
  date: "2026-11-24",
  description: "Padaria",
  envelopeId: "groceries",
});
const freelance = Transaction.create({
  id: "tx-freela",
  kind: "income",
  amountInCents: 80000,
  date: "2026-11-24",
  description: "Freela",
});
const oldSaving = Transaction.create({
  id: "tx-saving",
  kind: "saving",
  amountInCents: 30000,
  date: "2026-11-06",
  description: "Aporte: Viagem",
});

function doneTask(id: string, title: string, doneOn: string) {
  return Task.create({ id, title }).moveToStage("done", doneOn);
}

describe("Timeline (BR-H05)", () => {
  it("mistura lançamentos e pendências concluídas, do mais novo para o mais antigo, por dia", () => {
    const timeline = new Timeline(
      [oldSaving, bakery, freelance],
      envelopes,
      [doneTask("report", "Entregar o relatório", "2026-11-25")],
      today,
    );

    expect(timeline.toDayGroups(10)).toEqual([
      {
        dayText: "Hoje",
        rows: [
          {
            id: "report",
            kind: "task",
            title: "Entregar o relatório",
            detail: "Pendência concluída",
            signedAmountText: null,
            isFromTask: false,
          },
        ],
      },
      {
        dayText: "Ontem",
        rows: [
          expect.objectContaining({
            title: "Padaria",
            detail: "Mercado",
            signedAmountText: "− R$ 23,90",
          }),
          expect.objectContaining({
            title: "Freela",
            detail: "Receita",
            signedAmountText: "+ R$ 800,00",
          }),
        ],
      },
      {
        dayText: "sex, 6 nov",
        rows: [expect.objectContaining({ title: "Aporte: Viagem", detail: "Aporte em meta" })],
      },
    ]);
  });

  it("a pendência que gerou um lançamento aparece só pelo lançamento, com a marca", () => {
    const fromTask = Transaction.create({
      id: "tx-from-task",
      kind: "expense",
      amountInCents: 6230,
      date: "2026-11-23",
      description: "Comprar remédios",
      envelopeId: "groceries",
      taskId: "medicine",
    });

    const timeline = new Timeline(
      [fromTask],
      envelopes,
      [doneTask("medicine", "Comprar remédios", "2026-11-23")],
      today,
    );

    expect(timeline.count).toBe(1);
    expect(timeline.toDayGroups(10)[0]?.rows[0]).toMatchObject({ isFromTask: true });
  });

  it("ignora pendência que não está concluída", () => {
    const timeline = new Timeline(
      [],
      envelopes,
      [Task.create({ id: "open", title: "Aberta" })],
      today,
    );

    expect(timeline.count).toBe(0);
    expect(timeline.toDayGroups(10)).toEqual([]);
  });

  it("devolve só os eventos mais recentes pedidos", () => {
    const timeline = new Timeline([oldSaving, bakery, freelance], envelopes, [], today);

    const groups = timeline.toDayGroups(2);

    expect(groups.flatMap((group) => group.rows)).toHaveLength(2);
    expect(groups.map((group) => group.dayText)).toEqual(["Ontem"]);
    expect(timeline.count).toBe(3);
  });
});
