type SegmentedOption<Value extends string> = { value: Value; label: string; count?: number };

type SegmentedProps<Value extends string> = {
  label: string;
  options: SegmentedOption<Value>[];
  value: Value;
  onChange: (value: Value) => void;
  /** `tabs` troca o que a tela mostra; `choice` escolhe um valor num formulário. */
  kind: "tabs" | "choice";
};

export function Segmented<Value extends string>({
  label,
  options,
  value,
  onChange,
  kind,
}: SegmentedProps<Value>) {
  return (
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: o papel é sempre tablist ou group, ambos aceitam aria-label
    <div className="segmented" role={kind === "tabs" ? "tablist" : "group"} aria-label={label}>
      {options.map((option) => {
        const isSelected = option.value === value;
        const selectedAttributes =
          kind === "tabs"
            ? { role: "tab", "aria-selected": isSelected }
            : { "aria-pressed": isSelected };
        return (
          <button
            key={option.value}
            className="segment"
            type="button"
            onClick={() => onChange(option.value)}
            {...selectedAttributes}
          >
            {option.label}
            {option.count === undefined ? null : <span className="count">{option.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
