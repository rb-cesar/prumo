import { useState } from "react";
import type { CreateTaskResult, NewTaskForm } from "../model";
import { BottomSheet } from "./bottom-sheet";
import { Segmented } from "./segmented";

type AddTaskSheetProps = {
  cycleLabel: string;
  onCreate: (form: NewTaskForm) => Promise<CreateTaskResult>;
  onClose: () => void;
};

const emptyForm: NewTaskForm = {
  title: "",
  dueDate: "",
  priority: "medium",
  placement: "cycle",
  amountText: "",
  direction: "expense",
};

function describeFailure(reason: Extract<CreateTaskResult, { ok: false }>["reason"]): string {
  if (reason === "title-required") return "Escreva o que precisa ser feito.";
  if (reason === "invalid-amount" || reason === "amount-not-a-number") {
    return "O valor não parece certo. Use um formato como 120,50.";
  }
  if (reason === "invalid-date") return "A data não parece certa.";
  return "Não foi possível salvar a pendência.";
}

export function AddTaskSheet({ cycleLabel, onCreate, onClose }: AddTaskSheetProps) {
  const [form, setForm] = useState<NewTaskForm>(emptyForm);
  const [errorText, setErrorText] = useState<string | null>(null);
  const hasAmount = form.amountText.trim() !== "";

  function change<Field extends keyof NewTaskForm>(field: Field, value: NewTaskForm[Field]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit() {
    const result = await onCreate(form);
    if (result.ok) onClose();
    else setErrorText(describeFailure(result.reason));
  }

  return (
    <BottomSheet title="Nova pendência" onClose={onClose}>
      <div className="field">
        <label className="field-label" htmlFor="new-task-title">
          O que precisa ser feito?
        </label>
        <input
          className="input"
          id="new-task-title"
          type="text"
          autoComplete="off"
          placeholder="Ex.: Pagar o seguro do carro"
          value={form.title}
          onChange={(event) => change("title", event.target.value)}
        />
      </div>
      <div className="field-row">
        <div className="field">
          <label className="field-label" htmlFor="new-task-due">
            Prazo
          </label>
          <input
            className="input"
            id="new-task-due"
            type="date"
            value={form.dueDate}
            onChange={(event) => change("dueDate", event.target.value)}
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="new-task-priority">
            Prioridade
          </label>
          <select
            className="select"
            id="new-task-priority"
            value={form.priority}
            onChange={(event) => change("priority", event.target.value as NewTaskForm["priority"])}
          >
            <option value="high">Alta</option>
            <option value="medium">Média</option>
            <option value="low">Baixa</option>
          </select>
        </div>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="new-task-amount">
          Valor, se tiver (opcional)
        </label>
        <input
          className="input numeric"
          id="new-task-amount"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          value={form.amountText}
          onChange={(event) => change("amountText", event.target.value)}
        />
      </div>
      {hasAmount ? (
        <div className="field">
          <span className="field-label">Esse valor é</span>
          <Segmented
            kind="choice"
            label="Sentido do valor"
            value={form.direction}
            onChange={(value) => change("direction", value)}
            options={[
              { value: "expense", label: "A pagar" },
              { value: "income", label: "A receber" },
            ]}
          />
        </div>
      ) : null}
      <div className="field">
        <span className="field-label">Entra em</span>
        <Segmented
          kind="choice"
          label="Onde a pendência entra"
          value={form.placement}
          onChange={(value) => change("placement", value)}
          options={[
            { value: "cycle", label: `Ciclo ${cycleLabel}` },
            { value: "backlog", label: "Backlog" },
          ]}
        />
      </div>
      {errorText === null ? null : (
        <p className="form-error" role="alert">
          {errorText}
        </p>
      )}
      <button className="btn btn-primary btn-block" type="button" onClick={submit}>
        Salvar
      </button>
      <button className="btn btn-secondary btn-block" type="button" onClick={onClose}>
        Cancelar
      </button>
    </BottomSheet>
  );
}
