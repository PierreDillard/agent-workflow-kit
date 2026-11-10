---
name: validate-task
description: Confirm the user-visible outcome, audience, quality reference, invariants, scope and acceptance checks before ambiguous, contractual or multi-layer implementation, and after corrections that change them. Use when a request is ambiguous, contractual or spans several layers, before implementing it, and again after a correction changes its scope.
---

# Validate Task

## When to use

- Before a change that affects behavior, an external contract or more than one owning layer.
- When an implementation request leaves a product or architecture decision ambiguous.
- After a user correction changes an invariant, boundary or expected behavior.

Skip questions, read-only audits and isolated fast changes whose contract is already explicit.

## Process

1. Resolve facts available from the selected task and code before asking the user.
2. Identify missing decisions that could materially change the outcome. Ask the smallest set of concrete questions first; offer a recommendation when useful. Do not invent a user preference or reference. If an assumption cannot materially change the outcome, state it in the checkpoint instead.
3. Present one compact checkpoint covering:
   - **Outcome**: what the user will be able to see or do when the work is complete;
   - **Audience / context** and **User action / value**, when relevant;
   - **Reference / quality bar**: a concrete example, link, screenshot or existing behavior when available; write `none supplied` when there is no reference;
   - **Invariants** that must remain true;
   - owning layers and source of truth;
   - in-scope and out-of-scope work;
   - acceptance checks;
   - only decisions that still require the user.
4. Wait for explicit confirmation before the first edit. For user-facing or visual work, confirm a concrete quality bar if no reference was supplied; do not treat a generic goal such as "polished" or "converts" as an acceptance criterion.
5. If a later correction changes the contract, revalidate only that delta before continuing.

## Template

```
Outcome: ...
Audience / context: ... | not applicable
User action / value: ... | not applicable
Reference / quality bar: ... | none supplied
Invariants: ...
Owner / source of truth: ...
In scope / out of scope: ...
Acceptance: ...
Open decision: none | ...
Confirm this contract before implementation?
```

## Rules

- Keep the checkpoint under 15 lines and perform it once per implementation ticket.
- Ask only about missing information that could change the outcome; distinguish a supplied reference from a proposed quality bar.
- Name forbidden layer mixing explicitly when several layers are involved.
- After confirmation, implement only the confirmed scope.
- A newly discovered architecture decision stops edits until its delta is confirmed.
- Do not turn the checkpoint into a broad codebase audit or repeat it for every atomic step.
