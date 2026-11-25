import { describe, expect, it } from "vitest";
import { Envelope } from "../../../shared/finance/domain/envelope";
import { Ledger } from "../../../shared/finance/domain/ledger";
import { Transaction } from "../../../shared/finance/domain/transaction";
import { WeeklySpending } from "./weekly-spending";

const today = "2026-11-25";

// Plano semanal: (1.100 + 400) ÷ 30 × 7 = R$ 350.
const envelopes = [
  Envelope.fromRecord({ id: "housing", name: "Moradia", budgetInCents: 220000, isFixed: true }),
  Envelope.fromRecord({ id: "groceries", name: "Mercado", budgetInCents: 110000, isFixed: false }),
  Envelope.fromRecord({ id: "leisure", name: "Lazer", budgetInCents: 40000, isFixed: false }),
];

function expense(id: string, envelopeId: string, reais: number, date: string) {
  return Transaction.create({
    id,
    kind: "expense",
    amountInCents: reais * 100,
    date,
    description: "Gasto",
    envelopeId,
  });
}

describe("WeeklySpending (BR-H07)", () => {
  it("soma o dia a dia do ciclo de hoje e compara com o plano semanal", () => {
    const ledger = new Ledger([
      expense("a", "groceries", 200, "2026-11-22"),
      expense("b", "leisure", 100, "2026-11-24"),
    ]);

    expect(new WeeklySpending(envelopes, ledger, today).toView()).toEqual({
      spentText: "R$ 300",
      planText: "R$ 350",
      fillRatio: 300 / 350,
      tone: "near",
    });
  });

  it("não conta moradia, nem gasto de outra semana", () => {
    const ledger = new Ledger([
      expense("a", "housing", 900, "2026-11-23"),
      expense("b", "groceries", 500, "2026-11-21"),
      expense("c", "groceries", 50, "2026-11-23"),
    ]);

    const view = new WeeklySpending(envelopes, ledger, today).toView();

    expect(view.spentText).toBe("R$ 50");
    expect(view.tone).toBe("ok");
  });

  it("fica vermelho acima do plano e a barra enche até o fim", () => {
    const ledger = new Ledger([expense("a", "groceries", 400, "2026-11-23")]);

    expect(new WeeklySpending(envelopes, ledger, today).toView()).toMatchObject({
      fillRatio: 1,
      tone: "over",
    });
  });
});
