## Task contract

File name: `{NN}-{kebab-slug}.md`.

```md
---
objective: One verifiable outcome
status: pending | in-progress | implemented | reviewed | blocked
risk: low | medium | high
branch: target implementation branch when known, otherwise —
validator: Observable completion proof
---

# NN — Title

**Depends on**: NN | —
**Blocks**: NN | —

## Why
{For a feature, state the independently verifiable behavior that becomes usable.}
## Non-goals
{Only when Quality is installed and `soak-readiness` applies, insert its `## Soak contract` block here.}
## ANTS steps
### E1 — One atomic action
**Signal**: one observable proof
{Repeat this step shape, including Signal, for every remaining step.}
## Acceptance criteria
## Validation
{Checks actually run and results; independent review verdict + exact SHA if present, otherwise
not reviewed; commit evidence separately when known, otherwise uncommitted or unknown.}
## Files
## Constraints
**Trace**: `type(scope): imperative sentence`
```
