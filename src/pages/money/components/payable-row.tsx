import { Icon } from "../../../shared/icon";
import type { PayableRowView } from "../domain";

type PayableRowProps = { row: PayableRowView; onComplete: (taskId: string) => void };

/** Pendência aberta com valor. Tocar no círculo conclui e pergunta se lança no financeiro. */
export function PayableRow({ row, onComplete }: PayableRowProps) {
  return (
    <div className="task-row">
      <button
        className="check-button"
        type="button"
        aria-label={`Concluir: ${row.title}`}
        onClick={() => onComplete(row.id)}
      >
        <span className="check" data-status="todo">
          <Icon name="check" size={14} />
        </span>
      </button>
      <div className="grow min-w-0">
        <div className="task-title">{row.title}</div>
        <div className="task-meta">
          <span className="tiny">{row.dayText}</span>
        </div>
      </div>
      <div className="task-amount" data-direction={row.direction}>
        <strong>{row.amountText}</strong>
        <span>{row.direction === "income" ? "a receber" : "a pagar"}</span>
      </div>
    </div>
  );
}
