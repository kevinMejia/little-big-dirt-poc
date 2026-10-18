# Painted grass ground

Uses the supplied image directly, unchanged: `assets/terrain/painted-grass.png`
(461 × 461 pixels). SHA-256: fef38ee102906614507d37469582e9208d2e3e30965c47e4212463ed6d7426e3.

The existing `GroundTextures.js` material hook, procedural detail, terrain geometry,
vertex colors, and 256-pixel dirt/rock surface mask remain in use. No extra mesh,
collider, or draw call is added. The painted layer blends over grass only; dirt
roads, ramp masks, rocky areas, debris and existing vegetation remain present.

Mirrored repeat wrapping makes image edges continuous without altering the source
image. Two samples (one rotated and at a different scale) blend over large regions;
broad gentle color variation reduces the visible grid. This is seamless rendering,
not a claim that the supplied bitmap has mathematically matching opposite edges.
At grazing angles broad repeated brush patterns remain faintly visible; the small
461px source also limits close-up detail. No hard tile seams were seen in tested views.

## Adjustments

Settings → Painted Ground applies live in Play and persists through the existing
TuningStore. Shared settings in other areas save changes for Play. Defaults are
commented in `WorldEnvironmentConfig.js` and exported with Environment settings:

- Grass texture scale: 2–40 metres per image; default 9.
- Painted grass strength: 0–100%; default 85. Zero restores original ground.
- Grass saturation: 0–150%; default 90.
- Dirt edge blending: 0–100%; default 45; higher leaves a wider soft dirt margin.

The existing procedural detail strength remains unchanged. Artwork load failure
leaves the original shader visible. Textures and shader hooks are cleaned up on exit.

## Validation

Full `python tools/check_project.py` passed, including production subpath links,
shared settings persistence, real-model physics regressions and shader-hook tests.
The shader test checks terrain position preservation, mipmaps, mirrored wrapping,
4× maximum anisotropy, pending-load fallback and live strength updates.
Browser checked normal driving, foreground brush detail, high-hill distant terrain,
zero-strength fallback/reset and actual touch acceleration. No shader errors logged.
390×844 portrait and 844×390 landscape were inspected. No physical iPhone benchmark.
The extra cost is one 461px RGBA texture (~1.1 MiB with mipmaps), two filtered texture
samples per fragment, no new draws. Trilinear mipmaps plus capped anisotropy reduce
shimmering at shallow viewing angles.

Screenshots in `docs/screenshots/`: `painted-grass-before.png`,
`painted-grass-after.png` (same camera), `painted-grass-hills.png`,
`painted-grass-landscape.png`, and `painted-grass-portrait.png`.

The approved painted countryside background is now enabled in normal Play. The
review toolbar is removed from all Play URLs; `?storybook=0` keeps the original
background for comparison. This does not disable painted ground; use its strength
setting independently. Gameplay, vehicle tuning and terrain positions are unchanged.

Update: the review toolbar has been removed from Play, including `?storybook=1`.
Background adjustments remain in shared Settings; the static comparison gallery remains available.
