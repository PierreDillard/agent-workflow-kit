# Agent Workflow Kit

**End the chat without losing the thread.** Agent Workflow Kit gives coding agents a project memory you can read, edit and keep in Git. Start a fresh session on a long-running change and pick up from the last verified step, not from a transcript.

[![npm](https://img.shields.io/npm/v/ants-kit)](https://www.npmjs.com/package/ants-kit)
[![CI](https://github.com/PierreDillard/agent-workflow-kit/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/PierreDillard/agent-workflow-kit/actions/workflows/ci.yml)

## Try it across two sessions

From the root of a Git project, with Node.js 18+, npm and a coding agent, install the `continuity` profile. It includes tasks, memory and branch handoffs. Add `--dry-run` to preview the files first.

```bash
npx ants-kit init --yes --profile continuity
npx ants-kit doctor
```

`doctor` checks the installation. To try the workflow itself, open your assistant in that project. Pick a change you actually need; for example:

1. **Start a task.** “We need to split the CSV exporter without changing its output. Find an existing test that captures today's behavior. Write down what it covers and what's still missing. Don't refactor yet.”
2. **Before closing the chat:** “Leave a handoff for this branch. Link the task, record which checks actually ran, and name the next step.”
3. **Open a fresh chat on the same branch:** “Read the handoff. Which behavior is covered, what evidence do we have, and what should we do next?”

Open the Markdown file in `tasks/handoff/` yourself. It should point to the task and distinguish what was verified from what is still a plan. That file, not the old chat, is what makes the work resumable.

## What stays useful six months later?

| When you need to know… | Where to look |
|---|---|
| **“Why did we keep the old export format?”** | `tasks/DECISIONS.md` links to the decision. Project memory records reusable findings with links to their evidence. |
| **“Where does an export request go?”** | With `knowledge`, `tasks/APP.md` points to the relevant flow and source. Short indexes lead to individual sections, so the agent doesn't have to load the whole project history. |
| **“Can I safely extend this part?”** | `architecture` helps identify boundaries worth checking; `quality` guides reuse, tests and review. Before merging into the default branch, its rules call for independent approval of the exact commit under review. |

The workflow gets more useful as people and agents record verified facts and correct stale ones. It doesn't train the model or enlarge its context window. What grows is the project's own reference material, available to the next maintainer as well as the next agent.

## Choose what your team needs

Plain `npx ants-kit init` starts with **tasks + memory**. Add capabilities when there's a reason to use them:

```bash
npx ants-kit add knowledge quality --dry-run
npx ants-kit add knowledge quality
```

| Need | Modules |
|---|---|
| Track work, preserve decisions, resume another day | `tasks`, `memory`, `continuity` |
| Document code paths and domain facts; explain them to a newcomer | `knowledge`, `learning` |
| Diagnose regressions, review changes, check architectural boundaries | `bugs`, `quality`, `architecture` |
| Clarify an idea or summarize a week's progress | `exploration`, `reporting` |

`npx ants-kit list` shows the available modules. Choose `architecture` explicitly; even the `complete` profile leaves it out. To fit your team's conventions, set branch policy and verification commands in a [project configuration](examples/project.env), or build a module from the [project notes example](examples/modules/project-notes/module.json) and [module guide](docs/modules.md).

### New in 0.7.0

With `quality` installed, ask for a workflow retrospective on a named task or incident. The [`workflow-retro` skill](modules/quality/skills/workflow-retro/SKILL.md) checks whether the evidence points to a gap in the current workflow. It can propose a small change, but never applies it or writes files.

## You decide what gets shared and shipped

- **Review the work.** The [base rules](templates/project/.workflow/base-rules.md) tell the agent not to create branches, commit, push or merge without your authorization. These are instructions, not a permission sandbox; keep using your agent's approval settings.
- **Choose where the records live.** Commit `tasks/` to share it, or use `--local` at installation to exclude that directory only in this clone. Agent entry points still live in `.claude/`, `.codex/`, `CLAUDE.md` and `AGENTS.md`. Some skills are also exported to your home directory by default; set `INSTALL_GLOBAL_SKILLS=false` in your project configuration to keep them project-local.
- **Review changes to the kit itself.** `npx ants-kit@latest update` shows a plan and asks before applying it. Updates preserve editable project records and refuse conflicts in managed files. See the [update and migration guide](docs/modules.md#update-an-installed-kit).

## Compatibility

Claude Code and Codex have dedicated skills and hooks. GitHub Copilot can use compatible skills from `.claude/skills/`, but the kit doesn't configure Copilot hooks. Installation checks run on Linux; macOS, Windows and end-to-end behavior in fresh agent sessions have not been validated. See the [publication checklist](PUBLISHING.md).

If you try the two-session example and the next agent misses something, [open an issue](https://github.com/PierreDillard/agent-workflow-kit/issues) with the agent, installed modules and what the handoff failed to convey.

[MIT license](LICENSE) · [Third-party notices](THIRD_PARTY_NOTICES.md)
