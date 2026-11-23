import { useState } from "react";
import { Icon } from "../../shared/icon";
import { useServices } from "../../shared/services";
import { AddTaskSheet } from "./components/add-task-sheet";
import { Segmented } from "./components/segmented";
import { TaskDetailSheet } from "./components/task-detail-sheet";
import { TaskRow } from "./components/task-row";
import { type TaskFilter, type TaskScope, toTaskDetailView } from "./domain";
import { useTasksModel } from "./model";

type OpenSheet = { kind: "add" } | { kind: "detail"; taskId: string } | null;

const EMPTY_TEXTS = {
  todo: [
    "Nada a fazer neste filtro",
    "Puxe algo do backlog ou adicione uma pendência com o botão +.",
  ],
  doing: ["Nada em andamento", "Abra uma pendência e mude a etapa para Fazendo."],
  done: ["Nada concluído ainda", "Toque no círculo de uma pendência para concluir."],
  backlog: ["Backlog vazio", "Nenhuma pendência com esse filtro."],
} as const;

const FILTER_OPTIONS: Array<{ value: TaskFilter; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "money", label: "Com valor" },
  { value: "high", label: "Prioridade alta" },
];

export function TasksPage() {
  const model = useTasksModel(useServices());
  const [openSheet, setOpenSheet] = useState<OpenSheet>(null);
  const { state, actions, controls } = model;
  const cycleLabel = state.status === "ready" ? state.cycleLabel : "";
  const detailTask = openSheet?.kind === "detail" ? model.taskById(openSheet.taskId) : undefined;

  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col">
      <header className="app-header">
        <div>
          <div className="app-eyebrow">
            <span>Scrum pessoal</span>
          </div>
          <h1 className="app-title">Pendências</h1>
          <p className="app-subtitle">{cycleLabel === "" ? " " : `Ciclo ${cycleLabel}`}</p>
        </div>
      </header>

      <main className="flex flex-col gap-section px-4 pb-32 pt-1.5">
        {state.status === "loading" ? <p className="text-small text-ink-2">Carregando…</p> : null}

        {state.status === "error" ? (
          <div className="card">
            <div className="empty">
              <strong>Não foi possível carregar as pendências</strong>
              Feche e abra o app de novo.
            </div>
          </div>
        ) : null}

        {state.status === "ready" ? (
          <>
            <Segmented<TaskScope>
              kind="tabs"
              label="Onde estão as pendências"
              value={state.scope}
              onChange={controls.setScope}
              options={[
                { value: "cycle", label: "Ciclo", count: state.counts.cycle },
                { value: "backlog", label: "Backlog", count: state.counts.backlog },
              ]}
            />

            {state.scope === "backlog" ? (
              <p className="text-small text-ink-2">
                Tudo que ainda não tem semana marcada. Toque em Puxar para levar uma pendência ao
                ciclo.
              </p>
            ) : (
              <Segmented
                kind="tabs"
                label="Etapa da pendência"
                value={state.stage}
                onChange={controls.setStage}
                options={[
                  { value: "todo", label: "A fazer", count: state.counts.todo },
                  { value: "doing", label: "Fazendo", count: state.counts.doing },
                  { value: "done", label: "Feito", count: state.counts.done },
                ]}
              />
            )}

            <fieldset className="chip-row m-0 min-w-0 border-0 p-0">
              <legend className="sr-only">Filtrar pendências</legend>
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className="filter-chip"
                  type="button"
                  aria-pressed={state.filter === option.value}
                  onClick={() => controls.setFilter(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </fieldset>

            {state.rows.length === 0 ? (
              <div className="card">
                <div className="empty">
                  <strong>
                    {EMPTY_TEXTS[state.scope === "backlog" ? "backlog" : state.stage][0]}
                  </strong>
                  {EMPTY_TEXTS[state.scope === "backlog" ? "backlog" : state.stage][1]}
                </div>
              </div>
            ) : (
              <div className="card flush list">
                {state.rows.map((row) => (
                  <TaskRow
                    key={row.id}
                    row={row}
                    onToggle={actions.toggleDone}
                    onOpen={(taskId) => setOpenSheet({ kind: "detail", taskId })}
                    onPull={state.scope === "backlog" ? actions.pullToCycle : undefined}
                  />
                ))}
              </div>
            )}
          </>
        ) : null}
      </main>

      {state.status === "ready" ? (
        <button
          className="fab fixed bottom-6 right-4 z-10"
          type="button"
          aria-label="Adicionar"
          onClick={() => setOpenSheet({ kind: "add" })}
        >
          <Icon name="plus" size={26} />
        </button>
      ) : null}

      {openSheet?.kind === "add" ? (
        <AddTaskSheet
          cycleLabel={cycleLabel}
          onCreate={actions.create}
          onClose={() => setOpenSheet(null)}
        />
      ) : null}

      {openSheet?.kind === "detail" && detailTask !== undefined ? (
        <TaskDetailSheet
          detail={toTaskDetailView(detailTask, model.today)}
          cycleLabel={cycleLabel}
          onChangeStage={(stage) => actions.moveToStage(detailTask.id, stage)}
          onPullToCycle={() => actions.pullToCycle(detailTask.id)}
          onMoveToBacklog={() => actions.moveToBacklog(detailTask.id)}
          onRemove={() => actions.remove(detailTask.id)}
          onClose={() => setOpenSheet(null)}
        />
      ) : null}
    </div>
  );
}
