// MAIN TUNING FILE - change a value, save, refresh the game (restart lab setup if open).
// Dirty = backhoe; Stinky = garbage truck. Main-game "Rapier" is the HYBRID.
// ORIGINAL = legacy terrain-following controller. RAPIER = legacy raycast tests.
// HYBRID = arcade grounded driving + Rapier flight in the main game AND Dirt Jump Lab.
// "No clamp" means the implementation does not enforce a safe numeric bound:
// use finite values in the stated intended domain. Suggested ranges are starting
// points around current tuning, not engine limits or promises of tested feel.
// All previous stored configuration values are preserved, including out-of-range
// values whose effective behavior is explained below. New controls copy the old
// hardcoded constants, preserving defaults. Collision envelopes stay model-derived.
// HYBRID grounded stability is enforced: terrain-aligned chassis, visual body roll,
// no suspension forces. There is no hidden adjustable center-of-mass/rollover knob.
// For spin use airborneAngularDamping; for visible wobble use bodyDamping.

// Shared per-vehicle hills, release braking, body feedback, cannon and interactions.
export const vehicleConfig = {
  // Dirty / backhoe.
  backhoe: {
    // Controls: Scales acceleration and forward/reverse speed together; multiplier = 1 + value/100.
    // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
    // Units / actual limits: percent; finite numbers; values <= -100 give zero drive; no upper cap.
    // Increase/decrease: higher = quicker and faster; lower = slower.
    // Examples: -50 = half; 0 = baseline; 100 = double.
    // Suggested start: 0..100 for moderate speeds; existing Stinky 200 is triple. Together with: acceleration, topSpeed, reverseSpeed, hill boost.
    speedAdjustmentPercent: 80,

    // Controls: Maximum downhill increase to drive acceleration and speed limit.
    // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
    // Units / actual limits: percent; negative becomes 0; no upper cap.
    // Increase/decrease: higher = stronger downhill boost; lower = flatter speed.
    // Examples: 0 = none; 35 = up to +35%; 120 = up to +120%.
    // Suggested start: 0..50 for modest slope differences. Together with: fullEffectGrade, responseSeconds, speedAdjustmentPercent.
    downhillBoostPercent: 120,

    // Controls: Maximum uphill reduction to drive acceleration and speed limit.
    // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
    // Units / actual limits: percent; clamped 0..95.
    // Increase/decrease: higher = slower climbs; lower = easier climbs.
    // Examples: 0 = none; 30 = up to -30%; 60 = up to -60%.
    // Suggested start: 0..45 for forgiving hills. Together with: fullEffectGrade, responseSeconds, acceleration.
    uphillPenaltyPercent: 30,

    // Controls: Subtracts speed while neither accelerate nor reverse is held, after drag.
    // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
    // Units / actual limits: m/s^2; negative becomes 0; no upper cap.
    // Increase/decrease: higher = shorter coast; lower = longer coast.
    // Examples: 0 = drag only; 3.5 = truck coast; 8 = brisk stop.
    // Suggested start: 3..8, matching current vehicle values. Together with: autoBrakeOnRelease, stopThreshold, drag.
    releaseDeceleration: 8,

    // Controls: Snaps remaining release speed to exactly zero.
    // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
    // Units / actual limits: m/s; negative becomes 0 in release helper; no upper cap.
    // Increase/decrease: higher = earlier final stop; lower = longer low-speed tail.
    // Examples: 0 = no positive snap band; .1 = current; .5 = earlier snap.
    // Suggested start: 0..0.2 to avoid obvious snaps. Together with: releaseDeceleration, autoBrakeOnRelease.
    stopThreshold: 0.1,

    // Controls: Enables constant release deceleration; threshold snap and drag still apply when disabled.
    // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
    // Units / actual limits: boolean true/false.
    // Increase/decrease: true = release braking; false = coast with drag.
    // Examples: true = automatic slowing; false = drag-only coast.
    // Suggested start: true for child-friendly stopping. Together with: releaseDeceleration, stopThreshold, drag.
    autoBrakeOnRelease: true,

    // Controls: Visual outward body lean during turns and debris roll; cannot flip the collider.
    // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
    // Units / actual limits: percent; clamped 0..100.
    // Increase/decrease: higher = more visible lean; lower = flatter body.
    // Examples: 0 = no turn lean; 25 = subtle; 100 = up to 12 degrees from turns.
    // Suggested start: 10..35 for subtle cartoon motion. Together with: turn, bodyDamping, suspensionBouncePercent.
    bodyRollPercent: 25,

    // Controls: Visual body tilt under acceleration/braking and debris pitch.
    // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
    // Units / actual limits: percent; clamped 0..100.
    // Increase/decrease: higher = more nodding; lower = flatter body.
    // Examples: 0 = none; 20 = subtle; 100 = up to 10 degrees from acceleration.
    // Suggested start: 10..30 for subtle motion. Together with: acceleration, bodyDamping, brakeDeceleration.
    bodyPitchPercent: 20,

    // Controls: Visual response to changes in terrain pitch/roll/heave; Original also uses it for debris heave. HYBRID currently passes zero terrain motion to body feedback, so terrain bounce here is INACTIVE there; hybrid wheel rates still work.
    // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
    // Units / actual limits: percent; clamped 0..100.
    // Increase/decrease: higher = more terrain body movement in Original; lower = calmer.
    // Examples: 0 = no terrain feedback; 20 = current; 60 = exaggerated.
    // Suggested start: 0..25 for forgiving appearance. Together with: bodyDamping, groundDebrisConfig.suspensionEffectPercent; HYBRID wheel suspensionStiffness/Damping.
    suspensionBouncePercent: 20,

    // Controls: Visual feedback spring restoring acceleration applied to body pitch/roll/heave.
    // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
    // Units / actual limits: 1/s^2 coefficient; no clamp; use finite >0.
    // Increase/decrease: higher = faster/snappier body return; lower = softer/slower.
    // Examples: 35 = soft; 65 = current; 90 = firm.
    // Suggested start: 35..90 around current tested 65. Together with: bodyDamping, landingDamping.
    bodySpringStiffness: 65,

    // Controls: Visual body spring velocity damping outside landing heave.
    // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
    // Units / actual limits: 1/s; no clamp; use finite >=0.
    // Increase/decrease: higher = less oscillation; lower = more wobble.
    // Examples: 6 = lively; 10 = current; 16 = calmer.
    // Suggested start: 8..16 around current 10. Together with: bodySpringStiffness; excessive damping can make settling sluggish.
    bodyDamping: 10,

    // Controls: Visual heave velocity damping for 1.8 seconds after landing.
    // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
    // Units / actual limits: 1/s; no clamp; use finite >=0.
    // Increase/decrease: higher = less repeated visual rebound; lower = springier landing.
    // Examples: 6 = current bounce; 10 = calmer; 16 = heavily damped.
    // Suggested start: 6..16; critical damping near 16 for stiffness 65. Together with: bodySpringStiffness, landingBouncePercent.
    landingDamping: 6,

    // Controls: Original soft-boundary rebound when cannon is disabled; also legacy landing feedback if called without impact. INACTIVE for HYBRID boundary rebound, which uses a fixed small redirect.
    // Modes: ORIGINAL (legacy effects); HYBRID boundary rebound INACTIVE.
    // Units / actual limits: percent; clamped 0..100; rebound speed capped at 3 m/s.
    // Increase/decrease: higher = stronger Original rebound; lower = softer stop.
    // Examples: 0 = stop; 25 = mild; 100 = strongest capped rebound.
    // Suggested start: 0..30 for gentle borders. Together with: boundaryCannon.enabled, boundaryBodyRockPercent.
    boundaryBouncePercent: 25,

    // Controls: Visual body pitch kick at landings; Original also uses it for border impacts. HYBRID landings use this rather than jumpConfig.landingBodyRockPercent.
    // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
    // Units / actual limits: percent; clamped 0..100.
    // Increase/decrease: higher = stronger landing nod/impact rocking; lower = quieter body.
    // Examples: 0 = no pitch kick; 30 = current; 70 = pronounced.
    // Suggested start: 15..40 for soft-looking landings. Together with: landingBouncePercent, bodyDamping.
    boundaryBodyRockPercent: 30,

    // Boundary cannon settings.
    boundaryCannon: {
      // Controls: Enables boundary cannon for this vehicle. When disabled, Original uses soft-boundary response and HYBRID uses small velocity redirect.
      // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
      // Units / actual limits: boolean true/false.
      // Increase/decrease: true = cannon launches; false = border redirect.
      // Examples: true = launch; false = no launch.
      // Suggested start: true to retain cannon gameplay. Together with: horizontalLaunchSpeed, verticalLaunchSpeed, boundaryBouncePercent.
      enabled: true,

      // Controls: Boundary cannon inward horizontal launch speed.
      // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
      // Units / actual limits: m/s; clamped 8..65 in both playable modes.
      // Increase/decrease: higher = longer travel; lower = shorter travel.
      // Examples: 20 = short; 45 = current; 60 = long.
      // Suggested start: 30..45 within tested cannon envelope. Together with: verticalLaunchSpeed, gravityScalePercent (HYBRID only), airControlPercent.
      horizontalLaunchSpeed: 45,

      // Controls: Boundary cannon initial upward speed.
      // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
      // Units / actual limits: m/s; clamped 8..40.
      // Increase/decrease: higher = higher/longer flight; lower = low/short flight.
      // Examples: 12 = low; 28 = current Dirty; 38 = very high.
      // Suggested start: 20..30 for current world size. Together with: horizontalLaunchSpeed, gravityScalePercent (HYBRID only).
      verticalLaunchSpeed: 28,

      // Controls: Cannon wobble in Original; initial physical angular velocity in HYBRID.
      // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
      // Units / actual limits: percent; clamped 0..100.
      // Increase/decrease: higher = more rotation; lower = steadier launch.
      // Examples: 0 = no added spin; 20 = mild; 80 = stronger.
      // Suggested start: 0..25 for forgiving flights. Together with: airborneAngularDamping (HYBRID), airborne controls.
      launchSpinPercent: 20,

      // Controls: Steering rotates the cannon horizontal velocity; HYBRID also turns body toward flight heading.
      // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
      // Units / actual limits: percent; clamped 0..100.
      // Increase/decrease: higher = more flight-path steering; lower = straighter trajectory.
      // Examples: 0 = no path steering; 15 = current; 50 = stronger.
      // Suggested start: 0..25 to retain predictable return paths. Together with: horizontalLaunchSpeed, airborneRollControlPercent.
      airControlPercent: 15,

      // Controls: Impact-scaled visual heave at landing; lab additionally changes chassis restitution and suspension relaxation. HYBRID absorbs vertical speed on contact; this does not cause physical repeat bounce.
      // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
      // Units / actual limits: percent; feedback/lab clamps 0..100; lab per-vehicle multiplier applies before feedback clamp.
      // Increase/decrease: higher = springier visible landing (and bouncier lab); lower = softer.
      // Examples: 0 = no heave kick; 25 = gentle; 60 = lively.
      // Suggested start: 10..35 for gentle feedback. Together with: landingDamping, landingCompressionScale (HYBRID), landingBounceScalePercent (lab).
      landingBouncePercent: 30,

    },
    // Controls: Normal impact speed threshold for knocking down a tree, relative to UNSCALED base topSpeed.
    // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
    // Units / actual limits: percent; clamped 0..100.
    // Increase/decrease: higher = harder to topple; lower = easier.
    // Examples: 25 = quarter base speed; 90 = current Dirty; 100 = full base speed.
    // Suggested start: 70..100 for stronger impacts only. Together with: topSpeed, speedAdjustmentPercent (boost makes threshold easier to reach).
    treeKnockdownSpeedPercent: 90,

    // Controls: Normal impact threshold for first crack or breaking an already cracked rock.
    // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
    // Units / actual limits: percent; clamped 0..100; multiplied by base topSpeed and rock resistance.
    // Increase/decrease: higher = harder to crack; lower = easier.
    // Examples: 15 = easy; 25 = Dirty current; 50 = harder.
    // Suggested start: 20..40 for current resistance. Together with: rockBreakSpeedPercent, resistanceMultiplier, largeRockResistance, topSpeed.
    rockCrackSpeedPercent: 25,

    // Controls: Normal impact threshold for breaking an intact rock; never below crack threshold.
    // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
    // Units / actual limits: percent; clamped 0..100 then threshold raised to at least crack threshold.
    // Increase/decrease: higher = harder one-hit breaks; lower = easier.
    // Examples: 35 = easy; 55 = Dirty current; 75 = Stinky current.
    // Suggested start: 50..80 for intact-rock resistance. Together with: rockCrackSpeedPercent, resistanceMultiplier, topSpeed.
    rockBreakSpeedPercent: 55,

  },
  // Stinky / garbage truck.
  garbageTruck: {
    // Controls: Scales acceleration and forward/reverse speed together; multiplier = 1 + value/100.
    // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
    // Units / actual limits: percent; finite numbers; values <= -100 give zero drive; no upper cap.
    // Increase/decrease: higher = quicker and faster; lower = slower.
    // Examples: -50 = half; 0 = baseline; 100 = double.
    // Suggested start: 0..100 for moderate speeds; existing Stinky 200 is triple. Together with: acceleration, topSpeed, reverseSpeed, hill boost.
    speedAdjustmentPercent: 200,

    // Controls: Maximum downhill increase to drive acceleration and speed limit.
    // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
    // Units / actual limits: percent; negative becomes 0; no upper cap.
    // Increase/decrease: higher = stronger downhill boost; lower = flatter speed.
    // Examples: 0 = none; 35 = up to +35%; 120 = up to +120%.
    // Suggested start: 0..50 for modest slope differences. Together with: fullEffectGrade, responseSeconds, speedAdjustmentPercent.
    downhillBoostPercent: 35,

    // Controls: Maximum uphill reduction to drive acceleration and speed limit.
    // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
    // Units / actual limits: percent; clamped 0..95.
    // Increase/decrease: higher = slower climbs; lower = easier climbs.
    // Examples: 0 = none; 30 = up to -30%; 60 = up to -60%.
    // Suggested start: 0..45 for forgiving hills. Together with: fullEffectGrade, responseSeconds, acceleration.
    uphillPenaltyPercent: 45,

    // Controls: Subtracts speed while neither accelerate nor reverse is held, after drag.
    // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
    // Units / actual limits: m/s^2; negative becomes 0; no upper cap.
    // Increase/decrease: higher = shorter coast; lower = longer coast.
    // Examples: 0 = drag only; 3.5 = truck coast; 8 = brisk stop.
    // Suggested start: 3..8, matching current vehicle values. Together with: autoBrakeOnRelease, stopThreshold, drag.
    releaseDeceleration: 3.5,

    // Controls: Snaps remaining release speed to exactly zero.
    // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
    // Units / actual limits: m/s; negative becomes 0 in release helper; no upper cap.
    // Increase/decrease: higher = earlier final stop; lower = longer low-speed tail.
    // Examples: 0 = no positive snap band; .1 = current; .5 = earlier snap.
    // Suggested start: 0..0.2 to avoid obvious snaps. Together with: releaseDeceleration, autoBrakeOnRelease.
    stopThreshold: 0.1,

    // Controls: Enables constant release deceleration; threshold snap and drag still apply when disabled.
    // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
    // Units / actual limits: boolean true/false.
    // Increase/decrease: true = release braking; false = coast with drag.
    // Examples: true = automatic slowing; false = drag-only coast.
    // Suggested start: true for child-friendly stopping. Together with: releaseDeceleration, stopThreshold, drag.
    autoBrakeOnRelease: true,

    // Controls: Visual outward body lean during turns and debris roll; cannot flip the collider.
    // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
    // Units / actual limits: percent; clamped 0..100.
    // Increase/decrease: higher = more visible lean; lower = flatter body.
    // Examples: 0 = no turn lean; 25 = subtle; 100 = up to 12 degrees from turns.
    // Suggested start: 10..35 for subtle cartoon motion. Together with: turn, bodyDamping, suspensionBouncePercent.
    bodyRollPercent: 25,

    // Controls: Visual body tilt under acceleration/braking and debris pitch.
    // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
    // Units / actual limits: percent; clamped 0..100.
    // Increase/decrease: higher = more nodding; lower = flatter body.
    // Examples: 0 = none; 20 = subtle; 100 = up to 10 degrees from acceleration.
    // Suggested start: 10..30 for subtle motion. Together with: acceleration, bodyDamping, brakeDeceleration.
    bodyPitchPercent: 20,

    // Controls: Visual response to changes in terrain pitch/roll/heave; Original also uses it for debris heave. HYBRID currently passes zero terrain motion to body feedback, so terrain bounce here is INACTIVE there; hybrid wheel rates still work.
    // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
    // Units / actual limits: percent; clamped 0..100.
    // Increase/decrease: higher = more terrain body movement in Original; lower = calmer.
    // Examples: 0 = no terrain feedback; 20 = current; 60 = exaggerated.
    // Suggested start: 0..25 for forgiving appearance. Together with: bodyDamping, groundDebrisConfig.suspensionEffectPercent; HYBRID wheel suspensionStiffness/Damping.
    suspensionBouncePercent: 20,

    // Controls: Visual feedback spring restoring acceleration applied to body pitch/roll/heave.
    // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
    // Units / actual limits: 1/s^2 coefficient; no clamp; use finite >0.
    // Increase/decrease: higher = faster/snappier body return; lower = softer/slower.
    // Examples: 35 = soft; 65 = current; 90 = firm.
    // Suggested start: 35..90 around current tested 65. Together with: bodyDamping, landingDamping.
    bodySpringStiffness: 65,

    // Controls: Visual body spring velocity damping outside landing heave.
    // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
    // Units / actual limits: 1/s; no clamp; use finite >=0.
    // Increase/decrease: higher = less oscillation; lower = more wobble.
    // Examples: 6 = lively; 10 = current; 16 = calmer.
    // Suggested start: 8..16 around current 10. Together with: bodySpringStiffness; excessive damping can make settling sluggish.
    bodyDamping: 10,

    // Controls: Visual heave velocity damping for 1.8 seconds after landing.
    // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
    // Units / actual limits: 1/s; no clamp; use finite >=0.
    // Increase/decrease: higher = less repeated visual rebound; lower = springier landing.
    // Examples: 6 = current bounce; 10 = calmer; 16 = heavily damped.
    // Suggested start: 6..16; critical damping near 16 for stiffness 65. Together with: bodySpringStiffness, landingBouncePercent.
    landingDamping: 6,

    // Controls: Original soft-boundary rebound when cannon is disabled; also legacy landing feedback if called without impact. INACTIVE for HYBRID boundary rebound, which uses a fixed small redirect.
    // Modes: ORIGINAL (legacy effects); HYBRID boundary rebound INACTIVE.
    // Units / actual limits: percent; clamped 0..100; rebound speed capped at 3 m/s.
    // Increase/decrease: higher = stronger Original rebound; lower = softer stop.
    // Examples: 0 = stop; 25 = mild; 100 = strongest capped rebound.
    // Suggested start: 0..30 for gentle borders. Together with: boundaryCannon.enabled, boundaryBodyRockPercent.
    boundaryBouncePercent: 25,

    // Controls: Visual body pitch kick at landings; Original also uses it for border impacts. HYBRID landings use this rather than jumpConfig.landingBodyRockPercent.
    // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
    // Units / actual limits: percent; clamped 0..100.
    // Increase/decrease: higher = stronger landing nod/impact rocking; lower = quieter body.
    // Examples: 0 = no pitch kick; 30 = current; 70 = pronounced.
    // Suggested start: 15..40 for soft-looking landings. Together with: landingBouncePercent, bodyDamping.
    boundaryBodyRockPercent: 30,

    // Boundary cannon settings.
    boundaryCannon: {
      // Controls: Enables boundary cannon for this vehicle. When disabled, Original uses soft-boundary response and HYBRID uses small velocity redirect.
      // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
      // Units / actual limits: boolean true/false.
      // Increase/decrease: true = cannon launches; false = border redirect.
      // Examples: true = launch; false = no launch.
      // Suggested start: true to retain cannon gameplay. Together with: horizontalLaunchSpeed, verticalLaunchSpeed, boundaryBouncePercent.
      enabled: true,

      // Controls: Boundary cannon inward horizontal launch speed.
      // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
      // Units / actual limits: m/s; clamped 8..65 in both playable modes.
      // Increase/decrease: higher = longer travel; lower = shorter travel.
      // Examples: 20 = short; 45 = current; 60 = long.
      // Suggested start: 30..45 within tested cannon envelope. Together with: verticalLaunchSpeed, gravityScalePercent (HYBRID only), airControlPercent.
      horizontalLaunchSpeed: 45,

      // Controls: Boundary cannon initial upward speed.
      // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
      // Units / actual limits: m/s; clamped 8..40.
      // Increase/decrease: higher = higher/longer flight; lower = low/short flight.
      // Examples: 12 = low; 28 = current Dirty; 38 = very high.
      // Suggested start: 20..30 for current world size. Together with: horizontalLaunchSpeed, gravityScalePercent (HYBRID only).
      verticalLaunchSpeed: 29,

      // Controls: Cannon wobble in Original; initial physical angular velocity in HYBRID.
      // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
      // Units / actual limits: percent; clamped 0..100.
      // Increase/decrease: higher = more rotation; lower = steadier launch.
      // Examples: 0 = no added spin; 20 = mild; 80 = stronger.
      // Suggested start: 0..25 for forgiving flights. Together with: airborneAngularDamping (HYBRID), airborne controls.
      launchSpinPercent: 15,

      // Controls: Steering rotates the cannon horizontal velocity; HYBRID also turns body toward flight heading.
      // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
      // Units / actual limits: percent; clamped 0..100.
      // Increase/decrease: higher = more flight-path steering; lower = straighter trajectory.
      // Examples: 0 = no path steering; 15 = current; 50 = stronger.
      // Suggested start: 0..25 to retain predictable return paths. Together with: horizontalLaunchSpeed, airborneRollControlPercent.
      airControlPercent: 15,

      // Controls: Impact-scaled visual heave at landing; lab additionally changes chassis restitution and suspension relaxation. HYBRID absorbs vertical speed on contact; this does not cause physical repeat bounce.
      // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
      // Units / actual limits: percent; feedback/lab clamps 0..100; lab per-vehicle multiplier applies before feedback clamp.
      // Increase/decrease: higher = springier visible landing (and bouncier lab); lower = softer.
      // Examples: 0 = no heave kick; 25 = gentle; 60 = lively.
      // Suggested start: 10..35 for gentle feedback. Together with: landingDamping, landingCompressionScale (HYBRID), landingBounceScalePercent (lab).
      landingBouncePercent: 38,

    },
    // Controls: Normal impact speed threshold for knocking down a tree, relative to UNSCALED base topSpeed.
    // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
    // Units / actual limits: percent; clamped 0..100.
    // Increase/decrease: higher = harder to topple; lower = easier.
    // Examples: 25 = quarter base speed; 90 = current Dirty; 100 = full base speed.
    // Suggested start: 70..100 for stronger impacts only. Together with: topSpeed, speedAdjustmentPercent (boost makes threshold easier to reach).
    treeKnockdownSpeedPercent: 95,

    // Controls: Normal impact threshold for first crack or breaking an already cracked rock.
    // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
    // Units / actual limits: percent; clamped 0..100; multiplied by base topSpeed and rock resistance.
    // Increase/decrease: higher = harder to crack; lower = easier.
    // Examples: 15 = easy; 25 = Dirty current; 50 = harder.
    // Suggested start: 20..40 for current resistance. Together with: rockBreakSpeedPercent, resistanceMultiplier, largeRockResistance, topSpeed.
    rockCrackSpeedPercent: 35,

    // Controls: Normal impact threshold for breaking an intact rock; never below crack threshold.
    // Modes: ORIGINAL + HYBRID (main-game Rapier option + Dirt Jump Lab).
    // Units / actual limits: percent; clamped 0..100 then threshold raised to at least crack threshold.
    // Increase/decrease: higher = harder one-hit breaks; lower = easier.
    // Examples: 35 = easy; 55 = Dirty current; 75 = Stinky current.
    // Suggested start: 50..80 for intact-rock resistance. Together with: rockCrackSpeedPercent, resistanceMultiplier, topSpeed.
    rockBreakSpeedPercent: 75,

  },
};

