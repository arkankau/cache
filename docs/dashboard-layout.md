# Dashboard Layout — Cache Demo

The screen the judges watch. Uses the tokens in `dashboard-DESIGN.md`. Designed for a single 3-minute run projected on one screen — legible from the back of a room, choreographed to the seeded beats.

---

## Overall grid

One screen, no scrolling during the demo. Left-aligned inside a centered max-width (~1200px). Three zones:

```
┌──────────────────────────────────────────────────────────────┐
│  HEADER STRIP                                                  │
│  Northwind Software · Ledger Ops        [ ▶ Run ]  [ ↻ Reset ] │
├───────────────────────────────┬──────────────────────────────┤
│  LIVE FEED (left, ~60%)        │  METRICS COLUMN (right, ~40%) │
│                                │                              │
│  column labels                 │  ┌ COST / TASK (big) ──────┐ │
│  ─────────────────────────     │  │  live rolling curve      │ │
│  row  vendor case route cost   │  └──────────────────────────┘ │
│  row  ...                      │  ┌ counters row ───────────┐ │
│  row  ...            (scrolls  │  │ BUDGET  TOKENS  SPEC LIB │ │
│  row  ...             within)  │  └──────────────────────────┘ │
│  row  ...                      │  ┌ SOURCE OF TRUTH ────────┐ │
│                                │  │ lake + refresh (Graph 2) │ │
│                                │  └──────────────────────────┘ │
├───────────────────────────────┴──────────────────────────────┤
│  INSPECTOR DRAWER (hidden until a distillation beat fires)     │
│  side-by-side reasoning diff · general vs specialist           │
└──────────────────────────────────────────────────────────────┘
```

---

## Header strip

- Left: `Northwind Software` (h2, 400) + `· Ledger Ops` (muted). No logo, no Ramp mark.
- Right: `▶ Run` (`.btn--primary`, chartreuse — the one primary action on screen) and `↻ Reset` (`.btn`, monochrome).
- Reset reloads the frozen seed snapshot. Run starts the seeded live tail.
- Keep it thin (~56px). This is not where attention goes.

---

## Live feed (left, the main character)

White card, rows on 1px bottom-borders. Column micro-labels in `.label` (uppercase, tracked):

```
VENDOR              CASE TYPE        ROUTE        COST
─────────────────────────────────────────────────────
Cloudspan           invoice·P-04     [SPECIALIST] $0.002 ✓
DeskNest            notification     [SPECIALIST] $0.001 ✓
Meridian Travel     invoice·P-11     [SPECIALIST] $0.003 ✓
Cloudspan           invoice·P-04·CAP [DISTILLING] $0.022     ← beat @0:40
Beacon Contractors  expense·P-22     [SPECIALIST] $0.002 ✓
Cloudspan           invoice·P-04·CAP [SPECIALIST] $0.002 ✓   ← payoff @1:10
```

