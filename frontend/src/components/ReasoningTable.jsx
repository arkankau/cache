import { Bot, GraduationCap } from "lucide-react";

const money = (value) => value == null ? "pending" : value < .001 ? `$${value.toFixed(5)}` : `$${value.toFixed(4)}`;

function submissionTitle(row) {
  if (row.case_signature?.includes("CAPEX")) return "Prepaid software contract";
  if (row.case_signature?.includes("RUSH")) return "Urgent contractor release";
  if (row.case_signature?.includes("RETAINER")) return "Prepaid legal retainer";
  return (row.raw_text || row.case_signature || "Ledger submission").split(/[,.]/)[0];
}

export default function ReasoningTable({ receipts, active, drawer }) {
  const live = receipts.filter((row) => row.t >= 0);
  const base = live.length ? live : receipts.slice(-8);
  const rows = [...base].reverse();
  if (active) rows.unshift(active);
  return (
    <section className="reasoning-table-card card" aria-labelledby="reasoning-table-title">
      <div className="table-section-heading"><div><p className="label">Reasoning comparison / every entry</p><h2 id="reasoning-table-title" className="h2">Broad investigation vs compiled execution</h2></div><span className="table-caption">actual route and usage per submission</span></div>
      <div className="reasoning-table-scroll">
        <table className="reasoning-table">
          <thead><tr><th>Submission</th><th><GraduationCap size={13} /> General teacher</th><th><Bot size={13} /> Specialist procedure</th><th>Context touched</th><th>Actual usage</th></tr></thead>
          <tbody>{rows.map((row) => {
            const general = row.route === "general" || row.route === "distilling";
            const sameLatest = drawer?.case_signature === row.case_signature;
            const references = Object.keys(row.resolved_codes || {});
            return <tr className={general ? "reason-row reason-row--general" : "reason-row"} key={`${row.entry_id}-${row.route}`}>
              <td><span className="table-entry-title">{submissionTitle(row)}</span><small>{row.vendor} / {row.entry_id}</small></td>
              <td>{general ? <><span className="path-status path-status--active">{row.route === "distilling" ? "Reasoning now" : "Invoked"}</span><p>{sameLatest ? drawer.general.summary : "Inspect vendor history, GL policy, state rules, and exception cues."}</p></> : <><span className="path-status">Not invoked</span><p>Known signature; broad exploration was skipped.</p></>}</td>
              <td>{general ? <><span className="path-status">{row.route === "distilling" ? "Compiling" : "Validated after solve"}</span><p>{sameLatest ? drawer.specialist.summary : "Teacher trace becomes a schema-bound reusable procedure."}</p></> : <><span className="path-status path-status--specialist">Executed</span><p>Exact signature match; resolve live references; emit schema-only answer.</p></>}</td>
              <td><div className="table-context">{general ? <><span>vendor_registry</span><span>gl_codes</span><span>state_codes</span></> : references.length ? references.slice(0,4).map((code) => <span key={code}>{code}</span>) : <span>stored procedure</span>}</div></td>
              <td><span className="usage-route">{row.route}</span><strong className="mono">{row.tokens == null ? "pending" : `${row.tokens.toLocaleString()} tok`}</strong><small className="mono">{money(row.cost)}</small></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </section>
  );
}
