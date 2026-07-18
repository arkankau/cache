# ONE-SHOT BUILD PROMPT — Cache Demo

> Paste this entire document into Claude Code / Cursor as a single prompt. It is self-contained. Build exactly what is specified. Where it says DO NOT, do not. Run the self-verification checklist at the end before declaring done.

---

## 0. Mission

Build a live finance-ops demo called **Cache**. A fictional company (Northwind Software) processes a stream of finance entries. Novel case types are solved once by an expensive frontier model; that solve is compiled into a cheap reusable "specialist" (a stored procedure — retrieval plan + prompt template + code references, NOT a fine-tune). Future matching entries route to the cheap specialist. A dashboard shows this happening live: routing, a decaying cost-per-task curve, a growing specialist library, and a "source of truth" lake whose edits propagate to all specialists with zero re-distillation.

The thesis, made visible: **pay expensive reasoning once per case type; amortize it forever.** Same answer, ~25–50x cheaper per repeat.

---

## 1. Stack & structure

- **Frontend:** React (Vite) SPA. **Backend:** Python (FastAPI). One repo, two processes, run with a single `make dev` (or documented two-command start).
- Frontend renders the dashboard and polls/streams backend state. Backend owns the routing loop, the generator clock, the model calls, and all state.
- Communication: simplest that works — either Server-Sent Events for the live feed, or frontend polls `GET /state` every 500ms. Prefer SSE if trivial; polling is an acceptable fallback.

```
/backend
  main.py            # FastAPI app, endpoints, SSE/polling
  loop.py            # routing loop + generator clock
  compiler.py        # trace -> specialist (the one non-trivial file)
  agents.py          # general (frontier, tool-instrumented) + specialist runtime
  lake.py            # source-of-truth resolve()
  models.py          # OpenAI client wrapper + cost computation + MOCK_MODE
  config.py          # PRICE_TABLE, model strings, thresholds — ALL tunables here
  seed.py            # frozen seed snapshot as a Python literal
  pool.py            # pre-built entry pool + seeded arrival schedule
/frontend
  src/App.jsx, components/, tokens.css
```

---

## 2. THE CONTRACT LAYER (get this exactly right — everything downstream depends on it)

### 2a. Model tiers & price table — in `config.py`, never hardcoded elsewhere

```python
# Verify names/prices against OpenAI's pricing page the morning of the demo.
# Prices are USD per 1,000,000 tokens.
MODELS = {
    "frontier": "gpt-5.6-terra",   # expensive tier (general agent)
    "cheap":    "gpt-4.1-nano",    # cheap tier (specialists)
}
PRICE_TABLE = {                    # {input_per_1m, output_per_1m}
    "gpt-5.6-terra": {"in": 2.50, "out": 15.00},
    "gpt-4.1-nano":  {"in": 0.10, "out": 0.40},
}
MATCH_THRESHOLD = 0.0    # deterministic router uses exact signature match; no embedding
HELD_OUT_K = 5           # validation gate instances
POLL_MS = 500
```

Cost per call = `(usage.prompt_tokens/1e6)*in + (usage.completion_tokens/1e6)*out`. Read token counts from the OpenAI response `usage` object. NEVER estimate tokens — use the real returned counts. Every dollar on screen must trace to a real `usage` object (or a mock one in MOCK_MODE).

### 2b. Two API keys / two meters

- `OPENAI_KEY_MAIN` → the processing agents (general + specialists). This is the meter the dashboard cost counter reads.
- `OPENAI_KEY_GEN` → reserved for a generator if it ever calls a model. **In this build the generator does NOT call a model** (see 4a) — it emits pre-built entries. Keep the two-key structure in config anyway; it's part of the story ("generator on a separate meter").

### 2c. MOCK_MODE (mandatory — the demo must run offline)

`config.py: MOCK_MODE = bool(env "MOCK_MODE", default True)`.

- When `MOCK_MODE` is True: `models.py` returns canned responses with a realistic `usage` object (frontier ~1,800 in / ~120 out; specialist ~110 in / ~15 out) and a small `asyncio.sleep` to simulate latency (frontier ~1.2s, specialist ~0.2s). Answers come from the entry's stored ground truth so routing/gate logic exercises end-to-end.
- When False: real OpenAI calls via the SDK.
- **Both paths must produce identical-shaped results** so the UI and loop never branch on mode. Build MOCK_MODE first; verify the whole demo runs on it before wiring real calls.

