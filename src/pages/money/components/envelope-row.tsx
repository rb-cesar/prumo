import type { EnvelopeRowView } from "../domain";

type EnvelopeRowProps = {
  row: EnvelopeRowView;
  isSelected: boolean;
  onToggle: (envelopeId: string) => void;
};

const BAR_TONE_BY_STATUS = { ok: undefined, "near-limit": "near", "over-budget": "over" } as const;

/** Um envelope: gasto contra o valor, barra e situação. Tocar filtra os lançamentos. */
export function EnvelopeRow({ row, isSelected, onToggle }: EnvelopeRowProps) {
  return (
    <button
      className="envelope"
      type="button"
      aria-pressed={isSelected}
      onClick={() => onToggle(row.id)}
    >
      <span className="envelope-head">
        <span className="envelope-name">
          {row.name}
          {row.isFixed ? <span className="tiny"> fixo</span> : null}
        </span>{" "}
        <span className="small numeric muted">
          {row.spentText} de {row.budgetText}
        </span>
      </span>{" "}
      <span className="bar block" data-tone={BAR_TONE_BY_STATUS[row.status]}>
        <span style={{ width: `${Math.round(row.fillRatio * 100)}%` }} />
      </span>
      <span>
        <span className="chip" data-tone={row.statusChip.tone ?? undefined}>
          {row.statusChip.text}
        </span>
      </span>
    </button>
  );
}
