import { useServices } from "../../shared/services";
import { CompleteTaskSheet } from "../../shared/tasks/complete-task-sheet";
import { FocusTaskRow } from "./components/focus-task-row";
import { useTodayModel } from "./model";

export function TodayPage() {
  const model = useTodayModel(useServices());
  const { state } = model;

  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col">
      <header className="app-header">
        <div>
          <div className="app-eyebrow">
            <span>Visão do dia</span>
          </div>
          <h1 className="app-title">Hoje</h1>
          <p className="app-subtitle">{state.status === "ready" ? state.dateText : " "}</p>
        </div>
      </header>

      <main className="flex flex-col gap-section px-4 pb-40 pt-1.5">
        {state.status === "loading" ? <p className="text-small text-ink-2">Carregando…</p> : null}

        {state.status === "error" ? (
          <div className="card">
            <div className="empty">
              <strong>Não foi possível carregar o dia</strong>
              Feche e abra o app de novo.
            </div>
          </div>
        ) : null}

        {state.status === "ready" ? (
          <>
            <section className="hero" aria-label="Quanto posso gastar hoje">
              <div className="hero-label">Pode gastar hoje</div>
              <div className="hero-amount">{state.hero.allowanceText}</div>
              <p className="hero-detail">{state.hero.detailText}</p>
              <div>
                <div className="pace" role="img" aria-label={state.hero.paceCaption}>
                  <div
                    className="pace-fill"
                    data-tone={state.hero.paceIsAhead ? "ahead" : "steady"}
                    style={{ width: `${state.hero.spentPercent}%` }}
                  />
                  <div
                    className="pace-marker"
                    style={{ left: `${state.hero.monthElapsedPercent}%` }}
                  />
                </div>
                <p className="pace-caption mt-2">
                  {state.hero.paceCaption} A marca é o dia de hoje.
                </p>
              </div>
            </section>

            <section className="stats" aria-label="Situação em números">
              <div className="stat">
                <span className="stat-label">Saldo em conta</span>
                <span className="stat-value">{state.stats.accountBalanceText}</span>
              </div>
              <div className="stat">
                <span className="stat-label">A pagar em 7 dias</span>
                <span className="stat-value">{state.stats.dueSoonText}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Guardado no mês</span>
                <span className="stat-value">{state.stats.savedText}</span>
              </div>
            </section>

            <section>
              <h2 className="section-title">
                <span>
                  Para hoje <span className="count">{state.focusRows.length}</span>
                </span>
              </h2>
              {state.focusRows.length === 0 ? (
                <div className="card">
                  <div className="empty">
                    <strong>Nada pendente para hoje</strong>
                    Use o espaço para puxar algo do backlog.
                  </div>
                </div>
              ) : (
                <div className="card flush list">
                  {state.focusRows.map((row) => (
                    <FocusTaskRow key={row.id} row={row} onComplete={model.actions.completeTask} />
                  ))}
                </div>
              )}
            </section>

            <section className="card stack" aria-label="Ciclo atual">
              <div className="row between">
                <div>
                  <div className="small font-semibold">Ciclo {state.cycle.cycleLabel}</div>
                  <div className="tiny">{state.cycle.endsText}</div>
                </div>
                <span className="chip" data-tone="steel">
                  {state.cycle.summaryText}
                </span>
              </div>
              <div>
                <div className="goal-line">
                  <span>Pendências concluídas</span>
                  <strong>{state.cycle.donePercentText}%</strong>
                </div>
                <span className="bar mt-1.5 block">
                  <span style={{ width: `${Math.round(state.cycle.doneRatio * 100)}%` }} />
                </span>
              </div>
            </section>

            <section>
              <h2 className="section-title">
                <span>Próximos 7 dias</span>
              </h2>
              {state.upcomingRows.length === 0 ? (
                <div className="card">
                  <div className="empty">
                    <strong>Nenhum vencimento nos próximos 7 dias</strong>
                    Aproveite para adiantar algo.
                  </div>
                </div>
              ) : (
                <div className="card flush list">
                  {state.upcomingRows.map((row) => (
                    <div key={row.id} className="task-row">
                      <div className="tiny numeric w-[58px] flex-none">{row.dayText}</div>
                      <div className="grow task-title">{row.title}</div>
                      {row.amountText === null ? null : (
                        <strong
                          className={`numeric small ${row.direction === "income" ? "text-pos-ink" : ""}`}
                        >
                          {row.amountText}
                        </strong>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="section-title">
                <span>Meta em foco</span>
              </h2>
              {state.focusGoal.status === "in-focus" ? (
                <div className="card stack">
                  <div className="row between">
                    <strong>{state.focusGoal.title}</strong>
                    <span className="display-number">{state.focusGoal.percentText}</span>
                  </div>
                  <span className="bar block">
                    <span style={{ width: `${Math.round(state.focusGoal.ratio * 100)}%` }} />
                  </span>
                  <div className="goal-line">
                    <span>{state.focusGoal.savedText}</span>
                    <span>{state.focusGoal.timeLeftText}</span>
                  </div>
                </div>
              ) : (
                <div className="card">
                  <div className="empty">
                    <strong>
                      {state.focusGoal.status === "all-completed"
                        ? "Todas as metas concluídas"
                        : "Nenhuma meta ainda"}
                    </strong>
                    Crie uma meta na aba Metas.
                  </div>
                </div>
              )}
            </section>
          </>
        ) : null}
      </main>

      {model.completion.pending === null ? null : (
        <CompleteTaskSheet
          pending={model.completion.pending}
          today={model.today}
          onChoose={model.completion.choose}
          onCancel={model.completion.cancel}
        />
      )}
    </div>
  );
}
