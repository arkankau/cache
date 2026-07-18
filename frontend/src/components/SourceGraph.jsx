import { Database, RefreshCw } from "lucide-react";

const CODE_POSITIONS = {
  "GL-4021": 34,
  "GL-4890": 74,
  "ST-CA-07": 114,
  "ST-NY-01": 154,
  "ST-TX-03": 194
};

export default function SourceGraph({ state, onEdit, refreshing }) {
  const links = state.specialist_links.slice(0, 7);
  const caRate = state.lake.state_codes["ST-CA-07"].rate;
  return (
    <section className={`source-card card ${refreshing ? "source-card--refreshing" : ""}`} aria-labelledby="source-title">
      <div className="source-heading">
        <div>
          <p className="label">Source of truth</p>
          <h2 id="source-title" className="h2"><Database size={17} aria-hidden="true" /> Lake references</h2>
        </div>
        <span className="rate-readout mono">CA {caRate.toFixed(4)}</span>
      </div>
      <svg className="source-graph" viewBox="0 0 390 224" role="img" aria-label="Specialists linked to live lake codes">
        {links.flatMap((spec, index) => {
          const sy = 27 + index * 29;
          return spec.code_references
            .filter((code) => CODE_POSITIONS[code])
            .map((code) => (
              <line key={`${spec.specialist_id}-${code}`} x1="122" y1={CODE_POSITIONS[code]} x2="320" y2={sy} className="graph-edge" />
            ));
        })}
        {Object.entries(CODE_POSITIONS).map(([code, y]) => (
          <g key={code}>
            <rect x="8" y={y - 13} width="114" height="26" rx="5" className={code === state.refreshed_code ? "code-node code-node--active" : "code-node"} />
            <text x="20" y={y + 4} className="graph-code">{code}</text>
          </g>
        ))}
        {links.map((spec, index) => {
          const y = 27 + index * 29;
          return (
            <g key={spec.specialist_id}>
              <circle cx="320" cy={y} r="6" className={spec.refreshed ? "spec-dot spec-dot--refreshed" : "spec-dot"} />
              <text x="334" y={y + 4} className="graph-spec">S{index + 1}</text>
            </g>
          );
        })}
        {state.refreshed_specialists.length ? <text x="267" y="220" className="graph-refreshed">refreshed</text> : null}
      </svg>
      <button className="lake-edit" type="button" onClick={onEdit} disabled={caRate === 0.08}>
        <RefreshCw size={15} aria-hidden="true" />
        {caRate === 0.08 ? "ST-CA-07 refreshed · 0.08" : "Edit ST-CA-07 rate → 0.08"}
      </button>
    </section>
  );
}
