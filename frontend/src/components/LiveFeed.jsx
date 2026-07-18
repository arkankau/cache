import { Bell, FileText, Receipt, Scale, Wrench } from "lucide-react";

const ICONS = { notification: Bell, receipt: Receipt, expense: Wrench, invoice: FileText, recon: Scale };
const money = (value) => `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const cost = (value) => value == null ? "measuring" : value < 0.001 ? `$${value.toFixed(5)}` : `$${value.toFixed(4)}`;
const compute = (value) => value == null ? "pending" : value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`;

function titleFor(row) {
  const text = row.raw_text || "Processed finance submission";
  if (text.toLowerCase().includes("duplicate")) return "Duplicate invoice alert";
  if (row.case_signature?.includes("CAPEX")) return "Prepaid software contract";
  if (row.case_signature?.includes("RUSH")) return "Urgent contractor release";
  if (row.case_signature?.includes("RETAINER")) return "Prepaid legal retainer";
  if (row.entry_type === "recon") return "Multi-state reconciliation";
  return text.split(/[,.]/)[0];
}

export default function LiveFeed({ receipts, activeDistillation }) {
  const rows = [...receipts].reverse();
  if (activeDistillation) rows.unshift(activeDistillation);
  return (
    <section className="feed-card card" aria-labelledby="feed-title">
      <div className="section-heading">
        <div><p className="label">Incoming submissions</p><h1 id="feed-title" className="h1">Finance documents</h1></div>
        <div className="live-status"><span /> Live</div>
      </div>
      <div className="feed-header label" aria-hidden="true"><span>Submission</span><span>Routing</span><span>Compute</span><span>Cost</span></div>
      <div className="feed-scroll" role="log" aria-live="polite">
        {rows.map((row) => {
          const Icon = ICONS[row.entry_type] || FileText;
          const distilling = row.route === "distilling";
          return (
            <article className={`feed-row ${distilling ? "feed-row--distilling" : ""}`} key={`${row.entry_id}-${row.route}`}>
              <div className="document-cell">
                <span className="document-icon"><Icon size={17} /></span>
                <div><p className="document-title">{titleFor(row)}</p><p className="document-meta"><span>{row.vendor}</span><span className="mono">{money(row.amount)}</span><span>{row.entry_id}</span></p><p className="document-memo">{row.raw_text}</p></div>
              </div>
              <div className="route-cell"><span className={`badge badge--${row.route}`}>{row.route}</span><span className="signature">{row.case_signature}</span></div>
              <div className="compute-cell mono">{compute(row.compute_ms)}</div>
              <div className="cost-cell mono">{cost(row.cost)}{row.route === "specialist" && row.matches_truth ? <span className="match-mark">&#10003;</span> : null}</div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
