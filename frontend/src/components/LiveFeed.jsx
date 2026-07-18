function formatCost(value) {
  if (value == null) return "pending";
  return value < 0.001 ? `$${value.toFixed(5)}` : `$${value.toFixed(4)}`;
}

function displayCase(signature) {
  return signature.replace("|", " · ").replace("-CAPEX", " · CAPEX");
}

export default function LiveFeed({ receipts, activeDistillation }) {
  const rows = [...receipts].reverse();
  if (activeDistillation) rows.unshift(activeDistillation);

  return (
    <section className="feed-card card" aria-labelledby="feed-title">
      <div className="section-heading">
        <div>
          <p className="label">Processing stream</p>
          <h1 id="feed-title" className="h1">Live ledger feed</h1>
        </div>
        <div className="live-status"><span aria-hidden="true" /> Live</div>
      </div>

      <div className="feed-header label" aria-hidden="true">
        <span>Vendor</span><span>Case type</span><span>Route</span><span>Cost</span>
      </div>
      <div className="feed-scroll" role="log" aria-live="polite">
        {rows.map((row) => {
          const isDistilling = row.route === "distilling";
          return (
            <div className={`feed-row ${isDistilling ? "feed-row--distilling" : ""}`} key={`${row.entry_id}-${row.route}`}>
              <div className="vendor-cell">
                <span>{row.vendor}</span>
                <span className="entry-id">{row.entry_id}</span>
              </div>
              <span className="case-cell">{displayCase(row.case_signature)}</span>
              <span><span className={`badge badge--${row.route}`}>{row.route}</span></span>
              <span className="cost-cell mono">
                {formatCost(row.cost)}
                {row.route === "specialist" && row.matches_truth ? <span className="match-mark" aria-label="matches truth">✓</span> : null}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
