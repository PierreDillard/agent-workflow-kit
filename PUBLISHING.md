# Publication checklist

This file defines the first public GitHub candidate. It is intentionally separate from the local
planning backlog, which is not part of the package.

## Included package

- `bin/ants.mjs` (the CLI behind `npx`), `install.sh`/`module.sh` wrappers, `core/`,
  `modules/` and the runtime/templates consumed by the installer.
- `package.json`, whose `files` list is the npm package: tests, CI and local material stay out of it.
- `examples/`, `tests/`, `docs/`, README, version, MIT license, third-party notices and GitHub CI.
- Executable bits for shell entry points, preserved by Git.

## Excluded local material

- `tasks/`: personal planning, historical evidence and project references.
- Legacy template scripts/agents, `components.tsv` and the legacy reporting configurator: retained
  locally as historical snapshots only; the current installer does not read them. Skills have a
  single editable source in `core/skills/` and `modules/*/skills/`.

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

The package is published as `ants-kit` and installs an `ants` command. The names
`agent-workflow-kit`, `agent-workflow` and `ants` are already taken on npm, and npm rejects names that
differ from an existing package only by punctuation (`agentkit` blocks `agent-kit`, for example).
Change `name` in `package.json` and the commands in README/docs together if the name changes.

1. Keep `VERSION` and `package.json` `version` identical (a test enforces it); bump both for a release.
2. Run `bash tests/run.sh` and inspect `npm pack --dry-run`.
3. With explicit authorization only, publish through one of:
   - **CI (recommended)**: push a tag `v<version>` (for example `git tag v0.2.0 && git push origin
     v0.2.0`). `.github/workflows/publish.yml` checks that the tag, `VERSION` and `package.json`
     agree, reruns the tests and the archive check, and publishes with provenance. It authenticates
     through npm trusted publishing (OIDC): the `ants-kit` package settings on npmjs.com trust
     `PierreDillard/agent-workflow-kit` with workflow `publish.yml` and allow `npm publish`, so no
     npm token or `NPM_TOKEN` secret is needed. Renaming the repository or the workflow file requires
     recreating that trusted publisher.
   - **Locally**: `npm login`, then `npm publish` (public access is preset in `publishConfig`).

   Prereleases such as `0.2.0-dev` are published with `--tag next` (the CI workflow does this
   automatically) so that `npx ants-kit@latest` keeps resolving to the last
   stable release; `npx ants-kit@next` resolves to the latest prerelease.

`npx github:PierreDillard/agent-workflow-kit` installs from the default branch with the same CLI.

## Current release posture

`VERSION` is `0.2.0`, the first stable release on npm (`0.2.0-dev` was the initial prerelease).
Fresh Claude/Codex/Copilot discovery checks are still to be recorded. Linux is the tested platform. The project is MIT;
`THIRD_PARTY_NOTICES.md` retains the notices for the skills attributed to Matt Pocock.
