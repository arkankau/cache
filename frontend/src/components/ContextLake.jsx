import { Database, Link2, RefreshCw, Unlink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const POSITIONS = [
  [9, 20], [36, 12], [66, 20], [18, 51], [49, 46], [76, 53], [34, 75], [68, 78]
];

function contextPayload(event, fallbackCode) {
  try { return JSON.parse(event.dataTransfer.getData("application/x-cache-context")); }
  catch { return { code: fallbackCode }; }
}

export default function ContextLake({ state, onEdit, onContextChange }) {
  const links = state.specialist_links;
  const latestId = state.recent_distillation?.specialist_id || links[0]?.specialist_id;
  const [selectedId, setSelectedId] = useState(latestId);
  useEffect(() => { if (latestId) setSelectedId(latestId); }, [latestId]);
  const selected = links.find((item) => item.specialist_id === selectedId) || links[0];
  const latestReceipt = state.receipts[state.receipts.length - 1];
  const inUse = new Set(state.active_distillation?.context_codes || Object.keys(latestReceipt?.resolved_codes || {}));
  const nodes = useMemo(() => [
    ...Object.entries(state.lake.gl_codes).map(([code, row]) => ({ code, label: row.name, kind: "GL" })),
    ...Object.entries(state.lake.state_codes).map(([code, row]) => ({ code, label: `${row.state} / ${row.tax_rule}`, kind: "STATE" }))
  ], [state.lake]);
  const caRate = state.lake.state_codes["ST-CA-07"].rate;

  const startDrag = (event, code, source = "lake") => {
    event.dataTransfer.effectAllowed = source === "lake" ? "copy" : "move";
    event.dataTransfer.setData("application/x-cache-context", JSON.stringify({ code, source }));
  };
  const drop = (event, action) => {
    event.preventDefault();
    const { code } = contextPayload(event);
    if (!selected || !code) return;
    onContextChange({ specialist_id: selected.specialist_id, code, action });
  };

  return (
    <section className="lake-card card" aria-labelledby="lake-title">
      <div className="lake-heading">
        <div><p className="label">Live source of truth</p><h2 id="lake-title" className="h2"><Database size={16} /> Context lake</h2></div>
        <button className="rate-button" type="button" onClick={onEdit} disabled={caRate === 0.08}><RefreshCw size={13} /> CA rate {caRate.toFixed(4)}</button>
      </div>

      <div className="lake-workspace">
        <div className="lake-surface" aria-label="Draggable live context files">
          <span className="water-line water-line--one" /><span className="water-line water-line--two" /><span className="water-line water-line--three" />
          {nodes.map((node, index) => {
            const [left, top] = POSITIONS[index % POSITIONS.length];
            const active = inUse.has(node.code);
            return (
              <button
                className={`lake-node ${active ? "lake-node--active" : ""}`}
                style={{ left: `${left}%`, top: `${top}%` }}
                type="button"
                draggable
                onDragStart={(event) => startDrag(event, node.code)}
                title={`${node.code}: ${node.label}. Drag to the specialist dock.`}
                key={node.code}
              >
                {active ? <span className="node-ripple" /> : null}<small>{node.kind}</small><span>{node.code}</span><em>{node.label}</em>
              </button>
            );
          })}
        </div>

        <aside className="context-dock">
          <div className="dock-agent-list" aria-label="Choose specialist">
            {links.slice(-6).reverse().map((link) => <button type="button" className={link.specialist_id === selected?.specialist_id ? "agent-pill agent-pill--selected" : "agent-pill"} onClick={() => setSelectedId(link.specialist_id)} key={link.specialist_id}>{link.specialist_id.replace("SPEC-", "")}</button>)}
          </div>
          <div className="attachment-zone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, "attach")}>
            <span className="dock-label"><Link2 size={13} /> Attached context</span>
            <div className="attached-files">
              {(selected?.code_references || []).map((code) => <span className="attached-file" draggable onDragStart={(event) => startDrag(event, code, "agent")} key={code}>{code}</span>)}
              {!selected?.code_references?.length ? <span className="empty-context">Drop lake files here</span> : null}
            </div>
          </div>
          <div className="detach-zone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, "detach")}><Unlink size={13} /> Drop to detach</div>
        </aside>
      </div>
    </section>
  );
}
