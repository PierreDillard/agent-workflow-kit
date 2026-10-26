---
name: doc-pattern
description: Mandatory index/annex pattern for every document an agent writes in the project workflow directory - an ultra-short index per theme whose rows route to annex files, so context loads on demand. Use before creating, growing or splitting any such file.
---

# Doc Pattern

Mandatory, not a style preference: every document an agent writes under `{{TASKS_DIR}}` is either
an **index** (ultra-short, routes by theme, holds no content) or an **annex** (one theme, sectioned).
A reader loads one index row, then one annex, then one `## ` section - never a whole family.

Three rules decide every write:

1. Content goes in an annex, never in an index.
2. An annex gets exactly one index row: theme, relative link, read-when keywords.
3. An index over 8 KiB or an annex over 16 KiB is split, never trimmed of its routing value.

## Read only the annex you need

| Annex | Read when |
|---|---|
| [structure.md](references/structure.md) | Writing or checking the exact shape: index header, row columns, annex sections, size budgets, file naming. |
| [writing.md](references/writing.md) | Creating a document, adding to an existing theme, splitting an oversized file, retiring a theme. |
| [compliance.md](references/compliance.md) | Deciding whether a file is in scope, what is exempt, what the doctor verifies, how to repair a violation. |

Scope in one line: in scope are workflow documents under `{{TASKS_DIR}}` (tasks, bugs, memory,
decisions, knowledge docs, handoffs, learning records, skills an agent authors); exempt are code,
commit and review text, and documents produced for people outside the repository. Doubt is resolved
by [compliance.md](references/compliance.md), never by skipping the pattern.
