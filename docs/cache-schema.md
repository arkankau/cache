# Cache — Data Model & Seed Spec

The one design doc both the generator and the agents read from. Get this right and the build is plumbing.

---

## The four objects

Everything is one of: a **Lake entry** (source of truth), a **Case entry** (work to process), a **Specialist** (compiled procedure), or a **Receipt** (processed result). The whole anti-rot thesis lives in the fact that Specialists reference Lake codes and never store resolved values.

---

## 1. The Data Lake (source of truth)

Three tables. Mutable. This is the layer a policy change edits.

```json
// gl_codes
{
  "code": "GL-4021",
  "name": "Software Subscriptions",
  "current_rule": { "deductible": true, "rate": null },
  "effective_date": "2026-01-01"
}

// state_codes
{
  "code": "ST-CA-07",
  "state": "CA",
  "tax_rule": "digital_services_taxable",
  "rate": 0.0725,
  "effective_date": "2026-04-01"
}

// vendor_registry
{
  "vendor_id": "VEND-0042",
  "name": "Acme SaaS Inc",
  "default_gl": "GL-4021",
  "recon_pattern": "P-04",       // <-- drives case-type signature
  "home_state": "ST-CA-07"
}
```

**Rule that makes this safe (enforce it):** the lake stores *values and rules*, procedures store *references*. A specialist that needs the CA rate stores `"ST-CA-07"` and looks it up at runtime — it never bakes `0.0725` into itself. Change the lake row → every specialist referencing it is instantly current, zero re-distillation. This is the demo's Graph 2 and your killer-question answer.

Corollary constraint: specialists may only **value-lookup** codes, never branch on a rule's *structure*. "Fetch current rate for ST-CA-07" is safe under a lake edit. "If ST-CA-07 uses flat-rate then X else Y" is not — a lake edit could invalidate the branch silently. Value-lookups only = policy changes are safe by construction.

---

## 2. Case Entry (what the generator emits)

```json
{
  "entry_id": "E-10432",
  "type": "invoice",              // invoice | expense | recon | notification
  "vendor_id": "VEND-0042",
  "amount": 240.00,
  "raw_text": "Acme SaaS Inc — monthly platform fee, April. Inv #A-9931.",
  "arrival_t": 41.2,             // seconds into demo (seeded schedule)

  // eval-only, NEVER shown to the processing agents:
  "_case_signature": "invoice|P-04",   // the true case type
  "_ground_truth": {
    "gl_code": "GL-4021",
    "state_code": "ST-CA-07",
    "disposition": "auto-post"
  }
}
```

The agent sees `type`, `vendor_id`, `amount`, `raw_text`. The `_` fields are for the ✓-matches check and for staging beats — the model earns its answer from raw_text + lake, ground truth only judges it.

---

## 3. Case-type signature (the routing key)

How you decide "have I seen this kind of thing before." Two implementations — pick per time budget:

**A. Deterministic (safe, 20 min):** `signature = f(type, vendor.recon_pattern)`. Exact-match against the specialist library. Zero embedding infra, fully predictable on stage. **Use this for the demo.**

**B. Embedding (the pitch story, +2 hrs):** embed `raw_text`, cosine-match against each specialist's centroid, route if `sim > threshold`. This is what you *say* the product does (handles fuzzy variants), and you can show it working on a couple entries. Build A, demo A, mention B as the productionization — or build B only if A is solid with hours to spare.

Don't gate the demo on B. A wrong embedding match on stage is a visible failure; deterministic never misfires.

---

## 4. Specialist (compiled procedure)

The asset that accumulates. Stored, not fine-tuned.

```json
{
  "specialist_id": "SPEC-invoice-P04",
  "case_signature": "invoice|P-04",
  "model_tier": "cheap",                 // e.g. haiku-class / gpt cheap tier
  "retrieval_plan": ["vendor_registry", "gl_codes", "state_codes"],
  "code_references": ["VEND-0042", "GL-4021", "ST-CA-07"],  // dereferenced live
  "prompt_template": "Given invoice {raw_text} and vendor {vendor}, map to GL and state per the resolved codes. Output {answer_schema}.",
  "answer_schema": { "gl_code": "str", "state_code": "str", "disposition": "enum" },
  "distilled_from": "E-10098",
  "validated": true,
  "validation": { "held_out_matches": 5, "held_out_total": 5 }   // the correctness gate
}
```

The specialist call = cheap tier + tight context (only the dereferenced codes + template), which is why it's ~10x cheaper on *two* axes (model AND tokens), and why its reasoning trace is 1–2 lines: it's applying a conclusion, not deriving one.

---

## 5. The distillation + validation gate (your hour-0 kill test)

When a novel case type hits:

1. General agent (frontier, full context) solves it → produces answer + trace.
2. Compiler builds a candidate specialist from the trace: retrieval plan, code refs, template, answer schema.
3. **Validation gate — do NOT skip:** pull K held-out instances of the *same* case type from the pool (they exist but haven't been "seen"), run the candidate specialist on them, check each `== _ground_truth` (or `== general's answer`). Promote to library only if all K pass.
4. Promoted → future matching entries route cheap. Failed → keep routing to general, flag "doesn't compress." (This being *possible* is what makes the demo honest — not every case type compresses, and that's fine.)

This gate is the difference between "cheaper" and "cheaper *and correct*." Surface it as the ✓ on specialist rows.

---

## 6. Frozen seed vs live tail

**Seed snapshot (baked, reloaded on every rerun):**
```json
{
  "lake": { ...gl, state, vendor tables... },
  "processed_entries": [ ...N receipts, mix of general+specialist... ],
  "specialist_library": [ ...M pre-validated specialists... ],
  "counters": { "cost_total": 0.84, "tasks": 120, "cost_per_task_rolling": 0.006 }
}
```
Opens the demo in a warm, good-looking state — cost-per-task curve already showing payback shape, library non-empty. Deterministic every run.

**Live tail (real, starts on "go"):**
- Generator (separate API key = separate meter) emits entries from a **pre-built pool** on the seeded schedule — no model call to generate, just emit rows on a timer.
- Processing agents (main key = the on-screen counter) handle them for real.
- Seeded schedule plants the beats: **novel case ~0:40** (distillation interrupt fires, library ticks), **its repeat ~1:10** (routes SPECIALIST, cost drops, ✓).

---

## 7. Pre-built entry pool (what to author before coding)

You need, roughly:
- **Seed-processed:** ~120 entries across ~6 case types, already in the snapshot as receipts.
- **Live routine:** ~15–20 entries whose case types already have specialists → these show cheap routing live (the "greening" ambient wow).
- **Live novel:** 1 curated novel case type + **K=5 held-out instances** of it → this is the staged distillation beat. Curate so the specialist genuinely matches (this is your hero comparison; don't stage a case that loses info).
- Distribution skew: routine >> novel, matching reality. But *seeded*, not random — you choreograph arrival, don't gamble on it.

---

## Build order (unchanged, now concrete)

1. **Hour 0:** author the lake + pool + seed snapshot from this spec. Run the validation gate on your hero case type by hand — does the compiled specialist match on all 5 held-out? If no, the whole thesis is dead; find out now.
2. Deterministic router + specialist runtime (dereference codes → cheap call).
3. General agent path + trace→procedure compiler + live promotion.
4. Dashboard: live feed w/ route badges, cost-per-task rolling curve, library counter, the code-refresh (Graph 2) interaction, curated side-by-side reasoning diff.
5. Seed reload button. Rehearse the beats.

Cut without mercy: embedding router (unless hours spare), multi-provider proxy polish, anything not in steps 1–4.
