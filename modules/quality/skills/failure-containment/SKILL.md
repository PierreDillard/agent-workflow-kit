---
name: failure-containment
description: Enforce that no widget or view can crash the whole app — error boundary per widget, explicit loading/empty/error states everywhere. Use when creating or modifying a widget, view, tab, or chart; when a "black page" / white screen / full crash is reported; or when reviewing render paths that dereference nullable data.
---
# Failure Containment

A monitoring tool that dies while monitoring is disqualified. One component's crash
must degrade to ONE broken tile, never a black page.

Origin: 2026-07-10 — a `null.ipids` in a PID tab crashed the entire dashboard
(no error boundary anywhere in the tree).

## 1. Containment checklist (any widget/view work)

- [ ] The widget's render tree is wrapped in an error boundary (widget-level, not app-level).
- [ ] The boundary fallback shows the widget title + a compact error state + a retry action —
      the rest of the dashboard keeps streaming.
- [ ] The boundary reports the error (console + store error slice), never swallows it silently.

## 2. The three mandatory states

Every data-driven component must render, without crashing, all three:

| State | Trigger | Render |
|---|---|---|
| loading | subscription active, no data yet | spinner (see `effectiveIsLoading` pattern in `MonitoredFilterTabs.tsx`) |
| empty | data arrived, nothing to show | explicit message ("No input PIDs available for X") |
| error | data null/malformed, handler threw | contained error state, never a throw |

Before closing the task, mentally (or in a test) feed the component: `null`, `undefined`,
`{}`, and empty arrays. If any of them throws, the task is not done.

## 3. Render-path null audit

- No dereference of nullable data inside `useMemo` deps arrays (`[data.field]` crashes
  before the guard inside the memo runs — use `[data?.field]`).
- Parameter defaults (`= EMPTY_X`) only cover `undefined`, never `null` — see skill
  `type-honesty` for normalization at the callsite.
- Selectors returning `null` must be handled at the first consumer, not deep in leaf hooks.

## 4. Regression rule

Any crash fixed under this skill gets a null-safety regression test
(one `it()` per hook/component that threw) via `bug-fix-trace` when Bugs is installed, otherwise retain the regression evidence in the task.
