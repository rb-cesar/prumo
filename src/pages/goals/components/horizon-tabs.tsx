import type { GoalHorizon } from "../domain";

const HORIZONS: Array<{ value: GoalHorizon; label: string }> = [
  { value: "short", label: "Curto prazo" },
  { value: "long", label: "Longo prazo" },
];

type HorizonTabsProps = { value: GoalHorizon; onChange: (horizon: GoalHorizon) => void };

export function HorizonTabs({ value, onChange }: HorizonTabsProps) {
  return (
    <div className="segmented" role="tablist" aria-label="Horizonte das metas">
      {HORIZONS.map((horizon) => (
        <button
          key={horizon.value}
          className="segment"
          type="button"
          role="tab"
          aria-selected={horizon.value === value}
          onClick={() => onChange(horizon.value)}
        >
          {horizon.label}
        </button>
      ))}
    </div>
  );
}
