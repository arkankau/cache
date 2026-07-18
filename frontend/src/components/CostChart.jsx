export default function CostChart({ points = [], label = "Rolling cost per task trend" }) {
  const width = 760;
  const height = 150;
  const padX = 16;
  const padY = 13;
  const values = points.map((point) => point.value);
  const max = Math.max(...values, 0.0001);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 0.0001);
  const coords = points.map((point, index) => ({
    x: padX + (index / Math.max(points.length - 1, 1)) * (width - padX * 2),
    y: padY + ((max - point.value) / range) * (height - padY * 2)
  }));
  const path = coords.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = coords.at(-1);
  return (
    <svg className="cost-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      {[.25,.5,.75,1].map((part) => <line key={part} x1={padX} y1={padY + (height-padY*2)*part} x2={width-padX} y2={padY + (height-padY*2)*part} className="chart-grid" />)}
      {path ? <polyline points={path} className="chart-line" /> : null}
      {last ? <g><circle cx={last.x} cy={last.y} r="9" className="chart-current-ring" /><circle cx={last.x} cy={last.y} r="4" className="chart-current" /></g> : null}
    </svg>
  );
}