// Original baselines moved from index.html unchanged; shared input/brake controls noted per property.
export const originalDriveConfig = {
  // Dirty / backhoe.
  dirty: {
    // Controls: Baseline forward/reverse drive acceleration, before speed adjustment in playable modes. Lab has its own engine acceleration.
    // Modes: ORIGINAL; HYBRID has its own arcadeHandlingConfig baseline.
    // Units / actual limits: m/s^2; no clamp; finite >=0 intended.
    // Increase/decrease: higher = quicker speed gain; lower = slower.
    // Examples: 6 = gentle; 8 = moderate; 11 = Dirty playable baseline.
    // Suggested start: 7..11 playable, 6..8 lab, matching current values. Together with: speedAdjustmentPercent, topSpeed/maxSpeed, drag.
    acceleration: 11,

    // Controls: Forward speed cap before speedAdjustmentPercent and hill modifier.
    // Modes: ORIGINAL; HYBRID has its own arcadeHandlingConfig baseline.
    // Units / actual limits: m/s; no clamp; finite >=0 intended.
    // Increase/decrease: higher = faster maximum; lower = slower.
    // Examples: 17 = Stinky baseline; 21 = Dirty baseline; 25 = faster.
    // Suggested start: 17..21 matches current playable tuning. Together with: acceleration, speedAdjustmentPercent, turn, tree/rock thresholds.
    topSpeed: 21,

    // Controls: Reverse speed cap before speedAdjustmentPercent and hill modifier.
    // Modes: ORIGINAL; HYBRID has its own arcadeHandlingConfig baseline.
    // Units / actual limits: m/s magnitude; no clamp; finite >=0 intended.
    // Increase/decrease: higher = faster reverse; lower = slower.
    // Examples: 4 = slow; 7 = Stinky current; 9 = Dirty current.
    // Suggested start: 4..9 for controlled reverse. Together with: speedAdjustmentPercent, releaseDeceleration.
    reverseSpeed: 9,

    // Controls: Grounded heading change rate at full steer above steeringFullSpeed.
    // Modes: ORIGINAL; HYBRID has its own arcadeHandlingConfig baseline.
    // Units / actual limits: rad/s; no clamp; finite >=0 intended.
    // Increase/decrease: higher = tighter turns; lower = wider turns.
    // Examples: .8 = gentle; 1.05 = Stinky current; 1.42 = Dirty current.
    // Suggested start: 1..1.5 matches current driving. Together with: steeringFullSpeed, steeringResponse (HYBRID), steeringInputRate.
    turn: 1.42,

    // Controls: Grounded proportional speed loss: speed -= speed * drag * dt * .08.
    // Modes: ORIGINAL; HYBRID has its own arcadeHandlingConfig baseline.
    // Units / actual limits: coefficient (effective decay .08*value per second); no clamp; nonnegative intended.
    // Increase/decrease: higher = more slowing/lower equilibrium speed; lower = longer coast.
    // Examples: .3 = light; .52 = Dirty current; .8 = Stinky current.
    // Suggested start: 0.3..0.8 around tested tuning. Together with: acceleration, releaseDeceleration.
    drag: 0.52,

    // Controls: Exponential input smoothing, shared by playable Original and HYBRID before yaw calculation.
    // Modes: ORIGINAL; steeringInputRate/brakeDeceleration/emergencyBrakeDeceleration also HYBRID.
    // Units / actual limits: 1/s; no clamp; finite >0 intended; 0 freezes steering input.
    // Increase/decrease: higher = quicker input response; lower = softer/slower.
    // Examples: 2 = soft; 5 = current; 10 = quick.
    // Suggested start: 3..8 around current 5. Together with: turn, steeringResponse; arcadeHandlingConfig has no duplicate smoothing rate.
    steeringInputRate: 5,

    // Controls: Horizontal speed where full grounded yaw rate is reached.
    // Modes: ORIGINAL; HYBRID has its own arcadeHandlingConfig baseline.
    // Units / actual limits: m/s; no clamp; finite >0 required.
    // Increase/decrease: higher = wider slow turns; lower = tighter slow turns.
    // Examples: 5 = early full turn; 9 = current; 15 = later full turn.
    // Suggested start: 6..12 around current 9. Together with: turn, steeringResponse, speedSteeringReduction.
    steeringFullSpeed: 9,

    // Controls: Braking/reverse-button stopping deceleration; separate from release and emergency braking.
    // Modes: ORIGINAL; steeringInputRate/brakeDeceleration/emergencyBrakeDeceleration also HYBRID.
    // Units / actual limits: m/s^2; no clamp; finite >=0 intended; per-step removal limited to current speed.
    // Increase/decrease: higher = stronger brakes; lower = longer stopping.
    // Examples: 12 = gentle; 24 = current; 32 = strong.
    // Suggested start: 18..30 around current 24. Together with: releaseDeceleration, emergencyBrakeDeceleration.
    brakeDeceleration: 24,

    // Controls: Extra speed removal while emergency brake is held.
    // Modes: ORIGINAL; steeringInputRate/brakeDeceleration/emergencyBrakeDeceleration also HYBRID.
    // Units / actual limits: m/s^2; no clamp; finite >=0 intended; removal cannot reverse speed.
    // Increase/decrease: higher = quicker emergency stop; lower = longer stop.
    // Examples: 20 = softer; 38 = current; 50 = sharp.
    // Suggested start: 30..45 around current 38. Together with: brakeDeceleration, releaseDeceleration (can also apply when throttle released).
    emergencyBrakeDeceleration: 38,

  },
  // Stinky / garbage truck.
  stinky: {
    // Controls: Baseline forward/reverse drive acceleration, before speed adjustment in playable modes. Lab has its own engine acceleration.
    // Modes: ORIGINAL; HYBRID has its own arcadeHandlingConfig baseline.
    // Units / actual limits: m/s^2; no clamp; finite >=0 intended.
    // Increase/decrease: higher = quicker speed gain; lower = slower.
    // Examples: 6 = gentle; 8 = moderate; 11 = Dirty playable baseline.
    // Suggested start: 7..11 playable, 6..8 lab, matching current values. Together with: speedAdjustmentPercent, topSpeed/maxSpeed, drag.
    acceleration: 7,

    // Controls: Forward speed cap before speedAdjustmentPercent and hill modifier.
    // Modes: ORIGINAL; HYBRID has its own arcadeHandlingConfig baseline.
    // Units / actual limits: m/s; no clamp; finite >=0 intended.
    // Increase/decrease: higher = faster maximum; lower = slower.
    // Examples: 17 = Stinky baseline; 21 = Dirty baseline; 25 = faster.
    // Suggested start: 17..21 matches current playable tuning. Together with: acceleration, speedAdjustmentPercent, turn, tree/rock thresholds.
    topSpeed: 17,

    // Controls: Reverse speed cap before speedAdjustmentPercent and hill modifier.
    // Modes: ORIGINAL; HYBRID has its own arcadeHandlingConfig baseline.
    // Units / actual limits: m/s magnitude; no clamp; finite >=0 intended.
    // Increase/decrease: higher = faster reverse; lower = slower.
    // Examples: 4 = slow; 7 = Stinky current; 9 = Dirty current.
    // Suggested start: 4..9 for controlled reverse. Together with: speedAdjustmentPercent, releaseDeceleration.
    reverseSpeed: 7,

    // Controls: Grounded heading change rate at full steer above steeringFullSpeed.
    // Modes: ORIGINAL; HYBRID has its own arcadeHandlingConfig baseline.
    // Units / actual limits: rad/s; no clamp; finite >=0 intended.
    // Increase/decrease: higher = tighter turns; lower = wider turns.
    // Examples: .8 = gentle; 1.05 = Stinky current; 1.42 = Dirty current.
    // Suggested start: 1..1.5 matches current driving. Together with: steeringFullSpeed, steeringResponse (HYBRID), steeringInputRate.
    turn: 1.05,

    // Controls: Grounded proportional speed loss: speed -= speed * drag * dt * .08.
    // Modes: ORIGINAL; HYBRID has its own arcadeHandlingConfig baseline.
    // Units / actual limits: coefficient (effective decay .08*value per second); no clamp; nonnegative intended.
    // Increase/decrease: higher = more slowing/lower equilibrium speed; lower = longer coast.
    // Examples: .3 = light; .52 = Dirty current; .8 = Stinky current.
    // Suggested start: 0.3..0.8 around tested tuning. Together with: acceleration, releaseDeceleration.
    drag: 0.8,

    // Controls: Exponential input smoothing, shared by playable Original and HYBRID before yaw calculation.
    // Modes: ORIGINAL; steeringInputRate/brakeDeceleration/emergencyBrakeDeceleration also HYBRID.
    // Units / actual limits: 1/s; no clamp; finite >0 intended; 0 freezes steering input.
    // Increase/decrease: higher = quicker input response; lower = softer/slower.
    // Examples: 2 = soft; 5 = current; 10 = quick.
    // Suggested start: 3..8 around current 5. Together with: turn, steeringResponse; arcadeHandlingConfig has no duplicate smoothing rate.
    steeringInputRate: 5,

    // Controls: Horizontal speed where full grounded yaw rate is reached.
    // Modes: ORIGINAL; HYBRID has its own arcadeHandlingConfig baseline.
    // Units / actual limits: m/s; no clamp; finite >0 required.
    // Increase/decrease: higher = wider slow turns; lower = tighter slow turns.
    // Examples: 5 = early full turn; 9 = current; 15 = later full turn.
    // Suggested start: 6..12 around current 9. Together with: turn, steeringResponse, speedSteeringReduction.
    steeringFullSpeed: 9,

    // Controls: Braking/reverse-button stopping deceleration; separate from release and emergency braking.
    // Modes: ORIGINAL; steeringInputRate/brakeDeceleration/emergencyBrakeDeceleration also HYBRID.
    // Units / actual limits: m/s^2; no clamp; finite >=0 intended; per-step removal limited to current speed.
    // Increase/decrease: higher = stronger brakes; lower = longer stopping.
    // Examples: 12 = gentle; 24 = current; 32 = strong.
    // Suggested start: 18..30 around current 24. Together with: releaseDeceleration, emergencyBrakeDeceleration.
    brakeDeceleration: 24,

    // Controls: Extra speed removal while emergency brake is held.
    // Modes: ORIGINAL; steeringInputRate/brakeDeceleration/emergencyBrakeDeceleration also HYBRID.
    // Units / actual limits: m/s^2; no clamp; finite >=0 intended; removal cannot reverse speed.
    // Increase/decrease: higher = quicker emergency stop; lower = longer stop.
    // Examples: 20 = softer; 38 = current; 50 = sharp.
    // Suggested start: 30..45 around current 38. Together with: brakeDeceleration, releaseDeceleration (can also apply when throttle released).
    emergencyBrakeDeceleration: 38,

  },
};

