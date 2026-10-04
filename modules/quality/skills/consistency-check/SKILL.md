---
name: consistency-check
description: Audit pattern uniformity across the project before implementing anything new. For each layer touched by the task (types, services, hooks, components, store, utils…), extract the dominant pattern, detect divergences, and report before writing any code. Use when adding a new hook, service, component, type, or any construct that must be consistent with existing ones. Use when user says "check consistency", "is this pattern right", "how do others do it", or before any multi-layer feature implementation.
context: fork
agent: Explore
---

# Consistency Check

## When to run

Run this skill **before writing any code** when the task touches one or more layers of the project (types, services, hooks, components, store slices, selectors, utils).

## Process

1. **Identify layers** — from the user's request, list which layers are touched.
2. **Scan each layer** — read existing files in the relevant folder and across the project for similar constructs.
3. **Extract the dominant pattern per layer** — for each layer, identify:
   - Naming conventions
   - File structure and exports
   - Input/output shapes and return types
   - State management and memoization approach
   - Error handling and subscription/cleanup patterns
4. **Cross-project grep** — search for similar constructs elsewhere to confirm the pattern is project-wide, not just local.
5. **Flag divergences** — if inconsistencies already exist in the codebase, list them and ask the user which pattern to follow.
6. **Report** — output the report (see format below) and wait for confirmation before writing code.

## Output format

```
Scope: <layers touched>

Per-layer pattern:
  types:      <pattern + reference file>
  services:   <pattern + reference file>
  hooks:      <pattern + reference file>
  components: <pattern + reference file>
  store:      <pattern + reference file>
  ...

Divergences: <none | list>

New code will follow: <reference per layer>
```

## Rules

- Never write code before completing this report.
- If a layer has no existing examples, state it explicitly ("no existing pattern — propose one").
- If divergences exist, ask which pattern to follow — do not pick one silently.
