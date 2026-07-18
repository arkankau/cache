export default function CostChart({ points = [] }) {
  const width = 420;
  const height = 94;
  const pad = 7;
  const values = points.map((point) => point.value);
  const max = Math.max(...values, 0.0001);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 0.0001);
  const coords = points.map((point, index) => {
    const x = pad + (index / Math.max(points.length - 1, 1)) * (width - pad * 2);
    const y = pad + ((max - point.value) / range) * (height - pad * 2);
    return { x, y };
  });
  const path = coords.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = coords.at(-1);

  return (
    <svg className="cost-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Rolling cost per task trend">
      <line x1="7" y1="87" x2="413" y2="87" className="chart-baseline" />
      {path ? <polyline points={path} className="chart-line" /> : null}
      {last ? (
        <g>
          <circle cx={last.x} cy={last.y} r="7" className="chart-current-ring" />
          <circle cx={last.x} cy={last.y} r="3.5" className="chart-current" />
        </g>
      ) : null}
    </svg>
  );
}
