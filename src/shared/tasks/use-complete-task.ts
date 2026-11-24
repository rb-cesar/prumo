import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { type TasksData, tasksKeys } from "../../data/tasks";
import { type TransactionsData, transactionsKeys } from "../../data/transactions";
import type { Clock } from "../../infra/clock";
import { Ledger } from "../finance/domain/ledger";
import { type FinanceSnapshot, financeSnapshotQuery } from "../finance/finance-snapshot";
import type { IdGenerator } from "../ids";
import type { Task, TaskStage } from "./domain/task";
import { type CompletionContext, TaskCompletion } from "./domain/task-completion";

export type CompleteTaskDeps = {
  tasks: TasksData;
  transactions: TransactionsData;
  clock: Clock;
  generateId: IdGenerator;
};

/** A pergunta aberta: "lançar no financeiro?". Guarda a pendência e o que a folha precisa mostrar. */
export type PendingCompletion = {
  task: Task;
  completion: TaskCompletion;
  context: CompletionContext;
  envelopeOptions: Array<{ id: string; name: string }>;
};

/** O que a pessoa decidiu na folha: só concluir, ou lançar (com o envelope, no gasto). */
export type CompletionChoice =
  | { kind: "only-complete" }
  | { kind: "post"; envelopeId: string | null };

type StageChange = { task: Task; stage: TaskStage; choice: CompletionChoice | null };

function contextOf(snapshot: FinanceSnapshot): CompletionContext {
  return {
    envelopes: snapshot.envelopes,
    ledger: new Ledger(snapshot.transactions),
    openingBalanceInCents: snapshot.openingBalanceInCents ?? 0,
  };
}

/**
 * Mudar a etapa de uma pendência de qualquer tela. Concluir uma pendência com valor pergunta se
 * lança no financeiro; reabrir uma concluída remove o lançamento que ela gerou. Ao terminar,
 * atualiza as consultas das pendências e do financeiro, então uma tela atualiza a outra.
 */
export function useCompleteTask({ tasks, transactions, clock, generateId }: CompleteTaskDeps) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<PendingCompletion | null>(null);

  const applyStageChange = useMutation({
    mutationFn: async ({ task, stage, choice }: StageChange) => {
      const today = clock.today();
      await tasks.save(task.moveToStage(stage, today));

      const isReopening = task.stage === "done" && stage !== "done";
      if (isReopening) await transactions.removeTransactionsOfTask(task.id);

      const completion = TaskCompletion.of(task);
      if (choice?.kind === "post" && completion !== null) {
        const transaction = completion.toTransaction({
          id: generateId(),
          today,
          envelopeId: choice.envelopeId,
        });
        await transactions.saveTransaction(transaction);
      }
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: tasksKeys.all }),
        queryClient.invalidateQueries({ queryKey: transactionsKeys.all }),
      ]),
  });

  /** Concluir uma pendência com valor abre a pergunta; qualquer outra mudança vale na hora. */
  async function changeStage(task: Task, stage: TaskStage): Promise<void> {
    const isCompleting = stage === "done" && task.stage !== "done";
    const completion = TaskCompletion.of(task);
    if (!isCompleting || completion === null) {
      await applyStageChange.mutateAsync({ task, stage, choice: null });
      return;
    }

    const snapshot = await queryClient.fetchQuery({
      ...financeSnapshotQuery(transactions),
      staleTime: 0,
    });
    setPending({
      task,
      completion,
      context: contextOf(snapshot),
      envelopeOptions: snapshot.envelopes.map(({ id, name }) => ({ id, name })),
    });
  }

  async function confirm(choice: CompletionChoice): Promise<void> {
    if (pending === null) return;
    setPending(null);
    await applyStageChange.mutateAsync({ task: pending.task, stage: "done", choice });
  }

  function cancel(): void {
    setPending(null);
  }

  return { pending, changeStage, confirm, cancel };
}
