import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, Play, RotateCcw } from "lucide-react";
import AgentAudit from "./components/AgentAudit";
import AgentForge from "./components/AgentForge";
import ContextLake from "./components/ContextLake";
import EfficiencyChart from "./components/EfficiencyChart";
import FinancialReport from "./components/FinancialReport";
import LiveFeed from "./components/LiveFeed";
import ReasoningDiff from "./components/ReasoningDiff";

const INITIAL_POLL_MS = 500;
const money = (value, digits = 4) => `$${Number(value || 0).toFixed(digits)}`;

export default function App() {
  const [state, setState] = useState(null);
  const [libraryFlash, setLibraryFlash] = useState(false);
  const previousLibraryVersion = useRef(0);
  const previousRunning = useRef(false);
  const reportWindow = useRef(null);

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

  useEffect(() => {
    if (!state) return;
    if (previousRunning.current && !state.running && state.t >= 33 && reportWindow.current && !reportWindow.current.closed) {
      reportWindow.current.location.href = `${window.location.origin}/?view=report`;
    }
    previousRunning.current = state.running;
  }, [state?.running, state?.t]);

  const post = async (path, body) => {
    await fetch(path, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    await loadState();
  };

  const reset = async () => {
    if (reportWindow.current && !reportWindow.current.closed) reportWindow.current.close();
    reportWindow.current = null;
    previousLibraryVersion.current = 0;
    await post("/reset");
  };

  const runDemo = async () => {
    reportWindow.current = window.open("", "cache-financial-report");
    if (reportWindow.current) {
      reportWindow.current.document.title = "Cache report pending";
      reportWindow.current.document.body.innerHTML = "<p style='font:14px system-ui;padding:32px'>Cache is preparing the Northwind financial report.</p>";
    }
    await post("/run");
  };

  if (!state) return <main className="loading-shell"><span className="label">Cache / Northwind ledger ops</span></main>;

  if (new URLSearchParams(window.location.search).get("view") === "report") return <FinancialReport state={state} />;

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
          <button className="btn btn--primary" type="button" disabled={state.running} onClick={runDemo}>
            <Play size={15} fill="currentColor" /> {state.running ? "Running" : "Run demo"}
          </button>
          <a className={`btn ${state.t >= 33 && !state.running ? "" : "btn--muted"}`} href="/?view=report" target="_blank" rel="noreferrer"><ExternalLink size={14} /> Report</a>
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

      <AgentAudit state={state} onReview={(payload) => post("/library/review", payload)} />

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
