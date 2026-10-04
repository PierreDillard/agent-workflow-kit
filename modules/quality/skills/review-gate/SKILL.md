---
name: review-gate
description: Perform an independent review of a bounded task against a fixed Git SHA before a default-branch merge or when explicitly requested.
---

# Review Gate

Use before every merge into `DEFAULT_BRANCH`, and on an explicit request for an independent review
elsewhere. Resolve source, target and merge base with `branch-router`; capture the exact source
HEAD SHA and selected `write-task` contract.

The reviewer works from a separate fresh context, stays read-only and records findings for a new
iteration; it never implements its own findings. Write `${TASKS_DIR}/review/<safe-branch>.md` with
the reviewed SHA and base, acceptance criteria checked against the diff, checks actually run,
out-of-plan files, numbered `file:line` findings and verdict `approve`, `iterate` or `blocked`.

For a merge into `DEFAULT_BRANCH`, the merge is blocked unless the review record has verdict
`approve` for the current exact source HEAD SHA. Any source change after the reviewed SHA
invalidates the verdict and requires a new review. `approve` requires every acceptance criterion
to be verified and no blocking finding; `iterate` leaves the task implemented until a new SHA is
reviewed; `blocked` records the external blocker. Tasks become `reviewed` only after `approve` for
that exact SHA; synchronize the authoritative frontmatter and derived README using `write-task`. A
commit alone does not establish review.
