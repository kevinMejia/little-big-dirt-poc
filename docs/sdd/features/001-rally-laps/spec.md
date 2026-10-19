# 001: Rally checkpoint progression and lap timing

Status: DRAFT — material decisions pending. All proposed behavior below is subject to review.

## Outcome and scope

Let a player drive the existing Pine Ridge loop, pass ordered checkpoints and see a valid lap time. Use the existing course and three vehicles. Preserve free driving, Original/hybrid modes, road geometry, handling, collectibles, camera and controls.

Excluded: physics/rendering redesign, race opponents, countdowns, ghosts, leaderboards, accounts, strict anti-cheat, track editor and new audio/assets. Off-road shortcuts between gates are not comprehensively policed by this pilot.

## Proposed requirements and acceptance criteria

| ID | Requirement | Acceptance scenario |
| --- | --- | --- |
| R01 | Start by crossing the existing start/finish forward. Positive track tangent defines forward. | Approaching and crossing starts timing once; spawning on the line, reverse crossings and stationary jitter do not start a lap. |
| R02 | Require four ordered checkpoints at u=.2,.4,.6,.8, then start/finish. | Crossing the next gate advances exactly once; skipping a gate or crossing it backward does not advance; early finish cannot complete a lap. Missed gates can be revisited in the forward direction. |
| R03 | Detect swept vehicle-center crossings inside road-width gates, within 3 m vertically of the banked road. No grounded-only requirement. | Fast crossings between updates register; crossing beside/above a gate does not. Normal ramp flight can qualify inside the envelope. Teleport/reset/switch sweeps cannot award crossings. |
| R04 | Show elapsed time, next checkpoint, completed lap count, last and best times in a compact rally HUD, plus a visible next-gate marker. | A valid circuit records one positive duration and immediately starts the next lap at that finish instant. Best changes only for a faster valid lap. Display minutes:seconds.milliseconds; store numeric milliseconds. |
| R05 | Pause timing while backgrounded, unfocused, in garage or in settings/navigation dialogs. Ignore crossings during pauses and clear the movement sweep on resume. | An injected clock excludes paused intervals exactly; resuming cannot award movement accumulated during pause. Idle time while active still counts. |
| R06 | Reset, Rally relocation, vehicle change, physics-mode change and page navigation cancel an incomplete lap. | After each event, progression returns to waiting for a forward start crossing; no partial result is saved. Starting a new lap clears stale progress. |
| R07 | Keep completed results in page memory, separately per vehicle and physics mode. No persisted records in the pilot. | Switching returns that combination's completed count/last/best but never resumes its interrupted lap. Reload clears results. |
| R08 | Keep the activity observational and optional through configuration. | Disabling removes lap HUD/markers and progression; handling course/noRally never initializes it. Free driving, existing Rally relocation, Word Hunt and turbo retain their behavior. |
| R09 | Support the project's target platforms without untested claims; aim for 60 FPS. | Desktop/phone layouts do not cover driving controls, settings or Word Hunt. Reports identify tested versions/devices and pending targets; comparable before/after performance is recorded without a universal FPS gate. |

## Open decisions requiring user input

1. Confirm automatic start/continuous laps and the four proposed gate locations, or specify a different interaction/course layout.
2. Confirm pause rules, cancellation rules and session-only results separated by vehicle AND physics mode. Turbo remains allowed, so these are casual times rather than normalized competition records.
3. Confirm a next-gate marker and compact HUD, independent of the existing Driving HUD preference. Exact placement and marker appearance need browser review; no art assets are proposed.

Numbers above are proposed acceptance parameters, not established playtested values. Resolve material ambiguities under the current risk-based workflow before implementation; document reasonable assumptions for minor details.

## Approval record

No approval required solely because spec/plan documents exist. Reassess risk and material ambiguities when this feature is resumed.
