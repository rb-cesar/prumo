import { Icon } from "../../../shared/icon";
import type { FocusRowView } from "../domain";

type FocusTaskRowProps = {
  row: FocusRowView;
  onComplete: (taskId: string) => void;
};

/** Uma pendência de "Para hoje": o círculo conclui; o resto só mostra. */
export function FocusTaskRow({ row, onComplete }: FocusTaskRowProps) {
  return (
    <div className="task-row">
      <button
        className="check-button"
        type="button"
        aria-label={`Concluir: ${row.title}`}
        onClick={() => onComplete(row.id)}
      >
        <span className="check" data-status={row.stage}>
          <Icon name="check" size={14} />
        </span>
      </button>
      <div className="grow min-w-0">
        <div className="task-title">{row.title}</div>
        {row.chips.length === 0 ? null : (
          <div className="task-meta">
            {row.chips.map((chip) => (
              <span key={chip.text} className="chip" data-tone={chip.tone ?? undefined}>
                {chip.text}
              </span>
            ))}
          </div>
        )}
      </div>
      {row.money === null ? null : (
        <div className="task-amount" data-direction={row.money.direction}>
          <strong>{row.money.amountText}</strong>
          <span>{row.money.label}</span>
        </div>
      )}
    </div>
  );
}