// Playable Rapier/HYBRID per-vehicle drive, wheel, flight and landing controls.
export const arcadeHandlingConfig = {
  // Dirty / backhoe.
  dirty: {
    // Controls: Baseline forward/reverse drive acceleration, before speed adjustment in playable modes. Lab has its own engine acceleration.
    // Modes: HYBRID only (main-game Rapier option + Dirt Jump Lab); INACTIVE in legacy raycast tests and ORIGINAL.
    // Units / actual limits: m/s^2; no clamp; finite >=0 intended.
    // Increase/decrease: higher = quicker speed gain; lower = slower.
    // Examples: 6 = gentle; 8 = moderate; 11 = Dirty playable baseline.
    // Suggested start: 7..11 playable, 6..8 lab, matching current values. Together with: speedAdjustmentPercent, topSpeed/maxSpeed, drag.
    acceleration: 11,

    // Controls: Forward speed cap before speedAdjustmentPercent and hill modifier.
    // Modes: HYBRID only (main-game Rapier option + Dirt Jump Lab); INACTIVE in legacy raycast tests and ORIGINAL.
    // Units / actual limits: m/s; no clamp; finite >=0 intended.
    // Increase/decrease: higher = faster maximum; lower = slower.
    // Examples: 17 = Stinky baseline; 21 = Dirty baseline; 25 = faster.
    // Suggested start: 17..21 matches current playable tuning. Together with: acceleration, speedAdjustmentPercent, turn, tree/rock thresholds.
    topSpeed: 21,

    // Controls: Reverse speed cap before speedAdjustmentPercent and hill modifier.
    // Modes: HYBRID only (main-game Rapier option + Dirt Jump Lab); INACTIVE in legacy raycast tests and ORIGINAL.
    // Units / actual limits: m/s magnitude; no clamp; finite >=0 intended.
    // Increase/decrease: higher = faster reverse; lower = slower.
    // Examples: 4 = slow; 7 = Stinky current; 9 = Dirty current.
    // Suggested start: 4..9 for controlled reverse. Together with: speedAdjustmentPercent, releaseDeceleration.
    reverseSpeed: 9,

    // Controls: Grounded heading change rate at full steer above steeringFullSpeed.
    // Modes: HYBRID only (main-game Rapier option + Dirt Jump Lab); INACTIVE in legacy raycast tests and ORIGINAL.
    // Units / actual limits: rad/s; no clamp; finite >=0 intended.
    // Increase/decrease: higher = tighter turns; lower = wider turns.
    // Examples: .8 = gentle; 1.05 = Stinky current; 1.42 = Dirty current.
    // Suggested start: 1..1.5 matches current driving. Together with: steeringFullSpeed, steeringResponse (HYBRID), steeringInputRate.
    turn: 1.42,

    // Controls: Grounded proportional speed loss: speed -= speed * drag * dt * .08.
    // Modes: HYBRID only (main-game Rapier option + Dirt Jump Lab); INACTIVE in legacy raycast tests and ORIGINAL.
    // Units / actual limits: coefficient (effective decay .08*value per second); no clamp; nonnegative intended.
    // Increase/decrease: higher = more slowing/lower equilibrium speed; lower = longer coast.
    // Examples: .3 = light; .52 = Dirty current; .8 = Stinky current.
    // Suggested start: 0.3..0.8 around tested tuning. Together with: acceleration, releaseDeceleration.
    drag: 0.52,

    // Controls: Multiplier on grounded yaw rate; input smoothing is controlled separately by steeringInputRate.
    // Modes: HYBRID only (main-game Rapier option + Dirt Jump Lab); INACTIVE in legacy raycast tests and ORIGINAL.
    // Units / actual limits: unitless; no clamp; finite >=0 intended.
    // Increase/decrease: higher = tighter/faster turns; lower = wider turns.
    // Examples: .7 = softer; 1 = Original parity; 1.2 = quicker.
    // Suggested start: 0.8..1.2 around parity. Together with: turn, steeringInputRate, speedSteeringReduction.
    steeringResponse: 1,

    // Controls: Horizontal speed where full grounded yaw rate is reached.
    // Modes: HYBRID only (main-game Rapier option + Dirt Jump Lab); INACTIVE in legacy raycast tests and ORIGINAL.
    // Units / actual limits: m/s; no clamp; finite >0 required.
    // Increase/decrease: higher = wider slow turns; lower = tighter slow turns.
    // Examples: 5 = early full turn; 9 = current; 15 = later full turn.
    // Suggested start: 6..12 around current 9. Together with: turn, steeringResponse, speedSteeringReduction.
    steeringFullSpeed: 9,

    // Controls: Reduces yaw multiplier to 1/(1 + value*absoluteSpeed) at speed.
    // Modes: HYBRID only (main-game Rapier option + Dirt Jump Lab); INACTIVE in legacy raycast tests and ORIGINAL.
    // Units / actual limits: s/m; no clamp; finite >=0 required to avoid zero/negative denominator.
    // Increase/decrease: higher = wider high-speed turns; lower = more direct.
    // Examples: .0 = Original parity; .01 = 2/3 yaw at 50 m/s; .02 = half yaw at 50.
    // Suggested start: 0..0.01 if softening fast turns. Together with: turn, steeringResponse, topSpeed.
    speedSteeringReduction: 0,

    // Controls: Visual wheel compression approach rate; wheels apply no chassis force.
    // Modes: HYBRID only (main-game Rapier option + Dirt Jump Lab); INACTIVE in legacy raycast tests and ORIGINAL.
    // Units / actual limits: 1/s; no clamp; finite >=0 intended.
    // Increase/decrease: higher = quicker wheel reaction; lower = slower.
    // Examples: 8 = soft/slow; 24 = Dirty current; 35 = quick.
    // Suggested start: 16..30 around current rates. Together with: suspensionDamping, landingCompressionScale.
    suspensionStiffness: 24,

    // Controls: Visual wheel compression return rate; not chassis force or body spring damping.
    // Modes: HYBRID only (main-game Rapier option + Dirt Jump Lab); INACTIVE in legacy raycast tests and ORIGINAL.
    // Units / actual limits: 1/s; no clamp; finite >=0 intended.
    // Increase/decrease: higher = faster wheel settling; lower = lingering wheel compression.
    // Examples: 8 = slow; 16 = Dirty current; 24 = fast.
    // Suggested start: 12..24 around tested values. Together with: suspensionStiffness, landingCompressionScale, bodyDamping.
    suspensionDamping: 16,

    // Controls: Minimum upward tangent speed needed for natural ramp release.
    // Modes: HYBRID only (main-game Rapier option + Dirt Jump Lab); INACTIVE in legacy raycast tests and ORIGINAL.
    // Units / actual limits: m/s upward; no clamp; finite >=0 intended.
    // Increase/decrease: higher = fewer small-bump launches; lower = easier takeoff.
    // Examples: .5 = sensitive; 1.5 = current; 3 = more selective.
    // Suggested start: 1..3 for current terrain. Together with: takeoffClearance, ramp heights, topSpeed.
    minimumLaunchSpeed: 1.5,

    // Controls: Gap between projected ballistic root height and next terrain support needed to leave ground.
    // Modes: HYBRID only (main-game Rapier option + Dirt Jump Lab); INACTIVE in legacy raycast tests and ORIGINAL.
    // Units / actual limits: meters; no clamp; finite >=0 intended; evaluated at fixed 1/120 s.
    // Increase/decrease: higher = suppresses small convex bumps; lower = more sensitive lips.
    // Examples: .005 = sensitive; .012 = current; .03 = selective.
    // Suggested start: 0.005..0.03 around tested .012. Together with: minimumLaunchSpeed, topSpeed, gravityScalePercent.
    takeoffClearance: 0.012,

    // Controls: Physical roll torque from steering during HYBRID flight; does not change grounded stability.
    // Modes: HYBRID only (main-game Rapier option + Dirt Jump Lab); INACTIVE in legacy raycast tests and ORIGINAL.
    // Units / actual limits: percent; clamped 0..100.
    // Increase/decrease: higher = quicker air roll; lower = calmer air attitude.
    // Examples: 0 = no roll input; 12 = Dirty current; 30 = stronger.
    // Suggested start: 5..20 for forgiving air control. Together with: airborneAngularDamping, airbornePitchControlPercent, cannon airControlPercent.
    airborneRollControlPercent: 12,

    // Controls: Rapier angular velocity damping during HYBRID flight. Ground orientation is always terrain-aligned.
    // Modes: HYBRID only (main-game Rapier option + Dirt Jump Lab); INACTIVE in legacy raycast tests and ORIGINAL.
    // Units / actual limits: 1/s damping coefficient; negative becomes 0; no upper cap.
    // Increase/decrease: higher = suppresses spin; lower = longer spin.
    // Examples: 0 = free spin; 1.5 = previous hardcoded/current; 3 = stronger damping.
    // Suggested start: 1..3 around tested 1.5. Together with: airborneRollControlPercent, airbornePitchControlPercent, launchSpinPercent.
    airborneAngularDamping: 1.5,

    // Controls: Visual wheel compression per m/s of downward landing impact; final compression capped at .25 m.
    // Modes: HYBRID only (main-game Rapier option + Dirt Jump Lab); INACTIVE in legacy raycast tests and ORIGINAL.
    // Units / actual limits: seconds (meters compression per m/s); no clamp on scale; nonnegative intended.
    // Increase/decrease: higher = deeper visible wheel dip; lower = shallower.
    // Examples: .01 = .1 m at 10 m/s; .025 = .25 m at 10; .04 = reaches cap earlier.
    // Suggested start: 0.01..0.025 for subtle-to-current dip. Together with: suspensionDamping, landingBouncePercent, landingDamping.
    landingCompressionScale: 0.025,

    // Controls: Fraction of heading-projected horizontal speed kept when flight returns to ground.
    // Modes: HYBRID only (main-game Rapier option + Dirt Jump Lab); INACTIVE in legacy raycast tests and ORIGINAL.
    // Units / actual limits: ratio; clamped 0..1.
    // Increase/decrease: higher = keeps momentum; lower = slows on touchdown.
    // Examples: 0 = stops; .7 = loses 30%; 1 = current momentum retained.
    // Suggested start: 0.85..1 to avoid abrupt speed loss. Together with: landingDamping affects appearance only; airborne controls set landing heading.
    landingSpeedRetention: 1,

  },
  // Stinky / garbage truck.
  stinky: {
    // Controls: Baseline forward/reverse drive acceleration, before speed adjustment in playable modes. Lab has its own engine acceleration.
    // Modes: HYBRID only (main-game Rapier option + Dirt Jump Lab); INACTIVE in legacy raycast tests and ORIGINAL.
    // Units / actual limits: m/s^2; no clamp; finite >=0 intended.
    // Increase/decrease: higher = quicker speed gain; lower = slower.
    // Examples: 6 = gentle; 8 = moderate; 11 = Dirty playable baseline.
    // Suggested start: 7..11 playable, 6..8 lab, matching current values. Together with: speedAdjustmentPercent, topSpeed/maxSpeed, drag.
    acceleration: 7,

    // Controls: Forward speed cap before speedAdjustmentPercent and hill modifier.
    // Modes: HYBRID only (main-game Rapier option + Dirt Jump Lab); INACTIVE in legacy raycast tests and ORIGINAL.
    // Units / actual limits: m/s; no clamp; finite >=0 intended.
    // Increase/decrease: higher = faster maximum; lower = slower.
    // Examples: 17 = Stinky baseline; 21 = Dirty baseline; 25 = faster.
    // Suggested start: 17..21 matches current playable tuning. Together with: acceleration, speedAdjustmentPercent, turn, tree/rock thresholds.
    topSpeed: 17,

    // Controls: Reverse speed cap before speedAdjustmentPercent and hill modifier.
    // Modes: HYBRID only (main-game Rapier option + Dirt Jump Lab); INACTIVE in legacy raycast tests and ORIGINAL.
    // Units / actual limits: m/s magnitude; no clamp; finite >=0 intended.
    // Increase/decrease: higher = faster reverse; lower = slower.
    // Examples: 4 = slow; 7 = Stinky current; 9 = Dirty current.
    // Suggested start: 4..9 for controlled reverse. Together with: speedAdjustmentPercent, releaseDeceleration.
    reverseSpeed: 7,

    // Controls: Grounded heading change rate at full steer above steeringFullSpeed.
    // Modes: HYBRID only (main-game Rapier option + Dirt Jump Lab); INACTIVE in legacy raycast tests and ORIGINAL.
    // Units / actual limits: rad/s; no clamp; finite >=0 intended.
    // Increase/decrease: higher = tighter turns; lower = wider turns.
    // Examples: .8 = gentle; 1.05 = Stinky current; 1.42 = Dirty current.
    // Suggested start: 1..1.5 matches current driving. Together with: steeringFullSpeed, steeringResponse (HYBRID), steeringInputRate.
    turn: 1.05,

    // Controls: Grounded proportional speed loss: speed -= speed * drag * dt * .08.
    // Modes: HYBRID only (main-game Rapier option + Dirt Jump Lab); INACTIVE in legacy raycast tests and ORIGINAL.
    // Units / actual limits: coefficient (effective decay .08*value per second); no clamp; nonnegative intended.
    // Increase/decrease: higher = more slowing/lower equilibrium speed; lower = longer coast.
    // Examples: .3 = light; .52 = Dirty current; .8 = Stinky current.
    // Suggested start: 0.3..0.8 around tested tuning. Together with: acceleration, releaseDeceleration.
    drag: 0.8,

    // Controls: Multiplier on grounded yaw rate; input smoothing is controlled separately by steeringInputRate.
    // Modes: HYBRID only (main-game Rapier option + Dirt Jump Lab); INACTIVE in legacy raycast tests and ORIGINAL.
    // Units / actual limits: unitless; no clamp; finite >=0 intended.
    // Increase/decrease: higher = tighter/faster turns; lower = wider turns.
    // Examples: .7 = softer; 1 = Original parity; 1.2 = quicker.
    // Suggested start: 0.8..1.2 around parity. Together with: turn, steeringInputRate, speedSteeringReduction.
    steeringResponse: 1,

    // Controls: Horizontal speed where full grounded yaw rate is reached.
    // Modes: HYBRID only (main-game Rapier option + Dirt Jump Lab); INACTIVE in legacy raycast tests and ORIGINAL.
    // Units / actual limits: m/s; no clamp; finite >0 required.
    // Increase/decrease: higher = wider slow turns; lower = tighter slow turns.
    // Examples: 5 = early full turn; 9 = current; 15 = later full turn.
    // Suggested start: 6..12 around current 9. Together with: turn, steeringResponse, speedSteeringReduction.
    steeringFullSpeed: 9,

    // Controls: Reduces yaw multiplier to 1/(1 + value*absoluteSpeed) at speed.
    // Modes: HYBRID only (main-game Rapier option + Dirt Jump Lab); INACTIVE in legacy raycast tests and ORIGINAL.
    // Units / actual limits: s/m; no clamp; finite >=0 required to avoid zero/negative denominator.
    // Increase/decrease: higher = wider high-speed turns; lower = more direct.
    // Examples: .0 = Original parity; .01 = 2/3 yaw at 50 m/s; .02 = half yaw at 50.
    // Suggested start: 0..0.01 if softening fast turns. Together with: turn, steeringResponse, topSpeed.
    speedSteeringReduction: 0,

    // Controls: Visual wheel compression approach rate; wheels apply no chassis force.
    // Modes: HYBRID only (main-game Rapier option + Dirt Jump Lab); INACTIVE in legacy raycast tests and ORIGINAL.
    // Units / actual limits: 1/s; no clamp; finite >=0 intended.
    // Increase/decrease: higher = quicker wheel reaction; lower = slower.
    // Examples: 8 = soft/slow; 24 = Dirty current; 35 = quick.
    // Suggested start: 16..30 around current rates. Together with: suspensionDamping, landingCompressionScale.
    suspensionStiffness: 20,

    // Controls: Visual wheel compression return rate; not chassis force or body spring damping.
    // Modes: HYBRID only (main-game Rapier option + Dirt Jump Lab); INACTIVE in legacy raycast tests and ORIGINAL.
    // Units / actual limits: 1/s; no clamp; finite >=0 intended.
    // Increase/decrease: higher = faster wheel settling; lower = lingering wheel compression.
    // Examples: 8 = slow; 16 = Dirty current; 24 = fast.
    // Suggested start: 12..24 around tested values. Together with: suspensionStiffness, landingCompressionScale, bodyDamping.
    suspensionDamping: 14,

    // Controls: Minimum upward tangent speed needed for natural ramp release.
    // Modes: HYBRID only (main-game Rapier option + Dirt Jump Lab); INACTIVE in legacy raycast tests and ORIGINAL.
    // Units / actual limits: m/s upward; no clamp; finite >=0 intended.
    // Increase/decrease: higher = fewer small-bump launches; lower = easier takeoff.
    // Examples: .5 = sensitive; 1.5 = current; 3 = more selective.
    // Suggested start: 1..3 for current terrain. Together with: takeoffClearance, ramp heights, topSpeed.
    minimumLaunchSpeed: 1.5,

    // Controls: Gap between projected ballistic root height and next terrain support needed to leave ground.
    // Modes: HYBRID only (main-game Rapier option + Dirt Jump Lab); INACTIVE in legacy raycast tests and ORIGINAL.
    // Units / actual limits: meters; no clamp; finite >=0 intended; evaluated at fixed 1/120 s.
    // Increase/decrease: higher = suppresses small convex bumps; lower = more sensitive lips.
    // Examples: .005 = sensitive; .012 = current; .03 = selective.
    // Suggested start: 0.005..0.03 around tested .012. Together with: minimumLaunchSpeed, topSpeed, gravityScalePercent.
    takeoffClearance: 0.012,

    // Controls: Physical roll torque from steering during HYBRID flight; does not change grounded stability.
    // Modes: HYBRID only (main-game Rapier option + Dirt Jump Lab); INACTIVE in legacy raycast tests and ORIGINAL.
    // Units / actual limits: percent; clamped 0..100.
    // Increase/decrease: higher = quicker air roll; lower = calmer air attitude.
    // Examples: 0 = no roll input; 12 = Dirty current; 30 = stronger.
    // Suggested start: 5..20 for forgiving air control. Together with: airborneAngularDamping, airbornePitchControlPercent, cannon airControlPercent.
    airborneRollControlPercent: 10,

    // Controls: Rapier angular velocity damping during HYBRID flight. Ground orientation is always terrain-aligned.
    // Modes: HYBRID only (main-game Rapier option + Dirt Jump Lab); INACTIVE in legacy raycast tests and ORIGINAL.
    // Units / actual limits: 1/s damping coefficient; negative becomes 0; no upper cap.
    // Increase/decrease: higher = suppresses spin; lower = longer spin.
    // Examples: 0 = free spin; 1.5 = previous hardcoded/current; 3 = stronger damping.
    // Suggested start: 1..3 around tested 1.5. Together with: airborneRollControlPercent, airbornePitchControlPercent, launchSpinPercent.
    airborneAngularDamping: 1.5,

    // Controls: Visual wheel compression per m/s of downward landing impact; final compression capped at .25 m.
    // Modes: HYBRID only (main-game Rapier option + Dirt Jump Lab); INACTIVE in legacy raycast tests and ORIGINAL.
    // Units / actual limits: seconds (meters compression per m/s); no clamp on scale; nonnegative intended.
    // Increase/decrease: higher = deeper visible wheel dip; lower = shallower.
    // Examples: .01 = .1 m at 10 m/s; .025 = .25 m at 10; .04 = reaches cap earlier.
    // Suggested start: 0.01..0.025 for subtle-to-current dip. Together with: suspensionDamping, landingBouncePercent, landingDamping.
    landingCompressionScale: 0.025,

    // Controls: Fraction of heading-projected horizontal speed kept when flight returns to ground.
    // Modes: HYBRID only (main-game Rapier option + Dirt Jump Lab); INACTIVE in legacy raycast tests and ORIGINAL.
    // Units / actual limits: ratio; clamped 0..1.
    // Increase/decrease: higher = keeps momentum; lower = slows on touchdown.
    // Examples: 0 = stops; .7 = loses 30%; 1 = current momentum retained.
    // Suggested start: 0.85..1 to avoid abrupt speed loss. Together with: landingDamping affects appearance only; airborne controls set landing heading.
    landingSpeedRetention: 1,

  },
};

