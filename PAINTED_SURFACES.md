# Painted dirt and stony ground

`GroundTextures.js` extends the existing terrain material hook, dirt/rock blend
mask and packed microdetail. Terrain vertices, collision data, surface queries,
road/ramp placement, vegetation and vehicle/gameplay settings are unchanged.
Only rendered albedo and visual blend contours change.

The new original artwork is `assets/terrain/painted-soil-stone-v1.png`; its exact
built-in image_gen prompt/provenance is in `assets/terrain/soil-stone-art-direction.md`.
Each atlas panel tiles independently with mirrored sampling and a small inset at
the panel boundary. A second rotated scale and broad color modulation reduce
repetition. Soil is graded to muted ochre; stone is graded toward warm neutral gray.
The original surface mask remains authoritative. Packed detail perturbs only its
transition zones; zero-mask regions remain zero. Moderate rock-mask sharpening
reveals intentional gravel interiors without a binary cutoff. No terrain painter
surface results are modified, so grass/debris placement and physics see identical data.

## Controls and fallback

Settings → Painted Ground uses the existing shared TuningStore and persistence.
All controls apply live in Play. Defaults/ranges/comments are in
`WorldEnvironmentConfig.js` and export through existing Environment export:

- Painted dirt strength: 0–100%, default 75.
- Stony ground strength: 0–100%, default 90.
- Dirt texture scale: 2–24m across panel, default 8m.
- Stone texture scale: 1–16m across panel, default 4.5m.
- Surface edge variation: 0–100%, default 60.

Set BOTH strengths to zero for the previous grass/dirt/rock appearance, including
original blend contours. Grass strength remains independent. Missing atlas leaves
original surfaces active. Reset each strength to restore the new defaults. No
previous configuration values were changed; these are new visual parameters only.

## Performance and checks

One 1254px atlas (~3.23 MiB download, ~8 MiB RGBA with mipmaps), four added filtered
samples per terrain fragment, no extra draw calls or mesh. Trilinear mipmaps and
anisotropy capped at 4× reduce shimmer. No normal map, parallax, post-processing,
new dependencies or geometry are required. Repeated motifs can still be detected
across very large patches; fine gravel naturally softens at distance. The existing
256px mask limits the precision of narrow edges; it is not rebuilt or enlarged.
Atlas inset prevents visible panel bleed at close range; very small distant mips
average toward the muted atlas colors.

Full `python tools/check_project.py` passes. Extended shader-hook tests cover load
fallback, independent dirt/rock strength and scale updates, original-strength zero,
filtering, shared mask use, unchanged terrain positions and resource cleanup.
Browser tested same-camera fallback/new materials, normal driving, actual touch
acceleration/braking and 844×390 / 390×844 viewports, with no shader/console errors.
Physical iPhone performance has not been benchmarked.

Matched screenshots: `docs/screenshots/soil-rock-before.png` / `soil-rock-after.png`
and `stone-patch-before.png` / `stone-patch-after.png`. Mobile captures:
`soil-rock-landscape.png` / `soil-rock-portrait.png`.
