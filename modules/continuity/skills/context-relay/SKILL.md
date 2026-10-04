---
name: context-relay
description: Prepare a branch-scoped handoff before context saturation while preserving the current atomic step and loading boundaries.
---

# Context Relay

## Trigger

Measured remaining context at or below 20% is authoritative: finish the current atomic step,
invoke `project-handoff`, and start no new multi-file step. Never invent a percentage.

Without a meter, use a conservative proxy only after an atomic boundary. A platform compaction,
explicit low-context warning, or visible loss of recent decisions triggers the relay. Before a new
multi-file step, two caution signals—more than 30 exchanges, more than 15 files read/edited, or a
new multi-step task—also trigger it. State that this is a proxy, not a measured threshold.

## Procedure

1. Finish the atomic step already underway; do not start another multi-file step.
2. Tell the user that context capacity has been reached and that a handoff is being prepared.
3. Invoke `project-handoff` to update the branch handoff.
4. Provide a self-contained resumption block: branch, verified work, decisions, affected files,
   checks run, risks and the next action. Link canonical tasks, bugs, decisions and memory instead
   of copying their content.
5. Ask for a fresh session in the same project with that block as its first message.

Never include secrets or a conversation dump in a handoff. The handoff is resumption state; its
evidence remains in canonical project records.