---

## 3. Data model (the four objects)

### Lake (`lake.py`) — mutable source of truth, three tables
```python
vendor_registry: {vendor_id: {name, default_gl, recon_pattern, home_state}}
gl_codes:        {code: {name, rule}}
state_codes:     {code: {state, tax_rule, rate}}
def resolve(code) -> dict   # live lookup; specialists call this at runtime
```

### Entry (emitted by generator)
```python
{ "entry_id", "type", "vendor_id", "amount", "raw_text", "arrival_t",
  "_case_signature",  # eval-only, hidden from agents
  "_ground_truth": {"gl_code","state_code","disposition"} }
```

### Specialist (compiled procedure)
```python
{ "specialist_id", "case_signature", "model_tier": "cheap",
  "retrieval_plan": [table names], "code_references": [codes],  # refs, NOT values
  "prompt_template": str, "answer_schema": {field: type},
  "distilled_from": entry_id, "validated": bool,
  "validation": {"held_out_matches": int, "held_out_total": int} }
```

### Receipt (processed result, what the feed shows)
```python
{ "entry_id","vendor","case_signature","route": "general|specialist",
  "answer": {...}, "cost": float, "tokens": int, "matches_truth": bool, "t": float }
```

---

## 4. Runtime behavior

### 4a. Generator clock (`loop.py`) — deterministic, NOT random
- On Run: iterate a **seeded schedule** = ordered list of `{t_seconds, entry_id}` from `pool.py`. A single clock (asyncio loop reading elapsed time) fires each entry at its `t`. No `random` in the arrival path.
- The generator only *emits* entries (no model call). It appends to the live queue; the routing loop consumes.

### 4b. Routing loop
```
for each emitted entry:
  sig = (entry.type, vendor.recon_pattern) resolved via lake   # deterministic signature
  if sig in library and library[sig].validated:
      receipt = run_specialist(...)        # cheap tier, tight context
  else:
      trace = run_general(entry)           # frontier, tool-instrumented (4c)
      candidate = compile_specialist(trace, entry)     # compiler.py
      passed = validate(candidate, held_out_for(sig))  # 5/5 gate
      if passed: library[sig] = candidate  # promote (library count ticks)
      receipt = trace.receipt
  push receipt to state; update counters (budget, tokens, cost/task rolling)
```

### 4c. General agent = tool-instrumented (`agents.py`)
Give the frontier model these tools; the tool-call log IS the trace (do not ask it to introspect prose reasoning):
```
lookup_vendor(vendor_id) · lookup_gl(gl_code) · lookup_state(state_code) · emit_answer(gl_code, state_code, disposition)
```
Fallback if tool-calling is unavailable: instruct the model to end with a fenced JSON block `{retrieval:[...], rule:"...", answer:{...}}` and parse it.

### 4d. Compiler (`compiler.py`) — pure function, no LLM call
Extract from the tool log: touched tables → `retrieval_plan`; dereferenced codes → `code_references`; `emit_answer` args → `answer_schema`; the model's one-line rule summary → into `prompt_template`.
**HARD ASSERT:** no resolved numeric value from any lake row may appear in `prompt_template` or `code_references` — only codes. If a rate/number leaks in, raise. This assert is what guarantees the anti-rot property is real.
Do NOT improvise fancier extraction; implement exactly this.

### 4e. Specialist runtime (`agents.py`)
```python
resolved = {c: lake.resolve(c) for c in spec.code_references}   # LIVE lookup
prompt = spec.prompt_template.format(raw_text=entry.raw_text, resolved_codes=resolved)
answer = cheap_model(prompt, schema=spec.answer_schema)   # tight context, "no reasoning"
```
Because codes resolve live, editing a lake row changes the next specialist call with zero recompile. Expose which specialists reference which code so the UI can highlight refreshes.

### 4f. Validation gate (`validate`)
Run candidate specialist on K=5 held-out instances of the same signature (present in the pool, not yet "seen"). Promote only if all 5 match ground truth. Fail → keep routing that signature to general, flag "no-compress". This branch must exist.

---

## 5. Seed & pool (`seed.py`, `pool.py`) — Northwind Software (fictional; no real brand)

