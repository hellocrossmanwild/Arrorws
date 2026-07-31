export interface TrendPoint {
  sessionId: string
  date: string
  threeDartAverage: number
  legCount: number
}

/**
 * Three-dart average per session. Points, not a smoothed curve. Sessions
 * with fewer than three legs are drawn hollow — a two-leg average is noise.
 */
export function TrendLine({ points }: { points: TrendPoint[] }) {
  if (points.length === 0) {
    return (
      <p className="bg-bed px-4 py-6 text-sm text-tung" data-testid="trend-empty">
        No sessions yet. Throw a leg.
      </p>
    )
  }

  const width = 320
  const height = 120
  const pad = 14
  const values = points.map((p) => p.threeDartAverage)
  const min = Math.min(...values) - 5
  const max = Math.max(...values) + 5
  const x = (i: number) =>
    points.length === 1 ? width / 2 : pad + (i * (width - pad * 2)) / (points.length - 1)
  const y = (v: number) => height - pad - ((v - min) * (height - pad * 2)) / (max - min)

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full bg-bed"
      role="img"
      aria-label="Three-dart average per session"
      data-testid="trend-line"
    >
      {points.length > 1 && (
        <polyline
          points={points.map((p, i) => `${x(i)},${y(p.threeDartAverage)}`).join(" ")}
          fill="none"
          stroke="#B08D57"
          strokeWidth="1"
        />
      )}
      {points.map((p, i) => (
        <g key={p.sessionId}>
          <circle
            cx={x(i)}
            cy={y(p.threeDartAverage)}
            r="4"
            fill={p.legCount >= 3 ? "#B08D57" : "none"}
            stroke="#B08D57"
            strokeWidth="1.5"
            data-testid={p.legCount >= 3 ? "trend-point" : "trend-point-hollow"}
          />
          <text
            x={x(i)}
            y={y(p.threeDartAverage) - 8}
            textAnchor="middle"
            fill="#8A9099"
            fontSize="8"
            fontFamily="monospace"
          >
            {p.threeDartAverage.toFixed(0)}
          </text>
        </g>
      ))}
    </svg>
  )
}
