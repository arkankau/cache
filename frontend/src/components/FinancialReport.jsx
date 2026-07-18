import { ArrowLeft, Check, FileText } from "lucide-react";

const usd = (value) => `$${Number(value || 0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;

export default function FinancialReport({ state }) {
  const entries = state.receipts.filter((row) => row.t >= 0);
  const complete = !state.running && state.t >= 33;
  const totalValue = entries.reduce((sum,row) => sum + Number(row.amount || 0),0);
  const reviews = entries.filter((row) => row.answer?.disposition?.includes("review"));
  const automated = entries.filter((row) => row.route === "specialist");
  const capitalized = entries.filter((row) => row.answer?.gl_code === "GL-4890").reduce((sum,row) => sum + Number(row.amount || 0),0);
  const runSpend = entries.reduce((sum,row) => sum + Number(row.cost || 0),0);
  return <main className="report-page">
    <header className="report-header"><a href="/" className="report-back"><ArrowLeft size={16} /> Cache</a><span className="label">Northwind Software / generated close packet</span></header>
    <section className="report-title"><div><p className="label">Finance operations report</p><h1>{complete ? "Processing run complete" : "Report is being prepared"}</h1><p>{complete ? `Generated from ${entries.length} live submissions and ${state.library_count} validated specialists.` : "This tab will finalize automatically when the running demo finishes."}</p></div><span className={complete ? "report-status report-status--ready" : "report-status"}>{complete ? <><Check size={15} /> Finalized</> : "Processing"}</span></section>
    <section className="report-metrics"><div><span className="label">Submission value</span><strong>{usd(totalValue)}</strong></div><div><span className="label">Specialist handled</span><strong>{automated.length}</strong></div><div><span className="label">Review queue</span><strong>{reviews.length}</strong></div><div><span className="label">Capitalized software</span><strong>{usd(capitalized)}</strong></div><div><span className="label">Run model spend</span><strong>${runSpend.toFixed(3)}</strong></div></section>
    <section className="report-table-card"><div className="report-section-title"><FileText size={17} /><h2>Processed ledger</h2></div><table className="report-table"><thead><tr><th>Entry</th><th>Vendor</th><th>Amount</th><th>Classification</th><th>Disposition</th><th>Route</th><th>Model cost</th></tr></thead><tbody>{entries.map((row) => <tr key={row.entry_id}><td>{row.entry_id}</td><td>{row.vendor}</td><td>{usd(row.amount)}</td><td>{row.answer?.gl_code || "pending"}</td><td>{row.answer?.disposition || "pending"}</td><td><span className={`report-route report-route--${row.route}`}>{row.route}</span></td><td className="mono">{row.cost == null ? "-" : `$${row.cost.toFixed(5)}`}</td></tr>)}</tbody></table>{!entries.length ? <p className="empty-report">Run the demo to populate this close report.</p> : null}</section>
    <footer className="report-footer">Generated from Cache receipts / live lake references / usage-derived model costs</footer>
  </main>;
}
