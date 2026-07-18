# Northwind Software — Composite Client & Seed Pool

Fictional. Modeled on a ~200-person NY-based B2B SaaS company (the Ramp-shaped profile: heavy recurring SaaS spend, multi-state sales tax exposure, travel + contractor spend, a long tail of one-off vendors). Every entry below is fabricated and stageable.

**Framing line for the pitch:** "Northwind is a fictional 200-person NYC SaaS company — synthetic data modeled on real mid-market finance patterns."

---

## The Data Lake

### vendor_registry
| vendor_id | name | default_gl | recon_pattern | home_state |
|---|---|---|---|---|
| VEND-0042 | Cloudspan (cloud infra) | GL-4021 | P-04 | ST-CA-07 |
| VEND-0055 | DeskNest (office SaaS) | GL-4021 | P-04 | ST-NY-01 |
| VEND-0061 | Relay Comms (telephony) | GL-4021 | P-04 | ST-CA-07 |
| VEND-0088 | Meridian Travel (T&E) | GL-5510 | P-11 | ST-NY-01 |
| VEND-0090 | Beacon Contractors | GL-6200 | P-22 | ST-TX-03 |
| VEND-0102 | Ironside Legal | GL-6410 | P-30 | ST-NY-01 |
| VEND-0140 | (long-tail one-offs) | — | — | — |

### gl_codes
| code | name | rule |
|---|---|---|
| GL-4021 | Software Subscriptions | deductible, no special rate |
| GL-5510 | Travel & Entertainment | 50% meals rule flag |
| GL-6200 | Contractor Services | 1099-reportable |
| GL-6410 | Legal & Professional | deductible |
| GL-4890 | Software — Capitalized | *the trap: recon P-04 sometimes maps here instead of 4021* |

### state_codes
| code | state | tax_rule | rate |
|---|---|---|---|
| ST-NY-01 | NY | saas_taxable | 0.08875 |
| ST-CA-07 | CA | digital_services_taxable | 0.0725 |
| ST-TX-03 | TX | contractor_nexus | 0.0625 |

---

## The 6 case types (seed library — pre-distilled specialists)

1. **`invoice|P-04`** — recurring SaaS invoice → GL-4021, home-state tax. *Highest recurrence. Your bread-and-butter cheap route.*
2. **`invoice|P-11`** — travel/T&E → GL-5510, meals flag. Medium recurrence.
3. **`expense|P-22`** — contractor payment → GL-6200, 1099 flag, TX nexus. Medium.
4. **`invoice|P-30`** — legal invoice → GL-6410. Lower recurrence.
5. **`notification|dupe`** — duplicate-invoice alert → disposition flag. High recurrence, trivial.
6. **`recon|multistate`** — a SaaS charge billed across NY+CA → split allocation. Medium, slightly harder.

These 6 ship *inside the seed snapshot* as validated specialists. On load, the library shows 6, cost-per-task already in payback shape.

---

## The HERO novel case (the live distillation beat)

**`invoice|P-04-CAPEX`** — a Cloudspan invoice that is a *multi-year prepaid* contract. Looks like ordinary P-04 SaaS (same vendor!) but the annual-prepay means it maps to **GL-4890 (capitalized)**, not GL-4021.

Why this is the perfect hero:
- **Visibly novel:** same vendor as the routine case, so the judge sees the system *not* blindly reusing the P-04 specialist — it recognizes the prepay signal as new. Sharp.
- **Compresses cleanly:** once the general agent derives "annual prepay → capitalize → GL-4890," that's a crisp, stable rule. The specialist matches every held-out instance. Your ✓ is honest.
- **Real domain flavor:** capex-vs-opex on prepaid SaaS is a genuine thing finance people fight about. NY judges will nod.

### The 5 held-out instances (the validation gate)
Five more prepaid invoices, different vendors/amounts, same underlying case type:

| entry_id | vendor | raw_text cue | truth GL |
|---|---|---|---|
| E-H01 | Cloudspan | "annual prepay, 12-mo term" | GL-4890 |
| E-H02 | DeskNest | "prepaid 24 months upfront" | GL-4890 |
| E-H03 | Relay Comms | "yearly contract, paid in full" | GL-4890 |
| E-H04 | Cloudspan | "multi-year, invoiced annually" | GL-4890 |
| E-H05 | DeskNest | "12-month prepaid subscription" | GL-4890 |

Gate: compiled `P-04-CAPEX` specialist must hit GL-4890 on all 5 before promotion. **Run this by hand at hour 0.** If it doesn't hit 5/5, either fix the compiler's rule extraction or pick a cleaner hero case — but know before you build the dashboard.

---

## Seeded arrival schedule (the live tail)

| t (s) | entry | route | on-screen beat |
|---|---|---|---|
| 0:00 | — | — | load seed: 6 specialists, cost/task low, feed warm |
| 0:10–0:35 | 4–5 routine P-04 / dupe | SPECIALIST ✓ | ambient "greening", cost/task flat-low |
| 0:40 | **hero P-04-CAPEX** | GENERAL → *distilling…* | **interrupt beat**: row pauses, library ticks 6→7, verbose trace shown |
| 0:50–1:05 | 3–4 more routine | SPECIALIST ✓ | cost/task stays low, feed keeps greening |
| 1:10 | **repeat CAPEX (E-H0x)** | SPECIALIST ✓ | **payoff beat**: was expensive, now cheap, ✓ matches — solar panel closed |
| 1:20 | live lake edit: ST-CA-07 rate change | — | **Graph 2 beat**: every CA-referencing specialist lights "refreshed" |
| 1:30+ | mixed traffic | mostly SPECIALIST | cost/task curve visibly decayed vs opening |

Everything seeded/timed — no randomness on stage.

---

## The hero side-by-side (curated quality proof)

```
CAPEX case — GENERAL (full context)        CAPEX repeat — SPECIALIST (tight)
────────────────────────────────────       ────────────────────────────────
"Cloudspan invoice… normally P-04 →         "Cloudspan prepay → P-04-CAPEX.
 GL-4021. But 'annual prepay 12-mo'          GL-4890. ST-CA-07. ✓ matches"
 → this is capitalized, not expensed.
 → GL-4890. Verify CA tax ST-CA-07…"        [108 tok · $0.002 · ✓]
 [1,910 tok · $0.022]
```

Same answer. ~10x cheaper. The specialist isn't dumber — the reasoning was amortized at distillation, so it *applies* the rule instead of re-deriving it. That sentence is your quality rebuttal.
