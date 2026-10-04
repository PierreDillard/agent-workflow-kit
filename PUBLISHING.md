# Publication checklist

This file defines the first public GitHub candidate. It is intentionally separate from the local
planning backlog, which is not part of the package.

## Included package

- `install.sh`, `module.sh`, `scripts/modules.mjs`, `core/`, `modules/` and the runtime/templates
  consumed by the installer.
- `examples/`, `tests/`, `docs/`, README, version, MIT license, third-party notices and GitHub CI.
- Executable bits for shell entry points, preserved by Git.

## Excluded local material

- `tasks/`: personal planning, historical evidence and project references.
- `global-skills/`, legacy template skills/scripts/agents, `components.tsv` and the legacy reporting
  configurator: retained locally as historical snapshots only; the current installer does not read them.

The exclusions are declared in `.gitignore`, so `git add .` stages the intended source package
without deleting the local snapshots.

## Before the first push

1. Review `git diff --cached --check` and `git diff --cached --stat`.
2. Run `bash tests/publication-candidate.sh`; it builds an archive from the staged tree, rejects
   excluded historical paths, extracts it to a temporary directory, and runs `bash tests/run.sh`
   from that extracted copy. GitHub CI runs the same check.
3. Review tracked paths for credentials and machine-specific paths.
4. Create the initial commit only after explicit authorization. Create the GitHub repository, push,
   tag and release only after separate explicit authorization.

## Current release posture

`VERSION` is `0.1.0-dev`. Treat the first public commit as experimental until the GitHub CI run and
fresh Claude/Codex discovery checks are recorded. Linux is the tested platform. The project is MIT;
`THIRD_PARTY_NOTICES.md` retains the notices for the skills attributed to Matt Pocock.
