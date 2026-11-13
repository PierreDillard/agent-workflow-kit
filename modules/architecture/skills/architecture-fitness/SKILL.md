---
name: architecture-fitness
description: Assess or maintain architecture fitness checks. Use when architecture boundaries, dependencies, ownership, or structural drift are in scope.
---

# Architecture fitness

Start with the project's existing architecture documentation and instructions. Inspect the relevant implementation before treating a documented boundary as current. Distinguish observed behavior, intended rules, discrepancies, and unverified assumptions. Reuse the project's existing map and checks instead of creating competing sources of truth.

For the requested scope, identify the responsibilities, owners, dependencies and flows that matter. Choose a small number of consequential invariants and determine how each can be checked: existing automated checks, a focused test or static check, or an explicit manual review when automation would be brittle or disproportionate. Do not invent universal thresholds or enforce a proposed boundary as an established rule without evidence and agreement.

When implementing an agreed check, make it exercise the actual boundary and report actionable failures. Verify that it detects a representative violation as well as passing on valid code. Avoid broad refactoring or changing unrelated behavior. Record the check and any limitations in the project's existing documentation or task when useful.

When a change adds, moves or removes a module, entry point, storage, integration or flow, update the owning architecture map and links as part of that change. Keep one authoritative map, distinguish current and planned behavior, and verify changed links and claims against the code. Report findings with evidence, checks performed, and remaining uncertainty.
