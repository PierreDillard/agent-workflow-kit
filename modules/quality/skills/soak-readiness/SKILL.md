---
name: soak-readiness
description: Design and audit long-running operation by bounding growing data and work, owning lifecycles and proving overflow behavior. Use before writing a task that adds or consumes a growing collection, buffer, timer, subscription or retained history, and when investigating long-session degradation.
---

# Soak Readiness

## Before writing the task

Invoke this skill during surface discovery, before `write-task` and `validate-task`, when either
stored data or work performed on it can grow with runtime, item count, reconnects or repeated
lifecycle events. A consumer that renders or materializes complete persisted history can be the
unbounded stage even when it owns no storage.

Trace the cardinality path from production through storage and transfer to materialization. Emit
this compact block for the task under `## Soak contract`:

```md
- Growth path: {what grows, what drives it, and which stage this task owns}
- Resource bound: {data-size or work/render/queue bound at the declared soak duration}
- Retention / eviction: {exact policy, or why data stays exhaustive and work is bounded instead}
- Lifecycle owner: {timer/listener/subscription owner and cleanup, or N/A}
- Overflow proof: {test or measurement beyond the bound or cardinality target}
```

Do not approve an unknown field. If the project has no declared soak duration, the task must name
one justified by its operating context. If no cardinality or lifecycle risk exists, skip this skill
and do not add an empty soak section.

## Audit

For each long-lived resource, identify its owner, growth bound, reset condition, cleanup and failure
state. Every accumulation must answer what bounds it, which exact retention or eviction policy
applies, and where overflow is tested. Check queues, caches, sample arrays, logs, histories,
intervals, observers, workers, reconnect loops and views whose rendered item count grows over time.

Volatile buffers should preserve the newest useful data with an explicit eviction policy. Exhaustive
retained history is acceptable only when segmentation, on-demand transfer or bounded materialization
keeps resource use independent of total cardinality. A bound without an overflow test, or a timer
without an owner and cleanup, blocks readiness. Avoid permanent intervals as a safety net: schedule
work on demand, let it idle when no work remains and invalidate the timer handle before a callback
can reschedule it.

Record the workload and observed duration in the selected task. Separate measured results from
projections. Route lifecycle ambiguity to `resource-ownership` and confirmed defects to
`bug-fix-trace` when Bugs is installed; otherwise retain the evidence in the task.
