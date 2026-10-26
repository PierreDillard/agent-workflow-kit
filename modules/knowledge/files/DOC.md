# Domain docs — index

Verified domain facts (source code, specifications, runtime observations), one file per theme in
`doc/`. This index routes to a file; it does not describe its content. Read only the matching
theme, never this whole index plus every theme.

1. Find the row by responsibility under "When to read".
2. Exact symbol not listed → `grep -ril '<symbol>' {{TASKS_DIR}}/doc`; theme bodies are the only
   source of symbols, the index does not copy them.
3. Large theme → `grep -n '^## '` on the file, then read only the matching section's line range.

| Theme | File | When to read |
|---|---|---|

Row format: theme name, a relative link to `doc/<theme>.md`, then the questions it answers.
Shape, budgets and splitting rules come from the mandatory `doc-pattern` skill.
