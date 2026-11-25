import type { HistoryView } from "../model";

const VIEWS: Array<{ value: HistoryView; label: string }> = [
  { value: "months", label: "Meses" },
  { value: "cycles", label: "Ciclos" },
  { value: "timeline", label: "Cronologia" },
];

type ViewTabsProps = { value: HistoryView; onChange: (view: HistoryView) => void };

export function ViewTabs({ value, onChange }: ViewTabsProps) {
  return (
    <div className="segmented" role="tablist" aria-label="Tipo de histórico">
      {VIEWS.map((view) => (
        <button
          key={view.value}
          className="segment"
          type="button"
          role="tab"
          aria-selected={view.value === value}
          onClick={() => onChange(view.value)}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
}
