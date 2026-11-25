import type { CycleRowView } from "../domain";
import type { HistoryScreenState } from "../model";
import { InsightCard } from "./insight-card";

type CyclesViewProps = { cycles: Extract<HistoryScreenState, { status: "ready" }>["cycles"] };

function CycleRow({ row }: { row: CycleRowView }) {
  return (
    <div className="cycle-row">
      <div className="row between">
        <strong className="small">{row.title}</strong>
        {row.isCurrent ? (
          <span className="chip" data-tone="near">
            em andamento
          </span>
        ) : null}
      </div>
      <div className="cycle-bars">
        <div>
          <div className="cycle-bar-label">
            <span>Pendências</span>
            <strong className="numeric">{row.doneText}</strong>
          </div>
          <span className="bar block" data-tone={row.isAllDone ? "pos" : undefined}>
            <span style={{ width: `${Math.round(row.doneRatio * 100)}%` }} />
          </span>
        </div>
        <div>
          <div className="cycle-bar-label">
            <span>Dia a dia</span>
            <strong className="numeric">{row.spentText}</strong>
          </div>
          <span
            className="bar block"
            data-tone={row.spentTone === "ok" ? undefined : row.spentTone}
          >
            <span style={{ width: `${Math.round(row.spentRatio * 100)}%` }} />
          </span>
        </div>
      </div>
    </div>
  );
}

export function CyclesView({ cycles }: CyclesViewProps) {
  return (
    <>
      {cycles.insights.length === 0 ? null : (
        <section className="stack">
          <h2 className="section-title m-0">
            <span>O que os ciclos dizem</span>
          </h2>
          {cycles.insights.map((insight) => (
            <InsightCard key={insight.title} insight={insight} />
          ))}
        </section>
      )}

      <section>
        <h2 className="section-title">
          <span>Ciclos semanais</span>
        </h2>
        <div className="card flush list">
          {cycles.rows.map((row) => (
            <CycleRow key={row.cycleStart} row={row} />
          ))}
        </div>
        <p className="tiny mt-2">{cycles.weeklyPlanText}</p>
      </section>

      <section className="stack">
        <h2 className="section-title m-0">
          <span>Revisões</span>
        </h2>
        {cycles.reviews.length === 0 ? (
          <div className="card">
            <div className="empty">
              <strong>Nenhuma revisão ainda</strong>
              Faça a revisão do ciclo no cartão da tela Hoje.
            </div>
          </div>
        ) : (
          cycles.reviews.map((review) => (
            <div key={review.cycleStart} className="card review-note">
              <strong className="small text-ink">{review.title}</strong>
              <span>
                <b>Funcionou:</b> {review.worked}
              </span>
              <span>
                <b>Atrapalhou:</b> {review.hindered}
              </span>
              <span>
                <b>Muda agora:</b> {review.changeNext}
              </span>
            </div>
          ))
        )}
      </section>
    </>
  );
}