- New rows enter at top, push older down, feed scrolls *within its own card* (fixed height, ~8–9 rows visible). Never scroll the page.
- **Route badge is the visual pulse:** `SPECIALIST` chartreuse-filled, `GENERAL` gray-outlined, `DISTILLING` dark-bg/chartreuse-text for its ~1s.
- Cost in `.mono` tabular-nums so columns stay locked as values tick.
- `✓` chartreuse check on validated specialist rows only.
- Row enter: 150ms fade+slide. The distilling row holds visibly longer (it's the expensive one — let the pause read as "thinking").

**The two staged beats live here:**
- **0:40 distillation interrupt** — the CAPEX row lands as `DISTILLING`, holds ~1s, and simultaneously the SPEC LIB counter ticks 6→7 (chartreuse flash) and the inspector drawer slides open.
- **1:10 payoff** — the repeat CAPEX row lands as `SPECIALIST ✓` at 1/10th the cost. The contrast with the same vendor+case two rows up is the whole thesis in one glance.

---

## Metrics column (right)

### Cost / task — the money shot (top, largest)
- Big number, `.display` / Space Grotesk 400, `.mono`. Current rolling cost-per-task.
- Below it: the rolling curve. Monochrome line, **chartreuse dot + soft glow on the current point only.**
- Curve opens (seed state) already in decayed/payback shape, continues descending as the live tail routes cheap. The one line that visibly goes *down* while everything else goes up.
- Tiny caption in `.muted`: `rolling avg, last 20 tasks`.

### Counters row (middle, three cells)
```
BUDGET          TOKENS          SPEC LIBRARY
$0.87           142,308         6 → 7
```
- All `.label` headers + `.mono` values.
- BUDGET and TOKENS climb steadily (every system does — deliberately undramatic).
- SPEC LIBRARY is the one that *ticks up in steps* and flashes chartreuse on each distillation. Small footprint, big meaning ("the asset is accumulating").
- Optional caption under BUDGET: `main key · generator on separate meter` — the honesty flex, if you want it visible.

### Source of truth — Graph 2 (bottom)
- Compact node/edge view: lake codes (`GL-4021`, `ST-CA-07`, `ST-NY-01`…) as nodes, specialists as small dots edged to the codes they reference.
- A single control: `[ Edit ST-CA-07 rate → 0.08 ]`.
- **1:20 refresh beat:** click it → every specialist edged to `ST-CA-07` pulses `--accent-soft` and flips a tiny `refreshed` tag. Zero re-distillation. This is the anti-rot proof and the most novel thing on screen — give it a clean, uncluttered moment.

---

## Inspector drawer (bottom, appears on distillation)

Hidden at rest. Slides up when the 0:40 beat fires; can also be pinned open for the pitch. Two panels side by side:

```
GENERAL · full context                 SPECIALIST · tight context
─────────────────────────────          ─────────────────────────────
"Cloudspan invoice — normally           "Cloudspan prepay → P-04-CAPEX.
 P-04 → GL-4021. But 'annual             GL-4890 · ST-CA-07 · ✓ matches"
 prepay 12-mo' → capitalized →
 GL-4890. Verify CA tax ST-CA-07…"       108 tok · $0.002
 1,910 tok · $0.022
```

- Left panel: verbose, truncated with `…` (show weight, don't sprawl). Cost in gray.
- Right panel: terse, chartreuse `✓`, cost in chartreuse. The visual asymmetry *is* the argument — heavy left, light right, same answer.
- Caption spanning both, `.muted`: `same answer · reasoning amortized at distillation, not re-paid per call`.

---

## Choreography (what moves when)

| t | feed | metrics | drawer |
|---|---|---|---|
| load | warm w/ seed rows | cost/task low, lib=6 | hidden |
| 0:10–0:35 | routine → SPECIALIST | budget/tokens climb, cost/task flat-low | — |
| **0:40** | CAPEX → **DISTILLING** (hold) | **lib 6→7** flash | **slides open** |
| 0:50–1:05 | routine → SPECIALIST | cost/task holds low | pinned |
| **1:10** | CAPEX repeat → **SPECIALIST ✓** | cost/task dips again | shows the diff |
| **1:20** | (feed continues) | **lake edit → specialists pulse** | — |
| 1:30+ | mostly SPECIALIST | cost/task visibly below open | — |

---

## Legibility rules for a projected demo

- Minimum on-screen text ~14px; the cost/task number huge (48px+).
- Only ~3 things ever move per beat — a judge's eye can't track more. The choreography above never fires two accent events simultaneously except the intended pair (distilling row + lib tick, which read as one cause).
- At rest, <10% of the screen is chartreuse. The accent should feel *earned* each time it appears.
- No page scroll, ever. Everything the judge needs is in one frame; only the feed scrolls internally.

---

## Build note

Real state, faked nothing visual: the feed/counters/curve read from the actual routing loop (main key). The generator (separate key) drives arrivals on the seeded schedule. The only "staging" is the arrival *order* and *timing* — every number shown is a real routing result. Reset = reload seed snapshot; the demo is fully repeatable and identical each run.
