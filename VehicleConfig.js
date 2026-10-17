// Hill effects are maximum percentages, reached at the steepness below.
// Set an individual percentage to 0 to disable that effect for that vehicle.
export const vehicleConfig = {
  backhoe: {boundaryCannon: {enabled:true,horizontalLaunchSpeed:45,verticalLaunchSpeed:28,launchSpinPercent:20,airControlPercent:15,landingBouncePercent:30}, speedAdjustmentPercent: 80, bodyRollPercent: 25, bodyPitchPercent: 20, suspensionBouncePercent: 20, boundaryBouncePercent: 25, boundaryBodyRockPercent: 30, downhillBoostPercent: 120, uphillPenaltyPercent: 30, treeKnockdownSpeedPercent: 90, releaseDeceleration: 8.0, stopThreshold: .1, autoBrakeOnRelease: true, rockCrackSpeedPercent: 25, rockBreakSpeedPercent: 55},
  garbageTruck: {boundaryCannon: {enabled:true,horizontalLaunchSpeed:45,verticalLaunchSpeed:29,launchSpinPercent:15,airControlPercent:15,landingBouncePercent:38}, speedAdjustmentPercent: 200, bodyRollPercent: 25, bodyPitchPercent: 20, suspensionBouncePercent: 20, boundaryBouncePercent: 25, boundaryBodyRockPercent: 30, downhillBoostPercent: 35, uphillPenaltyPercent: 45, treeKnockdownSpeedPercent: 95, releaseDeceleration: 3.5, stopThreshold: .1, autoBrakeOnRelease: true, rockCrackSpeedPercent: 35, rockBreakSpeedPercent: 75},
};

export const hillSettings = {
  fullEffectGrade: .35, // rise/run: 35% grade (~19 degrees) gives the full effect
  flatGrade: .015,     // ignore terrain grades below 1.5%
  responseSeconds: .6,
  sampleDistance: 1,
  speedSettlingRate: 2.5,
};

// Orbit offsets decay by exp(-(8 * percent / 100) * deltaTime).
// 0 holds the view; 50 gives 4/s (95% return in .75s); 100 gives 8/s.
export const cameraSettings = {cameraReturnSpeedPercent: 50};

export const treeConfig = {
  fallDurationSeconds: .8, // Required by the current tree animation.
  recoveryDelaySeconds: 8,
  recoveryDurationSeconds: 1.5,

  minFallDurationSeconds: 0.5,
  maxFallDurationSeconds: 1.8,
  fallSpeedExponent: 1.5
};

export const rockConfig = {
  respawnSeconds: 15,
  reformSeconds: .9,
  fragmentCount: 5, // clamped to 3..6
  maxFragments: 48,
  bounceStrength: .35,
  resistanceMultiplier: 1,
  smallRockRadius: .7,
  largeRockRadius: 1.25,
  largeRockResistance: 1.3,
  hitCooldownSeconds: .65,
};

// 100% density = at most 1,000 fixed details; distribution weights are normalized.
// Heights are world units, capped at 0.5; effect scales existing visual springs only.
export const groundDebrisConfig = {
  enabled:true, densityPercent:70, interactivePercent:450,
  minBumpHeight:0.5, maxBumpHeight:0.25, suspensionEffectPercent:60,
  maxInteractiveDistance:35,
  dirtClumpPercent:35, smallRockPercent:35, twigPercent:20, earthClumpPercent:10
};

// Rendering-only tuning; none of these values change driving or collision surfaces.
export const visualPolishConfig = {
  shadowQuality:'medium', contactShadowStrengthPercent:35, groundTextureStrengthPercent:75,
  terrainColorVariationPercent:20, dirtBlendSoftnessPercent:65,
  dustIntensityPercent:35, tireTrackOpacityPercent:25, debrisColorVariationPercent:20
};

// Review prototype only: not consumed by the playable movement controller yet.
export const jumpConfig = {
  enabled:true, gravityScalePercent:100, airbornePitchControlPercent:20,
  landingBouncePercent:25, landingBodyRockPercent:35, landingDustPercent:40
};
export const rampConfig = {
  gentleRampHeight:1.5, tabletopHeight:2.5, gapRampHeight:3,
  bigKickerHeight:4, dirtBlendPercent:70
};

// Isolated Rapier lab tuning; these do not modify the playable vehicles.
export const jumpVehicleConfig = {
  dirty:{mass:1200,acceleration:8,maxSpeed:18,releaseDeceleration:5,restLength:.45,suspensionStiffness:75,suspensionCompression:5,suspensionRelaxation:4.5,bodyRollPercent:20,bodyPitchPercent:18,landingBounceScalePercent:100},
  stinky:{mass:1900,acceleration:6,maxSpeed:18,releaseDeceleration:5,restLength:.52,suspensionStiffness:58,suspensionCompression:5,suspensionRelaxation:3.5,bodyRollPercent:25,bodyPitchPercent:22,landingBounceScalePercent:125}
};
