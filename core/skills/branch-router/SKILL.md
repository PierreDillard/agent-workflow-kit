---
name: branch-router
description: Resolve the current Git branch, its task workspace, merge direction and configured branch policy before any versioned change or merge.
---

# Branch Router

Read `.workflow-kit.env`, then inspect `git status -sb` and `git branch --show-current`.

## Branch-owned context

Only for the corresponding modules listed in `.workflow/PROJECT_RULES.md`, for branch `<branch>`:

- task index and contract: resolve through `.workflow/PROJECT_RULES.md` (§ Task placement);
- branch memory: `${TASKS_DIR}/memory/<branch-with-slashes-as-dashes>.md`;
- handoff: `${TASKS_DIR}/handoff/<branch-with-slashes-as-dashes>.md`.

`<safe-branch>` is the exact branch name with `/` replaced by `-`. The branch directly selects
its memory and handoff; task paths may belong to an effort and remain valid across branch changes.

Read the index first. Load individual tasks or memory themes only when the current action needs them.

## Routing

- `trunk`: work on `DEFAULT_BRANCH` only when the user authorizes it.
- `flat`: feature branches derive from and merge directly into `DEFAULT_BRANCH`; propose
  `FEATURE_BRANCH_PREFIX<slug>` when the current branch does not match the change.
- `custom`: read `.workflow/branch-policy.md`; it is the only branch-policy authority.

Classify by change intent, not merely by the file touched. Mixed intents become separate atomic
changes. Never create, switch, merge, commit or push unless the user explicitly requests it.

Before implementation report the current branch, task path, target branch and expected merge
direction. For a requested merge into `DEFAULT_BRANCH`, also report the source HEAD SHA and require
an approved `review-gate` record for that exact SHA before performing the merge when Quality is installed. A source change
invalidates that approval. If the current branch is wrong, stop before editing and propose the exact
switch.
