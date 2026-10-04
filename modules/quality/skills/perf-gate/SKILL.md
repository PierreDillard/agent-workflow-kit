---
name: perf-gate
description: Require a bounded ceiling, written prediction, fixed protocol and measured comparison before claiming a performance improvement.
---

# Performance Gate

Use for any performance claim. An unmeasured optimization is a belief; a measurement without a
prior prediction is an unexplained result.

1. Bound the maximum cost the proposed change can remove from data already available. Express cost,
   not only item count; if its ceiling is below the task's threshold, close the task.
2. Record a predicted range and metric in writing before implementation.
3. Freeze workload, duration, build mode and measured artifact. Use a production-equivalent build
   and verify it contains the code under test.
4. Measure every run, including null, adverse and off-protocol results. Record what is not expected
   to move so confounds are visible.
5. Confront prediction and result. A gain larger than the ceiling is a confound, not a victory:
   verify the artifact, protocol and cost model before claiming an improvement.

Store the frozen protocol and every aggregate in the selected branch task's `BASELINE.md`. Keep raw
captures outside conversation context and link them only when retained; do not paste dumps into a
conversation. Route confirmed performance defects through `bug-fix-trace` only when Bugs is
installed; otherwise retain evidence in the task.

Never compare different workloads without marking the comparison invalid. Never claim “faster” from
perception alone.
