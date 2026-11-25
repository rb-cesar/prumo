import type { InsightView } from "../domain";

/** Uma frase tirada dos números, com uma tira colorida ao lado. */
export function InsightCard({ insight }: { insight: InsightView }) {
  return (
    <div className="insight" data-tone={insight.tone}>
      <span className="insight-mark" />
      <div>
        <div className="insight-title">{insight.title}</div>
        <p className="small muted">{insight.text}</p>
      </div>
    </div>
  );
}
