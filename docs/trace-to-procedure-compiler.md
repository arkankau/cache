# Trace → Procedure Compiler

Turns one expensive general-agent solve into a stored specialist. This is the "distillation" — no fine-tune, just structured extraction from the trace. The whole thing is ~150 lines.

---

## The core idea

The general agent, solving a novel case, *reveals a procedure by executing it*: it fetches certain lake tables, applies a rule, emits a structured answer. The compiler's job is to **capture that procedure as a replayable object** so a cheap model can re-run it on future instances without re-deriving.

You do NOT try to make the LLM introspect its own reasoning (unreliable). Instead you **instrument the general agent** so the procedure falls out of *what it did*, not *what it says it did*.

---

## Step 1: Instrument the general agent (this is the trick)

Give the general agent tools, and log the calls. The tool-call log *is* the trace — structured, not prose.

```python
TOOLS = [
  {"name": "lookup_vendor",  "args": ["vendor_id"]},
  {"name": "lookup_gl",      "args": ["gl_code"]},
  {"name": "lookup_state",   "args": ["state_code"]},
  {"name": "emit_answer",    "args": ["gl_code", "state_code", "disposition"]},
]
```

General agent runs with full context + these tools. You capture:

```json
{
  "entry_id": "E-10098",
  "tool_calls": [
    {"tool": "lookup_vendor", "args": {"vendor_id": "VEND-0042"}},
    {"tool": "lookup_gl",     "args": {"gl_code": "GL-4021"}},
    {"tool": "lookup_gl",     "args": {"gl_code": "GL-4890"}},   // considered the trap
    {"tool": "lookup_state",  "args": {"state_code": "ST-CA-07"}},
    {"tool": "emit_answer",   "args": {"gl_code": "GL-4890", "state_code": "ST-CA-07", "disposition": "capitalize"}}
  ],
  "reasoning_summary": "annual prepay -> capitalize -> GL-4890",  // one line, for the compiler's template
  "cost": 0.022, "tokens": 1910
}
```

If your provider path doesn't do clean tool-calling, fallback: prompt the general agent to end with a fenced JSON block `{retrieval: [...], rule: "...", answer: {...}}` and parse that. Tool-calling is cleaner; JSON-block is the universal fallback.

---

## Step 2: Compile the trace into a candidate specialist

Pure function, no LLM call. Extract from the tool log:

```python
def compile_specialist(trace, entry):
    # which lake tables were touched -> retrieval plan
    tables = { {"lookup_vendor":"vendor_registry",
                "lookup_gl":"gl_codes",
                "lookup_state":"state_codes"}[c["tool"]]
               for c in trace["tool_calls"] if c["tool"] != "emit_answer" }

    # which specific codes were dereferenced -> code_references (NOT values!)
    codes = [ list(c["args"].values())[0]
              for c in trace["tool_calls"] if c["tool"] != "emit_answer" ]

    answer = next(c["args"] for c in trace["tool_calls"] if c["tool"]=="emit_answer")

    return {
      "specialist_id": f"SPEC-{entry['_case_signature'].replace('|','-')}",
      "case_signature": entry["_case_signature"],
      "model_tier": "cheap",
      "retrieval_plan": sorted(tables),
      "code_references": codes,                 # dereferenced live, never resolved-in
      "prompt_template": build_template(trace["reasoning_summary"], answer.keys()),
      "answer_schema": {k: type(v).__name__ for k,v in answer.items()},
      "distilled_from": entry["entry_id"],
      "validated": False,                        # gate hasn't run yet
    }
```

**The one rule that must survive compilation:** `code_references` holds the *codes* (`"ST-CA-07"`), and the specialist's runtime resolves them against the live lake. The compiler must never copy a *resolved value* (`0.0725`) into the template or the answer. If a template string contains a literal rate/rule, that's a bug — it means a lake edit won't propagate. Add an assert: no numeric-looking constants from lake rows appear in `prompt_template`.

---

## Step 3: Build the specialist's prompt template

The cheap model gets a *tight* prompt: the raw entry + only the resolved codes + the extracted rule. No full-context reasoning.

```python
def build_template(rule, answer_fields):
    return (
      "Classify this finance entry.\n"
      "Entry: {raw_text}\n"
      "Resolved codes: {resolved_codes}\n"      # filled at runtime from lake
      f"Rule: {rule}\n"                          # the amortized conclusion
      f"Output JSON with fields: {list(answer_fields)}. No reasoning."
    )
```

`"No reasoning"` + pre-resolved codes = the 1-2 line trace and the ~10x token drop. The specialist *applies* `rule`; it doesn't re-derive it. That's the entire cost win, made concrete.

---

## Step 4: The validation gate (promote or reject)

```python
def validate(specialist, held_out, lake):
    passed = 0
    for e in held_out:                          # 5 instances, same case type
        out = run_specialist(specialist, e, lake)   # cheap model call
        if out == e["_ground_truth"]:
            passed += 1
    specialist["validation"] = {"held_out_matches": passed, "held_out_total": len(held_out)}
    specialist["validated"] = (passed == len(held_out))
    return specialist["validated"]              # promote to library only if True
```

Fail → the case type keeps routing to the general agent, flagged "doesn't compress." That branch existing is what makes the demo honest.

---

## Step 5: Runtime — how the specialist actually answers

```python
def run_specialist(spec, entry, lake):
    resolved = { code: lake.resolve(code) for code in spec["code_references"] }  # LIVE lookup
    prompt = spec["prompt_template"].format(
        raw_text=entry["raw_text"],
        resolved_codes=resolved
    )
    return cheap_model(prompt, schema=spec["answer_schema"])   # cheap tier, tight context
```

`lake.resolve(code)` is where anti-rot lives: change the lake row, next specialist call sees the new value automatically. No recompile. This function is also what "lights up" in your Graph 2 refresh beat — you can literally show which specialists call `resolve("ST-CA-07")` and mark them refreshed when that row changes.

---

## The full loop

```
new entry
   │
   ├─ signature in library?  ── yes ──> run_specialist  (cheap, ✓)
   │
   └─ no ──> general_agent (frontier, instrumented)
                │
                ├─ compile_specialist(trace)     # step 2-3
                ├─ validate(candidate, held_out) # step 4
                └─ pass? add to library : flag "no-compress"
```

---

## What to build vs fake for the 24h demo

- **Real:** steps 1, 4, 5 (instrumented general agent, validation gate, specialist runtime). These are the mechanism — they must actually run or the demo is a lie.
- **Real but simple:** step 2-3 compiler. Deterministic extraction from tool log. Genuinely ~40 lines.
- **Don't build:** actual fine-tuning, embedding-based rule generalization, multi-step retrieval planning. The "compiled procedure = retrieval plan + template + code refs" version is the whole point and it's enough.

The assert in step 2 (no resolved values baked into templates) is your cheapest insurance — it's the single line that guarantees the anti-rot story is true and not just claimed.
