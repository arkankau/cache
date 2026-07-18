import { Bot, GraduationCap, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const TEACHER = {
  id: "teacher",
  case_signature: "Frontier teacher",
  context_size: 430,
  description: "Investigates unfamiliar submissions with broad vendor, ledger, state, and exception context. Its successful trace is compiled into a smaller reusable procedure."
};

function hash(text) {
  return [...text].reduce((value, char) => ((value * 31) + char.charCodeAt(0)) >>> 0, 17);
}

function radiusFor(contextSize) {
  return Math.min(66, 17 + contextSize * .112);
}

export default function AgentForge({ state }) {
  const canvasRef = useRef(null);
  const nodesRef = useRef(new Map());
  const sizeRef = useRef({ width: 700, height: 410 });
  const dataRef = useRef(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(state.recent_distillation?.specialist_id || "teacher");
  const specialists = state.specialist_links;
  dataRef.current = { specialists, active: state.active_distillation, recent: state.recent_distillation, query, selectedId };

  useEffect(() => {
    if (state.recent_distillation?.promoted) setSelectedId(state.recent_distillation.specialist_id);
  }, [state.recent_distillation?.version, state.recent_distillation?.promoted, state.recent_distillation?.specialist_id]);

  useEffect(() => {
    const nodes = nodesRef.current;
    const { width, height } = sizeRef.current;
    if (!nodes.has("teacher")) nodes.set("teacher", { id: "teacher", x: width * .35, y: height * .5, vx: .28, vy: .21, r: radiusFor(TEACHER.context_size), data: TEACHER });
    const teacher = nodes.get("teacher");
    const currentIds = new Set(["teacher", ...specialists.map((spec) => spec.specialist_id)]);
    for (const [id] of nodes) if (!currentIds.has(id)) nodes.delete(id);
    specialists.forEach((spec, index) => {
      const existing = nodes.get(spec.specialist_id);
      if (existing) { existing.data = spec; existing.r = radiusFor(spec.context_size); return; }
      const seed = hash(spec.specialist_id);
      const generated = spec.generated;
      const angle = ((seed % 628) / 100) + index * .31;
      nodes.set(spec.specialist_id, {
        id: spec.specialist_id,
        x: generated ? teacher.x + Math.cos(angle) * 8 : width * (.18 + ((seed % 61) / 100)),
        y: generated ? teacher.y + Math.sin(angle) * 8 : height * (.18 + (((seed >> 5) % 63) / 100)),
        vx: generated ? Math.cos(angle) * 2.4 : ((seed % 17) - 8) / 25,
        vy: generated ? Math.sin(angle) * 2.4 : (((seed >> 4) % 17) - 8) / 25,
        r: radiusFor(spec.context_size),
        data: spec,
        bornAt: performance.now()
      });
    });
  }, [specialists]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas.parentElement;
    const ctx = canvas.getContext("2d");
    let frame;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const resize = () => {
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      sizeRef.current = { width: rect.width, height: rect.height };
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(parent);
    resize();

    const tick = (now) => {
      const { width, height } = sizeRef.current;
      const nodes = [...nodesRef.current.values()];
      if (!reducedMotion) {
        for (const node of nodes) {
          const speed = node.id === "teacher" ? .55 : .95;
          node.x += node.vx * speed;
          node.y += node.vy * speed;
          if (node.x - node.r < 5) { node.x = node.r + 5; node.vx = Math.abs(node.vx); }
          if (node.x + node.r > width - 5) { node.x = width - node.r - 5; node.vx = -Math.abs(node.vx); }
          if (node.y - node.r < 5) { node.y = node.r + 5; node.vy = Math.abs(node.vy); }
          if (node.y + node.r > height - 5) { node.y = height - node.r - 5; node.vy = -Math.abs(node.vy); }
        }
        for (let i = 0; i < nodes.length; i += 1) for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i], b = nodes[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const distance = Math.max(1, Math.hypot(dx, dy));
          const overlap = a.r + b.r + 3 - distance;
          if (overlap > 0) {
            const nx = dx / distance, ny = dy / distance;
            const totalMass = a.r * a.r + b.r * b.r;
            a.x -= nx * overlap * (b.r * b.r / totalMass);
            a.y -= ny * overlap * (b.r * b.r / totalMass);
            b.x += nx * overlap * (a.r * a.r / totalMass);
            b.y += ny * overlap * (a.r * a.r / totalMass);
            const impulse = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (impulse < 0) { a.vx += impulse * nx; a.vy += impulse * ny; b.vx -= impulse * nx; b.vy -= impulse * ny; }
          }
        }
      }

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#F7FAFC";
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "#E5E7EB";
      ctx.lineWidth = 1;
      for (let x = 24; x < width; x += 48) for (let y = 24; y < height; y += 48) { ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.stroke(); }

      const current = dataRef.current;
      for (const node of nodes) {
        const isTeacher = node.id === "teacher";
        const searchable = `${node.data.case_signature} ${node.data.description || ""} ${(node.data.code_references || []).join(" ")}`.toLowerCase();
        const dimmed = current.query && !searchable.includes(current.query.toLowerCase());
        const selected = current.selectedId === node.id;
        const born = node.bornAt && now - node.bornAt < 1800;
        ctx.save();
        ctx.globalAlpha = dimmed ? .16 : 1;
        if (born) { ctx.beginPath(); ctx.arc(node.x, node.y, node.r + 10 + Math.sin(now / 90) * 4, 0, Math.PI * 2); ctx.strokeStyle = "#CCFF00"; ctx.lineWidth = 3; ctx.stroke(); }
        ctx.beginPath(); ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        ctx.fillStyle = isTeacher || selected ? "#1A1919" : node.data.generated ? "#CCFF00" : "#FFFFFF";
        ctx.strokeStyle = isTeacher || selected ? "#1A1919" : "#4A5568";
        ctx.lineWidth = selected ? 3 : 1.2;
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = isTeacher || selected ? "#CCFF00" : "#0D0D0D";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.font = `${isTeacher ? 11 : 8}px Inter, sans-serif`;
        const label = isTeacher ? "FRONTIER TEACHER" : node.data.case_signature.split("|")[1];
        ctx.fillText(label.length > 14 ? `${label.slice(0, 13)}...` : label, node.x, node.y - 6);
        ctx.fillStyle = isTeacher || selected ? "#CCFF00" : "#4A5568";
        ctx.font = `${isTeacher ? 9 : 7}px Inter, sans-serif`;
        ctx.fillText(`${node.data.context_size} context`, node.x, node.y + 9);
        ctx.restore();
      }

      if (current.active) {
        const teacher = nodesRef.current.get("teacher");
        if (teacher) {
          const phase = (now % 1500) / 1500;
          const angle = -.48;
          const distance = phase * (teacher.r + 48);
          const x = teacher.x + Math.cos(angle) * distance;
          const y = teacher.y + Math.sin(angle) * distance;
          ctx.beginPath(); ctx.arc(x, y, 8 + phase * 18, 0, Math.PI * 2);
          ctx.fillStyle = "#CCFF00"; ctx.fill(); ctx.strokeStyle = "#1A1919"; ctx.stroke();
          ctx.fillStyle = "#0D0D0D"; ctx.font = "7px Inter"; ctx.textAlign = "center"; ctx.fillText("NEW", x, y + 2);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);

  const chooseAgent = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left, y = event.clientY - rect.top;
    const hit = [...nodesRef.current.values()].reverse().find((node) => Math.hypot(x - node.x, y - node.y) <= node.r);
    if (hit) setSelectedId(hit.id);
  };

  const selected = selectedId === "teacher" ? TEACHER : specialists.find((spec) => spec.specialist_id === selectedId) || TEACHER;
  return (
    <section className="ecosystem-card card" aria-labelledby="ecosystem-title">
      <div className="ecosystem-heading"><div><p className="label">Agent replication + specialist library</p><h2 id="ecosystem-title" className="h2">Living agent ecosystem</h2></div><label className="ecosystem-search"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search specialty or context" aria-label="Search agent ecosystem" /></label></div>
      <div className="ecosystem-layout">
        <div className="ecosystem-canvas"><canvas ref={canvasRef} onClick={chooseAgent} aria-label="Moving frontier teacher and specialist agents" /><span className="ecosystem-key"><i /> circle size = context footprint</span></div>
        <aside className="agent-profile">
          <span className={selectedId === "teacher" ? "profile-avatar profile-avatar--teacher" : "profile-avatar"}>{selectedId === "teacher" ? <GraduationCap size={24} /> : <Bot size={22} />}</span>
          <p className="label">{selectedId === "teacher" ? "Frontier model" : selected.generated ? "Newly generated specialist" : "Validated specialist"}</p>
          <h3>{selected.case_signature}</h3>
          <p className="profile-description">{selected.description}</p>
          <div className="profile-stat"><span>Context footprint</span><strong className="mono">{selected.context_size}</strong></div>
          {selected.code_references ? <div className="profile-context">{selected.code_references.map((code) => <span key={code}>{code}</span>)}</div> : null}
          {selected.validation ? <p className="profile-meta mono">{selected.validation.held_out_matches}/{selected.validation.held_out_total} gate / distilled from {selected.distilled_from}</p> : <p className="profile-meta">Broad context / expensive reasoning / teacher trace</p>}
        </aside>
      </div>
    </section>
  );
}
