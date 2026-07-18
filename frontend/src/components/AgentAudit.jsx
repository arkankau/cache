import { Check, ShieldCheck, X } from "lucide-react";

const cost = (value) => value < .001 ? `$${value.toFixed(5)}` : `$${value.toFixed(4)}`;

export default function AgentAudit({ state, onReview }) {
  if (state.running || state.t < 33) return null;
  const generated = state.specialist_links.filter((spec) => spec.generated);
  const agents = [...generated, ...state.defect_agents];
  if (!agents.length) return null;
  return <section className="audit-card card" aria-labelledby="audit-title">
    <div className="audit-heading"><div><p className="label">Post-run agent audit</p><h2 id="audit-title" className="h2">Reviewer approval required</h2></div><span className="audit-summary">{generated.filter((agent) => agent.review_status === "pending_review").length} pending / {state.defect_agents.length} defect</span></div>
    <div className="audit-grid">{agents.map((agent) => {
      const runs = state.receipts.filter((receipt) => receipt.specialist_id === agent.specialist_id);
      const matches = runs.filter((receipt) => receipt.matches_truth).length;
      const avgCost = runs.length ? runs.reduce((sum,row) => sum + row.cost,0) / runs.length : 0;
      const avgCompute = runs.length ? runs.reduce((sum,row) => sum + row.compute_ms,0) / runs.length : 0;
      const status = agent.review_status;
      return <article className={`audit-agent audit-agent--${status}`} key={`${agent.specialist_id}-${status}`}><div className="audit-agent-top"><span className="audit-icon"><ShieldCheck size={17} /></span><span className={`audit-status audit-status--${status}`}>{status.replace("_"," ")}</span></div><h3>{agent.case_signature}</h3><p>{agent.description}</p><div className="audit-metrics"><span><small>Gate</small><strong>{agent.validation ? `${agent.validation.held_out_matches}/${agent.validation.held_out_total}` : "rejected"}</strong></span><span><small>Live repeats</small><strong>{runs.length}</strong></span><span><small>Accuracy</small><strong>{runs.length ? `${matches}/${runs.length}` : "shadow only"}</strong></span><span><small>Avg compute</small><strong>{Math.round(avgCompute)}ms</strong></span><span><small>Avg cost</small><strong>{cost(avgCost)}</strong></span></div>{status === "pending_review" ? <div className="audit-actions"><button type="button" className="audit-approve" aria-label={`Approve ${agent.case_signature}`} onClick={() => onReview({specialist_id:agent.specialist_id,decision:"approve"})}><Check size={14} /> Approve agent</button><button type="button" className="audit-reject" aria-label={`Mark ${agent.case_signature} as defect`} onClick={() => onReview({specialist_id:agent.specialist_id,decision:"reject"})}><X size={14} /> Mark defect</button></div> : status === "defect" ? <p className="defect-note">Removed from active routing. Affected report entries require CFO review.</p> : <p className="validated-note"><Check size={13} /> Approved for active routing by reviewer.</p>}</article>;
    })}</div>
  </section>;
}
