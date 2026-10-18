// Global Play environment defaults. Saved Settings overrides apply before scene
// creation. Reload Play to rebuild scenery; vehicle physics is independent.
export const worldAppearance={
  // Distant fog toggle; only affects scenery beyond 350 m. Requires reload.
  fogEnabled:false,
  // Decorative horizon geometry, without driving colliders. Requires reload.
  distantHillsEnabled:true,
  // Grass color variation, 0–100%; higher is more varied. Requires reload.
  terrainColorVariation:25,
  // Dirt patch coverage, 0–100%; slopes/path also contribute. Requires reload.
  dirtPatchPercent:15,
  // Rocky ground color coverage, 0–100%; not boulder count. Requires reload.
  rockyGroundPercent:8,
  // Decorative grass/flowers/pebbles, 0–100%; maximum budgets 10,000/700/450.
  grassDetailDensity:60,
  // Clustering of trees/rocks, 0–100%; higher gathers them into groups.
  vegetationClusteringPercent:60,
  // Fog strength, 0–100%; requires fogEnabled. Near distance remains 350 m.
  hazeStrengthPercent:8,
  // Tree target density, 0–200%; 100% retains the original 175-tree target.
  // Safe placement/ramp exclusions may reduce the resulting count. Requires reload.
  treeDensityPercent:100,
  // Boulder target density, 0–200%; 100% retains the original 80-rock target.
  // Safe placement/ramp exclusions may reduce the resulting count. Requires reload.
  rockDensityPercent:100,
  // Play rendering only; live. Metres across one supplied grass image, clamped 2–40.
  // Higher enlarges brush marks; lower adds fine repeats. Examples: 4 fine, 9 balanced,
  // 18 broad. Start 6–12; adjust strength with scale. Geometry/physics unchanged.
  grassTextureScale:9,
  // Play rendering only; live 0–100%. 0 restores original procedural ground exactly;
  // 50 blends both styles, 85 strongly shows the supplied artwork. Start 60–90.
  // Independent of existing groundTextureStrengthPercent (procedural microdetail).
  grassTextureStrength:85,
  // Play rendering only; live saturation 0–150%. 0 gray, 80 subdued, 100 original art.
  // Start 75–100; coordinate with terrainColorVariation and background saturation.
  grassTextureSaturation:90,
  // Play rendering only; live 0–100% extra dirt-edge protection. 0 uses the original
  // soft surface mask, 50 softens the grass away from road edges, 100 widest dirt
  // margin. Start 25–60. Does not widen road geometry or modify traction/colliders.
  grassDirtBlending:45,
};
