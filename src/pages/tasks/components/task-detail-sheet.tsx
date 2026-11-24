import { useState } from "react";
import { BottomSheet } from "../../../shared/bottom-sheet";
import type { TaskStage } from "../../../shared/tasks/domain/task";
import type { TaskDetailView } from "../domain";
import { Segmented } from "./segmented";

type TaskDetailSheetProps = {
  detail: TaskDetailView;
  cycleLabel: string;
  onChangeStage: (stage: TaskStage) => void;
  onPullToCycle: () => void;
  onMoveToBacklog: () => void;
  onRemove: () => void;
  onClose: () => void;
};

export function TaskDetailSheet({
  detail,
  cycleLabel,
  onChangeStage,
  onPullToCycle,
  onMoveToBacklog,
  onRemove,
  onClose,
}: TaskDetailSheetProps) {
  const [isConfirmingRemoval, setIsConfirmingRemoval] = useState(false);
  const stageOptions = [
    { value: "todo" as const, label: "A fazer" },
    ...(detail.canBeDoing ? [{ value: "doing" as const, label: "Fazendo" }] : []),
    { value: "done" as const, label: "Feito" },
  ];

  return (
    <BottomSheet title={detail.title} onClose={onClose}>
      <Segmented
        kind="choice"
        label="Etapa"
        value={detail.stage}
        onChange={onChangeStage}
        options={stageOptions}
      />
      <dl className="detail-grid">
        {detail.rows.map(([term, value]) => (
          <div key={term} className="contents">
            <dt>{term}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {detail.isInBacklog ? (
        <button
          className="btn btn-secondary btn-block"
          type="button"
          onClick={() => {
            onPullToCycle();
            onClose();
          }}
        >
          Puxar para o ciclo {cycleLabel}
        </button>
      ) : null}
      {detail.canMoveToBacklog ? (
        <button
          className="btn btn-secondary btn-block"
          type="button"
          onClick={() => {
            onMoveToBacklog();
            onClose();
          }}
        >
          Mover para o backlog
        </button>
      ) : null}
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
          Excluir pendência
        </button>
      )}
    </BottomSheet>
  );
}
