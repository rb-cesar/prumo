import { useServices } from "../../shared/services";
import { CyclesView } from "./components/cycles-view";
import { MonthsView } from "./components/months-view";
import { TimelineView } from "./components/timeline-view";
import { ViewTabs } from "./components/view-tabs";
import { useHistoryModel } from "./model";

export function HistoryPage() {
  const { state, controls } = useHistoryModel(useServices());

  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col">
      <header className="app-header">
        <div>
          <div className="app-eyebrow">
            <span>Memória</span>
          </div>
          <h1 className="app-title">Histórico</h1>
          <p className="app-subtitle">Como você chegou até aqui</p>
        </div>
      </header>

      <main className="flex flex-col gap-section px-4 pb-40 pt-1.5">
        {state.status === "loading" ? <p className="text-small text-ink-2">Carregando…</p> : null}

        {state.status === "error" ? (
          <div className="card">
            <div className="empty">
              <strong>Não foi possível carregar o histórico</strong>
              Feche e abra o app de novo.
            </div>
          </div>
        ) : null}

        {state.status === "ready" ? (
          <>
            <ViewTabs value={state.view} onChange={controls.selectView} />
            {state.view === "months" ? <MonthsView months={state.months} /> : null}
            {state.view === "cycles" ? <CyclesView cycles={state.cycles} /> : null}
            {state.view === "timeline" ? (
              <TimelineView timeline={state.timeline} onShowMore={controls.showMoreTimeline} />
            ) : null}
          </>
        ) : null}
      </main>
    </div>
  );
}
