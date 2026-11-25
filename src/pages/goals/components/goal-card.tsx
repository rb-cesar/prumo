import { useState } from "react";
import type { GoalCardView } from "../domain";
import type { SaveResult } from "../model";

const SHORTCUT_AMOUNTS = [50, 100, 200] as const;

type GoalCardProps = {
  card: GoalCardView;
  isExpanded: boolean;
  onToggle: () => void;
  onContribute: (amountText: string) => Promise<SaveResult>;
  onRemove: () => void;
};

/** Uma meta: título, prazo, progresso e, aberta, o aporte e a exclusão em dois passos. */
export function GoalCard({ card, isExpanded, onToggle, onContribute, onRemove }: GoalCardProps) {
  const [amountText, setAmountText] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isConfirmingRemoval, setIsConfirmingRemoval] = useState(false);

  async function contribute() {
    const result = await onContribute(amountText);
    if (result.ok) {
      setAmountText("");
      setErrorText(null);
    } else {
      setErrorText("O valor não parece certo. Use um formato como 120,50.");
    }
  }

  return (
    <article className="card goal">
      <button className="goal-head" type="button" aria-expanded={isExpanded} onClick={onToggle}>
        <span className="grow">
          <span className="goal-title">{card.title}</span>
          <span className="tiny mt-1 block">{card.dueText}</span>
        </span>
        <span className="goal-percent">{card.percentText}</span>
      </button>

      <span className="bar block" data-tone={card.isCompleted ? "pos" : undefined}>
        <span style={{ width: `${Math.round(card.ratio * 100)}%` }} />
      </span>

      <div className="goal-lines">
        <div className="goal-line">
          <span>Guardado</span>
          <strong>{card.savedText}</strong>
        </div>
        {card.paceText === null ? null : (
          <div className="goal-line">
            <span>Ritmo necessário</span>
            <strong>{card.paceText}</strong>
          </div>
        )}
        {card.isCompleted ? (
          <div>
            <span className="chip" data-tone="pos">
              Concluída
            </span>
          </div>
        ) : null}
      </div>

      {isExpanded ? (
        <div className="stack">
          <label className="field-label" htmlFor={`contribution-${card.id}`}>
            Guardar agora (sai do saldo em conta)
          </label>
          <input
            className="input numeric"
            id={`contribution-${card.id}`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0,00"
            value={amountText}
            onChange={(event) => setAmountText(event.target.value)}
          />
          <div className="contribute">
            {SHORTCUT_AMOUNTS.map((shortcutAmount) => (
              <button
                key={shortcutAmount}
                type="button"
                onClick={() => setAmountText(String(shortcutAmount))}
              >
                + R$ {shortcutAmount}
              </button>
            ))}
          </div>
          {errorText === null ? null : (
            <p className="form-error" role="alert">
              {errorText}
            </p>
          )}
          <button className="btn btn-primary btn-block" type="button" onClick={contribute}>
            Guardar
          </button>
          {isConfirmingRemoval ? (
            <button className="btn btn-danger btn-block" type="button" onClick={onRemove}>
              Confirmar exclusão
            </button>
          ) : (
            <button
              className="btn btn-block bg-transparent text-neg-ink"
              type="button"
              onClick={() => setIsConfirmingRemoval(true)}
            >
              Excluir meta
            </button>
          )}
        </div>
      ) : null}
    </article>
  );
}
