import type { Config } from "tailwindcss";

/** Cores e formas vêm de `src/styles/tokens.css` (variáveis CSS), então os dois temas funcionam sem `dark:`. */
const colorTokenNames = [
  "bg",
  "surface",
  "surface-2",
  "ink",
  "ink-2",
  "ink-3",
  "line",
  "accent",
  "on-accent",
  "steel",
  "pos",
  "neg",
  "near",
  "on-pos",
  "steel-bg",
  "pos-bg",
  "neg-bg",
  "near-bg",
  "steel-ink",
  "pos-ink",
  "neg-ink",
  "near-ink",
  "hero-bg",
  "hero-fg",
  "hero-fg-2",
  "hero-track",
  "hero-warn",
  "overlay",
];

const colors = Object.fromEntries(colorTokenNames.map((name) => [name, `var(--${name})`]));

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors,
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
      fontSize: {
        "hero-amount": ["46px", { lineHeight: "1", letterSpacing: "-0.03em", fontWeight: "700" }],
        "app-title": ["27px", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" }],
        "goal-percent": [
          "26px",
          { lineHeight: "1.4", letterSpacing: "-0.02em", fontWeight: "700" },
        ],
        "sheet-title": [
          "22px",
          { lineHeight: "1.15", letterSpacing: "-0.02em", fontWeight: "700" },
        ],
        "goal-title": ["18px", { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "700" }],
        "stat-value": ["17px", { lineHeight: "1.4", letterSpacing: "-0.01em", fontWeight: "700" }],
        body: ["15px", { lineHeight: "1.4", fontWeight: "400" }],
        "task-title": ["15px", { lineHeight: "1.4", fontWeight: "500" }],
        button: ["15px", { lineHeight: "1.4", fontWeight: "600" }],
        small: ["13px", { lineHeight: "1.4", fontWeight: "400" }],
        tiny: ["12px", { lineHeight: "1.4", fontWeight: "400" }],
        chip: ["12px", { lineHeight: "1.4", fontWeight: "500" }],
        label: ["12px", { lineHeight: "1.4", letterSpacing: "0.08em", fontWeight: "600" }],
        tab: ["11px", { lineHeight: "1.4", fontWeight: "500" }],
      },
      // Os espaços do design system de 4 a 16px (--space-1 a --space-7) coincidem com os passos 1, 1.5,
      // 2, 2.5, 3, 3.5 e 4 da escala do Tailwind. Os 22px (--space-8) e os tamanhos de controle entram aqui.
      spacing: {
        section: "var(--space-8)",
        "above-tabs": "calc(5.5rem + var(--safe-area-inset-bottom, 0px))",
        touch: "var(--size-touch)",
        input: "var(--size-input)",
        button: "var(--size-button)",
        fab: "var(--size-fab)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        card: "var(--radius-card)",
        fab: "var(--radius-fab)",
        hero: "var(--radius-hero)",
        sheet: "var(--radius-sheet)",
        pill: "var(--radius-pill)",
        round: "var(--radius-round)",
      },
      boxShadow: {
        segment: "var(--shadow-segment)",
        fab: "var(--shadow-fab)",
        toast: "var(--shadow-toast)",
      },
    },
  },
} satisfies Config;