// Shared hill sampling and smoothing; keep fullEffectGrade > flatGrade.
export const hillSettings = {
  // Controls: Terrain rise/run that gives full uphill/downhill percentage effect.
  // Modes: ORIGINAL + HYBRID; INACTIVE in legacy raycast tests.
  // Units / actual limits: rise/run ratio; no clamp; must be finite and > flatGrade.
  // Increase/decrease: higher = gentler slope effects; lower = stronger effects on mild hills.
  // Examples: .2 = full at 20% grade; .35 = current; .5 = full at 50%.
  // Suggested start: 0.25..0.5 around current terrain grades. Together with: flatGrade, uphillPenaltyPercent, downhillBoostPercent.
  fullEffectGrade: 0.35,

  // Controls: Dead band below which terrain grade has no hill effect.
  // Modes: ORIGINAL + HYBRID; INACTIVE in legacy raycast tests.
  // Units / actual limits: rise/run ratio; no clamp; use 0 <= value < fullEffectGrade.
  // Increase/decrease: higher = more slopes treated as flat; lower = more sensitive.
  // Examples: .0 = no dead band; .015 = 1.5%; .05 = 5%.
  // Suggested start: 0..0.03 for small-slope filtering. Together with: fullEffectGrade.
  flatGrade: 0.015,

  // Controls: Exponential time constant smoothing hill grade and speed modifier.
  // Modes: ORIGINAL + HYBRID; INACTIVE in legacy raycast tests.
  // Units / actual limits: seconds; no clamp; finite >0 required.
  // Increase/decrease: higher = slower hill response; lower = quicker response.
  // Examples: .2 = quick; .6 = current; 1.2 = gradual.
  // Suggested start: 0.3..1 for smooth onset. Together with: sampleDistance, speedSettlingRate.
  responseSeconds: 0.6,

  // Controls: Forward/back terrain sample offset for measuring slope.
  // Modes: ORIGINAL + HYBRID; INACTIVE in legacy raycast tests.
  // Units / actual limits: meters each side; no clamp; finite >0 required.
  // Increase/decrease: higher = smoother broad slope estimate; lower = more local variation.
  // Examples: .5 = local; 1 = current; 2 = broad.
  // Suggested start: 0.5..2 for current terrain. Together with: responseSeconds, fullEffectGrade.
  sampleDistance: 1,

  // Controls: Exponential removal of existing overspeed when hill speed limit drops.
  // Modes: ORIGINAL + HYBRID; INACTIVE in legacy raycast tests.
  // Units / actual limits: 1/s; no clamp; use finite >=0.
  // Increase/decrease: higher = faster return to cap; lower = longer overspeed tail.
  // Examples: 0 = retains prior overspeed; 2.5 = current; 5 = faster.
  // Suggested start: 1..5 for smooth speed limits. Together with: responseSeconds, downhillBoostPercent.
  speedSettlingRate: 2.5,

};

