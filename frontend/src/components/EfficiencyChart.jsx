import { useState } from "react";
import CostChart from "./CostChart";

const money = (value) => `$${Number(value || 0).toFixed(5)}`;

export default function EfficiencyChart({ state }) {
  const [metric, setMetric] = useState("cost");
  const costMode = metric === "cost";
  const value = costMode ? money(state.cost_per_task) : Math.round(state.tokens_per_task).toLocaleString();
  const points = costMode ? state.cost_points : state.token_points;
  return (
    <section className="efficiency-card card" aria-labelledby="efficiency-title">
      <div className="efficiency-copy">
        <p className="label">Amortization curve</p>
        <h2 id="efficiency-title" className="efficiency-value mono">{value}</h2>
        <p className="efficiency-unit">{costMode ? "USD per task" : "tokens per task"} / rolling 20</p>
        <div className="segmented" aria-label="Chart metric">
          <button type="button" className={costMode ? "segment segment--active" : "segment"} onClick={() => setMetric("cost")}>Cost / task</button>
          <button type="button" className={!costMode ? "segment segment--active" : "segment"} onClick={() => setMetric("tokens")}>Tokens / task</button>
        </div>
      </div>
      <div className="chart-wrap"><CostChart points={points} label={`Rolling ${costMode ? "cost" : "tokens"} per task trend`} /><span className="chart-start">warm library</span><span className="chart-end">now</span></div>
    </section>
  );
}
