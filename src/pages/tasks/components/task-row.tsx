import { Icon } from "../../../shared/icon";
import type { TaskRowView } from "../domain";

type TaskRowProps = {
  row: TaskRowView;
  onToggle: (taskId: string) => void;
  onOpen: (taskId: string) => void;
  /** Só no backlog: leva a pendência ao ciclo. */
  onPull?: ((taskId: string) => void) | undefined;
};

export function TaskRow({ row, onToggle, onOpen, onPull }: TaskRowProps) {
  const toggleLabel = `${row.isDone ? "Reabrir" : "Concluir"}: ${row.title}`;
  return (
    <div className="task-row" data-done={row.isDone}>
      <button
        className="check-button"
        type="button"
        aria-label={toggleLabel}
        onClick={() => onToggle(row.id)}
      >
        <span className="check" data-status={row.stage}>
          <Icon name="check" size={14} />
        </span>
      </button>
      <button
        className="grow min-w-0 bg-transparent p-0 text-left"
        type="button"
        onClick={() => onOpen(row.id)}
      >
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
      </button>
      {row.money === null ? null : (
        <div className="task-amount" data-direction={row.money.direction}>
          <strong>{row.money.amountText}</strong>
          <span>{row.money.label}</span>
        </div>
      )}
      {onPull === undefined ? null : (
        <button className="pull-button" type="button" onClick={() => onPull(row.id)}>
          Puxar
        </button>
      )}
    </div>
  );
}
