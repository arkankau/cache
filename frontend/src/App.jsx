import { useCallback, useEffect, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import AgentForge from "./components/AgentForge";
import ContextLake from "./components/ContextLake";
import EfficiencyChart from "./components/EfficiencyChart";
import LiveFeed from "./components/LiveFeed";
import ReasoningDiff from "./components/ReasoningDiff";

const INITIAL_POLL_MS = 500;
const money = (value, digits = 4) => `$${Number(value || 0).toFixed(digits)}`;

export default function App() {
  const [state, setState] = useState(null);
  const [libraryFlash, setLibraryFlash] = useState(false);
  const previousLibraryVersion = useRef(0);

  const loadState = useCallback(async () => {
    const response = await fetch("/state");
    if (!response.ok) throw new Error("State unavailable");
    setState(await response.json());
  }, []);

  useEffect(() => {
    loadState().catch(() => undefined);
    const timer = window.setInterval(() => loadState().catch(() => undefined), state?.poll_ms || INITIAL_POLL_MS);
    return () => window.clearInterval(timer);
  }, [loadState, state?.poll_ms]);

  useEffect(() => {
    if (!state) return;
    if (state.library_version > previousLibraryVersion.current) {
      setLibraryFlash(true);
      window.setTimeout(() => setLibraryFlash(false), 700);
    }
    previousLibraryVersion.current = state.library_version;
  }, [state?.library_version]);

  const post = async (path, body) => {
    await fetch(path, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    await loadState();
  };

  const reset = async () => {
    previousLibraryVersion.current = 0;
    await post("/reset");
  };

  if (!state) return <main className="loading-shell"><span className="label">Cache / Northwind ledger ops</span></main>;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="product-name">Cache</span>
          <span className="brand-divider" aria-hidden="true" />
          <span>Northwind Software <span className="muted">/ Ledger Ops</span></span>
        </div>
        <div className="header-actions">
          <span className="mode-label label">{state.mode} / {Math.round(state.t)}s</span>
          <button className="btn btn--primary" type="button" disabled={state.running} onClick={() => post("/run")}>
            <Play size={15} fill="currentColor" /> {state.running ? "Running" : "Run demo"}
          </button>
          <button className="btn" type="button" onClick={reset}><RotateCcw size={15} /> Reset</button>
        </div>
      </header>

      <section className="economics" aria-label="Demo economics">
        <div className="economic-primary"><span className="label">Cost / task</span><span className="economic-value mono">{money(state.cost_per_task, 5)}</span><span className="trend">rolling down</span></div>
        <div><span className="label">Spend</span><span className="metric mono">{money(state.cost_total, 3)}</span></div>
        <div><span className="label">Tokens</span><span className="metric mono">{Number(state.tokens_total).toLocaleString()}</span></div>
        <div className={libraryFlash ? "library-flash" : ""}><span className="label">Specialists</span><span className="metric mono">{state.library_count}</span></div>
        <div><span className="label">Payback</span><span className="metric">25-50x / repeat</span></div>
      </section>

      <EfficiencyChart state={state} />

      <main className="dashboard">
        <LiveFeed receipts={state.receipts} activeDistillation={state.active_distillation} />
        <AgentForge state={state} />
      </main>

      <div className="lower-grid">
        <ReasoningDiff drawer={state.drawer} />
        <div className="lake-shell">
          <ContextLake
            state={state}
            onEdit={() => post("/lake/edit", { code: "ST-CA-07", rate: 0.08 })}
            onContextChange={(payload) => post("/library/context", payload)}
          />
        </div>
      </div>
    </div>
  );
}
