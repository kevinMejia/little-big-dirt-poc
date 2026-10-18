// Global Play environment defaults. Saved Settings overrides apply before scene
// creation. Reload Play to rebuild scenery; vehicle physics is independent.
export const worldAppearance={
  // Main Play only: full square width AND length, in world metres; clamped 220–880.
  // Reload required. 440 = previous map; 660 = 1.5× width / 2.25× area (default);
  // 880 = 2× width / 4× area, with greater memory/startup/rendering cost.
  // Start 440–660 for phones. Terrain/texture scales and ramp coordinates stay fixed.
  // Tree/rock/grass/debris target counts scale by (worldSize/440)², in addition to
  // their existing density controls. Boundaries stay 15m inside each terrain edge.
  // Does not affect Dirt Jump Lab dimensions, vehicle tuning, spawn or reset.
  worldSize:660,
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
  // Decorative grass/flowers/pebbles, 0–100%; budgets 10,000/700/450 per 440m map, scaled by area.
  grassDetailDensity:60,
  // Clustering of trees/rocks, 0–100%; higher gathers them into groups.
  vegetationClusteringPercent:60,
  // Fog strength, 0–100%; requires fogEnabled. Near distance remains 350 m.
  hazeStrengthPercent:8,
  // Tree target density, 0–200%; 100% targets 175 trees per 440m map, scaled by area.
  // Safe placement/ramp exclusions may reduce the resulting count. Requires reload.
  treeDensityPercent:100,
  // Boulder target density, 0–200%; 100% targets 80 rocks per 440m map, scaled by area.
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
  // Play visual-only, live 0–100%. 0 restores the previous dirt rendering exactly;
  // 40 subtle brushwork, 75 worn painted soil, 100 full artwork. Start 50–80.
  // Road/ramp placement and traction are unaffected. Coordinate with dirtTextureScale.
  dirtTextureStrength:75,
  // Play visual-only, live 0–100%. 0 restores the former soft rock patches;
  // 50 restrained gravel, 90 distinct stony ground. Start 70–95.
  // Coordinate with rockTextureScale and surfaceEdgeVariation; no collision change.
  rockTextureStrength:90,
  // Play visual-only; live 2–24 metres across the soil atlas panel (height twice width).
  // 4 fine soil marks, 8 balanced, 16 broad brushwork. Start 6–10.
  dirtTextureScale:8,
  // Play visual-only; live 1–16 metres across the stone panel (height twice width).
  // 2 fine gravel, 4 embedded chips, 8 larger rough marks. Start 2–5.
  rockTextureScale:4.5,
  // Play visual-only; live 0–100% irregularity at existing surface-mask edges.
  // 0 preserves the old contours; 50 gently breaks edges, 100 more ragged patches.
  // Start 40–70. Has no effect when both dirt/rock texture strengths are zero.
  surfaceEdgeVariation:60,
};
