import { ArrowLeft, Check, FileText, Flag, PenLine } from "lucide-react";
import { useMemo, useState } from "react";

const usd = (value) => `$${Number(value || 0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;

export default function FinancialReport({ state }) {
  const entries = state.receipts.filter((row) => row.t >= 0);
  const complete = !state.running && state.t >= 33;
  const defectIds = new Set(state.defect_agents.map((agent) => agent.specialist_id));
  const [decisions,setDecisions] = useState({});
  const [cfoName,setCfoName] = useState("");
  const [attested,setAttested] = useState(false);
  const [signed,setSigned] = useState(false);
  const totalValue = entries.reduce((sum,row) => sum + Number(row.amount || 0),0);
  const capitalized = entries.filter((row) => row.answer?.gl_code === "GL-4890").reduce((sum,row) => sum + Number(row.amount || 0),0);
  const operatingExpense = totalValue - capitalized;
  const reviewEntries = entries.filter((row) => row.answer?.disposition?.includes("review") || defectIds.has(row.specialist_id));
  const reviewExposure = reviewEntries.reduce((sum,row) => sum + Number(row.amount || 0),0);
  const classifications = useMemo(() => {
    const grouped = new Map();
    entries.forEach((row) => { const code=row.answer?.gl_code || "Pending"; const item=grouped.get(code)||{code,count:0,amount:0,dispositions:new Set()}; item.count+=1; item.amount+=Number(row.amount||0); if(row.answer?.disposition)item.dispositions.add(row.answer.disposition); grouped.set(code,item); });
    return [...grouped.values()];
  },[entries]);
  const sign = () => { if(cfoName.trim() && attested) setSigned(true); };
  return <main className="report-page">
    <header className="report-header"><a href="/" className="report-back"><ArrowLeft size={16} /> Cache</a><span className="label">Northwind Software / finance control packet</span></header>
    <section className="report-title"><div><p className="label">Ledger classification report / demo close cycle</p><h1>{complete ? "Northwind finance report" : "Report is being prepared"}</h1><p>{complete ? `${entries.length} processed submissions classified against the live Northwind ledger and state policy lake.` : "This report will finalize automatically when the processing run finishes."}</p></div><span className={complete ? "report-status report-status--ready" : "report-status"}>{complete ? <><Check size={15} /> Prepared</> : "Processing"}</span></section>
    <section className="report-metrics report-metrics--finance"><div><span className="label">Total processed</span><strong>{usd(totalValue)}</strong></div><div><span className="label">Operating expense</span><strong>{usd(operatingExpense)}</strong></div><div><span className="label">Capitalized software</span><strong>{usd(capitalized)}</strong></div><div><span className="label">Review exposure</span><strong>{usd(reviewExposure)}</strong></div></section>
    <section className="classification-card"><div className="report-section-title"><FileText size={17} /><h2>Classification summary</h2></div><table className="classification-table"><thead><tr><th>GL classification</th><th>Entries</th><th>Amount</th><th>Dispositions represented</th></tr></thead><tbody>{classifications.map((item) => <tr key={item.code}><td>{item.code}</td><td>{item.count}</td><td>{usd(item.amount)}</td><td>{[...item.dispositions].join(", ")}</td></tr>)}</tbody></table></section>
    <section className="report-table-card"><div className="report-section-title"><FileText size={17} /><h2>Detailed classified ledger</h2></div><table className="report-table"><thead><tr><th>Entry</th><th>Vendor</th><th>Amount</th><th>Classification</th><th>Disposition</th><th>Control status</th></tr></thead><tbody>{entries.map((row) => { const defect=defectIds.has(row.specialist_id); const decision=decisions[row.entry_id]; return <tr className={defect ? "report-row--flagged" : ""} key={row.entry_id}><td>{row.entry_id}</td><td>{row.vendor}</td><td>{usd(row.amount)}</td><td>{row.answer?.gl_code || "pending"}</td><td>{row.answer?.disposition || "pending"}</td><td>{defect ? <div className="defect-control"><span className="defect-flag"><Flag size={12} /> Defect agent / CFO review</span>{decision ? <strong>{decision === "accept" ? "Classification accepted" : "Sent to manual review"}</strong> : <span className="cfo-row-actions"><button type="button" onClick={() => setDecisions((current) => ({...current,[row.entry_id]:"accept"}))}>Accept</button><button type="button" onClick={() => setDecisions((current) => ({...current,[row.entry_id]:"review"}))}>Send to review</button></span>}</div> : <span className="control-clear"><Check size={12} /> Control clear</span>}</td></tr>;})}</tbody></table>{!entries.length ? <p className="empty-report">Run the demo to populate this finance report.</p> : null}</section>
    <section className={`cfo-signoff ${signed ? "cfo-signoff--signed" : ""}`}><div><p className="label">CFO validation</p><h2><PenLine size={18} /> Sign finance report</h2><p>Confirm the classifications, dispositions, and any defect-agent decisions above before final approval.</p></div>{signed ? <div className="signature-complete"><Check size={18} /><span>Signed by {cfoName}</span><small>{new Date().toLocaleString()}</small></div> : <div className="signature-form"><input value={cfoName} onChange={(event) => setCfoName(event.target.value)} placeholder="CFO full name" aria-label="CFO full name" /><label><input type="checkbox" checked={attested} onChange={(event) => setAttested(event.target.checked)} /> I reviewed classifications and flagged entries</label><button type="button" disabled={!cfoName.trim() || !attested} onClick={sign}>Sign report</button></div>}</section>
    <footer className="report-footer">Prepared from Cache receipts / live lake references / CFO approval required</footer>
  </main>;
}