// Playable chase-camera orbit return.
export const cameraSettings = {
  // Controls: Returns released camera orbit yaw/pitch to chase position.
  // Modes: ORIGINAL + HYBRID; INACTIVE in lab orbit camera.
  // Units / actual limits: percent; clamped 0..100; decay rate = 8 * value/100 per second.
  // Increase/decrease: higher = quicker return; lower = slower return.
  // Examples: 0 = hold orbit; 50 = 95% return in .75 s; 100 = about .375 s.
  // Suggested start: 25..60 for comfortable return. Together with: none; independent of vehicle physics.
  cameraReturnSpeedPercent: 50,

};

// Tree interaction lifecycle and retained inactive legacy fields.
export const treeConfig = {
  // Controls: Time taken by a knocked-down tree to fall.
  // Modes: ORIGINAL + HYBRID main-world environment; INACTIVE in legacy raycast tests.
  // Units / actual limits: seconds; effective minimum .01; no upper cap.
  // Increase/decrease: higher = slower fall; lower = quicker fall.
  // Examples: .5 = quick; .8 = current; 1.5 = slow.
  // Suggested start: 0.5..1.5 for current animation. Together with: recoveryDelaySeconds.
  fallDurationSeconds: 0.8,

  // Controls: Time a fallen tree waits before recovery, unless vehicle occupies it.
  // Modes: ORIGINAL + HYBRID main-world environment; INACTIVE in legacy raycast tests.
  // Units / actual limits: seconds; no clamp; nonnegative intended.
  // Increase/decrease: higher = longer fallen state; lower = earlier recovery.
  // Examples: 2 = brief; 8 = current; 15 = long.
  // Suggested start: 5..15 to allow driving away. Together with: recoveryDurationSeconds.
  recoveryDelaySeconds: 8,

  // Controls: Time for a tree to stand back up once unoccupied.
  // Modes: ORIGINAL + HYBRID main-world environment; INACTIVE in legacy raycast tests.
  // Units / actual limits: seconds; effective minimum .01; no upper cap.
  // Increase/decrease: higher = slower recovery; lower = quicker recovery.
  // Examples: .5 = quick; 1.5 = current; 3 = slow.
  // Suggested start: 1..3 for visible recovery. Together with: recoveryDelaySeconds.
  recoveryDurationSeconds: 1.5,

  // Controls: INACTIVE legacy tree tuning: no runtime consumer; fallDurationSeconds is the only active fall-time setting.
  // Modes: ORIGINAL + HYBRID main-world environment; INACTIVE in legacy raycast tests.
  // Units / actual limits: stored numeric value; no supported active range.
  // Increase/decrease: increasing/decreasing has no effect.
  // Examples: 0.5 = no effect; 1 = no effect; 2 = no effect.
  // Suggested start: none: inactive. Together with: fallDurationSeconds instead.
  minFallDurationSeconds: 0.5,

  // Controls: INACTIVE legacy tree tuning: no runtime consumer; fallDurationSeconds is the only active fall-time setting.
  // Modes: ORIGINAL + HYBRID main-world environment; INACTIVE in legacy raycast tests.
  // Units / actual limits: stored numeric value; no supported active range.
  // Increase/decrease: increasing/decreasing has no effect.
  // Examples: 0.5 = no effect; 1 = no effect; 2 = no effect.
  // Suggested start: none: inactive. Together with: fallDurationSeconds instead.
  maxFallDurationSeconds: 1.8,

  // Controls: INACTIVE legacy tree tuning: no runtime consumer; fallDurationSeconds is the only active fall-time setting.
  // Modes: ORIGINAL + HYBRID main-world environment; INACTIVE in legacy raycast tests.
  // Units / actual limits: stored numeric value; no supported active range.
  // Increase/decrease: increasing/decreasing has no effect.
  // Examples: 0.5 = no effect; 1 = no effect; 2 = no effect.
  // Suggested start: none: inactive. Together with: fallDurationSeconds instead.
  fallSpeedExponent: 1.5,

};

// Rock interaction lifecycle and procedural fragment settings.
export const rockConfig = {
  // Controls: Broken rock respawn delay and fragment lifetime; occupied spawn waits.
  // Modes: ORIGINAL + HYBRID main-world environment; INACTIVE in legacy raycast tests.
  // Units / actual limits: seconds; no clamp; use finite >0.
  // Increase/decrease: higher = longer debris/absence; lower = faster return.
  // Examples: 5 = quick; 15 = current; 30 = long.
  // Suggested start: 10..30 for current interaction pacing. Together with: reformSeconds, maxFragments.
  respawnSeconds: 15,

  // Controls: Rock reappearance growth animation duration.
  // Modes: ORIGINAL + HYBRID main-world environment; INACTIVE in legacy raycast tests.
  // Units / actual limits: seconds; effective minimum .01; no upper cap.
  // Increase/decrease: higher = slower growth; lower = faster.
  // Examples: .3 = fast; .9 = current; 2 = slow.
  // Suggested start: 0.5..2 for visible return. Together with: respawnSeconds.
  reformSeconds: 0.9,

  // Controls: Procedural fragments activated per broken rock. Imported Blender model fragments use their own five chunks.
  // Modes: ORIGINAL + HYBRID main-world environment; INACTIVE in legacy raycast tests.
  // Units / actual limits: count; rounded then clamped 3..6.
  // Increase/decrease: higher = more procedural chunks; lower = fewer.
  // Examples: 3 = few; 5 = current; 6 = maximum.
  // Suggested start: 3..6; imported model count unaffected. Together with: maxFragments.
  fragmentCount: 5,

  // Controls: Preallocated procedural fragment pool, reused when full; imported model fragments have separate lifecycle.
  // Modes: ORIGINAL + HYBRID main-world environment; INACTIVE in legacy raycast tests.
  // Units / actual limits: count; floored with minimum 6; no upper cap.
  // Increase/decrease: higher = more simultaneous chunks/memory; lower = earlier reuse.
  // Examples: 12 = small pool; 48 = current; 72 = larger pool.
  // Suggested start: 24..64 for bounded procedural effects. Together with: fragmentCount, respawnSeconds.
  maxFragments: 48,

  // Controls: Procedural rock fragment vertical restitution; does not control vehicle landing or imported model fragment bounce.
  // Modes: ORIGINAL + HYBRID main-world environment; INACTIVE in legacy raycast tests.
  // Units / actual limits: ratio; clamped 0..0.7.
  // Increase/decrease: higher = bouncier fragments; lower = less bounce.
  // Examples: 0 = no bounce; .35 = current; .7 = max.
  // Suggested start: 0.1..0.4 for soft debris. Together with: respawnSeconds; vehicle landing uses landingBouncePercent.
  bounceStrength: 0.35,

  // Controls: Scales crack/break impact thresholds for blocking rocks.
  // Modes: ORIGINAL + HYBRID main-world environment; INACTIVE in legacy raycast tests.
  // Units / actual limits: unitless multiplier; no clamp; use finite >=0.
  // Increase/decrease: higher = harder rocks; lower = easier breaks.
  // Examples: .5 = half thresholds; 1 = current; 1.5 = harder.
  // Suggested start: 0.7..1.3 for current speeds. Together with: rockCrackSpeedPercent, rockBreakSpeedPercent, largeRockResistance.
  resistanceMultiplier: 1,

  // Controls: Rocks at or below this collision radius yield/push aside instead of blocking.
  // Modes: ORIGINAL + HYBRID main-world environment; INACTIVE in legacy raycast tests.
  // Units / actual limits: meters; no clamp; nonnegative intended.
  // Increase/decrease: higher = more rocks become pushable; lower = more block.
  // Examples: .4 = fewer pushable; .7 = current; 1 = more pushable.
  // Suggested start: 0.4..0.8 for current rock sizes. Together with: largeRockRadius, resistanceMultiplier.
  smallRockRadius: 0.7,

  // Controls: Radius at/above which extra large-rock resistance applies.
  // Modes: ORIGINAL + HYBRID main-world environment; INACTIVE in legacy raycast tests.
  // Units / actual limits: meters; no clamp; nonnegative intended.
  // Increase/decrease: higher = fewer extra-resistant rocks; lower = more.
  // Examples: .9 = many; 1.25 = current; 1.6 = fewer.
  // Suggested start: 1..1.6 for current rock sizes. Together with: smallRockRadius, largeRockResistance.
  largeRockRadius: 1.25,

  // Controls: Extra threshold multiplier for rocks meeting largeRockRadius.
  // Modes: ORIGINAL + HYBRID main-world environment; INACTIVE in legacy raycast tests.
  // Units / actual limits: unitless; no clamp; nonnegative intended.
  // Increase/decrease: higher = tougher large rocks; lower = softer.
  // Examples: 1 = no extra; 1.3 = current; 2 = double.
  // Suggested start: 1..1.5 for mild size differences. Together with: largeRockRadius, resistanceMultiplier.
  largeRockResistance: 1.3,

  // Controls: Minimum interval between accepted hit reactions on one rock.
  // Modes: ORIGINAL + HYBRID main-world environment; INACTIVE in legacy raycast tests.
  // Units / actual limits: seconds; no clamp; nonnegative intended.
  // Increase/decrease: higher = fewer repeated hits; lower = quicker follow-up.
  // Examples: 0 = every eligible frame; .65 = current; 1 = slower.
  // Suggested start: 0.4..1 to prevent rapid repeated reactions. Together with: rockCrackSpeedPercent, rockBreakSpeedPercent.
  hitCooldownSeconds: 0.65,

};

