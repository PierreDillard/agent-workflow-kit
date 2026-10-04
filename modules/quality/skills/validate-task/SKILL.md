---
name: validate-task
description: Confirm objective, invariants, ownership boundaries, scope and acceptance checks before ambiguous, contractual or multi-layer implementation, and after corrections that change them.
---

# Validate Task

## When to use

- Before a change that affects behavior, an external contract or more than one owning layer.
- When an implementation request leaves a product or architecture decision ambiguous.
- After a user correction changes an invariant, boundary or expected behavior.

Skip questions, read-only audits and isolated fast changes whose contract is already explicit.

## Process

1. Resolve facts available from the selected task and code before asking the user.
2. Present one compact checkpoint covering:
   - **Objective** and concrete expected behavior;
   - **Invariants** that must remain true;
   - owning layers and source of truth;
   - in-scope and out-of-scope work;
   - acceptance checks;
   - only decisions that still require the user.
3. Wait for explicit confirmation before the first edit.
4. If a later correction changes the contract, revalidate only that delta before continuing.

## Template

```
Objective: ...
Invariants: ...
Owner / source of truth: ...
In scope: ...
Out of scope: ...
Acceptance: ...
Open decision: none | ...
Confirm this contract before implementation?
```

## Rules

- Keep the checkpoint under 15 lines and perform it once per implementation ticket.
- Name forbidden layer mixing explicitly when several layers are involved.
- After confirmation, implement only the confirmed scope.
- A newly discovered architecture decision stops edits until its delta is confirmed.
- Do not turn the checkpoint into a broad codebase audit or repeat it for every atomic step.
