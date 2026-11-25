import { useState } from "react";
import { Icon } from "../../shared/icon";
import { useServices } from "../../shared/services";
import { GoalCard } from "./components/goal-card";
import { HorizonTabs } from "./components/horizon-tabs";
import { NewGoalSheet } from "./components/new-goal-sheet";
import { useGoalsModel } from "./model";

const HINT_BY_HORIZON = {
  short: "Até 3 meses. Guarde um pouco por semana.",
  long: "Mais de 3 meses. Pequenos aportes por mês, acompanhados pelo ritmo necessário.",
} as const;

export function GoalsPage() {
  const model = useGoalsModel(useServices());
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
  const [isNewGoalSheetOpen, setIsNewGoalSheetOpen] = useState(false);
  const { state, actions, controls } = model;

  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col">
      <header className="app-header">
        <div>
          <div className="app-eyebrow">
            <span>O que quero alcançar</span>
          </div>
          <h1 className="app-title">Metas</h1>
        </div>
      </header>

      <main className="flex flex-col gap-section px-4 pb-40 pt-1.5">
        {state.status === "loading" ? <p className="text-small text-ink-2">Carregando…</p> : null}

        {state.status === "error" ? (
          <div className="card">
            <div className="empty">
              <strong>Não foi possível carregar as metas</strong>
              Feche e abra o app de novo.
            </div>
          </div>
        ) : null}

        {state.status === "ready" ? (
          <>
            <HorizonTabs value={state.horizon} onChange={controls.selectHorizon} />
            <p className="small muted">{HINT_BY_HORIZON[state.horizon]}</p>

            {state.cards.length === 0 ? (
              <div className="card">
                <div className="empty">
                  <strong>Nenhuma meta aqui</strong>
                  Crie uma meta para acompanhar quanto falta.
                </div>
              </div>
            ) : (
              state.cards.map((card) => (
                <GoalCard
                  key={card.id}
                  card={card}
                  isExpanded={expandedGoalId === card.id}
                  onToggle={() => setExpandedGoalId(expandedGoalId === card.id ? null : card.id)}
                  onContribute={(amountText) => actions.contribute(card.id, amountText)}
                  onRemove={() => actions.removeGoal(card.id)}
                />
              ))
            )}

            <button
              className="btn btn-secondary btn-block"
              type="button"
              onClick={() => setIsNewGoalSheetOpen(true)}
            >
              <Icon name="plus" size={18} /> Nova meta
            </button>
          </>
        ) : null}
      </main>

      {isNewGoalSheetOpen ? (
        <NewGoalSheet onCreate={actions.createGoal} onClose={() => setIsNewGoalSheetOpen(false)} />
      ) : null}
    </div>
  );
}
