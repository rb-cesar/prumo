import { useState } from "react";
import { BottomSheet } from "../../../shared/bottom-sheet";
import type { ReviewForm, SaveReviewResult } from "../model";

type ReviewSheetProps = {
  /** "22 a 28 nov". */
  cycleLabel: string;
  /** O resumo do ciclo, em cima das perguntas (BR-H06). */
  summary: { doneText: string; spendingText: string; savedText: string };
  onSave: (form: ReviewForm) => Promise<SaveReviewResult>;
  onClose: () => void;
};

const QUESTIONS: Array<{ field: keyof ReviewForm; label: string; placeholder: string }> = [
  { field: "worked", label: "O que funcionou?", placeholder: "Ex.: Planejei na segunda" },
  {
    field: "hindered",
    label: "O que atrapalhou?",
    placeholder: "Ex.: Gastei demais no fim de semana",
  },
  {
    field: "changeNext",
    label: "O que muda no próximo ciclo?",
    placeholder: "Ex.: Planejar no máximo 7 pendências",
  },
];

export function ReviewSheet({ cycleLabel, summary, onSave, onClose }: ReviewSheetProps) {
  const [form, setForm] = useState<ReviewForm>({ worked: "", hindered: "", changeNext: "" });
  const [errorText, setErrorText] = useState<string | null>(null);

  async function submit() {
    const result = await onSave(form);
    if (result.ok) onClose();
    else setErrorText("Responda pelo menos uma pergunta para salvar a revisão.");
  }

  return (
    <BottomSheet title={`Revisão do ciclo ${cycleLabel}`} onClose={onClose}>
      <div className="preview-box">
        <div className="goal-line">
          <span>Pendências concluídas</span>
          <strong>{summary.doneText}</strong>
        </div>
        <div className="goal-line">
          <span>Gasto do dia a dia</span>
          <strong>{summary.spendingText}</strong>
        </div>
        <div className="goal-line">
          <span>Guardado no mês</span>
          <strong>{summary.savedText}</strong>
        </div>
      </div>
      {QUESTIONS.map((question) => (
        <div key={question.field} className="field">
          <label className="field-label" htmlFor={`review-${question.field}`}>
            {question.label}
          </label>
          <textarea
            className="textarea"
            id={`review-${question.field}`}
            placeholder={question.placeholder}
            value={form[question.field]}
            onChange={(event) =>
              setForm((current) => ({ ...current, [question.field]: event.target.value }))
            }
          />
        </div>
      ))}
      {errorText === null ? null : (
        <p className="form-error" role="alert">
          {errorText}
        </p>
      )}
      <button className="btn btn-primary btn-block" type="button" onClick={submit}>
        Salvar revisão
      </button>
      <button className="btn btn-secondary btn-block" type="button" onClick={onClose}>
        Agora não
      </button>
    </BottomSheet>
  );
}
