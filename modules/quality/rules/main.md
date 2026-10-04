Use `validate-task` for ambiguous or multi-layer work; apply `reuse`, `architect` and relevant gates.
When growth or lifecycle risks apply, invoke `soak-readiness` before `write-task` and implementation.
Close with `done-check`. Before every merge into `DEFAULT_BRANCH`, run `branch-router` then `review-gate`.
Require an independent approve verdict for the exact source SHA; a source change invalidates approval.
Perform only an explicitly authorized merge, then run `merge-integrity`.
