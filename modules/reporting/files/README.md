# Weekly reporting

Use `weekly-report` in Claude Code or Codex: prepare objectives, note work, prepare the weekly
report, then finalize it after review. Nothing is sent automatically.

`YYYY-WNN.carnet.md` is the internal notebook; `YYYY-WNN.md` is the shareable report.
Both are created on demand. Pending or internal notes are excluded from the report.

`config.json` owns the timezone, sources, author identities and objectives document.
Source paths are relative to the project root. A source's `path_env` names an optional local
environment variable for another checkout location; do not share machine-specific paths.
Confirm author identities at first use. Missing sources are reported, never treated as no work.

The startup reminder is read-only; the handoff proposes notes for approval. To postpone the
reminder until tomorrow, say “plus tard”. Declare whole-week absences explicitly.

On another workstation, install the same kit version first, then transfer the latest task data.
Transferring this folder alone does not install skills or hooks. Git trust and hook approval are
local to each workstation and must not be copied. See the kit README for collision handling.
