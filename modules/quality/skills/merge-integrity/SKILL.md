---
name: merge-integrity
description: Audit semantic divergence immediately after a cross-branch merge, even when Git reports no textual conflict.
---

# Merge Integrity

Use the source, target and merge base supplied by `branch-router`.

1. Inspect the bounded merge diff and both pre-merge sides.
2. Compare moved files, public interfaces, tests, configuration and task contracts by intent.
3. Run focused checks that cover behavior changed on either side.
4. Record each silent semantic conflict with its owning branch and resolution.

Do not equate “no conflicts” with coherence. Do not repair findings inside the audit unless the user
asked for implementation; route each repair as a new atomic task.
