import type { MonthRowView } from "../domain";

const WIDTH = 340;
const HEIGHT = 196;
const MARGIN = { top: 12, right: 8, bottom: 30, left: 34 };
const BAR_WIDTH = 15;
const BAR_GAP = 3;
/** Uma linha de grade a cada R$ 2.000. */
const TICK_STEP_IN_CENTS = 200000;

/** Barras lado a lado de quanto entrou e saiu em cada mês; o mês atual fica mais claro. */
export function MonthlyChart({ rows }: { rows: MonthRowView[] }) {
  const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const highestInCents = Math.max(
    TICK_STEP_IN_CENTS,
    ...rows.map((row) => Math.max(row.incomeInCents, row.expenseInCents)),
  );
  const axisMaximumInCents = Math.ceil(highestInCents / TICK_STEP_IN_CENTS) * TICK_STEP_IN_CENTS;
  const toY = (cents: number) => MARGIN.top + plotHeight * (1 - cents / axisMaximumInCents);
  const groupWidth = plotWidth / rows.length;

  const ticks: number[] = [];
  for (let tick = 0; tick <= axisMaximumInCents; tick += TICK_STEP_IN_CENTS) ticks.push(tick);

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="Entradas e saídas por mês"
    >
      {ticks.map((tick) => (
        <g key={tick}>
          <line
            className="grid"
            x1={MARGIN.left}
            x2={WIDTH - MARGIN.right}
            y1={toY(tick)}
            y2={toY(tick)}
          />
          <text className="axis-label" x={MARGIN.left - 6} y={toY(tick) + 3} textAnchor="end">
            {tick === 0 ? "0" : `${tick / 100000}k`}
          </text>
        </g>
      ))}
      {rows.map((row, index) => {
        const center = MARGIN.left + groupWidth * (index + 0.5);
        const baseline = toY(0);
        const partialClass = row.isPartial ? " partial" : "";
        return (
          <g key={row.month}>
            <rect
              className={`bar-income${partialClass}`}
              x={center - BAR_WIDTH - BAR_GAP / 2}
              y={toY(row.incomeInCents)}
              width={BAR_WIDTH}
              height={baseline - toY(row.incomeInCents)}
              rx={3}
            />
            <rect
              className={`bar-expense${partialClass}`}
              x={center + BAR_GAP / 2}
              y={toY(row.expenseInCents)}
              width={BAR_WIDTH}
              height={baseline - toY(row.expenseInCents)}
              rx={3}
            />
            <text className="axis-label" x={center} y={HEIGHT - 10} textAnchor="middle">
              {row.isPartial ? `${row.label}*` : row.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
