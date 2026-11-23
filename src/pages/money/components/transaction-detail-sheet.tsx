import { useState } from "react";
import type { TransactionRowView } from "../domain";
import { BottomSheet } from "./bottom-sheet";

type TransactionDetailSheetProps = {
  row: TransactionRowView;
  onRemove: () => void;
  onClose: () => void;
};

export function TransactionDetailSheet({ row, onRemove, onClose }: TransactionDetailSheetProps) {
  const [isConfirmingRemoval, setIsConfirmingRemoval] = useState(false);

  return (
    <BottomSheet title={row.description} onClose={onClose}>
      <dl className="detail-grid">
        <dt>Valor</dt>
        <dd>{row.signedAmountText}</dd>
        <dt>Categoria</dt>
        <dd>{row.categoryName}</dd>
      </dl>
      {isConfirmingRemoval ? (
        <button
          className="btn btn-danger btn-block"
          type="button"
          onClick={() => {
            onRemove();
            onClose();
          }}
        >
          Confirmar exclusão
        </button>
      ) : (
        <button
          className="btn btn-block bg-transparent text-neg-ink"
          type="button"
          onClick={() => setIsConfirmingRemoval(true)}
        >
          Excluir lançamento
        </button>
      )}
    </BottomSheet>
  );
}
