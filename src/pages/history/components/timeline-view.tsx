import { Icon } from "../../../shared/icon";
import type { HistoryScreenState } from "../model";

type TimelineViewProps = {
  timeline: Extract<HistoryScreenState, { status: "ready" }>["timeline"];
  onShowMore: () => void;
};

const ICON_BY_KIND = {
  income: "arrowUp",
  saving: "vault",
  task: "tasks",
  expense: "arrowDown",
} as const;

export function TimelineView({ timeline, onShowMore }: TimelineViewProps) {
  return (
    <>
      <p className="small muted">
        Pendências concluídas e lançamentos na mesma linha do tempo, para ver o que aconteceu e o
        que custou.
      </p>
      {timeline.groups.length === 0 ? (
        <div className="card">
          <div className="empty">
            <strong>Nada aconteceu ainda</strong>
            Lançamentos e pendências concluídas aparecem aqui.
          </div>
        </div>
      ) : (
        <div className="card flush">
          {timeline.groups.map((group) => (
            <div key={group.dayText}>
              <div className="day-heading">{group.dayText}</div>
              {group.rows.map((row) => (
                <div key={row.id} className="tx-row">
                  <span className="tx-icon" data-kind={row.kind}>
                    <Icon name={ICON_BY_KIND[row.kind]} size={18} />
                  </span>
                  <div className="grow">
                    <div className="task-title">{row.title}</div>
                    <div className="task-meta">
                      <span className="tiny">{row.detail}</span>
                      {row.isFromTask ? (
                        <span className="chip" data-tone="steel">
                          <Icon name="link" size={12} />
                          pendência concluída
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {row.signedAmountText === null ? null : (
                    <span className="tx-amount" data-kind={row.kind}>
                      {row.signedAmountText}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      {timeline.hasMore ? (
        <button className="btn btn-secondary btn-block" type="button" onClick={onShowMore}>
          Ver mais
        </button>
      ) : null}
    </>
  );
}
