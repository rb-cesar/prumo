import { queryOptions } from "@tanstack/react-query";
import { type TransactionsData, transactionsKeys } from "../../data/transactions";
import type { Envelope } from "./domain/envelope";
import type { Transaction } from "./domain/transaction";

/** Tudo o que as contas de finanças leem: envelopes, lançamentos e saldo inicial. */
export type FinanceSnapshot = {
  envelopes: Envelope[];
  transactions: Transaction[];
  /** `null` enquanto a pessoa ainda não informou o saldo inicial. */
  openingBalanceInCents: number | null;
};

/**
 * A consulta de finanças: a tela de finanças lê e a folha de concluir pendência busca com a mesma
 * chave, então um lançamento novo atualiza as duas.
 */
export function financeSnapshotQuery(transactionsData: TransactionsData) {
  return queryOptions({
    queryKey: transactionsKeys.all,
    queryFn: async (): Promise<FinanceSnapshot> => {
      const [envelopes, transactions, openingBalanceInCents] = await Promise.all([
        transactionsData.listEnvelopes(),
        transactionsData.listTransactions(),
        transactionsData.getOpeningBalanceInCents(),
      ]);
      return { envelopes, transactions, openingBalanceInCents };
    },
  });
}
