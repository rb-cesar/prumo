import { useState } from "react";
import { BottomSheet } from "../bottom-sheet";
import type { CompletionChoice, PendingCompletion } from "./use-complete-task";

type CompleteTaskSheetProps = {
  pending: PendingCompletion;
  today: string;
  onChoose: (choice: CompletionChoice) => void;
  onCancel: () => void;
};

const BAR_TONE_BY_STATUS = { ok: undefined, "near-limit": "near", "over-budget": "over" } as const;

/** "Concluir e lançar no financeiro?": a pendência tem valor, então a pessoa decide se ele vira lançamento. */
export function CompleteTaskSheet({ pending, today, onChoose, onCancel }: CompleteTaskSheetProps) {
  const { completion, context, envelopeOptions } = pending;
  const needsEnvelopeChoice = !completion.isIncome && completion.envelopeIdFromTask === null;
  const [chosenEnvelopeId, setChosenEnvelopeId] = useState<string | null>(
    needsEnvelopeChoice ? (envelopeOptions[0]?.id ?? null) : null,
  );
  const preview = completion.toPreview(context, chosenEnvelopeId, today);
  const canPost = completion.isIncome || preview !== null;
  const questionText = completion.isIncome
    ? `Registrar ${completion.amountText} como receita?`
    : `Registrar ${completion.amountText} como gasto?`;

  return (
    <BottomSheet title="Concluir e lançar no financeiro?" onClose={onCancel}>
      <p className="muted">
        “{completion.title}” tem valor. {questionText}
      </p>

      {needsEnvelopeChoice ? (
        <div className="field">
          <label className="field-label" htmlFor="complete-task-envelope">
            Envelope
          </label>
          <select
            className="select"
            id="complete-task-envelope"
            value={chosenEnvelopeId ?? ""}
            onChange={(event) => setChosenEnvelopeId(event.target.value)}
          >
            {envelopeOptions.map((envelope) => (
              <option key={envelope.id} value={envelope.id}>
                {envelope.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {preview?.kind === "income" ? (
        <div className="preview-box">
          <div className="goal-line">
            <span>Saldo em conta agora</span>
            <strong>{preview.balanceNowText}</strong>
          </div>
          <div className="goal-line">
            <span>Depois de lançar</span>
            <strong className="text-pos-ink">{preview.balanceAfterText}</strong>
          </div>
        </div>
      ) : null}

      {preview?.kind === "expense" ? (
        <div className="preview-box">
          <div className="goal-line">
            <span>{preview.envelopeName} depois de lançar</span>
            <strong>{preview.afterText}</strong>
          </div>
          <span className="bar block" data-tone={BAR_TONE_BY_STATUS[preview.status]}>
            <span style={{ width: `${Math.round(preview.fillRatio * 100)}%` }} />
          </span>
        </div>
      ) : null}

      <button
        className="btn btn-primary btn-block"
        type="button"
        disabled={!canPost}
        onClick={() => onChoose({ kind: "post", envelopeId: chosenEnvelopeId })}
      >
        Lançar e concluir
      </button>
      <button
        className="btn btn-secondary btn-block"
        type="button"
        onClick={() => onChoose({ kind: "only-complete" })}
      >
        Só concluir
      </button>
    </BottomSheet>
  );
}
