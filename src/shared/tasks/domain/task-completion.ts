import type { Envelope, EnvelopeStatus } from "../../finance/domain/envelope";
import type { Ledger } from "../../finance/domain/ledger";
import { Money } from "../../finance/domain/money";
import { Transaction } from "../../finance/domain/transaction";
import { monthOf } from "../../iso-date";
import type { Task, TaskMoney } from "./task";

/** O que a folha "Concluir e lançar?" mostra do efeito do lançamento, antes de a pessoa decidir. */
export type CompletionPreview =
  | { kind: "income"; balanceNowText: string; balanceAfterText: string }
  | {
      kind: "expense";
      envelopeName: string;
      /** "R$ 550 de R$ 1.100" */
      afterText: string;
      fillRatio: number;
      status: EnvelopeStatus;
    };

/** Onde estão as contas do financeiro, para mostrar o efeito de lançar. */
export type CompletionContext = {
  envelopes: readonly Envelope[];
  ledger: Ledger;
  openingBalanceInCents: number;
};

/**
 * Concluir uma pendência que tem valor: o lançamento que ela gera e o efeito dele (doc de regras de
 * pendências, BR-T03). Só existe para pendência com valor. Imutável.
 */
export class TaskCompletion {
  private readonly task: Task;
  private readonly money: TaskMoney;

  private constructor(task: Task, money: TaskMoney) {
    this.task = task;
    this.money = money;
  }

  /** `null` se a pendência não tem valor: concluir é só mudar a etapa. */
  static of(task: Task): TaskCompletion | null {
    return task.money === null ? null : new TaskCompletion(task, task.money);
  }

  get isIncome(): boolean {
    return this.money.direction === "income";
  }

  get title(): string {
    return this.task.title;
  }

  get amountText(): string {
    return Money.ofCents(this.money.amountInCents).format();
  }

  /** Só o valor a pagar precisa de envelope, e a pendência pode ainda não ter um. */
  get envelopeIdFromTask(): string | null {
    return this.money.envelopeId;
  }

  /** BR-F03: o lançamento tem a data de hoje e a descrição é o título da pendência. */
  toTransaction(input: { id: string; today: string; envelopeId: string | null }): Transaction {
    return Transaction.create({
      id: input.id,
      kind: this.money.direction,
      amountInCents: this.money.amountInCents,
      date: input.today,
      description: this.task.title,
      envelopeId: this.isIncome ? null : (this.money.envelopeId ?? input.envelopeId),
      taskId: this.task.id,
    });
  }

  /** A receita mostra o saldo em conta antes e depois; o gasto mostra o envelope depois de lançar. */
  toPreview(
    context: CompletionContext,
    envelopeId: string | null,
    today: string,
  ): CompletionPreview | null {
    const { amountInCents } = this.money;
    if (this.isIncome) {
      const balanceNow = context.ledger.accountBalanceInCents(context.openingBalanceInCents);
      return {
        kind: "income",
        balanceNowText: Money.ofCents(balanceNow).format(),
        balanceAfterText: Money.ofCents(balanceNow + amountInCents).format(),
      };
    }

    const chosenEnvelope = context.envelopes.find(
      (envelope) => envelope.id === (this.money.envelopeId ?? envelopeId),
    );
    if (chosenEnvelope === undefined) return null;
    const spentAfter =
      context.ledger.spentInEnvelope(chosenEnvelope.id, monthOf(today)) + amountInCents;
    return {
      kind: "expense",
      envelopeName: chosenEnvelope.name,
      afterText: `${Money.ofCents(spentAfter).formatWhole()} de ${Money.ofCents(chosenEnvelope.budgetInCents).formatWhole()}`,
      fillRatio: Math.min(1, spentAfter / chosenEnvelope.budgetInCents),
      status: chosenEnvelope.statusAfterSpending(spentAfter),
    };
  }
}