// Stationary detail generation and visual wheel/body feedback.
export const groundDebrisConfig = {
  // Controls: Creates stationary ground debris and enables its wheel queries.
  // Modes: ORIGINAL + HYBRID main-world environment; INACTIVE in legacy raycast tests.
  // Units / actual limits: boolean true/false.
  // Increase/decrease: true = debris shown/queried; false = absent on reload.
  // Examples: true = debris; false = none.
  // Suggested start: true; reduce density for performance. Together with: densityPercent, suspensionEffectPercent.
  enabled: true,

  // Controls: Budget for stationary ground details; placement filters can reduce actual count.
  // Modes: ORIGINAL + HYBRID main-world environment; INACTIVE in legacy raycast tests.
  // Units / actual limits: percent; clamped 0..100; budget round(1000*percent/100).
  // Increase/decrease: higher = more details; lower = fewer.
  // Examples: 0 = none; 70 = up to 700; 100 = up to 1000.
  // Suggested start: 30..70 for moderate detail budgets. Together with: interactivePercent, distribution weights.
  densityPercent: 70,

  // Controls: Fraction of ground details that create wheel/body feedback rather than decoration only.
  // Modes: ORIGINAL + HYBRID main-world environment; INACTIVE in legacy raycast tests.
  // Units / actual limits: percent; clamped 0..100; existing 450 is effectively 100.
  // Increase/decrease: higher = more interactive bumps; lower = more decorative only.
  // Examples: 0 = decorative; 50 = half; 100 = all (450 is the same).
  // Suggested start: 20..70 for gentler roughness. Together with: densityPercent, minBumpHeight, maxBumpHeight, suspensionEffectPercent.
  interactivePercent: 450,

  // Controls: Minimum height of interactive debris; decorative debris stays .025.. .06 m.
  // Modes: ORIGINAL + HYBRID main-world environment; INACTIVE in legacy raycast tests.
  // Units / actual limits: meters; clamped 0..0.5.
  // Increase/decrease: higher = all interactive bumps taller; lower = smaller possible bumps.
  // Examples: .03 = small; .1 = visible; .5 = maximum/current.
  // Suggested start: 0.03..0.15 for subtle wheel motion. Together with: maxBumpHeight must be >= this; suspensionEffectPercent.
  minBumpHeight: 0.5,

  // Controls: Maximum interactive debris height. Current .25 is raised to .5 because minBumpHeight is .5.
  // Modes: ORIGINAL + HYBRID main-world environment; INACTIVE in legacy raycast tests.
  // Units / actual limits: meters; clamped between effective minBumpHeight and .5.
  // Increase/decrease: higher = taller possible bumps; lower = shorter only until minimum reached.
  // Examples: .1 = small with min <=.1; .25 = medium with min <=.25; .5 = tallest.
  // Suggested start: 0.08..0.25 with minimum lowered first. Together with: minBumpHeight, suspensionEffectPercent.
  maxBumpHeight: 0.25,

  // Controls: Debris wheel/body feedback strength; HYBRID wheel compression only, Original body and wheel effects.
  // Modes: ORIGINAL + HYBRID main-world environment; INACTIVE in legacy raycast tests.
  // Units / actual limits: percent; clamped 0..100.
  // Increase/decrease: higher = stronger feedback; lower = less; visual debris remains.
  // Examples: 0 = no feedback; 30 = mild; 60 = current.
  // Suggested start: 10..40 for subtle bumps. Together with: minBumpHeight, maxBumpHeight, suspensionBouncePercent.
  suspensionEffectPercent: 60,

  // Controls: Distance from vehicle focus within which debris contributes to wheel sampling.
  // Modes: ORIGINAL + HYBRID main-world environment; INACTIVE in legacy raycast tests.
  // Units / actual limits: meters; negative becomes 0; no upper cap.
  // Increase/decrease: higher = larger active sampling radius; lower = smaller.
  // Examples: 10 = close; 35 = current; 60 = wide.
  // Suggested start: 15..35; only wheel-near queries are normally needed. Together with: densityPercent; does not remove rendered debris.
  maxInteractiveDistance: 35,

  // Controls: Relative distribution weight for dirt clumps in stationary debris.
  // Modes: ORIGINAL + HYBRID main-world environment; INACTIVE in legacy raycast tests.
  // Units / actual limits: weight, NOT a clamped percent; negative becomes 0; normalized with other three weights.
  // Increase/decrease: higher = larger share; lower = smaller share.
  // Examples: 0 = exclude kind; 20 = low share; 70 = higher share.
  // Suggested start: 10..40 for a mixed distribution. Together with: other debris kind weights; all zero produces no details.
  dirtClumpPercent: 35,

  // Controls: Relative distribution weight for small rocks in stationary debris.
  // Modes: ORIGINAL + HYBRID main-world environment; INACTIVE in legacy raycast tests.
  // Units / actual limits: weight, NOT a clamped percent; negative becomes 0; normalized with other three weights.
  // Increase/decrease: higher = larger share; lower = smaller share.
  // Examples: 0 = exclude kind; 20 = low share; 70 = higher share.
  // Suggested start: 10..40 for a mixed distribution. Together with: other debris kind weights; all zero produces no details.
  smallRockPercent: 35,

  // Controls: Relative distribution weight for twigs in stationary debris.
  // Modes: ORIGINAL + HYBRID main-world environment; INACTIVE in legacy raycast tests.
  // Units / actual limits: weight, NOT a clamped percent; negative becomes 0; normalized with other three weights.
  // Increase/decrease: higher = larger share; lower = smaller share.
  // Examples: 0 = exclude kind; 20 = low share; 70 = higher share.
  // Suggested start: 10..40 for a mixed distribution. Together with: other debris kind weights; all zero produces no details.
  twigPercent: 20,

  // Controls: Relative distribution weight for earth clumps in stationary debris.
  // Modes: ORIGINAL + HYBRID main-world environment; INACTIVE in legacy raycast tests.
  // Units / actual limits: weight, NOT a clamped percent; negative becomes 0; normalized with other three weights.
  // Increase/decrease: higher = larger share; lower = smaller share.
  // Examples: 0 = exclude kind; 20 = low share; 70 = higher share.
  // Suggested start: 10..40 for a mixed distribution. Together with: other debris kind weights; all zero produces no details.
  earthClumpPercent: 10,

};

// Rendering only; reload to refresh setup-time settings.
export const visualPolishConfig = {
  // Controls: Shadow map resolution and camera coverage.
  // Modes: ORIGINAL + HYBRID + LEGACY raycast tests.
  // Units / actual limits: enum low/medium/high; unknown values fall back to medium.
  // Increase/decrease: low = cheaper/coarser; high = tighter, sharper coverage.
  // Examples: low = 1024px/100m span; medium = 2048px/130m; high = 2048px/96m.
  // Suggested start: medium; use low for slower devices. Together with: contactShadowStrengthPercent.
  shadowQuality: "medium",

  // Controls: Opacity of soft ground contact patches; rendering only, no handling forces.
  // Modes: ORIGINAL + HYBRID only.
  // Units / actual limits: percent; clamped 0..100.
  // Increase/decrease: higher = stronger/more visible effect; lower = weaker.
  // Examples: 0 = disabled effect; 35 = subtle; 75 = stronger.
  // Suggested start: 20..75 as appearance preference; not a physics recommendation. Together with: landingDustPercent for dust; otherwise independent of handling.
  contactShadowStrengthPercent: 35,

  // Controls: Strength of terrain detail texture shading; rendering only, no handling forces.
  // Modes: ORIGINAL + HYBRID + LEGACY raycast tests.
  // Units / actual limits: percent; clamped 0..100.
  // Increase/decrease: higher = stronger/more visible effect; lower = weaker.
  // Examples: 0 = disabled effect; 35 = subtle; 75 = stronger.
  // Suggested start: 20..75 as appearance preference; not a physics recommendation. Together with: landingDustPercent for dust; otherwise independent of handling.
  groundTextureStrengthPercent: 75,

  // Controls: Strength of terrain vertex color mottling; rendering only, no handling forces.
  // Modes: ORIGINAL + HYBRID only.
  // Units / actual limits: percent; clamped 0..100.
  // Increase/decrease: higher = stronger/more visible effect; lower = weaker.
  // Examples: 0 = disabled effect; 35 = subtle; 75 = stronger.
  // Suggested start: 20..75 as appearance preference; not a physics recommendation. Together with: landingDustPercent for dust; otherwise independent of handling.
  terrainColorVariationPercent: 20,

  // Controls: Softening/expansion of dry path color blend; rendering only, no handling forces.
  // Modes: ORIGINAL + HYBRID only.
  // Units / actual limits: percent; clamped 0..100.
  // Increase/decrease: higher = stronger/more visible effect; lower = weaker.
  // Examples: 0 = disabled effect; 35 = subtle; 75 = stronger.
  // Suggested start: 20..75 as appearance preference; not a physics recommendation. Together with: landingDustPercent for dust; otherwise independent of handling.
  dirtBlendSoftnessPercent: 65,

  // Controls: Moving dust emission/opacity and landing dust visibility; rendering only, no handling forces.
  // Modes: ORIGINAL + HYBRID + LEGACY raycast tests.
  // Units / actual limits: percent; clamped 0..100.
  // Increase/decrease: higher = stronger/more visible effect; lower = weaker.
  // Examples: 0 = disabled effect; 35 = subtle; 75 = stronger.
  // Suggested start: 20..75 as appearance preference; not a physics recommendation. Together with: landingDustPercent for dust; otherwise independent of handling.
  dustIntensityPercent: 35,

  // Controls: Tire-track opacity and enable gate; rendering only, no handling forces.
  // Modes: ORIGINAL + HYBRID + LEGACY raycast tests.
  // Units / actual limits: percent; clamped 0..100.
  // Increase/decrease: higher = stronger/more visible effect; lower = weaker.
  // Examples: 0 = disabled effect; 35 = subtle; 75 = stronger.
  // Suggested start: 20..75 as appearance preference; not a physics recommendation. Together with: landingDustPercent for dust; otherwise independent of handling.
  tireTrackOpacityPercent: 25,

  // Controls: Color variation among debris instances; rendering only, no handling forces.
  // Modes: ORIGINAL + HYBRID only.
  // Units / actual limits: percent; clamped 0..100.
  // Increase/decrease: higher = stronger/more visible effect; lower = weaker.
  // Examples: 0 = disabled effect; 35 = subtle; 75 = stronger.
  // Suggested start: 20..75 as appearance preference; not a physics recommendation. Together with: landingDustPercent for dust; otherwise independent of handling.
  debrisColorVariationPercent: 20,

};

// Shared lab/HYBRID jump settings; per-mode exceptions are documented.
export const jumpConfig = {
  // Controls: Creates dirt ramp features on reload and enables natural HYBRID takeoff. Does not disable boundary cannon or lab physics.
  // Modes: ORIGINAL + HYBRID + LEGACY raycast tests terrain; HYBRID natural takeoff gate.
  // Units / actual limits: boolean true/false.
  // Increase/decrease: true = ramps/natural jumps; false = no generated ramps or HYBRID ramp release.
  // Examples: true = jumps enabled; false = flat base terrain.
  // Suggested start: true to retain jumps. Together with: rampConfig; boundaryCannon.enabled controls cannon separately.
  enabled: true,

  // Controls: Rapier flight gravity relative to 12 m/s^2. Original cannon gravity stays fixed at 12.
  // Modes: LEGACY raycast tests + HYBRID; INACTIVE in ORIGINAL (cannon has separate per-vehicle settings).
  // Units / actual limits: percent; clamped 25..200 in LEGACY raycast tests and HYBRID.
  // Increase/decrease: higher = faster fall/shorter flight; lower = floatier/longer flight.
  // Examples: 50 = 6 m/s^2; 100 = 12; 150 = 18.
  // Suggested start: 75..125 around current tested 100. Together with: verticalLaunchSpeed, ramp heights, minimumLaunchSpeed.
  gravityScalePercent: 250,

  // Controls: Forward/reverse pitch torque in flight, in LEGACY raycast tests and HYBRID; inactive in Original.
  // Modes: LEGACY raycast tests + HYBRID; INACTIVE in ORIGINAL (cannon has separate per-vehicle settings).
  // Units / actual limits: percent; clamped 0..100.
  // Increase/decrease: higher = faster pitch response; lower = steadier air attitude.
  // Examples: 0 = no pitch input; 20 = current; 50 = stronger.
  // Suggested start: 10..30 for forgiving input. Together with: airborneAngularDamping (HYBRID), airborneRollControlPercent.
  airbornePitchControlPercent: 20,

  // Controls: Impact-scaled visual heave at landing; lab additionally changes chassis restitution and suspension relaxation. HYBRID absorbs vertical speed on contact; this does not cause physical repeat bounce.
  // Modes: LEGACY raycast tests + HYBRID; INACTIVE in ORIGINAL (cannon has separate per-vehicle settings).
  // Units / actual limits: percent; feedback/lab clamps 0..100; lab per-vehicle multiplier applies before feedback clamp.
  // Increase/decrease: higher = springier visible landing (and bouncier lab); lower = softer.
  // Examples: 0 = no heave kick; 25 = gentle; 60 = lively.
  // Suggested start: 10..35 for gentle feedback. Together with: landingDamping, landingCompressionScale (HYBRID), landingBounceScalePercent (lab).
  landingBouncePercent: 25,

  // Controls: Lab landing pitch kick; INACTIVE in playable Original/HYBRID, which use each vehicle boundaryBodyRockPercent.
  // Modes: LEGACY raycast tests only; INACTIVE in playable ORIGINAL/HYBRID.
  // Units / actual limits: percent; feedback clamps 0..100.
  // Increase/decrease: higher = more lab landing nod; lower = less.
  // Examples: 0 = none; 35 = current; 70 = pronounced.
  // Suggested start: 15..40 for lab feedback. Together with: jumpVehicleConfig body damping is fixed by feedback fallback; landingBouncePercent.
  landingBodyRockPercent: 35,

  // Controls: Scales impact passed to landing dust puff; existing visual dust intensity still gates visibility. Original cannon uses its separate legacy dust path.
  // Modes: LEGACY raycast tests + HYBRID; INACTIVE in ORIGINAL (cannon has separate per-vehicle settings).
  // Units / actual limits: percent input; no upper clamp; values <=0 suppress lab emission; hybrid puff count capped at 12.
  // Increase/decrease: higher = more/larger landing puff up to effect caps; lower = less.
  // Examples: 0 = no landing puff; 40 = current; 100 = stronger.
  // Suggested start: 20..60 for current impacts. Together with: dustIntensityPercent=0 disables dust completely.
  landingDustPercent: 40,

};

