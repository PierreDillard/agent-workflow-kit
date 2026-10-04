---
name: architect
description: Validate file and folder placement against the current project's documented architecture before creating, moving or refactoring code.
---

# Architect

Before writing a new file or moving code:

1. Read the nearest project guidance and architecture decision relevant to the candidate location.
2. Search for two or three similar constructs and extract the dominant placement pattern.
3. Identify the behavior's owner and source of truth.
4. Verify import direction and runtime boundaries.
5. Choose the narrowest existing layer that owns the responsibility.

Do not import an architecture from another project. If no documented or dominant pattern exists,
state the proposed placement and why before creating it. Avoid new top-level directories unless the
task explicitly establishes a new architectural boundary.
