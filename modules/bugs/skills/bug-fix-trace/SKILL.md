---
name: bug-fix-trace
description: Confirm a bug hypothesis at runtime, add a focused regression test when feasible, and retain the incident in the thematic bug ledger.
---

# Bug Fix Trace

Start from `bug-triage`. Reading code creates a hypothesis, never a conclusion. Do not report a
root cause or implement a correction until runtime evidence confirms it.

1. Add the smallest temporary probes that make competing hypotheses produce different output.
   Instrument early returns and error paths too: a missing log is not evidence when that path has
   no probe. Verify a probe can read the value it claims to inspect.
2. Reproduce the failure. Record the cause as either `confirmed by runtime` or `hypothesis,
   source-read only`; if runtime contradicts the reading, discard the hypothesis.
3. Once confirmed, write one focused regression test for the broken public behavior, then the
   minimal fix. If a test is infeasible, state why in the trace.
4. Upsert the incident in `${TASKS_DIR}/bugs/<theme>.md`: read only the matching theme and replace
   the row when its diagnosis, correction or proof changed. Add the index entry only for a new
   theme. Do not retain refuted hypotheses as current facts.
5. Find `Introduced` with bounded history inspection (`git blame` or `git log -S`) or write
   `unknown`; never guess. `Fix` remains `pending` until an exact correction commit exists.
6. If Memory is installed, invoke `memory-report` with this exact evidence; otherwise retain the
   bug trace. Never scan unrelated bug files.

Use this ledger shape:

```md
| Date | Fix | Introduced | Branch | Severity | Files | Root Cause | Correction | Test | Prevention |
```

One-off incidents remain canonical in the bug ledger. Promote only a verified prevention rule that
applies beyond the affected area; raw logs and a one-off diagnosis do not belong in project memory.