// Shared simple dirt ramp geometry and material mask.
export const rampConfig = {
  // Controls: Added terrain height at the gentle ramp lip; shared rendered/collision surface.
  // Modes: ORIGINAL + HYBRID + LEGACY raycast tests terrain.
  // Units / actual limits: meters; effective ramp height clamped 0..8.
  // Increase/decrease: higher = steeper/higher takeoff; lower = gentler.
  // Examples: 0 = flat; 1.5 = gentle; 4 = large.
  // Suggested start: 1..4, matching current ramp set. Together with: topSpeed, minimumLaunchSpeed, takeoffClearance, gravityScalePercent.
  gentleRampHeight: 1.5,

  // Controls: Added terrain height at the tabletop lip; shared rendered/collision surface.
  // Modes: ORIGINAL + HYBRID + LEGACY raycast tests terrain.
  // Units / actual limits: meters; effective ramp height clamped 0..8.
  // Increase/decrease: higher = steeper/higher takeoff; lower = gentler.
  // Examples: 0 = flat; 1.5 = gentle; 4 = large.
  // Suggested start: 1..4, matching current ramp set. Together with: topSpeed, minimumLaunchSpeed, takeoffClearance, gravityScalePercent.
  tabletopHeight: 2.5,

  // Controls: Added terrain height at the gap ramp lip; shared rendered/collision surface.
  // Modes: ORIGINAL + HYBRID + LEGACY raycast tests terrain.
  // Units / actual limits: meters; effective ramp height clamped 0..8.
  // Increase/decrease: higher = steeper/higher takeoff; lower = gentler.
  // Examples: 0 = flat; 1.5 = gentle; 4 = large.
  // Suggested start: 1..4, matching current ramp set. Together with: topSpeed, minimumLaunchSpeed, takeoffClearance, gravityScalePercent.
  gapRampHeight: 3,

  // Controls: Added terrain height at the big kicker lip; shared rendered/collision surface.
  // Modes: ORIGINAL + HYBRID + LEGACY raycast tests terrain.
  // Units / actual limits: meters; effective ramp height clamped 0..8.
  // Increase/decrease: higher = steeper/higher takeoff; lower = gentler.
  // Examples: 0 = flat; 1.5 = gentle; 4 = large.
  // Suggested start: 1..4, matching current ramp set. Together with: topSpeed, minimumLaunchSpeed, takeoffClearance, gravityScalePercent.
  bigKickerHeight: 4,

  // Controls: Dirt mask strength near ramps; also affects path materials and ground effects classification.
  // Modes: ORIGINAL + HYBRID + LEGACY raycast tests terrain.
  // Units / actual limits: percent; clamped 0..100.
  // Increase/decrease: higher = stronger dirt mask; lower = greener ramp.
  // Examples: 0 = no added dirt mask; 70 = current; 100 = full.
  // Suggested start: 50..100 for visible ramp approaches. Together with: groundTextureStrengthPercent, dustIntensityPercent.
  dirtBlendPercent: 70,

};

// Legacy legacy raycast tests settings; mostly INACTIVE in playable HYBRID.
// The playable Dirt Jump Lab now uses RapierWorldVehicle exactly like the game.
// This object remains for JumpVehiclePrototype automated raycast-solver tests.
// BOTH playable environments still share its mass/restLength for the underlying
// Rapier body/wheel layout and landingBounceScalePercent for landing feedback.
// acceleration, maxSpeed, releaseDeceleration, physical spring/damper and lab body
// feedback values below DO NOT drive either playable environment. Tune arcadeHandlingConfig
// and vehicleConfig instead. No numeric values were changed during lab alignment.
export const jumpVehicleConfig = {
  // Dirty / backhoe.
  dirty: {
    // Controls: Rapier chassis collider mass; also scales engine/air torque. In HYBRID this is inherited from lab for airborne inertia only.
    // Modes: LEGACY raycast tests; HYBRID also inherits mass/restLength; other fields INACTIVE in playable HYBRID.
    // Units / actual limits: kg; no application clamp; finite >0 required for Rapier.
    // Increase/decrease: higher = larger inertia; force/torque scaling means effects are not simply slower.
    // Examples: 800 = light; 1200 = Dirty current; 1900 = Stinky current.
    // Suggested start: keep current unless measuring inertia; no broad feel recommendation. Together with: airbornePitchControlPercent, airborneRollControlPercent, suspension lab rates.
    mass: 1200,

    // Controls: Baseline forward/reverse drive acceleration, before speed adjustment in playable modes. Lab has its own engine acceleration.
    // Modes: LEGACY raycast tests only; INACTIVE in playable HYBRID (main game + Dirt Jump Lab) and ORIGINAL.
    // Units / actual limits: m/s^2; no clamp; finite >=0 intended.
    // Increase/decrease: higher = quicker speed gain; lower = slower.
    // Examples: 6 = gentle; 8 = moderate; 11 = Dirty playable baseline.
    // Suggested start: 7..11 playable, 6..8 lab, matching current values. Together with: speedAdjustmentPercent, topSpeed/maxSpeed, drag.
    acceleration: 8,

    // Controls: Raycast lab forward speed gate; not used by playable HYBRID (use arcadeHandlingConfig.topSpeed).
    // Modes: LEGACY raycast tests only; INACTIVE in playable HYBRID (main game + Dirt Jump Lab) and ORIGINAL.
    // Units / actual limits: m/s; no clamp; finite >=0 intended; force gate is not a hard velocity clamp.
    // Increase/decrease: higher = longer engine acceleration; lower = earlier force cutoff.
    // Examples: 12 = small test speed; 18 = current; 25 = faster lab.
    // Suggested start: 12..18 for existing small lab; use handling course for normal speeds. Together with: acceleration, suspension lab rates.
    maxSpeed: 18,

    // Controls: Subtracts speed while neither accelerate nor reverse is held, after drag.
    // Modes: LEGACY raycast tests only; INACTIVE in playable HYBRID (main game + Dirt Jump Lab) and ORIGINAL.
    // Units / actual limits: m/s^2; negative becomes 0; no upper cap.
    // Increase/decrease: higher = shorter coast; lower = longer coast.
    // Examples: 0 = drag only; 3.5 = truck coast; 8 = brisk stop.
    // Suggested start: 3..8, matching current vehicle values. Together with: autoBrakeOnRelease, stopThreshold, drag.
    releaseDeceleration: 5,

    // Controls: Raycast wheel suspension rest length; HYBRID uses it as a visual wheel baseline, not a spring.
    // Modes: LEGACY raycast tests; HYBRID also inherits mass/restLength; other fields INACTIVE in playable HYBRID.
    // Units / actual limits: meters; no application clamp; positive intended.
    // Increase/decrease: higher = more lab rest travel; lower = less; hybrid baseline cancels with render rest length.
    // Examples: .3 = short; .45 = Dirty current; .52 = Stinky current.
    // Suggested start: 0.3..0.6 for lab only. Together with: suspensionStiffness, suspensionCompression, suspensionRelaxation.
    restLength: 0.45,

    // Controls: Lab raycast spring stiffness; INACTIVE as a chassis spring in playable HYBRID.
    // Modes: LEGACY raycast tests only; INACTIVE in playable HYBRID (main game + Dirt Jump Lab) and ORIGINAL.
    // Units / actual limits: Rapier spring coefficient; no application clamp; finite >=0 intended.
    // Increase/decrease: higher = firmer/higher-frequency spring; lower = softer.
    // Examples: 40 = soft; 58 = Stinky current; 75 = Dirty current.
    // Suggested start: 50..80 around tested lab values. Together with: suspensionCompression, suspensionRelaxation, mass.
    suspensionStiffness: 75,

    // Controls: Lab raycast spring damping while compressing; INACTIVE in playable HYBRID.
    // Modes: LEGACY raycast tests only; INACTIVE in playable HYBRID (main game + Dirt Jump Lab) and ORIGINAL.
    // Units / actual limits: Rapier damping coefficient; no application clamp; nonnegative intended.
    // Increase/decrease: higher = more lab compression damping; lower = more compression oscillation.
    // Examples: 3 = light; 5 = current; 8 = strong.
    // Suggested start: 4..8 around tested 5; engine coefficient, not a percentage. Together with: suspensionStiffness, suspensionRelaxation, landingBouncePercent.
    suspensionCompression: 5,

    // Controls: Lab spring damping while extending; multiplied by (1 - .4*landingBouncePercent/100). INACTIVE in playable HYBRID.
    // Modes: LEGACY raycast tests only; INACTIVE in playable HYBRID (main game + Dirt Jump Lab) and ORIGINAL.
    // Units / actual limits: Rapier damping coefficient; no application clamp; nonnegative intended.
    // Increase/decrease: higher = less lab rebound oscillation; lower = more rebound.
    // Examples: 3.5 = Stinky current; 4.5 = Dirty current; 7 = stronger.
    // Suggested start: 3.5..7 around tested values. Together with: suspensionCompression, landingBouncePercent.
    suspensionRelaxation: 4.5,

    // Controls: Visual outward body lean during turns and debris roll; cannot flip the collider.
    // Modes: LEGACY raycast tests only; INACTIVE in playable HYBRID (main game + Dirt Jump Lab) and ORIGINAL.
    // Units / actual limits: percent; clamped 0..100.
    // Increase/decrease: higher = more visible lean; lower = flatter body.
    // Examples: 0 = no turn lean; 25 = subtle; 100 = up to 12 degrees from turns.
    // Suggested start: 10..35 for subtle cartoon motion. Together with: turn, bodyDamping, suspensionBouncePercent.
    bodyRollPercent: 20,

    // Controls: Visual body tilt under acceleration/braking and debris pitch.
    // Modes: LEGACY raycast tests only; INACTIVE in playable HYBRID (main game + Dirt Jump Lab) and ORIGINAL.
    // Units / actual limits: percent; clamped 0..100.
    // Increase/decrease: higher = more nodding; lower = flatter body.
    // Examples: 0 = none; 20 = subtle; 100 = up to 10 degrees from acceleration.
    // Suggested start: 10..30 for subtle motion. Together with: acceleration, bodyDamping, brakeDeceleration.
    bodyPitchPercent: 18,

    // Controls: Per-vehicle multiplier on jumpConfig landing heave in lab and HYBRID; cannon landings use their own per-vehicle bounce instead.
    // Modes: LEGACY raycast tests + HYBRID ordinary landings; INACTIVE in ORIGINAL and cannon landings.
    // Units / actual limits: percent multiplier; no clamp here; final feedback clamps 0..100.
    // Increase/decrease: higher = stronger lab landing kick; lower = weaker.
    // Examples: 0 = no heave kick; 100 = unchanged; 125 = Stinky current.
    // Suggested start: 75..125 around current lab values. Together with: jumpConfig.landingBouncePercent.
    landingBounceScalePercent: 100,

  },
  // Stinky / garbage truck.
  stinky: {
    // Controls: Rapier chassis collider mass; also scales engine/air torque. In HYBRID this is inherited from lab for airborne inertia only.
    // Modes: LEGACY raycast tests; HYBRID also inherits mass/restLength; other fields INACTIVE in playable HYBRID.
    // Units / actual limits: kg; no application clamp; finite >0 required for Rapier.
    // Increase/decrease: higher = larger inertia; force/torque scaling means effects are not simply slower.
    // Examples: 800 = light; 1200 = Dirty current; 1900 = Stinky current.
    // Suggested start: keep current unless measuring inertia; no broad feel recommendation. Together with: airbornePitchControlPercent, airborneRollControlPercent, suspension lab rates.
    mass: 1900,

    // Controls: Baseline forward/reverse drive acceleration, before speed adjustment in playable modes. Lab has its own engine acceleration.
    // Modes: LEGACY raycast tests only; INACTIVE in playable HYBRID (main game + Dirt Jump Lab) and ORIGINAL.
    // Units / actual limits: m/s^2; no clamp; finite >=0 intended.
    // Increase/decrease: higher = quicker speed gain; lower = slower.
    // Examples: 6 = gentle; 8 = moderate; 11 = Dirty playable baseline.
    // Suggested start: 7..11 playable, 6..8 lab, matching current values. Together with: speedAdjustmentPercent, topSpeed/maxSpeed, drag.
    acceleration: 6,

    // Controls: Raycast lab forward speed gate; not used by playable HYBRID (use arcadeHandlingConfig.topSpeed).
    // Modes: LEGACY raycast tests only; INACTIVE in playable HYBRID (main game + Dirt Jump Lab) and ORIGINAL.
    // Units / actual limits: m/s; no clamp; finite >=0 intended; force gate is not a hard velocity clamp.
    // Increase/decrease: higher = longer engine acceleration; lower = earlier force cutoff.
    // Examples: 12 = small test speed; 18 = current; 25 = faster lab.
    // Suggested start: 12..18 for existing small lab; use handling course for normal speeds. Together with: acceleration, suspension lab rates.
    maxSpeed: 18,

    // Controls: Subtracts speed while neither accelerate nor reverse is held, after drag.
    // Modes: LEGACY raycast tests only; INACTIVE in playable HYBRID (main game + Dirt Jump Lab) and ORIGINAL.
    // Units / actual limits: m/s^2; negative becomes 0; no upper cap.
    // Increase/decrease: higher = shorter coast; lower = longer coast.
    // Examples: 0 = drag only; 3.5 = truck coast; 8 = brisk stop.
    // Suggested start: 3..8, matching current vehicle values. Together with: autoBrakeOnRelease, stopThreshold, drag.
    releaseDeceleration: 5,

    // Controls: Raycast wheel suspension rest length; HYBRID uses it as a visual wheel baseline, not a spring.
    // Modes: LEGACY raycast tests; HYBRID also inherits mass/restLength; other fields INACTIVE in playable HYBRID.
    // Units / actual limits: meters; no application clamp; positive intended.
    // Increase/decrease: higher = more lab rest travel; lower = less; hybrid baseline cancels with render rest length.
    // Examples: .3 = short; .45 = Dirty current; .52 = Stinky current.
    // Suggested start: 0.3..0.6 for lab only. Together with: suspensionStiffness, suspensionCompression, suspensionRelaxation.
    restLength: 0.52,

    // Controls: Lab raycast spring stiffness; INACTIVE as a chassis spring in playable HYBRID.
    // Modes: LEGACY raycast tests only; INACTIVE in playable HYBRID (main game + Dirt Jump Lab) and ORIGINAL.
    // Units / actual limits: Rapier spring coefficient; no application clamp; finite >=0 intended.
    // Increase/decrease: higher = firmer/higher-frequency spring; lower = softer.
    // Examples: 40 = soft; 58 = Stinky current; 75 = Dirty current.
    // Suggested start: 50..80 around tested lab values. Together with: suspensionCompression, suspensionRelaxation, mass.
    suspensionStiffness: 58,

    // Controls: Lab raycast spring damping while compressing; INACTIVE in playable HYBRID.
    // Modes: LEGACY raycast tests only; INACTIVE in playable HYBRID (main game + Dirt Jump Lab) and ORIGINAL.
    // Units / actual limits: Rapier damping coefficient; no application clamp; nonnegative intended.
    // Increase/decrease: higher = more lab compression damping; lower = more compression oscillation.
    // Examples: 3 = light; 5 = current; 8 = strong.
    // Suggested start: 4..8 around tested 5; engine coefficient, not a percentage. Together with: suspensionStiffness, suspensionRelaxation, landingBouncePercent.
    suspensionCompression: 5,

    // Controls: Lab spring damping while extending; multiplied by (1 - .4*landingBouncePercent/100). INACTIVE in playable HYBRID.
    // Modes: LEGACY raycast tests only; INACTIVE in playable HYBRID (main game + Dirt Jump Lab) and ORIGINAL.
    // Units / actual limits: Rapier damping coefficient; no application clamp; nonnegative intended.
    // Increase/decrease: higher = less lab rebound oscillation; lower = more rebound.
    // Examples: 3.5 = Stinky current; 4.5 = Dirty current; 7 = stronger.
    // Suggested start: 3.5..7 around tested values. Together with: suspensionCompression, landingBouncePercent.
    suspensionRelaxation: 3.5,

    // Controls: Visual outward body lean during turns and debris roll; cannot flip the collider.
    // Modes: LEGACY raycast tests only; INACTIVE in playable HYBRID (main game + Dirt Jump Lab) and ORIGINAL.
    // Units / actual limits: percent; clamped 0..100.
    // Increase/decrease: higher = more visible lean; lower = flatter body.
    // Examples: 0 = no turn lean; 25 = subtle; 100 = up to 12 degrees from turns.
    // Suggested start: 10..35 for subtle cartoon motion. Together with: turn, bodyDamping, suspensionBouncePercent.
    bodyRollPercent: 25,

    // Controls: Visual body tilt under acceleration/braking and debris pitch.
    // Modes: LEGACY raycast tests only; INACTIVE in playable HYBRID (main game + Dirt Jump Lab) and ORIGINAL.
    // Units / actual limits: percent; clamped 0..100.
    // Increase/decrease: higher = more nodding; lower = flatter body.
    // Examples: 0 = none; 20 = subtle; 100 = up to 10 degrees from acceleration.
    // Suggested start: 10..30 for subtle motion. Together with: acceleration, bodyDamping, brakeDeceleration.
    bodyPitchPercent: 22,

    // Controls: Per-vehicle multiplier on jumpConfig landing heave in lab and HYBRID; cannon landings use their own per-vehicle bounce instead.
    // Modes: LEGACY raycast tests + HYBRID ordinary landings; INACTIVE in ORIGINAL and cannon landings.
    // Units / actual limits: percent multiplier; no clamp here; final feedback clamps 0..100.
    // Increase/decrease: higher = stronger lab landing kick; lower = weaker.
    // Examples: 0 = no heave kick; 100 = unchanged; 125 = Stinky current.
    // Suggested start: 75..125 around current lab values. Together with: jumpConfig.landingBouncePercent.
    landingBounceScalePercent: 125,

  },
};

