# Agent Workflow Kit

[![CI](https://github.com/PierreDillard/agent-workflow-kit/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/PierreDillard/agent-workflow-kit/actions/workflows/ci.yml)

**Organize work with your AI, your way.**

Less context to repeat, clear task tracking, and decisions preserved between sessions.
Choose only the modules you need and adapt them to your project.

**Claude Code · Codex · Copilot · 8 optional modules · Customizable**

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
or Learning to help you understand the project.

## Quick start

**Prerequisites**: a Git project, one of the agents above, Linux, Bash, Node.js 18+, `rsync`,
and standard GNU utilities. macOS and Windows have not been validated yet.

Clone the kit and open its directory:

```bash
git clone https://github.com/PierreDillard/agent-workflow-kit.git
cd agent-workflow-kit
```

Then replace `/path/to/my-project` with your project's root directory:

```bash
# Preview the installation without changing the project
bash install.sh --target /path/to/my-project --dry-run

# Install Tasks + Memory, the default selection
bash install.sh --target /path/to/my-project
```

Answer the questions about your project, then open your assistant in that project.
Instructions and skills — specialized guides for the assistant — are prepared for all three
agents. Hooks are configured for Claude Code and Codex; approve them if your assistant asks.

## Start as a coding agent

If your agent is retrieving the kit from a project, use the [agent entry](docs/agent-start.md)
for a revision-pinned checkout and a non-interactive dry-run with global exports disabled.
Automatic selection and approval enforcement remain work in progress.

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

For a custom first installation:

```bash
# Learning only
bash install.sh --target /path/to/my-project --modules learning

# Tasks, Memory, and Continuity
bash install.sh --target /path/to/my-project --modules tasks,memory,continuity
```

These selections replace the default. Some modules require dependencies, which the installer
displays; every selection includes a shared core. The `minimal`, `continuity`, and `complete`
profiles also provide ready-made selections.

To add a module to a project where the kit is already installed:

```bash
bash module.sh add --target /path/to/my-project --modules reporting --dry-run
bash module.sh add --target /path/to/my-project --modules reporting
```

## Make it your own

Each project can have its own modules, task directory, verification commands, and branch rules.
Copy the [example configuration](examples/project.env), adjust the values, then use your file:

```bash
bash install.sh --target /path/to/my-project --config my-project.env
```

You can also customize module sources before installation or create your own modules:
team guidelines, domain notes, document templates…
The [module guide](docs/modules.md) and [project notes example](examples/modules/project-notes/module.json)
provide a starting point.

The kit installs into your project without an additional server or online registry.
Your tasks and notes remain local files. You stay in control of commits, merges, and publishing.

## Project status

**Available to install and distribute as an experimental version: `0.1.0-dev`.**

Local tests and publication archive checks pass. GitHub CI and checks in fresh Claude Code,
Codex, and Copilot sessions still need to be validated before declaring the first release ready.
See the [publication checklist](PUBLISHING.md).

<details>
<summary>Installation details and verification</summary>

- Existing `CLAUDE.md` and `AGENTS.md` files are preserved and receive a link to the kit's rules. File conflicts are rejected.
- Some skills are also exported to your user directories by default. Set `INSTALL_GLOBAL_SKILLS=false` in your configuration to keep them local to the project.
- A skill available at user level does not activate a project module on its own.
- Managed files and Codex mirrors are checked by the kit. Customize sources before installation; tasks, notes, and configurations marked as editable can change afterward.
- Automatic module upgrades and removal are not supported yet.
- Quality requires an independent review before an authorized merge into the default branch. Reporting never publishes reports automatically.

To check an installation's files and modules without modifying them:

```bash
bash /path/to/my-project/.claude/scripts/workflow-doctor.sh
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
