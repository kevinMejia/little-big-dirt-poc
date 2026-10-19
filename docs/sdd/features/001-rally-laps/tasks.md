# Development tasks

Status: DRAFT, not scheduled in the current rename task. Use the risk-based workflow when resumed.

| Task | Requirements | Deliverable and independent verification | Depends on |
| --- | --- | --- | --- |
| T01 | All | Resolve material open decisions; record assumptions and risk classification. | None |
| T02 | R08-R09 | Record revision, environment, existing regression/browser baseline and known failures. | T01 |
| T03 | R01-R02,R04-R07 | Pure lap state with injected clock; deterministic progression, timing, pause/cancel and result partition tests. | T02 |
| T04 | R01-R03 | Gate configuration and swept detector; bank/width/height/seam, direction, jitter and multi-gate tests. | T02 |
| T05 | R01-R08 | Integrate state/detection and lifecycle owners in actual game; browser assertions for resets, switches, pauses, modes and disabling. | T03,T04 |
| T06 | R04,R08-R09 | Bounded HUD/marker; desktop/phone visual review, layout checks, cleanup and pool/resource checks. | T05 |
| T07 | All | Register deterministic runner; current build + main checker, targeted browser/rally checks, performance comparison and requirement evidence table. Report all failures/pending targets. | T06 |

Each completed task records commands/results in validation.md. Material changes require risk reassessment under the current workflow. Passing an isolated task does not substitute for integrated acceptance.
