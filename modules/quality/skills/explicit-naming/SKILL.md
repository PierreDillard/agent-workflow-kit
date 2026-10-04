---
name: explicit-naming
description: Enforce explicit, readable variable and function names when writing or reviewing TypeScript, JavaScript or React code.
---

# Explicit Naming

## Rule: the code IS the comment

A well-named identifier replaces any comment. If a name needs a comment to be understood, the name is wrong.

## Never

```ts
// ❌ Single-letter
const e = entries.find(...);
const m = metrics.map(...);
const d = definitions?.[key];
const i = index;
const cb = () => {};

// ❌ Cryptic abbreviations
const isDn = hasDoneFlag(entries);
const cmpMt = completionMetrics;
const fmtVal = formatNumericValue(entry);
```

## Always

```ts
// ✅ Descriptive — no comment needed
const matchingEntry = entries.find(...);
const formattedMetrics = metrics.map(...);
const metricDefinition = definitions?.[key];
const currentIndex = index;
const handleToggle = () => {};

const isDone = hasDoneFlag(entries);
const completionMetrics = numericMetrics.filter(...);
const formattedValue = formatNumericValue(entry);
```

## Rules

- **Variables**: describe what the value IS (`completionMetrics`, not `cmt`)
- **Booleans**: prefix with `is`, `has`, `should`, `can` (`isExpanded`, `hasCompletion`)
- **Functions**: describe what they DO (`buildFilterStatusViewModel`, not `buildVM`)
- **Loop variables**: never `i`, `j`, `k` → use `index`, `itemIndex`, `rowIndex`
- **Parameters**: never `e` for event → use `clickEvent`, `changeEvent`
- **Destructuring**: keep full names unless renaming to avoid conflict

## Checklist before writing code

- [ ] Every variable name answers "what does this hold?"
- [ ] Every function name answers "what does this do?"
- [ ] No single letter anywhere (including loop counters, callbacks, destructured params)
- [ ] No abbreviations that aren't universally known (ok: `url`, `id`, `api` — not ok: `def`, `cfg`, `val`)
