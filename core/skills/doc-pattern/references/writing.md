# Writing under the pattern

## Before writing anything

1. Identify the family: tasks, bugs, memory, decisions, domain docs, app flows, handoffs,
   learning records, reports kept in the repository.
2. Open that family's index and find the row whose theme owns the content.
3. No row fits → the content is a new theme and needs a new annex plus one new row.
4. No index exists for the family → create it with the header and columns from `structure.md`,
   in the same action as the first annex.

## Adding content

- Write the content in the annex, under an existing `## ` section when one covers it.
- Add or update exactly one index row. Never copy annex text into the index.
- Keep evidence where it is: link to the task, bug or commit instead of pasting it into a theme.
- Touch only the annex and its row. Rewriting a whole index because one theme changed is a
  violation of the pattern, not a cleanup.

## Splitting an oversized file

An annex over 16 KiB:

1. Group its `## ` sections into sub-themes by responsibility, never by date or by branch.
2. Create one annex per sub-theme, moving the sections verbatim.
3. Replace the original row with one row per new annex, then delete the original file.

An index over 8 KiB:

1. Group rows into sub-families.
2. Move each group into a sub-index (`<sub-family>/README.md`) that follows the same shape.
3. Replace the moved rows with one row per sub-index. Depth is allowed; prose in an index is not.

## Retiring a theme

Mark the row as retired with its reason and keep the annex, or delete both in the same action.
Never leave a row pointing at a deleted file, and never delete an annex another annex links to
without updating that link.

## Reading, for symmetry

Index row → one annex → one `## ` section. Symbol not listed in any row →
`grep -ril '<symbol>'` over the family directory; annex bodies are the only source of symbols.
Loading an index plus every annex it routes to defeats the pattern and is never the cheap option.
