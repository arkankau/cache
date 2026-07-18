import { ChevronDown, Pin } from "lucide-react";

function formatCost(value) {
  return value < 0.001 ? `$${value.toFixed(5)}` : `$${value.toFixed(4)}`;
}

export default function InspectorDrawer({ drawer, pinned, onPin, collapsed, onCollapse }) {
  if (!drawer) return null;
  const validation = drawer.specialist.validation;
  return (
    <aside className={`inspector ${collapsed ? "inspector--collapsed" : ""}`} aria-label="Distillation inspector">
      <div className="inspector-topline">
        <div><span className="label">Distillation inspector</span><span className="inspector-case">{drawer.case_signature}</span></div>
        <div className="inspector-actions">
          <button className={`icon-btn ${pinned ? "icon-btn--active" : ""}`} type="button" onClick={onPin} title="Pin inspector" aria-label="Pin inspector"><Pin size={15} /></button>
          <button className="icon-btn" type="button" onClick={onCollapse} title="Collapse inspector" aria-label="Collapse inspector"><ChevronDown size={17} /></button>
        </div>
      </div>
      {!collapsed ? (
        <div className="inspector-content">
          <section className="reason-panel reason-panel--general">
            <p className="label">General · full context</p>
            <p className="reason-copy">{drawer.general.summary}</p>
            <p className="reason-meta mono">{drawer.general.tokens.toLocaleString()} tok · {formatCost(drawer.general.cost)}</p>
          </section>
          <section className="reason-panel reason-panel--specialist">
            <div className="reason-title"><p className="label">Specialist · tight context</p><span className="match-mark">✓</span></div>
            <p className="reason-copy">{drawer.specialist.summary}</p>
            <p className="reason-meta reason-meta--active mono">{drawer.specialist.tokens.toLocaleString()} tok · {formatCost(drawer.specialist.cost)} · {validation.held_out_matches}/{validation.held_out_total} gate</p>
          </section>
          <p className="inspector-caption">same answer · reasoning amortized at distillation, not re-paid per call</p>
        </div>
      ) : null}
    </aside>
  );
}
