# Structure of an index and of an annex

## Index file

An index is a routing table with a short preamble. Nothing else belongs in it.

```markdown
# <Family> — index

<One or two lines: what this family holds, where its annexes live, how to read it.>

| Theme | File | Read when |
|---|---|---|
| Transport | [transport.md](doc/transport.md) | WebSocket framing, reconnect, backpressure |
```

- Title ends with `— index` (or `— thematic index`, `— lazy index` where already installed).
- Preamble: at most three lines. It states the family and the read path, never the content.
- One row per annex, never per section of an annex. Rows stay sorted by theme name.
- Column 1 theme name, column 2 a relative markdown link to the annex, column 3 the keywords,
  symbols or symptoms that make a reader pick that row. Extra columns are allowed, the first
  three are not negotiable.
- Hard budget 8 KiB. A row is one line; a row never summarizes its annex.

## Annex file

```markdown
# <Theme>

<One line: the question this theme answers.>

## <Section a reader can load alone>
...
```

- One theme per file, named `<theme>.md` in lower kebab-case, in the family directory.
- `## ` sections are the loading unit: a reader greps `^## ` and reads one line range.
- Hard budget 16 KiB. Over it, the theme is two themes (see `writing.md`).
- An annex never repeats its index row, never routes to sibling annexes except where a
  dependency genuinely requires it, and never becomes a second index.

## Size budgets

| File | Budget | Checked by |
|---|---|---|
| Index | 8 KiB | `workflow-doctor` (`type: index` / `type: file` checks) |
| Annex | 16 KiB | `workflow-doctor` (`type: file` checks on the family pattern) |
| Skill an agent authors | ~100 lines of `SKILL.md` + annexes under `references/` | review, not automated |

## Naming

- Family index: the installed path when the module ships one (`PROJECT_MEMORY.md`, `DECISIONS.md`,
  `APP.md`, `DOC.md`, `bugs/README.md`, `todo/<effort>/README.md`), otherwise `README.md` in the
  family directory.
- Annex: `<theme>.md`, stable once published. Renaming an annex means updating its index row in
  the same action.
