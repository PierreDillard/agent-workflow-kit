# Publication checklist

This file defines the first public GitHub candidate. It is intentionally separate from the local
planning backlog, which is not part of the package.

## Included package

- `bin/agent-workflow-kit.mjs` (the CLI behind `npx`), `install.sh`/`module.sh` wrappers, `core/`,
  `modules/` and the runtime/templates consumed by the installer.
- `package.json`, whose `files` list is the npm package: tests, CI and local material stay out of it.
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

## Publish the npm package

The package is scoped (`@pierredillard/agent-workflow-kit`) because the unscoped names
`agent-workflow-kit` and `agent-workflow` are already taken on npm. Change `name` in `package.json`
and the commands in README/docs together if another scope is used.

1. Keep `VERSION` and `package.json` `version` identical (a test enforces it); bump both for a release.
2. Run `bash tests/run.sh` and inspect `npm pack --dry-run`.
3. With explicit authorization only: `npm login`, then `npm publish` (public access is preset in
   `publishConfig`). Prereleases such as `0.2.0-dev` should be published with `--tag next` so that
   `npx @pierredillard/agent-workflow-kit@latest` keeps resolving to the last stable release.

Before the first publication, `npx github:PierreDillard/agent-workflow-kit` installs from the default
branch with the same CLI.

## Current release posture

`VERSION` is `0.2.0-dev`. Treat the first public commit as experimental until the GitHub CI run and
fresh Claude/Codex discovery checks are recorded. Linux is the tested platform. The project is MIT;
`THIRD_PARTY_NOTICES.md` retains the notices for the skills attributed to Matt Pocock.
