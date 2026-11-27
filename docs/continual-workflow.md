# Improve a workflow with evidence

Use a read-only retrospective to identify a rule gap, compare the existing rule and a candidate,
then promote the tested version with human approval. Project teams perform the comparisons in
their existing agent. ANTS checks the evidence record and Git history before promotion.

## Run project checks

Set any of the following in the configuration passed to `ants init --config FILE` or in a
trusted configuration file passed directly to `verify`. Values use the same literal
`KEY=command` format as [project.env](../examples/project.env). `--config` supplies the whole
command set for that invocation. It also works in a Git project without ANTS installed.

| Key | Check |
| --- | --- |
| `TYPECHECK_COMMAND` | Type checks |
| `LINT_COMMAND` | Lint |
| `TEST_COMMAND` | Tests |
| `BUILD_COMMAND` | Build |
| `ACCEPTANCE_COMMAND` | A task-specific acceptance script |

~~~sh
npx ants-kit verify
npx ants-kit verify --config ./project.env --json --timeout 120
npx ants-kit verify --integrity
~~~

Commands run once in the table order from the project Git root. They run through Bash with
the invoking user's permissions. Blank entries are omitted. `--integrity` adds the checks
shared with `doctor`, including module-defined document links and indexes when installed.
Those checks retain their declared warning or failure level. An integrity failure stops
verification before executable checks run.

`--timeout` sets the overall command budget in seconds (default 300). A timed-out command
fails verification and later commands are skipped once the budget is spent. A failed command
doesn't trigger an automatic retry. Rerun after a change when trying to fix a failure. On
Linux and macOS, keep verification commands in their original process group so the runner
can stop them on timeout or interruption.

Exit status 0 means at least one check ran and every selected check passed. With `--json`,
stdout contains the report and command logs go to stderr. The report records outcomes and
durations. Redirect stdout to a file if you want to link it as evidence.

## Compare a rule change

Use a Git-tracked record for the protocol, comparison results and evidence references.
With `--local`, Git ignores the tasks directory. To start tracking the record in that installation,
add only the chosen file before the baseline commit, substituting your tasks directory and record name:

```sh
git add -f -- "<TASKS_DIR>/refinements/<name>.json"
```

Git tracks subsequent edits to that file normally. The rest of the tasks directory stays local.

1. Install `quality` in the project. Request `workflow-retro` for a named task or incident.
   Proceed to a comparison when its verdict is `CANDIDATE`.
2. On a named integration branch, copy the [record template](../examples/refinement.json)
   to `<TASKS_DIR>/refinements/<name>.json`. Fill it in and commit it before drafting the
   candidate. That commit is the baseline. Pick a distinct validation case withheld from
   drafting and an unrelated negative control. Define the outcome for each case before the
   tests. The budget is per variant and case. Add `maxTokens` when token evidence is available.
3. From the baseline, prepare a separate candidate branch or worktree. In one commit, edit an
   existing project instruction in `AGENTS.md` or `CLAUDE.md`, or an existing project-owned
   `SKILL.md` in a client skills directory. The same instruction or skill can be changed for
   both clients in that commit. Keep the installation pointer intact. Changes to distributed
   skills belong in the kit or owning module's source repository and follow its review process.
4. Run each case on both revisions in fresh, isolated sessions. Match the model, tools, settings
   and task inputs. Keep earlier attempts in the linked evidence. Use `verify --json` wherever
   a command can measure the outcome. Record incomplete, inconclusive or over-budget trials.
   The promotion command requires a completed comparison within the registered budget.
5. On the candidate branch add the following fields to the record, preserving the original
   protocol. Then commit only the record. This new commit is the evidence tip.

| Field added | Content |
| --- | --- |
| `baseline` and `candidate` | Full commit SHAs |
| `results` | An object keyed by `reproduction`, `validation` and `negativeControl` |
| `decision` | An object with `reviewer` and `rationale`, identifying the human review |

Each result contains `baseline` and `candidate`. Each variant records `verdict` (`pass` or
`fail`), an `evidence` reference, `attempts`, and `seconds` rounded up to a whole second.
With `maxTokens` set, each variant also records `tokens`. Promotion requires the baseline
to fail the two target cases and the candidate to pass them. The negative control must pass
under both rules. The reviewer checks that the evidence supports the recorded outcomes and
that the candidate adds no blocking regression or unacceptable cost.

## Approve, promote and reevaluate

On the clean integration branch at the baseline commit, review the patch and the evidence.
Run the preview as shown below, substituting the record path and the full evidence tip SHA.
The reviewer runs `promote` with the printed plan fingerprint after approving that exact
comparison. The branch fast-forwards to the evidence commit. A moved baseline requires
a new comparison. Promotion targets a feature branch so the normal review process still
applies before merging it into the default branch.

~~~sh
npx ants-kit refine plan --record tasks/refinements/example.json --tip "$evidence_tip"
npx ants-kit refine promote --record tasks/refinements/example.json --tip "$evidence_tip" --approve-plan "$approved_plan"
~~~

Monitor the outcome named in `reopenWhen` on subsequent tasks. If new evidence warrants
rollback, use the normal review process to run `git revert` on the candidate commit. The
evidence commit remains in history. Preserve counter-evidence when opening a new comparison.

The CLI checks the structure and provenance of the record. The comparative observations
come from the host agent sessions and the judgment comes from the human reviewer.
