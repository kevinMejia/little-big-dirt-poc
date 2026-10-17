// Hill effects are maximum percentages, reached at the steepness below.
// Set an individual percentage to 0 to disable that effect for that vehicle.
export const vehicleConfig = {
  backhoe: {downhillBoostPercent: 90, uphillPenaltyPercent: 30, treeKnockdownSpeedPercent: 90, releaseDeceleration: 5.0, stopThreshold: .1, autoBrakeOnRelease: true, rockCrackSpeedPercent: 25, rockBreakSpeedPercent: 55},
  garbageTruck: {downhillBoostPercent: 35, uphillPenaltyPercent: 45, treeKnockdownSpeedPercent: 95, releaseDeceleration: 3.5, stopThreshold: .1, autoBrakeOnRelease: true, rockCrackSpeedPercent: 35, rockBreakSpeedPercent: 75},
};

export const hillSettings = {
  fullEffectGrade: .35, // rise/run: 35% grade (~19 degrees) gives the full effect
  flatGrade: .015,     // ignore terrain grades below 1.5%
  responseSeconds: .6,
  sampleDistance: 1,
  speedSettlingRate: 2.5,
};

export const treeConfig = {
  recoveryDelaySeconds: 8,
  fallDurationSeconds: .8,
  recoveryDurationSeconds: 1.5,
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
