# Technical plan

Status: DRAFT — apply risk-based review; no implementation scheduled in the current task.

## Proposed ownership

- Extend RallyTrackConfig.js with the four checkpoint records and a small lap settings object (enable, vertical tolerance, gate rearm distance). Preserve all existing geometry/tuning values. Reject invalid/duplicate/non-finite checkpoint data and disable only lap tracking with a diagnostic.
- Add RallyLapState.js: renderer-independent state machine with injected monotonic time, explicit pause/resume/cancel, ordered checkpoint events and in-memory per-vehicle/mode results.
- Add RallyLapSystem.js: construct banked gate envelopes from track.at/frame, perform swept tests, feed the state machine and own a bounded marker/HUD with dispose(). Never write vehicle/physics state.
- Connect in index.html only when rallyEnabled. Read the authoritative post-update vehicle position for each mode. Hook actual reset, Rally relocation, selection and mode-transition owners; pause during mode loading as well as the specified UI/page states. Keep new logic out of existing movement equations.

## Detection and timing

Use forward signed-plane crossings in X/Z against each gate's normalized horizontal tangent. Interpolate the crossing fraction and validate lateral road width and banked surface height at that point. Use the vehicle center rather than its collider footprint. Require a proposed 1 m approach-side rearm distance to suppress jitter; normal crossing must pass from the approach side to the exit side. Explicit relocation/lifecycle events clear previous samples and gate arming.

Collect crossed gates over a sweep, sort by fraction and feed them in movement order, so high speed cannot reorder checkpoints. Interpolate crossing time between the two monotonic sample timestamps. Split finishing/starting laps at the same crossing timestamp. Pause transitions close the active interval at their event time; resume starts a new sample without a crossing. Use injected-clock tests, not frame count or Date.now(). A geometric envelope is not full anti-cheat.

Keep state transitions explicit: waiting -> running -> paused/resumed; finish emits a result and begins the next lap; cancel returns to waiting. Separate completed results from active progress. Resolve open spec decisions before fixing these interfaces.

## Presentation and cost

Use a single reusable next-gate marker with shared disposable resources; no collider, lights, shadows, downloads or dependencies. HUD updates at a bounded cadence (proposed 10 Hz) while crossing/timing logic uses every gameplay sample. Handle disabled/failed initialization without breaking the game. Verify overlap against Word Hunt, touch controls and safe-area insets before accepting layout.

## Validation and rollout

Add deterministic state and geometry tests, including reverse/jitter, missed/revisited gates, multiple crossings per sample, vertical/lateral bounds, banked track seam, clock/pause boundaries and relocation. Follow existing Python temporary Three.js test-runner conventions if needed. Add the deterministic runner to tools/check_project.py when implementation begins; browser checks remain explicit with documented setup.

Use browser scenarios on the actual game for all vehicles and both modes, resets/switches/dialogs, continuous laps and layout. Reuse existing rally regression checks; verify production subdirectory URLs and startup fallback. First record baseline revision, commands and failures; do not infer it from historical reports. Device/browser evidence and performance limitations belong in validation.md.

Rollback: remove the isolated integration/config additions and new modules/tests; no asset migration or stored-data migration. Existing Rally button relocation remains authoritative.

## Risks and decisions

Closely spaced switchbacks require finite gate width/height rather than nearest-u progression. Displayed/interpolated physics poses may shift crossing timestamps slightly; compare timing consistency across frame rates and document a justified tolerance. Event-driven pause handling must cover multiple overlapping pause causes. Optional activity failures must stay isolated from driving. No runtime implementation or test scaffolding exists yet.
