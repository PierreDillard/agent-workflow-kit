For code paths start at `${TASKS_DIR}/APP.md`, for domain facts at `${TASKS_DIR}/DOC.md`: read the
matching index row, then only the matching `## ` section of that file, never every theme.
Write a flow doc in `doc/app/` and its index row when the same flow is investigated a second
time, or during an explicitly requested initialisation of an existing project. Never copy index or theme content into CLAUDE.md or AGENTS.md.
Both indexes and every theme follow `doc-pattern`; a row routes, it never summarizes.

For explicit initialisation, inspect the existing README, agent instructions and relevant indexes first.
Treat existing CLAUDE.md project content as the starting point (respect the actual filename/case).
Also reuse relevant AGENTS.md guidance and linked documentation. ANTS must complement these sources:
link to the existing section for facts already covered; write only missing navigation, source-backed
observations, uncertainties or discrepancies discovered in the repository. Do not copy or paraphrase
existing sections into an ANTS annex, rewrite the guidance, or create an annex just to repeat it.
A link is not permission to repeat the linked explanation. If CLAUDE.md already gives a flow's
entry point and behavior, an annex must refer to that section instead of retelling the function's
inputs, outputs or invariant, even under a "navigation" heading. Keep new evidence separate: for
example a missing assertion, an unverified README claim, or a source/guidance discrepancy. Before
writing, compare each proposed paragraph against the existing guidance and omit every covered fact.
If everything in the requested scope is already covered, report that no addition is needed.
If CLAUDE.md is absent or contains only the installer's unfilled scaffold, build the initial project
documentation from repository evidence for the requested scope, in bounded passes. An empty scaffold
is not project knowledge. Preserve other existing documentation and keep guidance files unchanged.
A disagreement between guidance and code is a sourced observation to flag, not permission to replace
human decisions or silently correct their text.
Bound the files and bytes read; skip secrets, dependencies, generated files and external paths. Follow
one user-relevant flow from its entry point to implementation and related tests; cite the source paths.
Distinguish observations from assumptions, missing evidence, and commands found from tests actually run.
Reuse an existing matching theme and index row; create at most one flow document and its row initially.
Preserve existing documentation and human edits: propose additions or updates without overwriting them;
if the relationship is unclear, report it instead of creating a duplicate. Repeated initialisation must
not duplicate rows or replace corrections. Do not execute project scripts or install missing modules as
part of discovery. Report unavailable capabilities and questions; extend documentation only within the
user's authorised scope. Promote reusable facts to Memory only through its existing evidence rules.
