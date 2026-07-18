import { useCallback, useEffect, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import CostChart from "./components/CostChart";
import InspectorDrawer from "./components/InspectorDrawer";
import LiveFeed from "./components/LiveFeed";
import SourceGraph from "./components/SourceGraph";

const INITIAL_POLL_MS = 500;

function formatMoney(value, digits = 4) {
  return `$${Number(value || 0).toFixed(digits)}`;
}

function formatTokens(value) {
  return Number(value || 0).toLocaleString();
}

export default function App() {
  const [state, setState] = useState(null);
  const [libraryFlash, setLibraryFlash] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const previousLibraryVersion = useRef(0);
  const previousRefreshVersion = useRef(0);

  const loadState = useCallback(async () => {
    const response = await fetch("/state");
    if (!response.ok) throw new Error("State unavailable");
    const next = await response.json();
    setState(next);
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
      setCollapsed(false);
      window.setTimeout(() => setLibraryFlash(false), 800);
    }
    previousLibraryVersion.current = state.library_version;
  }, [state?.library_version]);

  useEffect(() => {
    if (!state) return;
    if (state.refresh_version > previousRefreshVersion.current) {
      setRefreshing(true);
      window.setTimeout(() => setRefreshing(false), 1200);
    }
    previousRefreshVersion.current = state.refresh_version;
  }, [state?.refresh_version]);

  const post = async (path, body) => {
    await fetch(path, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    await loadState();
  };

  const reset = async () => {
    setPinned(false);
    setCollapsed(false);
    previousLibraryVersion.current = 0;
    previousRefreshVersion.current = 0;
    await post("/reset");
  };

  if (!state) {
    return <main className="loading-shell"><span className="label">Cache · Northwind ledger ops</span></main>;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="product-name">Cache</span>
          <span className="brand-divider" aria-hidden="true" />
          <span>Northwind Software <span className="muted">· Ledger Ops</span></span>
        </div>
        <div className="header-actions">
          <span className="mode-label label">{state.mode} · {Math.round(state.t)}s</span>
          <button className="btn btn--primary" type="button" disabled={state.running} onClick={() => post("/run")}>
            <Play size={15} fill="currentColor" aria-hidden="true" /> {state.running ? "Running" : "Run"}
          </button>
          <button className="btn" type="button" onClick={reset}>
            <RotateCcw size={15} aria-hidden="true" /> Reset
          </button>
        </div>
      </header>

      <main className={`dashboard ${state.drawer && !collapsed ? "dashboard--with-drawer" : ""}`}>
        <LiveFeed receipts={state.receipts} activeDistillation={state.active_distillation} />
        <div className="metrics-column">
          <section className="cost-card card" aria-labelledby="cost-title">
            <div className="cost-heading">
              <div><p className="label">Cost / task</p><h2 id="cost-title" className="display mono">{formatMoney(state.cost_per_task, 5)}</h2></div>
              <span className="cost-direction">rolling ↓</span>
            </div>
            <CostChart points={state.cost_points} />
            <p className="caption">rolling avg, last 20 tasks</p>
          </section>

          <section className="counter-card card" aria-label="Processing counters">
            <div className="counter-cell"><span className="label">Budget</span><span className="counter-value mono">{formatMoney(state.cost_total, 3)}</span></div>
            <div className="counter-cell"><span className="label">Tokens</span><span className="counter-value mono">{formatTokens(state.tokens_total)}</span></div>
            <div className={`counter-cell library-counter ${libraryFlash ? "library-counter--flash" : ""}`}><span className="label">Spec library</span><span className="counter-value mono">{state.library_count}</span></div>
            <p className="counter-caption">main key · generator on separate meter</p>
          </section>

          <SourceGraph state={state} refreshing={refreshing} onEdit={() => post("/lake/edit", { code: "ST-CA-07", rate: 0.08 })} />
        </div>
      </main>

      <InspectorDrawer
        drawer={state.drawer}
        pinned={pinned}
        onPin={() => setPinned((value) => !value)}
        collapsed={collapsed}
        onCollapse={() => setCollapsed((value) => !value)}
      />
    </div>
  );
}
