# Dirt jump review and integration plan

## Review first

Open `viewer/jumps.html` through the existing local/production server. The main
playable `index.html` does not import the jump system or Rapier. Its terrain,
driving, cannon, obstacles, models, controls and release braking remain intact.
This is the requested review milestone, not a migration of working gameplay.

The default scene has one vehicle, flat ground and one selected ramp. Select
**Four-ramp playground** for all four lanes, or **Rolling terrain geometry preview**
for the current world's analytic hill shape with the proposed playground. The
rolling preview deliberately has no tree/rock systems. It mirrors the current
height formula for review; future integration must pass the actual base-height
function into `DirtJumpSystem` instead of maintaining two formulas.

W/Up accelerates; S/Down brakes/reverses; A/D steer; Space brakes; W/S apply limited
pitch torque in the air. R/Approach resets the test. View ramps gives an overview.
Cannon test resets to a clear edge and sets a real inward/upward rigid-body
velocity. Touch buttons support independent pointer ownership and cancellation.
The camera follows physical position, including flight; orbit/zoom remain available.

## Ramp geometry

`DirtJumpSystem.js` accepts a base height function, a feature array and `rampConfig`.
Each feature has world `x/z`, `angle` (radians), `height`, `width`, approach and tail
lengths, with tabletop/gap lengths where appropriate. The approach begins with zero
slope. A positive takeoff tangent is retained at the lip; the intentional slope
change does not introduce a height discontinuity. Feathered sides and smooth tail
profiles blend to the base height without holes. Gap ramps have a second landing
hill, not a collider spanning empty space.

`sample(x,z)` is base plus ramp height. `dirtMask` includes approach/exit paths.
`contains(x,z,margin)` reserves clear obstacle-free landing lanes for later world
integration. Four lanes are centered at x = -66, -22, 22, 66 and z = 30, far inside
the existing +/-205 boundary. The review uses a +/-120 test floor with safety walls.
It does not trigger the existing playable-world boundary cannon.

`createSurface` resolves terrain at <=.75 units in the browser. The **same typed
vertex/index arrays** create the rendered mesh and Rapier's fixed triangle collider.
Wheel raycasts and chassis collisions therefore see the rendered surface, rather
than a separately rounded approximation. Analytic sampling is used for color/dust
and labels. The main-world integration should use a stitched fine-resolution
playground patch instead of raising the resolution of the whole 440-unit map.

## Rapier evaluation

The official raycast vehicle controller uses one dynamic chassis and independent
wheel suspension springs, avoiding four wheel rigid bodies/joints. See
[Rapier vehicle controller](https://rapier.rs/docs/user_guides/javascript/vehicle_controller/).
It applies suspension, tire forces and brakes before `world.step`. Raycasts exclude
dynamic bodies in this isolated scene so wheels cannot hit their own chassis.

`JumpVehiclePrototype.js` advances a fixed 1/120-second accumulator with a .1-second
frame catch-up cap. Rapier integrates chassis position, rotation, linear/angular
velocity, gravity and collision response. No ground-height assignment, launch arc
or landing upright quaternion is imposed during stepping. Wheel unloading is
measured from four actual ray contacts; wheel centers use suspension lengths.
CCD is enabled. Air pitch is a bounded torque impulse. Braking uses wheel impulses;
near-zero grounded release motion sleeps the body to stop/hold exactly. Gentle
recovery torque helps a slow, tipped chassis; an out-of-floor/fall emergency resets
only the isolated viewer.

The existing Blender Dirty model is loaded unchanged and follows the rigid body.
Existing `VehicleFeedback` adds bounded visual landing rocking, while independent
wheel pivots retain the physical suspension positions. Dust uses the existing pool.
The Stinky selector **only tests heavier/bouncier mass tuning on Dirty's four-wheel
model**. It is not a claim that the playable six-wheel truck has migrated.
Prototype masses are 1200/1900, with softer suspension for the heavier profile;
final game tuning will require the real truck's six contact positions.

`jumpConfig` controls enabled ramp features, gravity (100 = 12 units/s², clamped
25–200%), air pitch torque (0–100%), physical restitution/spring relaxation and
visual landing bounce, body rock, and landing dust. `rampConfig` controls four
heights and dirt-mask strength. Both live in `VehicleConfig.js`; reload to tune. `jumpVehicleConfig` exposes per-profile mass, acceleration, stopping rate, spring/damper values and cartoon percentages.
Rapier compat **0.21.0** is vendored only for the lab, with its Apache license and
npm source/integrity metadata under `viewer/vendor/rapier`. Its WASM is embedded in
the ESM file: no missing external WASM URL on Pages. It adds ~4.2 MiB to deployment,
but no Rapier download/init cost to ordinary gameplay.

## Required integration work after review

1. Introduce one per-vehicle controller adapter, behind an opt-in flag, retaining
   the existing movement implementation as the default/fallback.
2. Build the same ramp-aware surface for drawing, terrain/hill/wheel sampling,
   dust and the physics collision mesh. Reserve playground lanes in tree/rock/
   debris placement before generation; keep all placements outside them unchanged.
3. In physics mode, the rigid body must own **both grounded and airborne motion**.
   Do not run the existing `position.y=height(...)` or `TreeCollisionSystem.move`
   position integration alongside it. Current obstacle handlers mutate position:
   adapt swept hits to events/velocity impulses without integrating travel twice,
   and validate all knockdown/destruction thresholds against physical speed.
4. Reuse hill settings to tune grounded engine forces/speed limits; preserve
   release deceleration/hold, keyboard/touch merging and equipment updates.
5. Keep the cannon's boundary detector/latch, but apply its velocity to the body
   once. Never run `BoundaryCannon.update` and Rapier position integration together.
6. Position the logical/collision root from rigid-body pose, render wheels from
   suspension contacts, and apply optional cartoon feedback only on the existing
   visual child. Remove competing terrain pitch/roll alignment in physics mode.
7. Keep the camera target sourced from the authoritative body; add the actual
   six-wheel Stinky support and tune both vehicles separately before default-on.

## Validation and limits

`tests/jump-prototype.mjs` runs the actual vendored WASM, not mocked physics:
all four ramps with both mass profiles, fixed-step frame independence, gravity,
air torque, physical takeoff/landing and suspension compression, exact release
stop/hold, continuous rotated profiles, identical mesh samples, and an assertion
that the live game has not loaded either new controller. All normal production
and gameplay checks remain required through `python tools/check_project.py`.

The prototype demonstrates a viable foundation. It does not yet prove compatibility
with the live mutable tree/rock collision pipeline or six-wheel Stinky. The four
ray wheels approximate tires (no tire shape casts), and sharp sideways approaches
can touch the chassis. Mobile-size browser checks are emulation; actual iPhone
Safari frame/memory testing is still required before enabling a Rapier controller
in the full game. The normal playable game remains the working fallback.

### Render smoothness

The lab keeps previous/current fixed-step chassis pose, wheel suspension lengths,
steering and wheel angle. Rendering interpolates these using the accumulator
fraction, including normalized shortest-path quaternion interpolation. Camera
translation and target use that same interpolated chassis pose, preventing a second
follow-lag wobble. This adds at most one 120 Hz tick (8.3 ms) of visual latency and
does not change Rapier integration or grounded/airborne collision state. Reset clears
both pose histories. Tests cover uniform rendered travel at 60, 90, 144 and 165 Hz.
This removes fixed-step presentation judder; it does not guarantee that a device
with rendering stalls will never drop frames. Actual iPhone checks remain needed.
