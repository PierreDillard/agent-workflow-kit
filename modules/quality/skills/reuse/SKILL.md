---
name: reuse
description: Use before implementation to inspect the existing codebase and reuse existing utilities, hooks, components, services, selectors, types, configs, and project patterns instead of creating duplicates.
context: fork
agent: Explore
model: haiku
---

# Reuse Existing Code

## Goal

Prevent duplicate logic and keep new code aligned with existing project patterns.

## Scope

Use this skill before:
- adding a feature
- fixing a bug
- creating a component, hook, utility, service, type, selector, config, or store logic
- refactoring code that may already exist elsewhere

## Hard Rule

Do not write new code until the existing codebase has been searched.

Reuse first. Extend second. Create new code only when reuse is clearly worse.

## Search Checklist

Inspect, when relevant:

1. Existing components
2. Existing hooks
3. Existing utilities/helpers
4. Existing services/adapters
5. Existing Redux stores/selectors/actions
6. Existing TypeScript types/interfaces
7. Existing constants/config files
8. Existing tests
9. Existing naming and folder conventions

## Recommended Commands

Use targeted searches before broad exploration:

```bash
rg -n "keyword|similarName|domainTerm" src tests
rg -n "use[A-Z].*|createSelector|createSlice|adapter|service" src
find src -maxdepth 4 -type f | sort
````

Search by:

* domain vocabulary
* UI label
* API field name
* type name
* action name
* hook name
* component name
* similar feature name

## Required Output Before Coding

Return this short report:

```md
## Reuse Report

### Existing candidates found
- `path/to/file.ts`: what exists and why it matters

### Best reuse option
- Reuse / extend / extract / create new

### Decision
- Chosen approach:
- Reason:

### Duplication risk
- Low / Medium / High
- Explanation:

### Files likely to modify
- `path/to/file.ts`
```

## Decision Rules

Choose `reuse` when existing logic already solves the same problem.

Choose `extend` when existing logic is close but missing a small behavior.

Choose `extract` when similar logic exists in multiple places and should become shared.

Choose `create new` only when:

* no close existing abstraction exists
* existing code is too coupled
* reuse would make the code harder to understand
* the new behavior is genuinely separate

## Duplication Warning

If new code duplicates existing logic, explicitly say:

```md
This duplicates existing logic in `path/to/file.ts`.
Reason for accepting duplication:
```

Never hide duplication.
