import type { TransactionRowView } from "../../../shared/finance/domain/ledger";
import { Icon } from "../../../shared/icon";

type TransactionRowProps = { row: TransactionRowView; onOpen: (transactionId: string) => void };

const ICON_BY_KIND = { income: "arrowUp", saving: "vault", expense: "arrowDown" } as const;

/** Uma linha de lançamento. Tocar abre a folha com a opção de excluir. */
export function TransactionRow({ row, onOpen }: TransactionRowProps) {
  return (
    <button
      className="tx-row w-full bg-transparent text-left"
      type="button"
      onClick={() => onOpen(row.id)}
    >
      <span className="tx-icon" data-kind={row.kind}>
        <Icon name={ICON_BY_KIND[row.kind]} size={18} />
      </span>
      <span className="grow min-w-0">
        <span className="task-title block">{row.description}</span>
        <span className="tiny block">
          {row.categoryName}
          {row.isFromTask ? (
            <span className="chip ml-1.5" data-tone="steel">
              <Icon name="link" size={12} />
              de uma pendência
            </span>
          ) : null}
        </span>
      </span>
      <span className="tx-amount" data-kind={row.kind}>
        {row.signedAmountText}
      </span>
    </button>
  );
}
