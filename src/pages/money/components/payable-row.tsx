import type { PayableRowView } from "../domain";

/** Pendência aberta com valor. Só mostra: concluir com valor é da fatia 3. */
export function PayableRow({ row }: { row: PayableRowView }) {
  return (
    <div className="task-row">
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
