import { describe, expect, it } from "vitest";
import { Envelope } from "../../finance/domain/envelope";
import { Ledger } from "../../finance/domain/ledger";
import { Transaction } from "../../finance/domain/transaction";
import { type NewTaskInput, Task } from "./task";
import { TaskCompletion } from "./task-completion";

const today = "2026-11-13";

const groceries = Envelope.fromRecord({
  id: "groceries",
  name: "Mercado",
  budgetInCents: 110000,
  isFixed: false,
});

function makeTask(overrides: Partial<NewTaskInput> = {}): Task {
  return Task.create({ id: "task-1", title: "Fazer a feira da semana", ...overrides });
}

function expenseTask(envelopeId: string | null, amountInCents = 18420): Task {
  return makeTask({ money: { amountInCents, direction: "expense", envelopeId } });
}

function completionOf(task: Task): TaskCompletion {
  const completion = TaskCompletion.of(task);
  if (completion === null) throw new Error("a pendência de teste devia ter valor");
  return completion;
}

describe("TaskCompletion.of", () => {
  it("não existe para pendência sem valor", () => {
    expect(TaskCompletion.of(makeTask())).toBeNull();
  });
});

describe("TaskCompletion.toTransaction", () => {
  it("gera o gasto com o valor, o título, o dia de hoje e o vínculo com a pendência", () => {
    const transaction = completionOf(expenseTask("groceries")).toTransaction({
      id: "tx-1",
      today,
      envelopeId: null,
    });

    expect(transaction.toRecord()).toEqual({
      id: "tx-1",
      kind: "expense",
      amountInCents: 18420,
      date: today,
      description: "Fazer a feira da semana",
      envelopeId: "groceries",
      taskId: "task-1",
      goalId: null,
    });
  });

  it("usa o envelope escolhido quando a pendência ainda não tinha um", () => {
    const transaction = completionOf(expenseTask(null)).toTransaction({
      id: "tx-1",
      today,
      envelopeId: "groceries",
    });

    expect(transaction.envelopeId).toBe("groceries");
  });

  it("recusa gasto sem envelope", () => {
    const build = () =>
      completionOf(expenseTask(null)).toTransaction({ id: "tx-1", today, envelopeId: null });

    expect(build).toThrowError();
  });

  it("gera receita sem envelope, mesmo se um envelope for passado", () => {
    const received = makeTask({
      money: { amountInCents: 60000, direction: "income", envelopeId: null },
    });

    const transaction = completionOf(received).toTransaction({
      id: "tx-2",
      today,
      envelopeId: "groceries",
    });

    expect([transaction.kind, transaction.envelopeId]).toEqual(["income", null]);
  });
});

describe("TaskCompletion.toPreview", () => {
  const spentBefore = Transaction.create({
    id: "tx-old",
    kind: "expense",
    amountInCents: 90000,
    date: "2026-11-02",
    description: "Supermercado",
    envelopeId: "groceries",
  });
  const context = {
    envelopes: [groceries],
    ledger: new Ledger([spentBefore]),
    openingBalanceInCents: 420000,
  };

  it("mostra o envelope depois de lançar, com a situação", () => {
    const preview = completionOf(expenseTask("groceries")).toPreview(context, null, today);

    expect(preview).toEqual({
      kind: "expense",
      envelopeName: "Mercado",
      afterText: "R$ 1.084 de R$ 1.100",
      fillRatio: 108420 / 110000,
      status: "near-limit",
    });
  });

  it("usa o envelope escolhido na folha quando a pendência não tem um", () => {
    const preview = completionOf(expenseTask(null)).toPreview(context, "groceries", today);

    expect(preview).toMatchObject({ kind: "expense", envelopeName: "Mercado" });
  });

  it("sem envelope escolhido, não mostra o efeito", () => {
    expect(completionOf(expenseTask(null)).toPreview(context, null, today)).toBeNull();
  });

  it("na receita, mostra o saldo em conta antes e depois", () => {
    const received = makeTask({
      money: { amountInCents: 60000, direction: "income", envelopeId: null },
    });

    const preview = completionOf(received).toPreview(context, null, today);

    expect(preview).toEqual({
      kind: "income",
      balanceNowText: "R$ 3.300,00",
      balanceAfterText: "R$ 3.900,00",
    });
  });
});
