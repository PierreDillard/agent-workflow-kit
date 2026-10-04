---
name: resource-ownership
description: Identify the owner of shared sockets, workers, subscriptions and timers before writing connect, disconnect or cleanup behavior.
---

# Resource Ownership

Before changing lifecycle code, name the resource, creator, long-lived owner, borrowers and final
destroyer. A borrower releases only its own handle or subscription; it never destroys a shared
singleton.

For every cleanup, answer: what resource does it touch, who created it, and who else might consume
it? If the cleanup's owner did not create the resource, it may unregister its own callback but must
not close a socket, terminate a worker or disconnect a shared service.

Verify setup/cleanup symmetry, repeated mount/start behavior, target switches and error paths. A
cleanup driven by identity-unstable dependencies can run mid-life and needs the same ownership
review. Timers must have one owner, be invalidated before a callback can reschedule them, and end
with that owner. Prefer the existing service or infrastructure owner over local UI ownership. If
ownership remains ambiguous, stop and resolve it before implementation.
