# Validation record

Status: NOT RUN — documentation draft only. No implementation, build, automated checks or fresh browser/device tests were performed for this pilot.

## Baseline to capture when implementation begins

Record Git revision and working-tree state, Python/Node versions, browser/OS/device, viewport, quality settings, physics mode and cache state. Build before the main checker; record each command and failure. The main checker is fail-fast, so a failure can leave later suites unexecuted. Record separate browser prerequisites and generated report/screenshot changes.

## Traceability

| Requirements | Planned evidence | Result |
| --- | --- | --- |
| R01-R03 | Deterministic state/gate tests; actual-game forward/reverse/fast crossing scenarios | Pending |
| R04 | Injected-clock timing tests; continuous laps and HUD browser review | Pending |
| R05-R07 | Pause overlap, exact timing boundaries, reset/relocation/selection/mode and result partition tests | Pending |
| R08 | Disabled/handling/noRally/failure-isolation checks; existing driving/rally/input/activity regressions | Pending |
| R09 | Layout review, target-platform matrix and comparable performance samples | Pending |

## Platform matrix

Desktop Chrome, Edge, Firefox, Safari; iPhone Safari; Android Chrome: ALL pending for this feature. Enter actual versions/devices and dates individually. Keep emulation evidence distinct from hardware evidence.

Performance target: 60 FPS. No strict FPS acceptance requirement. Record comparable baseline/feature frame-time samples and loading costs on named hardware; agree any meaningful regression budget after measurement.

## Completion report

For every check: command/scenario, environment, observed outcome, evidence path and requirement IDs. Explicitly mark pass/fail/blocked/not tested. Include known baseline failures with current evidence, unexplained regressions, manual review findings and outstanding device coverage. Existing documentation/reports are historical context, not new results.