// Main-world Turbo Boost. Shared by both vehicles; floating Settings saves overrides.
// Turbo values apply live in Play; charge is session-only, never persisted.
export const turboBoostConfig = {
  // Controls: Enable pickups and turbo.
  // Modes: Play, all three vehicles; live settings.
  // Units / actual limits: boolean.
  // Increase/decrease: true enables; false stops boost.
  // Examples: true / false.
  // Suggested start: true; session charge is never saved.
  enabled: true,
  // Controls: Additional acceleration and speed.
  // Modes: Play, all three vehicles; live settings.
  // Units / actual limits: percent 0..300.
  // Increase/decrease: higher gives stronger boost.
  // Examples: 80 = 1.8x.
  // Suggested start: 80; session charge is never saved.
  speedBoostPercent: 80,
  // Controls: Passive charge rate.
  // Modes: Play, all three vehicles; live settings.
  // Units / actual limits: percentage points/s 0..20.
  // Increase/decrease: higher fills faster.
  // Examples: 1 = 100 seconds.
  // Suggested start: 1; session charge is never saved.
  rechargePerSecond: 1,
  // Controls: Boost consumption.
  // Modes: Play, all three vehicles; live settings.
  // Units / actual limits: percentage points/s 1..100.
  // Increase/decrease: higher drains faster.
  // Examples: 20 = 5 seconds.
  // Suggested start: 20; session charge is never saved.
  drainPerSecond: 20,
  // Controls: Charge per pickup.
  // Modes: Play, all three vehicles; live settings.
  // Units / actual limits: percentage points 1..100.
  // Increase/decrease: higher grants more charge.
  // Examples: 25 = quarter tank.
  // Suggested start: 25; session charge is never saved.
  pickupCharge: 25,
  // Controls: Separate acceleration press window.
  // Modes: Play, all three vehicles; live settings.
  // Units / actual limits: milliseconds 100..600.
  // Increase/decrease: higher allows slower taps.
  // Examples: 300 = .3 seconds.
  // Suggested start: 300; session charge is never saved.
  doubleTapWindowMs: 300,
  // Controls: Scale ALL turbo widget artwork and reserved dimensions.
  // Modes: Play, all three vehicles; live settings.
  // Units / actual limits: multiplier .5..2; viewport clamped.
  // Increase/decrease: higher makes the entire HUD larger.
  // Examples: 0.5 = 50%; 1 = default; 2 = 200%.
  // Suggested start: 1.0; session charge is never saved.
  turboHudScale: 1.0,
  // Controls: Pickup cooldown.
  // Modes: Play, all three vehicles; live settings.
  // Units / actual limits: seconds .1..60.
  // Increase/decrease: higher waits longer.
  // Examples: 5 = five seconds.
  // Suggested start: 5; session charge is never saved.
  respawnSeconds: 5,
  // Controls: Seeded pickup count.
  // Modes: Play, all three vehicles; live settings.
  // Units / actual limits: integer 0..30.
  // Increase/decrease: higher places more pickups.
  // Examples: 15 = default.
  // Suggested start: 15; session charge is never saved.
  pickupCount: 15,
  // Controls: Swept collection radius.
  // Modes: Play, all three vehicles; live settings.
  // Units / actual limits: world units .5..6.
  // Increase/decrease: higher collects farther away.
  // Examples: 2.5 = default.
  // Suggested start: 2.5; session charge is never saved.
  pickupRadius: 2.5,
};
// Word Hunt defaults. Runtime Settings overrides are persisted separately from vehicle tuning.
export const wordHuntConfig={
  // Controls: Automatically run the shuffled word hunt.
  // Modes: Play, Dirty and Stinky; independent of vehicle handling.
  // Units / actual limits: Boolean; true runs, false clears incomplete progress.
  // Increase/decrease: True starts a hunt; false removes letters and HUD.
  // Examples: true for Luca; false for driving only.
  // Suggested start: true.
  enabled: true,
  // Controls: Word Hunt HUD visibility, independent of Driving HUD.
  // Modes: Play, Dirty and Stinky; independent of vehicle handling.
  // Units / actual limits: Boolean; no gameplay or timer effect.
  // Increase/decrease: True shows spelling slots and elapsed time.
  // Examples: false for an unobstructed view with pickups still active.
  // Suggested start: true.
  showHud: true,
  // Controls: World letter rendering.
  // Modes: Play, Dirty and Stinky; independent of vehicle handling.
  // Units / actual limits: Boolean; hidden letters remain collectible.
  // Increase/decrease: True makes letters visible; false hides world meshes.
  // Examples: true for normal play; false for a visibility experiment.
  // Suggested start: true.
  visible: true,
  // Controls: Shared letter geometry scale.
  // Modes: Play, Dirty and Stinky; independent of vehicle handling.
  // Units / actual limits: Metres per font unit; Settings clamps 2–6.
  // Increase/decrease: Larger letters are easier to see; collection radius is independent.
  // Examples: 3 compact; 3.6 balanced; 5 very prominent.
  // Suggested start: 3.6.
  letterSize: 3.6,
  // Controls: Letter centre above sampled terrain.
  // Modes: Play, Dirty and Stinky; independent of vehicle handling.
  // Units / actual limits: Metres; use positive heights, typically 2.5–4.
  // Increase/decrease: Higher lifts the visual; pickup still checks vehicle ground clearance.
  // Examples: 2.5 low floating; 3 suits both vehicles; 4 tall.
  // Suggested start: 3.
  floatingHeight: 3,
  // Controls: Readable horizontal wobble phase speed.
  // Modes: Play, Dirty and Stinky; independent of vehicle handling.
  // Units / actual limits: Degrees/second; visual yaw stays within ±32 degrees.
  // Increase/decrease: Higher speeds up wobble; zero holds the phase.
  // Examples: 0 still; 14 gentle; 30 lively.
  // Suggested start: 14.
  rotationSpeed: 14,
  // Controls: Swept horizontal driving collection reach.
  // Modes: Play, Dirty and Stinky; independent of vehicle handling.
  // Units / actual limits: Metres; Settings clamps 3–10; vertical ground clearance <6m.
  // Increase/decrease: Larger is more forgiving for both vehicles.
  // Examples: 3 close contact; 5.5 forgiving; 8 very easy.
  // Suggested start: 5.5.
  collectionRadius: 5.5,
  // Controls: Minimum separation between word letters.
  // Modes: Play, Dirty and Stinky; independent of vehicle handling.
  // Units / actual limits: Metres; positive; unavailable layouts safely retry without partial words.
  // Increase/decrease: Higher spreads letters farther and increases search distance.
  // Examples: 20 short drives; 24 balanced; 35 more exploration.
  // Suggested start: 24.
  minSpacing: 24,
  // Controls: Particles emitted by each pickup.
  // Modes: Play, Dirty and Stinky; independent of vehicle handling.
  // Units / actual limits: Integer particles, clamped 0–64; completion triples, capped at 128.
  // Increase/decrease: Higher adds sparkle and GPU work; zero suppresses particles.
  // Examples: 0 minimal; 16 subtle; 24 cheerful; 40 busy.
  // Suggested start: 24.
  pickupParticleIntensity: 24,
  // Controls: Pop, upward movement and shrink after collection.
  // Modes: Play, Dirty and Stinky; independent of vehicle handling.
  // Units / actual limits: Seconds; must be >0; progress and sound update immediately.
  // Increase/decrease: Higher prolongs the visual; lower makes it snappier.
  // Examples: 0.25 quick; 0.38 playful; 0.6 leisurely.
  // Suggested start: 0.38.
  pickupAnimationDuration: 0.38,
  // Controls: Completed-word banner before automatic next word.
  // Modes: Play, Dirty and Stinky; independent of vehicle handling.
  // Units / actual limits: Seconds; must be >0; never pauses driving.
  // Increase/decrease: Higher leaves the result visible longer.
  // Examples: 2 quick; 2.6 balanced; 3 relaxed.
  // Suggested start: 2.6.
  celebrationDuration: 2.6,
  // Controls: Independent Web Audio chime/jingle gain.
  // Modes: Play, Dirty and Stinky; independent of vehicle handling.
  // Units / actual limits: Linear gain 0–1; saved Settings clamps to this range.
  // Increase/decrease: Higher is louder; zero silences the feature.
  // Examples: 0 silent; 0.2 soft; 0.35 gentle; 0.5 prominent.
  // Suggested start: 0.35.
  soundVolume: 0.35,
  // Controls: Mute Word Hunt sounds while retaining its volume.
  // Modes: Play, Dirty and Stinky; independent of vehicle handling.
  // Units / actual limits: Boolean; existing game audio is unaffected.
  // Increase/decrease: True silences pickups, completion and record tones.
  // Examples: true for quiet play; false for musical feedback.
  // Suggested start: false.
  muted: false,
  // Controls: Initial editable word list when none has been saved.
  // Modes: Play, Dirty and Stinky; independent of vehicle handling.
  // Units / actual limits: Comma-separated defaults; Settings stores unique uppercase A–Z words, 2–12 letters.
  // Increase/decrease: More words extend each shuffled round; an empty saved list pauses the feature.
  // Examples: "TREE,BALL" supports repeated letters; customize through Settings.
  // Suggested start: Five sample words below.
  words: "LUCA,DIRT,TREE,TRUCK,STINKY",
};
