import { useState } from "react";
import { BottomSheet } from "../../../shared/bottom-sheet";
import type { NewGoalForm, SaveResult } from "../model";

type NewGoalSheetProps = {
  onCreate: (form: NewGoalForm) => Promise<SaveResult>;
  onClose: () => void;
};

function describeFailure(reason: Extract<SaveResult, { ok: false }>["reason"]): string {
  if (reason === "title-required") return "Escreva o nome da meta.";
  if (reason === "target-not-a-number" || reason === "invalid-target") {
    return "O valor da meta não parece certo. Use um formato como 5.000,00.";
  }
  if (reason === "initial-saved-not-a-number" || reason === "invalid-initial-saved") {
    return "O valor que você já tem não parece certo. Deixe vazio se não tem nada.";
  }
  if (reason === "invalid-due-date") return "Escolha o prazo da meta.";
  if (reason === "due-date-in-past") return "O prazo precisa ser hoje ou depois.";
  return "Não foi possível salvar a meta.";
}

export function NewGoalSheet({ onCreate, onClose }: NewGoalSheetProps) {
  const [form, setForm] = useState<NewGoalForm>({
    title: "",
    targetText: "",
    initialSavedText: "",
    dueDate: "",
  });
  const [errorText, setErrorText] = useState<string | null>(null);

  function change<Field extends keyof NewGoalForm>(field: Field, value: NewGoalForm[Field]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit() {
    const result = await onCreate(form);
    if (result.ok) onClose();
    else setErrorText(describeFailure(result.reason));
  }

  return (
    <BottomSheet title="Nova meta" onClose={onClose}>
      <div className="field">
        <label className="field-label" htmlFor="new-goal-title">
          Nome da meta
        </label>
        <input
          className="input"
          id="new-goal-title"
          type="text"
          autoComplete="off"
          placeholder="Ex.: Viagem de julho"
          value={form.title}
          onChange={(event) => change("title", event.target.value)}
        />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="new-goal-target">
          Quanto quero juntar
        </label>
        <input
          className="input numeric"
          id="new-goal-target"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          value={form.targetText}
          onChange={(event) => change("targetText", event.target.value)}
        />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="new-goal-initial">
          Quanto já tenho guardado (opcional)
        </label>
        <input
          className="input numeric"
          id="new-goal-initial"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          value={form.initialSavedText}
          onChange={(event) => change("initialSavedText", event.target.value)}
        />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="new-goal-due-date">
          Prazo
        </label>
        <input
          className="input"
          id="new-goal-due-date"
          type="date"
          value={form.dueDate}
          onChange={(event) => change("dueDate", event.target.value)}
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
