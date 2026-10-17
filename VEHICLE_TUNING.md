# Quick tuning guide

Edit `VehicleConfig.js`, save, then refresh the game. All existing stored values
were preserved. New controls start at the constants previously embedded in code.
The main game now starts in **Rapier**, which runs the **HYBRID** controller.
**Original** remains available in the Physics Mode selector. The standalone
`viewer/jumps.html` is the older **RAPIER raycast lab**, with different tuning.

| Problem | First settings to try |
| --- | --- |
| Slow acceleration | Increase `arcadeHandlingConfig.dirty/stinky.acceleration` about 10%. `vehicleConfig.backhoe/garbageTruck.speedAdjustmentPercent` increases acceleration **and** speed together. |
| Top speed too low/high | Change HYBRID `topSpeed`; `reverseSpeed` controls reverse. Speed adjustment and hill percentages multiply these baselines. |
| Poor turning | Increase HYBRID `turn` or `steeringResponse`; increase shared `originalDriveConfig.dirty/stinky.steeringInputRate` for faster input response. Lower `steeringFullSpeed` for tighter low-speed turns. |
| Turning too sharp at speed | Raise HYBRID `speedSteeringReduction` from 0 to .005 or .01. This changes the Original-parity turning curve. |
| Excessive body bouncing | Reduce shared `suspensionBouncePercent` in Original; increase `bodyDamping` in either playable mode. For landing rebound, increase `landingDamping` toward 10–16 or lower `jumpConfig.landingBouncePercent`. |
| Wheels stay compressed | Increase HYBRID `suspensionDamping`. This is a visual wheel return rate, not physical chassis damping. |
| Flipping/spinning | Grounded HYBRID rollover is prevented by terrain alignment. For air spin, increase `airborneAngularDamping`, lower `airborneRollControlPercent` / `jumpConfig.airbornePitchControlPercent`, or lower cannon `launchSpinPercent`. |
| Hard-looking landings | Lower `jumpConfig.landingBouncePercent` and vehicle `boundaryBodyRockPercent`; adjust HYBRID `landingCompressionScale` for visible wheel dip. Physical vertical speed is absorbed on contact. |
| Too much speed lost on landing | Keep HYBRID `landingSpeedRetention` near 1. Reducing it intentionally slows touchdown. |
| Small bumps launch vehicle | Increase HYBRID `minimumLaunchSpeed` or `takeoffClearance` slightly. Recheck all ramps after either change. |
| Flight too floaty/heavy | Raise/lower `jumpConfig.gravityScalePercent`. This affects HYBRID and lab, not Original cannon gravity. Recheck cannon height/distance. |

For Original-only acceleration/speed/turning, use `originalDriveConfig` instead of
`arcadeHandlingConfig`. Shared hills, visual feedback, release braking, and cannon
settings remain under `vehicleConfig`. Each property documents mode, units,
actual limits, examples and related settings directly above the value.

Known preserved values: `interactivePercent: 450` behaves as 100%; debris
`minBumpHeight: .5` forces `maxBumpHeight: .25` up to .5 in practice. To get small
bumps, lower the minimum first. Three legacy tree fall settings are inactive and
marked accordingly; use `fallDurationSeconds`. Lab spring settings do not tune
the main HYBRID suspension. Start with small changes, one at a time, on the
`?handling=1` course, then repeat in the main world.

Default-preserving wiring fixes: HYBRID gravity, pitch/roll and cannon air control
now honor their documented clamps consistently; landing dust at 0 suppresses the
HYBRID puff. The existing lab per-vehicle `landingBounceScalePercent` now also
controls ordinary HYBRID landings, replacing the equivalent hardcoded 1/1.25.
