---
name: replace-not-add
description: Before adding a new utility function, find and remove the one it replaces. Enforces replace+delete atomicity — never leave dead code behind. Use when adding/refactoring utility functions, simplifying an API, or when user says "simplifie l'api", "retire les fonctions obsolètes", "don't add without removing".
model: haiku
---

# Replace, don't add

Before writing any new utility function:

1. **Search** — grep for existing functions with the same input/output shape. Check all importers.
2. **List redundancies** — every function the new one makes obsolete.
3. **Replace atomically** — write new + delete obsolete + update all call sites in one step.
4. **Verify** — grep that deleted names no longer appear anywhere.

Never add a function that duplicates an existing one. Never leave an old function "just in case".
