---
name: explain-simply
description: Explain a complex technical finding in plain language before any code or source citation. Use when the user says "je comprends pas", "explique simplement", "c'est quoi le problème", "en clair", when a diagnosis has spanned several exchanges, when an explanation has quoted C source or file:line more than twice, or before proposing a fix whose reasoning the user has not yet acknowledged.
---

# explain-simply

The user is a working engineer, not a novice. Confusion here means the explanation
failed, not the reader. Rewrite it.

## Structure — exactly three blocks, in this order

**Ce qui se passe** — the symptom, in the user's own vocabulary (what they clicked,
what they saw). No mechanism yet.

**Pourquoi** — one causal chain, one analogy from ordinary life. Stop at the first
cause that explains the symptom. Deeper layers are noise until asked for.

**Le correctif** — what changes, where, and how big. One sentence plus a size
("trois lignes", "un fichier", "un flag").

## Hard rules

- **No file:line, no C function names, no struct fields** in the three blocks. If a
  citation is essential, put it after, under `Si tu veux le détail :`.
- **One analogy maximum.** Two analogies compete and cancel each other.
- **Under 150 words** for the three blocks combined. Length is the main failure mode.
- **No tables, no diff, no code** unless the user asked for the fix specifically.
- **Never re-explain by adding more detail.** If the first attempt failed, cut, don't
  extend. The second attempt must be shorter than the first.
- Name what is *certain* vs what is *supposed*, in plain words: "c'est vérifié" /
  "c'est une hypothèse, à confirmer en lançant".

## Ending

Close with a single concrete question the user can answer yes/no, or a single next
action. Never a menu of options — a menu means the explanation did not land.

## Anti-patterns

- Restating the technical version with softer words → still technical, still opaque.
- Explaining the *investigation* (what was grepped, what was read) instead of the
  *finding*. The user does not care how it was found.
- Leading with the fix. Symptom first, always — that is what they recognise.
- Apologising or narrating the failure to explain. Just explain.
