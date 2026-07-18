# DESIGN.md — Cache Dashboard

Paste this at the top of any Cursor / Claude Code / Codex prompt before generating frontend. Inspired by Ramp's editorial finance aesthetic — monochrome canvas, single highlighter accent where money moves. Not affiliated with Ramp; do not use Ramp's logo or wordmark.

---

## The four rules (violating any one makes it look generic)

1. **One accent only.** Chartreuse appears ONLY on live/active/money elements (specialist route, current cost point, live counters, refresh pulse). Everything else is monochrome. Never introduce a second chromatic color — no red/green for good/bad; use chartreuse vs. gray weight instead.
2. **No shadows.** Cards rest on 1px hairline borders, never `box-shadow`.
3. **One font weight.** Everything at 400. Hierarchy comes from size and case, not bold. Small labels are UPPERCASE with positive letter-spacing.
4. **Left-aligned.** Text and headlines left-align inside centered max-width containers. Never center body copy.

---

## CSS variables

```css
:root {
  /* canvas & surfaces */
  --bg:          #F7FAFC;   /* warm off-white app canvas */
  --surface:     #FFFFFF;   /* cards, feed rows */
  --inverted:    #1A1919;   /* inverted panels (NOT pure black) */

  /* text */
  --text:        #0D0D0D;   /* near-black, primary */
  --text-2:      #4A5568;   /* secondary / muted */
  --text-3:      #A0AEC0;   /* tertiary / disabled labels */

  /* borders */
  --border:      #E5E7EB;   /* 1px hairline, everywhere */

  /* the one accent — money moves */
  --accent:      #CCFF00;   /* primary chartreuse */
  --accent-soft: #E4F222;   /* slightly warmer, for fills/pulses */
  --accent-ink:  #0D0D0D;   /* text ON accent (near-black, never white) */

  /* radii */
  --r-card:      14px;      /* 12–16 range */
  --r-btn:       6px;

  /* spacing rhythm: 8 / 12 / 16 / 24 */
  --s1: 8px; --s2: 12px; --s3: 16px; --s4: 24px; --s6: 32px;

  /* type */
  --font: "Inter", "Space Grotesk", -apple-system, system-ui, sans-serif;
  --track-label: 0.08em;   /* uppercase micro-labels */
  --track-body: -0.01em;   /* tighten body/display */
  --lh-display: 1.02;      /* tight leading on large sizes */
}
```

---

## Type scale (all weight 400)

```css
.display { font-size: 48px; line-height: var(--lh-display); letter-spacing: var(--track-body); font-weight: 400; }
.h1      { font-size: 28px; line-height: 1.1; letter-spacing: var(--track-body); font-weight: 400; }
.h2      { font-size: 20px; line-height: 1.2; font-weight: 400; }
.body    { font-size: 15px; line-height: 1.5; color: var(--text); font-weight: 400; }
.muted   { font-size: 14px; color: var(--text-2); font-weight: 400; }
.label   { font-size: 11px; text-transform: uppercase; letter-spacing: var(--track-label); color: var(--text-2); font-weight: 400; }
.mono    { font-variant-numeric: tabular-nums; }  /* ALL numbers: counters, costs, tokens */
```

Use `.label` for column headers (`CASE TYPE`, `ROUTE`, `COST/TASK`) — this uppercase-tracked micro-label is the signature move. Use `.mono` / `tabular-nums` on every number so live counters don't jitter width as they tick.

---

## Components

```css
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-card);
  padding: var(--s4);
  /* NO box-shadow */
}

.btn {
  border-radius: var(--r-btn);
  padding: var(--s2) var(--s3);
  font-weight: 400;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
}
.btn--primary {           /* only the single most important action */
  background: var(--accent);
  color: var(--accent-ink);
  border-color: var(--accent);
}

/* the feed row */
.row {
  display: grid;
  grid-template-columns: 1.6fr 1fr 0.8fr 0.6fr;  /* vendor · case · route · cost */
  align-items: center;
  gap: var(--s3);
  padding: var(--s2) var(--s3);
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

/* route badges — the money signal */
.badge { font-size: 11px; letter-spacing: var(--track-label); text-transform: uppercase; padding: 2px 8px; border-radius: 4px; }
.badge--specialist { background: var(--accent); color: var(--accent-ink); }        /* cheap = lit up */
.badge--general    { background: transparent; color: var(--text-2); border: 1px solid var(--border); }  /* expensive = monochrome */
.badge--distilling { background: var(--inverted); color: var(--accent); }          /* transient beat */
```

---

## Demo-specific accent usage (where the chartreuse earns its keep)

- **Route badges:** `SPECIALIST` filled chartreuse, `GENERAL` outlined gray. Feed visibly "lighting up" over time = savings made visible. This is the ambient wow.
- **Cost/task curve:** monochrome line, chartreuse dot + soft glow on the *current* (live) point only.
- **Live counters** (budget, tokens, cost/task): number in near-black, but the *unit or delta* tick flashes chartreuse on update.
- **Distillation interrupt:** row flips to `.badge--distilling` (dark bg, chartreuse text) for ~1s, library counter ticks chartreuse.
- **Graph-2 lake refresh:** affected specialist nodes pulse `--accent-soft` on the edit.
- **✓ matches ground truth:** small chartreuse check on specialist rows.

Rule of thumb: if it's not live, active, or about money, it's monochrome. If the whole screen has more than ~10% chartreuse at rest, you're overusing it — pull back.

---

## Motion

Minimal, fast, functional. 150–200ms ease on state flips (badge changes, counter ticks, node pulses). No decorative animation. The only "movement" that matters is data changing — let that be the show.

---

## Fonts to load

Primary: **Inter** (400 only). Optional display: **Space Grotesk** (400) for the big cost/task number.
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400&family=Space+Grotesk:wght@400&display=swap" rel="stylesheet">
```
Do not load or use bold weights. If a heading feels weak, make it *bigger*, not bolder.
```

---

## One-line brief for the AI agent

"Build a finance-ops dashboard in a black-and-white editorial style: warm off-white canvas, white cards on 1px hairline borders (no shadows), single 400-weight sans, uppercase letter-spaced micro-labels, everything left-aligned. Use exactly one accent — chartreuse #CCFF00 — and only on live/active/money elements (specialist badges, current cost point, live counters). Everything else stays monochrome."