### Lake contents
Vendors: Cloudspan(GL-4021,P-04,ST-CA-07), DeskNest(GL-4021,P-04,ST-NY-01), Relay Comms(GL-4021,P-04,ST-CA-07), Meridian Travel(GL-5510,P-11,ST-NY-01), Beacon Contractors(GL-6200,P-22,ST-TX-03), Ironside Legal(GL-6410,P-30,ST-NY-01).
GL: 4021 Software Subs · 5510 Travel&Ent(meals flag) · 6200 Contractor(1099) · 6410 Legal · **4890 Software-Capitalized (the trap)**.
State: ST-NY-01 NY saas_taxable 0.08875 · ST-CA-07 CA digital_services 0.0725 · ST-TX-03 TX contractor_nexus 0.0625.

### Seed snapshot (frozen; Reset reloads this)
- 6 pre-validated specialists for signatures: `invoice|P-04`, `invoice|P-11`, `expense|P-22`, `invoice|P-30`, `notification|dupe`, `recon|multistate`.
- ~120 pre-processed receipts (mixed routes) so counters open warm: budget ≈ $0.84, tokens ≈ 142k, cost/task rolling low, library = 6.
- Cost/task curve opens already in payback shape.

### The hero novel case (drives the live distillation beat)
- Signature `invoice|P-04-CAPEX`: a Cloudspan invoice that is a **multi-year prepaid** contract → maps to **GL-4890 (capitalized)**, not GL-4021. Same vendor as routine P-04 → proves the system detected a genuinely new case type, not blind vendor reuse.
- 5 held-out instances (different vendors/amounts, same case) all truth = GL-4890, for the gate:
  E-H01 Cloudspan "annual prepay 12-mo", E-H02 DeskNest "prepaid 24 months", E-H03 Relay "yearly paid in full", E-H04 Cloudspan "multi-year invoiced annually", E-H05 DeskNest "12-month prepaid".

### Seeded arrival schedule (the choreography)
| t (s) | entry | expected route | beat |
|---|---|---|---|
| 0–35 | 4–5 routine (P-04, dupe) | specialist | ambient "greening" |
| **40** | hero CAPEX | general → distilling | interrupt: lib 6→7, drawer opens |
| 50–65 | 3–4 routine | specialist | cost/task holds low |
| **70** | CAPEX repeat (E-H0x) | specialist ✓ | payoff: was $, now cheap |
| **80** | (feed continues) | — | UI-triggered lake edit → specialists pulse |
| 90+ | mixed | mostly specialist | cost/task visibly below open |
Distribution routine≫novel, but fully seeded — no randomness on stage.

---

## 6. Design tokens (`tokens.css`) — inspired by Ramp's editorial finance style; NOT affiliated, no Ramp logo/wordmark

**Four rules (violating any one makes it look generic):**
1. ONE accent (chartreuse) — only on live/active/money elements. No second chromatic color; use chartreuse-vs-gray, never red/green.
2. NO shadows — cards on 1px hairline borders only.
3. ONE font weight (400) — hierarchy from size + uppercase, never bold.
4. LEFT-aligned inside centered max-width containers.

```css
:root{
  --bg:#F7FAFC; --surface:#FFFFFF; --inverted:#1A1919;
  --text:#0D0D0D; --text-2:#4A5568; --text-3:#A0AEC0;
  --border:#E5E7EB;
  --accent:#CCFF00; --accent-soft:#E4F222; --accent-ink:#0D0D0D;
  --r-card:14px; --r-btn:6px;
  --s1:8px;--s2:12px;--s3:16px;--s4:24px;--s6:32px;
  --font:"Inter","Space Grotesk",system-ui,sans-serif;
  --track-label:.08em; --track-body:-.01em; --lh-display:1.02;
}
```
Type: all 400. `.label` = 11px UPPERCASE letter-spaced `--track-label` for column headers. All numbers `tabular-nums`. Display number 48px+ (Space Grotesk). Load Inter 400 + Space Grotesk 400 only — no bold weights.
Route badges: specialist = chartreuse fill (`--accent-ink` text); general = transparent + gray border; distilling = `--inverted` bg + chartreuse text. `✓` chartreuse on matched specialist rows.
Motion: 150–200ms ease on state flips only. No decorative animation. <10% chartreuse on screen at rest.

---

## 7. Dashboard layout (`App.jsx` + components)

