# Agent Workflow Kit

[![npm](https://img.shields.io/npm/v/ants-kit)](https://www.npmjs.com/package/ants-kit)
[![CI](https://github.com/PierreDillard/agent-workflow-kit/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/PierreDillard/agent-workflow-kit/actions/workflows/ci.yml)

**Organize work with your AI, your way.**

Less context to repeat, clear task tracking, and decisions preserved between sessions.
Choose only the modules you need and adapt them to your project.

**Claude Code · Codex · Copilot · 9 optional modules · Customizable**

## Supported coding agents

| Agent | Support |
|---|---|
| Claude Code | ✅ Skills and dedicated hook configuration |
| Codex | ✅ Skills and dedicated hook configuration |
| GitHub Copilot | ✅ Compatible skills via `.claude/skills/`; kit validation pending |

The kit does not yet provide dedicated hook configuration for Copilot.

## How it works

Keep talking to your assistant as usual. Your selected modules give it guidance to organize
work and keep useful records for the next session.

> “Create a task for this feature, work through it in small steps, and verify the result.”

With Tasks + Memory, the basic flow is:

```text
Your request → a task → verifiable steps → useful decisions preserved
```

Add Continuity to resume work in another session, Quality for more thorough checks,
Knowledge to map your code flows and domain facts, or Learning to help you understand the project.

The shared `project-workflow` skill routes questions, audits, planning, bugs, implementation
and merges to the skills in your installed modules. It preserves local project rules and reports
missing capabilities. Installation checks verify files and mirrors; they do not prove that an
assistant followed the route in a session.

## Quick start

**Prerequisites**: a Git project, one of the agents above, Node.js 18+ and Git.
Linux is the tested platform; macOS and Windows have not been validated yet.

From your project's root directory:

```bash
npx ants-kit init
```

Answer the questions about your project, then open your assistant in that project.
Instructions and skills — specialized guides for the assistant — are prepared for all three
agents. Hooks are configured for Claude Code and Codex; approve them if your assistant asks.

Preview first with `--dry-run`, or skip the questions with `--yes`:

```bash
npx ants-kit init --dry-run
npx ants-kit init --yes --profile continuity
```

The package is [`ants-kit`](https://www.npmjs.com/package/ants-kit) on npm. To get the shorter
`ants` command instead of `npx ants-kit`, install it globally:

```bash
npm install -g ants-kit
ants init
```

### Commands

| Command | What it does |
|---|---|
| `npx ants-kit init` | Install the kit into the current Git project (alias: `install`) |
| `npx ants-kit add <modules>` | Add modules to an existing installation |
| `npx ants-kit@latest update` | Preview the update to the latest release, then apply it after confirmation |
| `npx ants-kit doctor` | Check the installation without modifying it |
| `npx ants-kit list` | List available modules |
| `npx ants-kit --help` | Show every option (`--target`, `--dry-run`, `--yes`, `--tasks-dir`, `--local`…) |

With a global installation, replace `npx ants-kit` with `ants`.

## One directory in your project

Everything the kit installs lives in a single directory, `tasks/` by default:

```text
my-project/
├── tasks/                    # your tasks, memory, decisions, reports…
│   └── .workflow/            # managed by the kit: rules, runtime, scripts, inventory
├── .claude/                  # skills, settings.json (hook), agents for Claude Code
├── .codex/                   # skills, hooks.json for Codex
├── CLAUDE.md                 # your content + a three-line pointer to tasks/.workflow
└── AGENTS.md                 # same pointer for Codex and Copilot
```

Claude Code and Codex only discover skills, hooks and agents in `.claude/` and `.codex/`, and read
`CLAUDE.md`/`AGENTS.md` at the root, so those few entry points stay outside. Inside the project, the
kit writes nothing else outside `tasks/` (apart from a lock directory that exists only while it writes).
Some general-purpose skills are also exported to `~/.claude/skills` and `~/.codex/skills`; set
`INSTALL_GLOBAL_SKILLS=false` to keep them project-local. Choose another directory name with
`--tasks-dir`, for example `--tasks-dir .agent`.

**Versioned or not.** Commit `tasks/` to share the workflow with your team, or keep it personal:

```bash
npx ants-kit init --local
```

`--local` adds `/tasks/` to `.git/info/exclude`, a per-clone exclusion that is never committed; the
project's `.gitignore` is not touched. Hooks stay silent in clones that do not have the directory.

## Your kit, your modules

**Use only the parts you need**, then add modules as your needs grow.

| Module | What it gives you |
|---|---|
| Tasks (`tasks`) | A clear goal and verifiable steps |
| Memory (`memory`) | Project knowledge and decisions preserved |
| Continuity (`continuity`) | Handoffs to resume work between sessions |
| Quality (`quality`) | Guidance for code, tests, and reviews |
| Bugs (`bugs`) | Records of diagnosis and fixes |
| Reporting (`reporting`) | Weekly goals and progress reports |
| Exploration (`exploration`) | Help clarifying ideas before development |
| Learning (`learning`) | Explanations and guidance to help you learn |
| Knowledge (`knowledge`) | Indexes of your app's flows and domain facts, read one section at a time |

**Knowledge** adds two indexes to `tasks/`: `APP.md` maps each code flow to its doc in `doc/app/`
with the keywords that lead to it, and `DOC.md` maps each verified domain fact to its theme in `doc/`.
Your assistant reads the matching index line, then only the matching section, instead of searching
the whole codebase. It writes a flow doc once it has investigated the same flow twice. The indexes hold
what the model cannot know about your project, never generic framework documentation.

## One writing pattern, everywhere

Whatever the module, every document your assistant writes in `tasks/` follows the same mandatory
pattern: an **ultra-short index per theme**, whose rows point to **annex files** holding the
content. A session then loads one index row, one annex and one section of it, instead of the whole
folder — your context stays small as the project grows.

```text
tasks/PROJECT_MEMORY.md     index:  | Transport | memory/transport.md | reconnect, backpressure |
tasks/memory/transport.md   annex:  the content itself, in sections a reader can load alone
```

The `doc-pattern` skill, installed with every profile, is the authority: it sets the shape, the
8 KiB index and 16 KiB annex budgets, how to split an oversized file, and the few exemptions
(code, commit messages, documents meant for people outside the repository). `npx ants-kit doctor`
warns when an index grows past its budget, points at a missing annex, or carries content in a row
instead of a link.

For a custom first installation:

```bash
# Learning only
npx ants-kit init --modules learning

# Tasks, Memory, and Continuity
npx ants-kit init --modules tasks,memory,continuity
```

These selections replace the default (Tasks + Memory). Some modules require dependencies, which the
installer displays; every selection includes a shared core. The `minimal`, `continuity`, and
`complete` profiles also provide ready-made selections.

To add a module to a project where the kit is already installed:

```bash
npx ants-kit add reporting --dry-run
npx ants-kit add reporting
npx ants-kit add knowledge
```

## Update an existing installation

```bash
npx ants-kit@latest update
```

The command shows what will change, asks for confirmation, then applies exactly that plan.
`--yes` applies without asking (for scripts); `--dry-run` prints the full diff and a plan
fingerprint that `--expect-plan` can apply later.

The update preserves your selected modules, tasks, editable notes and local project rules.
It refuses conflicting managed files and stale plans. Updates are never applied silently: they
rewrite the instructions your assistant follows, so the plan is always shown first.
See [the update contract](docs/modules.md#update-an-installed-kit) for details and recovery limits.

**Coming from 0.1?** Those installations keep the kit at the project root
(`.workflow/`, `.workflow-kit.*`, `.claude/scripts/`, `.claude/hooks/`). The same `update` command
moves them into `tasks/.workflow/` and removes the old managed files; files you added there stay.

## Make it your own

Each project can have its own modules, task directory, verification commands, and branch rules.
Copy the [example configuration](examples/project.env), adjust the values, then use your file:

```bash
npx ants-kit init --config my-project.env
```

You can also customize module sources before installation or create your own modules:
team guidelines, domain notes, document templates…
The [module guide](docs/modules.md) and [project notes example](examples/modules/project-notes/module.json)
provide a starting point.

The kit installs into your project without an additional server or online registry.
Your tasks and notes remain local files. You stay in control of commits, merges, and publishing.

### From a clone of the kit

`install.sh` and `module.sh` remain as wrappers around the same CLI, for checkouts and scripts:

```bash
git clone https://github.com/PierreDillard/agent-workflow-kit.git
bash agent-workflow-kit/install.sh --target /path/to/my-project --dry-run
bash agent-workflow-kit/module.sh update --target /path/to/my-project
```

## Project status

**Version `0.4.0`, published on npm as [`ants-kit`](https://www.npmjs.com/package/ants-kit).**

Local tests, GitHub CI and publication archive checks pass; Linux is the tested platform. Checks in
fresh Claude Code, Codex, and Copilot sessions are still to be recorded.
See the [publication checklist](PUBLISHING.md).

<details>
<summary>Installation details and verification</summary>

- Existing `CLAUDE.md` and `AGENTS.md` files are preserved and receive a link to the kit's rules. File conflicts are rejected.
- Some skills are also exported to your user directories by default. Set `INSTALL_GLOBAL_SKILLS=false` in your configuration to keep them local to the project.
- A skill available at user level does not activate a project module on its own.
- Managed files and Codex mirrors are checked by the kit. Customize sources before installation; tasks, notes, and configurations marked as editable can change afterward.
- Explicit kit updates are available; module removal and automatic migrations are not supported.
- Quality requires an independent review before an authorized merge into the default branch. Reporting never publishes reports automatically.

To check an installation's files and modules without modifying them:

```bash
npx ants-kit doctor
# or, without the package: bash tasks/.workflow/scripts/workflow-doctor.sh
```

To check the kit and the package staged in Git:

```bash
bash tests/run.sh
bash tests/publication-candidate.sh
```

These checks verify the installation; they do not guarantee that the assistant follows every
instruction.

</details>

## License

[MIT](LICENSE) · [Third-party attributions and licenses](THIRD_PARTY_NOTICES.md)
