# Rapier hybrid handling review

Developed on `codex/arcade-rapier-handling`. The user approved the improved driving feel, requested default main-world integration, and authorized commit/merge/push to main.

## Findings and choice

Original uses acceleration 11/7, speed limits 21/17, and direct yaw rates
1.42/1.05 for Dirty/Stinky. Default speed adjustments multiply those by 1.8/3:
37.8/51 m/s flat top speeds. Rapier previously inherited the small lab's 8/6
acceleration and 18/18 limits, then multiplied engine force and limits by the
world speed adjustment. Tire traction and uphill gravity competed with drive
forces. Steering came from front wheel angles and tire friction instead of the
Original yaw equation, so identical inputs could not produce identical turns.
Release braking also used wheel impulses rather than Original's scalar decay.

Raycast suspension applied forces at wheel contacts around a dynamic chassis.
The offset chassis, six-wheel load distribution, steep debris triangle contacts,
and lateral tire forces all fed pitch/roll. Increasing grip alone changes lateral
forces and does not establish Original's speed, hill behavior, or stability.
The old lab's 18 m/s ceiling hid the normal world's much faster operating range.

Chosen approach B: reuse the existing main-world adapter and Rapier body, with
a grounded movement component. Each fixed step has one movement owner. Grounded
steps run Original's speed, hill, braking, and yaw equations; wheel compression
and body rocking are visual. Grounded terrain alignment prevents force-driven
rollover. Sharp convex ramp lips hand off tangent velocity and orientation to
Rapier. Flight runs gravity and pitch/roll torque without grounded movement.
Descending terrain/chassis contact absorbs vertical velocity, emits one landing
event, and returns ownership to grounded driving. A roof-first landing recovers
upright on contact. This deliberately forgiving landing can visibly straighten
a heavily rotated vehicle; gameplay review should assess that transition.

The existing tree/rock swept movement adapters and boundary cannon remain in
use. Debris moves visual wheel suspension without launching the body. The
raycast lab remains available as a separate physics diagnostic; it does not use
the main-world hybrid. Original's movement branch and model files are unchanged.

## Tuning

Edit `arcadeHandlingConfig` in `VehicleConfig.js` for per-vehicle baseline
acceleration, speed, turning, speed steering reduction, visual suspension,
takeoff sensitivity, and air roll. Comments include units and suggested ranges.
Existing `vehicleConfig` speed adjustment, hills, release braking, body feedback,
and cannon parameters continue to apply. Existing `jumpConfig` controls gravity,
air pitch and landing feedback. Reload after editing config. The hybrid's
landing bounce setting affects feedback, not repeated physical rebounds. See
`VEHICLE_TUNING.md` for the short guide; every scalar setting is documented above
its property in `VehicleConfig.js`. All stored pre-existing values were preserved.

## Gameplay review checklist

Run `npm run dev`, open `http://127.0.0.1:8000/?handling=1&debug=1`, and use the
existing Physics Mode selector to compare the same course in both modes. The
Handling course link in the main world also opens it. Reset returns to the
south end of the straight. Vehicle buttons select Dirty or Stinky. Use `R` or
Reset before each comparable run. The default open world is available at `/`.

1. For each vehicle and each mode, hold accelerate along x=-145 from z=-170
   toward z=170. Compare acceleration and HUD speed. Stop before the boundary
   for braking comparisons; cross it deliberately for a cannon test.
2. Release throttle at top speed, then repeat using reverse/brake and emergency
   brake. Check exact stop, no creep, and reverse steering.
3. Follow the marked turn circles centered at (-75,-100), radius 12, and
   (-75,-20), radius 30. Also hold full left/right at top speed in open space.
   Compare response and radius, straight tracking, roll, and camera smoothness.
4. Drive north/south through the gentle hill at x=0, z=-65, and the small bump
   lane at x=85, z=-65. Compare climbing, descending, and bouncing.
5. Approach ramps northbound at x=-66/-22/22/66 from z=-130. Their lips are at
   z=30. Check takeoff continuity, gravity, pitch with forward/reverse, roll
   with steering, landing compression/dust, and prompt settling. Repeat in the
   rolling main world, where scenery and slopes are present.
6. Drive through each boundary in Rapier mode. Check inward cannon flight,
   steering, camera tracking, a single landing, and normal driving afterward.
7. In the main world, check tree blocking/knockdown, rock pushing/breaking,
   debris wheel motion, switching vehicles/modes, keyboard, gamepad, and iPhone
   touch controls. Original remains the fallback.

Automated tests verify numeric behavior and regression scenarios; they cannot
establish enjoyable driving feel, mobile rendering, camera feel, or visible
landing quality. Those remain user gameplay checks before merge.
