import { Bot, Check, GraduationCap } from "lucide-react";
import SpecialistConstellation from "./SpecialistConstellation";

export default function AgentForge({ state }) {
  const active = state.active_distillation;
  const recent = state.recent_distillation;
  const event = active || recent;
  const codes = event?.context_codes || [];
  const working = Boolean(active);
  return (
    <section className={`forge-card card ${working ? "forge-card--active" : ""}`} aria-labelledby="forge-title">
      <div className="forge-heading"><div><p className="label">Agent replication</p><h2 id="forge-title" className="h2">Teacher creates a reusable specialist</h2></div><span className={`forge-state ${working ? "forge-state--active" : ""}`}>{working ? "compiling" : recent?.promoted ? "validated" : recent ? "gate rejected" : "standing by"}</span></div>
      <div className="forge-stage">
        <div className="agent-node agent-node--teacher"><span className="agent-icon"><GraduationCap size={22} /></span><span>Teacher</span><small>frontier / broad reasoning</small></div>
        <div className="transfer-lane" aria-label="Relevant context copied into a specialist"><span className="transfer-label">trace becomes procedure</span><span className="transfer-line" />{codes.slice(0,4).map((code,index) => <span className={`context-packet ${working ? "context-packet--moving" : ""}`} style={{"--packet-index":index}} key={code}>{code}</span>)}</div>
        <div className={`agent-node agent-node--specialist ${working ? "agent-node--forming" : recent?.promoted ? "agent-node--ready" : ""}`}><span className="agent-icon"><Bot size={22} /></span><span>{event ? "New specialist" : "Specialist slot"}</span><small>{event?.case_signature || "waiting for novel case"}</small>{recent?.promoted && !working ? <span className="agent-check"><Check size={13} /> {recent.validation.held_out_matches}/{recent.validation.held_out_total}</span> : null}</div>
      </div>
      <div className="forge-footer"><span>{working ? `${active.vendor} is teaching only the reusable context` : recent?.promoted ? `${recent.specialist_id} joined the searchable library` : "Novel cases create compact, inspectable procedures"}</span><span className="mono">{state.library_count} agents</span></div>
      <SpecialistConstellation specialists={state.specialist_links} recentId={recent?.specialist_id} />
    </section>
  );
}
