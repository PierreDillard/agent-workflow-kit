---
name: done-check
description: Quality gate before closing any task. Runs 5 questions on the code just written: complexity, readability, API simplicity, pattern consistency, extensibility. Use before saying a task is done, before committing, before moving a task to done/, or when finishing any implementation step ("terminé", "done", "commit propre", "tâche close").
---

# done-check

Run this before every task close. If any answer is bad → fix first, then close.

## The 5 questions

For each file touched in this task, answer honestly:

**1. Complexity** — Does this add cognitive load?
- New abstraction nobody asked for? → remove it
- Wrapper around a wrapper? → inline it
- More lines than the problem warrants? → cut

**2. Readability** — Can a dev who has never seen this project understand it in 30 seconds?
- Names that require context to decode? → rename
- Logic that needs a comment to be understood? → restructure
- Magic values or conditions? → name them

**3. API surface** — Does this simplify or complicate the call site?
- Caller now needs to know more than before? → bad
- Old function still exists alongside the new one? → delete old
- Return type harder to consume? → redesign

**4. Pattern consistency** — Does this match how the rest of the project does it?
- Check the nearest 2–3 similar constructs in the codebase
- Different naming convention? → align
- Different file location? → move
- Different error handling style? → align

**5. Extensibility / reuse** — Will the next dev be able to reuse this?
- Hardcoded assumption that should be a parameter? → extract
- Duplicates something that already exists? → delete and point to existing
- Too coupled to one call site? → decouple if the next use case is obvious

## Scoring

| Result | Action |
|--------|--------|
| All 5 ✅ | Close the task; commit only after explicit user authorization |
| 1–2 ⚠️ | Fix the specific issue, re-check |
| 3+ ❌ | Do not close — refactor first |

## Format for self-check

State each answer in one line before closing:

```
1. Complexity ✅ — no new abstractions
2. Readability ✅ — names are self-documenting
3. API ✅ — call site unchanged
4. Patterns ⚠️ — field order differs from other MetricDef usages → fixed
5. Extensibility ✅ — map is open for new entries
```