One screen, NO page scroll (only the feed scrolls internally). Left-aligned, centered ~1200px max-width.
- **Header strip (~56px):** "Northwind Software · Ledger Ops" left; `▶ Run` (primary, chartreuse) + `↻ Reset` right. Reset reloads seed. Run starts the clock.
- **Live feed (left ~60%):** white card; columns `VENDOR · CASE TYPE · ROUTE · COST` in `.label`; rows enter at top with 150ms fade+slide; ~8–9 visible, scrolls within card; distilling row holds ~1s longer.
- **Metrics column (right ~40%), top→bottom:**
  1. **Cost/task** — big `.display` number + rolling line chart, monochrome line with chartreuse dot+glow on the current point only. Opens in decayed shape, keeps descending.
  2. **Counters row:** BUDGET · TOKENS · SPEC LIBRARY (all `.label`+`tabular-nums`). Library ticks in steps, chartreuse flash on distillation. Optional caption "main key · generator on separate meter".
  3. **Source of truth (Graph 2):** compact node/edge — lake codes as nodes, specialists as dots edged to referenced codes; one control `[ Edit ST-CA-07 rate → 0.08 ]`; on click, every specialist edged to ST-CA-07 pulses `--accent-soft` + shows `refreshed`. Zero re-distillation.
- **Inspector drawer (bottom, hidden until distillation; pinnable):** two panels — GENERAL full-context (verbose, truncated `…`, gray cost) vs SPECIALIST tight (terse, chartreuse ✓, chartreuse cost). Caption: "same answer · reasoning amortized at distillation, not re-paid per call".

Choreography per §5 schedule. Never fire two accent events simultaneously except the intended pair (distilling row + library tick read as one cause).

---

## 8. DO NOT BUILD (each of these wastes hackathon time and adds failure surface)

- ❌ No auth, no login, no user accounts.
- ❌ No database / persistence. All state in-memory; Reset = reload the seed literal.
- ❌ No real embeddings / vector store. Router is deterministic exact-signature match.
- ❌ No fine-tuning. "Specialist" = stored procedure only.
- ❌ No multi-provider proxy, no LangChain/heavy agent framework. Direct OpenAI SDK calls.
- ❌ No tests, no CI, no Docker, no deployment config.
- ❌ No error-handling elaborateness beyond: MOCK_MODE fallback + a try/except around model calls that logs and continues.
- ❌ No second accent color, no shadows, no bold fonts, no page scroll.
- ❌ Do NOT improvise the compiler's extraction logic or the routing rule — implement §4d and §4b exactly.

---

## 9. Build order (follow this; do not jump ahead)

1. `config.py` + `models.py` with MOCK_MODE returning shaped canned responses.
2. `lake.py`, `seed.py`, `pool.py` — data + schedule literals.
3. `agents.py` (specialist runtime + tool-instrumented general), `compiler.py` (+ the hard assert), `validate`.
4. `loop.py` — generator clock + routing loop + counters. Verify end-to-end in MOCK_MODE via logs before any UI.
5. Frontend: tokens.css → static layout → wire to `/state` → animate beats.
6. Flip MOCK_MODE off, smoke-test a few real calls, flip back for rehearsal.

---

## 10. SELF-VERIFICATION CHECKLIST (run before declaring done)

Functional:
- [ ] `MOCK_MODE=True` runs the full 90s demo with zero network calls.
- [ ] Routine entries route `specialist`; the hero CAPEX routes `general`, triggers a distillation, library goes 6→7.
- [ ] The 5/5 validation gate actually runs and the CAPEX specialist passes all 5 (if it can't in MOCK, ground-truth wiring is wrong — fix).
- [ ] After promotion, the CAPEX repeat routes `specialist` and `matches_truth=True`.
- [ ] Cost/task rolling value is **lower** at t=90 than at t=0.
- [ ] Editing ST-CA-07 in the lake changes the next specialist call's resolved value with NO recompile; referencing specialists show `refreshed`.
- [ ] Compiler hard-assert is present and fires if a resolved value leaks into a template.
- [ ] `Reset` returns to an identical opening state every time (deterministic).
- [ ] Every on-screen cost derives from a real/mock `usage` object — no invented numbers.

Design:
- [ ] Exactly one accent color used; only on live/active/money elements; <10% of screen at rest.
- [ ] No box-shadows anywhere; cards use 1px `--border`.
- [ ] No font weight other than 400; column labels UPPERCASE + tracked; numbers tabular.
- [ ] No page scroll; only the feed scrolls internally.

Scope:
- [ ] No database, auth, embeddings, fine-tuning, or extra frameworks present.

If any box fails, fix before finishing. Report which boxes passed.
```
