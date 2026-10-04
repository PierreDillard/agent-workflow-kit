---
name: grill-me
description: Interview the user relentlessly about a plan, design, process, or skill until all gaps are resolved, checkpointing every answer to a brainstorm doc. Use when user says "grill me", wants to stress-test a plan, extract tacit knowledge, or build reusable context for a skill/process.
---

# Grill Me

## Goal

Extract everything in the user's head about a topic and turn it into a reusable, structured knowledge doc. The result should let future AI sessions work at 90%+ accuracy without re-asking the same questions.

## Setup

Before asking the first question:
1. Create `${TASKS_DIR}/brainstorms/` if it does not exist (never use the project root)
2. Create `${TASKS_DIR}/brainstorms/<topic>-<YYYY-MM-DD>.md` with this structure:

```md
# Grill session: <topic>
Date: <date>

## Key decisions
<!-- filled as session progresses -->

## Q&A log
<!-- one entry per question -->

## Gaps to resolve
<!-- flagged unknowns -->

## Highlights
<!-- written at session end -->
```

## Loop (repeat for every question)

1. **Ask one question** — walk each branch of the design tree, resolving dependencies in order. Provide your recommended answer before the user replies.
2. **If the question can be answered by exploring the codebase**, do that instead of asking.
3. **After the user answers**, immediately update the brainstorm doc:
   - Append `Q: ... / A: ...` to the Q&A log
   - Extract any decision into Key decisions
   - If the answer is vague, incomplete, or "I don't know" → add to **Gaps to resolve** with a note on who to ask or what to look up
4. **Continue** until no branches remain and no gaps are unresolved.

## Flags

When the user can't answer confidently:
- Mark the gap explicitly in the doc
- Suggest a concrete next step: "Reach out to X", "Check Y config", "Run Z command"
- Continue the session — don't block on unknowns

## End of session

When all questions are exhausted:
1. Write the **Highlights** section (3-5 bullet decisions that will most impact the outcome)
2. Scan installed skills and only the project documents relevant to the topic for overlap
3. Report: "This session surfaced nuance not captured in [file X] and [skill Y]. Update them?"
4. Wait for user confirmation before modifying anything.
