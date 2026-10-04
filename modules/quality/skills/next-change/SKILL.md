---
name: next-change
description: Anti-technical-debt gate. Forces one brutal question before any code change: "Will this make the next change easier or harder?" Use before implementing any feature, refactor, fix, or new abstraction — especially when the task feels urgent or obvious.
---

# Next Change Gate

Before writing a single line of code, answer these 4 points. No skipping.

## The Gate

**1. This change:** _(one sentence — what you're about to do)_

**2. Next likely change:** _(what will probably be asked next, based on context)_

**3. Verdict:** Does this change make that next change **easier** or **harder**?

**4. Decision:**
- If **easier** → proceed.
- If **harder** → either propose an alternative that doesn't create debt, or explicitly justify why the debt is acceptable right now (deadline, prototype, isolated scope).

---

## Examples

### Green — proceed

> **This change:** Extract `formatFps` into `utils/formatting/numbers.ts`.
> **Next likely change:** Add `formatKbps`, `formatLatency` for other status metrics.
> **Verdict:** Easier — new formatters land in the same file, same pattern.
> **Decision:** Proceed.

### Red — block or justify

> **This change:** Inline fps clamping directly in `FilterStatusMetrics.tsx`.
> **Next likely change:** Same clamping needed for kbps, latency in the same component.
> **Verdict:** Harder — logic duplicated, no shared entry point.
> **Alternative:** Add `formatFps` to `utils/formatting/numbers.ts` instead.

### Red — justified debt

> **This change:** Hardcode the filter index in the debug log.
> **Next likely change:** Support multiple filters.
> **Verdict:** Harder — but this is a temporary debug log, removed before merge.
> **Justified:** Yes — scope is isolated, explicitly temporary.

---

## Rules

- Answer all 4 points even when the answer is obvious.
- "Next likely change" must be specific — not "future improvements".
- Never invent a justification to bypass the gate. If you can't justify it honestly, propose the alternative.
- The gate takes ~30 seconds. It saves hours.
