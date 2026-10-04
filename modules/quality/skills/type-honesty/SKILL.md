---
name: type-honesty
description: Hunt and eliminate type lies at data boundaries — `as X`, `any`, `{} as Y`, non-null `!`, casts hiding null. Use when writing or reviewing code that casts a value, when a runtime TypeError contradicts the declared types, or when touching WS payloads, store selectors returning nullable data, or props with parameter defaults.
---
# Type Honesty

A cast is a promise the compiler can no longer verify. Every `as` at a data boundary
is a place where runtime reality can diverge from the declared type — and in this
project, it already has.

Origin: 2026-07-10 — `stats as FilterStatsResponse | undefined` let a runtime `null`
through; the parameter default `filterData = EMPTY_FILTER_DATA` only covers
`undefined`, never `null` → black page crash.

## 1. The null/undefined law

- Parameter defaults and destructuring defaults apply ONLY to `undefined`.
- Any nullable value passed to a prop with a default must be normalized at the
  callsite: `value ?? undefined` — never casted.
- `as X | undefined` on a `X | null` value is the exact lie that caused the crash.

## 2. Boundary audit (run when touching these zones)

| Boundary | Lie to hunt | Honest replacement |
|---|---|---|
| WS payloads (`processGpacMessage`, handlers) | `data: any`, `data as SomeResponse` | type in `ws/types.ts` + narrowing on `data.message` |
| Store selectors | consumer casting away `null` | handle `null` at first consumer, or selector returns a safe default |
| Props | `as X \| undefined`, `{} as HandlersType` | `?? undefined`, real empty object literal satisfying the type |
| Service internals | non-null `!` after an async gap | explicit guard with early return |

## 3. Decision tree for an existing cast

1. Is the cast provably safe (narrowed just above)? → replace with a type guard so
   the compiler proves it too.
2. Does it hide `null`/`undefined`? → normalize the value (`?? undefined`, guard).
3. Does it bridge two genuinely different shapes (e.g. `MonitoredFilterStats` vs
   `FilterStatsResponse`)? → that is a modeling debt: keep the cast, flag it in the
   task file — do not silently widen either type.

## 4. Rules

- Never add a new `any` at an external data boundary; validate unknown input before narrowing it.
- Never "fix" a type error with a broader cast — if the compiler complains, the
  types are telling the truth somewhere; find where.
- `useMemo`/`useEffect` deps must not dereference values the type says can be
  absent (`[data?.field]`, not `[data.field]`).
