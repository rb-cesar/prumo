import type { HistoryScreenState } from "../model";
import { InsightCard } from "./insight-card";
import { MonthlyChart } from "./monthly-chart";

type MonthsViewProps = { months: Extract<HistoryScreenState, { status: "ready" }>["months"] };

export function MonthsView({ months }: MonthsViewProps) {
  if (months.rows.length === 0) {
    return (
      <div className="card">
        <div className="empty">
          <strong>Ainda não há movimento</strong>
          Os meses aparecem aqui conforme você lança entradas, gastos e aportes.
        </div>
      </div>
    );
  }

  return (
    <>
      <section className="card">
        <div className="legend">
          <span>
            <i style={{ background: "var(--steel)" }} />
            Entrou
          </span>
          <span>
            <i style={{ background: "var(--ink)" }} />
            Saiu
          </span>
        </div>
        <MonthlyChart rows={months.rows} />
        {months.partialNote === null ? null : <p className="tiny mt-1.5">{months.partialNote}</p>}
      </section>

      {months.insights.length === 0 ? null : (
        <section className="stack">
          <h2 className="section-title m-0">
            <span>O que os números dizem</span>
          </h2>
          {months.insights.map((insight) => (
            <InsightCard key={insight.title} insight={insight} />
          ))}
        </section>
      )}

      <section className="card">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mês</th>
                <th>Entrou</th>
                <th>Saiu</th>
                <th>Guardou</th>
                <th>Taxa</th>
              </tr>
            </thead>
            <tbody>
              {months.rows.map((row) => (
                <tr key={row.month}>
                  <td>
                    {row.label}
                    {row.isPartial ? "*" : ""}
                  </td>
                  <td>{row.incomeText}</td>
                  <td>{row.expenseText}</td>
                  <td>{row.savedText}</td>
                  <td>{row.rateText}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
