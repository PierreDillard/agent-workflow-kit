# Draft and approve a created skill

Implementation status: task 05 E1/E2/E3, 2026-10-05. The file-level approval mechanism,
refusal, stale-state handling and process-resume/repeat behavior are tested in fixtures.
A real user approval exchange followed by local fixture activation is verified for review-local-skill;
native agent discovery and usage remain unproven.

`write-a-skill` ships in the shared core, including its attribution/license and kit procedure.
It is copied into project Claude/Codex skills; it is not globally exported. Minimal still selects
Tasks + Memory. This addition does not upgrade existing installations automatically.

Source choice: reuse available capabilities first. For an unmet need, prefer a minimal locally
authored skill with write-a-skill over an imported package, using the kit's native tools when
needed. An external source requires a concrete justification of why local authoring is insufficient.
Local authorship does not prove correctness or prevent later file alteration; review and agreement
still bind the exact package and target.

Run from the kit checkout against a Git project with the kit already installed and global
exports disabled. Draft outside every discovery path applicable to the chosen agent.
The current input is a module.json with one skill contribution and its complete skill directory;
no additional dependencies, rules, hooks, files, config or template substitutions are accepted.

```bash
node scripts/skill-proposals.mjs propose \
  --target /path/to/project --id project-guide --source /path/to/draft-module \
  --need "Need not covered by the catalog" \
  --actions "Read project inputs and draft a guide" --prerequisites "None"
node scripts/skill-proposals.mjs present --target /path/to/project --id project-guide
```

The proposal first runs the existing installer dry-run, then retains all package files under
`.workflow/skill-proposals/project-guide/package/` and proposal.json alongside them. Present the
complete output: unmet need, possible actions, prerequisites, module, every file, fingerprint
and destinations. Supporting files are data for review; none are executed or used as a skill.
Active skill trees, inventory and rules remain unchanged by proposing or presenting.

Silence leaves the proposal in `proposed` state with no decision and no activation. An explicit
refusal can be recorded without removing the retained package or changing the active workflow:

```bash
node scripts/skill-proposals.mjs refuse \
  --target /path/to/project --id project-guide \
  --fingerprint SHA256_FROM_PRESENTATION --statement "Exact explicit refusal"
```

A refused proposal cannot be activated or converted directly to an approval.
After the user explicitly approves that exact package and project target:

```bash
node scripts/skill-proposals.mjs approve \
  --target /path/to/project --id project-guide \
  --fingerprint SHA256_FROM_PRESENTATION --statement "Exact explicit user response"
node scripts/skill-proposals.mjs activate \
  --target /path/to/project --id project-guide --dry-run
node scripts/skill-proposals.mjs activate \
  --target /path/to/project --id project-guide
```

Approval binds the proposal ID, retained package fingerprint and absolute project root. The
proposal also retains the presentation inventory and the planned module ID, version and
fingerprint. An inventory change before initial activation requires a new proposal. The engine installs the approved package using its existing lock, collision
checks, transaction and mirrors. `.workflow-kit.json` remains the installation source of truth;
proposal.json owns only the proposal, recorded decision and planned module identity.

A fresh process reopens the same proposal and retained package. Neither restarting nor finding
an installed skill implies user approval. After approved activation, presentation derives an
`installation` object from the current inventory and checks all managed files. Repeating the
same approved activation is a no-op, even after another module was added, provided the package,
approval target and exact installed module still match and managed files remain valid.
The decision record is unchanged by installation and repetition. No parallel installed-state
registry is introduced. Conflicts, managed-file changes and existing installer locks refuse
activation; intercepted write failures roll back through the existing transaction.

Presenting a changed package reports `obsolete` without writing files. Approval/activation
attempts persist that state, preserve the earlier decision as evidence, and refuse activation.
Changes include content, references, file modes, added/removed files, an unreadable manifest,
project target or pre-activation inventory. Restoring the old bytes after detected invalidation does not restore
approval. Prepare a revised draft outside discovery and create a new proposal ID; present all
files again and obtain a new explicit agreement. No old decision is inherited by the new proposal.

Direct `module.sh add` of a retained draft also checks its approval. Dry-run remains possible
before agreement. The caller must truthfully record an explicit user response: local records
do not authenticate a human or prevent a caller with write access from falsifying a decision.
Raw sources containing provenance.json must use a retained approved proposal for activation.
Unmarked custom module sources retain existing add behavior and source-classification responsibilities.
See the [external flow](external-skill-intake.md).

Validation: `bash tests/run.sh` passes, including an isolated E1 fixture that checks portable
creator files, complete presentation, unchanged discovery trees before agreement, a blocked
unapproved direct add, an approved dry-run, real installation, owned inventory and doctor.
E2 adds isolated tests for silence, refusal, changed files/modes, invalid manifest, changed target
and inventory, no inherited agreement, no restoration of invalidated approval, and successful
activation of a newly presented revision only after renewed agreement. E3 adds fresh Node
processes importing the installed runtime: waiting/refused/approved decisions survive, retained
packages activate without the original draft, identical repetition preserves bytes/modes,
conflicts preserve user content, rollback permits safe retry, locks block activation and copying
a proposal does not transfer approval to another project. All 46 module/proposal and 10 reporting
tests pass, with doctor and portability checks. These Node processes are not native coding-agent
sessions; agent discovery, usage and approval behavior remain task 06 observations.
The automated tests use simulated decisions. Separately, a real locally authored review-local-skill
package was fully presented in chat and approved with the user's response "oui" on its exact fingerprint
and fixture target. Actual activation, exact mirrors, preserved notes/user-root, doctor and byte/mode
identical repetition passed. The skill was not used or tested in a native agent session. The evidence
is retained in the local task records; these records are not included in the publication package.
