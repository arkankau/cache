import { Bot, Search } from "lucide-react";
import { useMemo, useState } from "react";

export default function SpecialistConstellation({ specialists, recentId }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => specialists.filter((spec) => `${spec.specialist_id} ${spec.case_signature} ${spec.code_references.join(" ")}`.toLowerCase().includes(query.toLowerCase())), [specialists, query]);
  const [selectedId, setSelectedId] = useState(null);
  const selected = specialists.find((spec) => spec.specialist_id === selectedId) || specialists.find((spec) => spec.specialist_id === recentId) || filtered[0];
  return (
    <div className="constellation">
      <div className="constellation-bar"><span className="label">Generated specialist library</span><label className="specialist-search"><Search size={13} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search case or context" aria-label="Search specialists" /></label></div>
      <div className="constellation-body">
        <div className="agent-bubbles" role="list" aria-label="Searchable specialists">
          {filtered.map((spec, index) => <button
            type="button"
            role="listitem"
            className={`agent-bubble ${spec.generated ? "agent-bubble--generated" : ""} ${selected?.specialist_id === spec.specialist_id ? "agent-bubble--selected" : ""}`}
            style={{ "--bubble-delay": `${(index % 5) * -0.35}s` }}
            onClick={() => setSelectedId(spec.specialist_id)}
            title={`${spec.case_signature}; ${spec.code_references.join(", ")}`}
            key={spec.specialist_id}
          ><Bot size={15} /><span>{spec.case_signature.split("|")[1]}</span>{spec.generated ? <small>new</small> : null}</button>)}
          {!filtered.length ? <span className="no-results">No matching specialist</span> : null}
        </div>
        <div className="specialist-detail">
          {selected ? <><div className="detail-title"><span>{selected.case_signature}</span><span className="mono">{selected.validation.held_out_matches}/{selected.validation.held_out_total}</span></div><p>{selected.specialist_id}</p><div className="detail-chips">{selected.code_references.map((code) => <span key={code}>{code}</span>)}</div><small>distilled from {selected.distilled_from} / {selected.model_tier} tier</small></> : <p>Select a specialist</p>}
        </div>
      </div>
    </div>
  );
}
