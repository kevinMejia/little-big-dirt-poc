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
};
