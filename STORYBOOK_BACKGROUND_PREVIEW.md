# Painted countryside — visual review

Live preview: `index.html?storybook=1`.
Comparison gallery: `viewer/storybook-review.html` (also linked from Environment
Workshop → Painted countryside review). Normal Play continues using the original
background. The preview is **not approved** and does not enable itself from saved
preferences. `?storybook=0` and URLs without the flag use the original scenery.

The comparison gallery contains matching north, east and high-hilltop camera
captures. In the live preview, the compact view chooser provides north/east/south/
west and hilltop presets, plus Drive / orbit to return to the normal chase camera.
Hilltop moves only the camera to a sampled high point on the existing terrain.
Show Original / Show Painted switches backgrounds without reloading or changing
the car. Rendering distance is extended only while the painted version is active.

## Original artwork

Both textures were generated with the built-in OpenAI image_gen tool:

- `assets/backgrounds/storybook-v1/countryside-panorama.png`: 1774×887, original
  panoramic gouache-style sky/clouds/countryside, about 2.1 MiB.
- `assets/backgrounds/storybook-v1/painted-meadow.png`: 1254×1254, original meadow
  brush texture for the 3D horizon transition, about 3.1 MiB.
- Exact generation prompts: `assets/backgrounds/storybook-v1/art-direction.md`.
- Provenance, dimensions and approval state: the adjacent `manifest.json`.

The countryside screenshot mentioned in the request was not attached in the
accessible conversation. This original visual study follows the written art
direction; it does not claim to reproduce or match a reference image we inspected.

## Rendering

`StorybookBackground.js` maps the painted panorama onto a camera-centered sphere.
The landscape and sky retain distinct motion: only the upper cloud portion drifts.
A periodic seam bridge softens the image's left/right join rather than assuming
generated pixels are an exact mathematical tile. Vertical projection is compressed
around the horizon to expose multiple painted countryside layers from the low
driving camera. The top/bottom polar regions clamp to the artwork's uniform edges.

A curved, textured transition mesh begins exactly at the playable terrain edge.
Its first vertices use the existing terrain heights/colors and real scene lighting;
painted meadow color and atmospheric softening fade in outward. The panoramic
artwork supplies the detailed distant hills/mountains and vegetation, not flat
colored billboard silhouettes. The transition exists outside the playable square
and has no colliders, interactions or physics. The existing world boundary/cannon
continues to make the distant backdrop unreachable.

Three.js supplies the sphere/transition geometry, material grading, warm sun halo,
cloud drift and atmospheric blending. No bloom, HDR environment, additional
render target, full-screen post-processing or foreground fog is introduced.
Blender was not needed: the actual illustration supplies the visual detail, while
the lightweight runtime skirt must follow the existing terrain edge precisely.

The regular terrain, ramps, roads, models, trees, rocks, collision adapters,
vehicle tuning, lighting and input handlers remain unchanged. Review camera
presets and background grading run only on the explicit preview route. Original
background fog and camera range are restored when comparing or disposing.

## Live settings

In the preview, shared Settings → Storybook Preview provides brightness,
saturation, sky/background tint, sun bearing/elevation/glow, mountain visibility,
background atmosphere, cloud drift, background scale, horizon alignment and
panorama direction. Defaults and supported units/ranges are documented in
`StorybookBackgroundConfig.js`. Sun controls affect the background halo, not the
foreground directional light. Tint grades the whole illustrated palette for a
cohesive result. Scale rebuilds only the non-collidable transition geometry.

These settings reuse TuningStore's saved overrides, field/category resets and
validation. Export storybook preview settings downloads a compatible configuration
module. They neither enable the preview automatically nor change VehicleConfig.js.
Normal Play/labs hide this experimental settings section. Versioned import-map
aliases keep the shared Settings/store modules consistent across cached entry
pages; all asset URLs remain relative for repository-based GitHub Pages hosting.

## Budget and validation

The new background uses two texture assets (about 5.2 MiB downloaded), roughly
16 MiB of RGBA texture memory including mipmaps, and 13,184 background triangles
across two meshes/draw calls. Original comparison geometry remains hidden rather
than rendered twice. Textures are below 2K on their longest edge; high-resolution
desktop displays can reveal their deliberately soft distant detail. A higher
resolution art pass can follow visual approval without changing this interface.

Desktop plus 390×844 and 844×390 browser viewports were checked. The compact review
toolbar stays above the main toolbar, with driving controls clear. A held touch
accelerator drove the vehicle while the painted scenery rendered; saturation was
set to zero to verify the foreground remained colored, then reset. North, east,
south, west and high-hilltop views were inspected. Browser shader/console logs
were clear. An actual boundary-cannon flight was observed with the normal chase
camera and painted backdrop, without missing scenery or rendering errors. Normal
Play was separately checked: no review toolbar or experimental settings section.
Native iPhone Safari performance has not been measured on hardware.

Automated checks verify actual artwork dimensions, exact terrain-edge attachment,
geometry remaining outside the playable square at every supported scale, live
uniforms, sky following the camera, original-mode restoration, texture/geometry/
material disposal, and clean fallback to original scenery on artwork failure.
The existing full project check, including actual-model main/lab handling tests,
passes. No vehicle physics defaults were changed.

Review screenshots are under `assets/backgrounds/storybook-v1/review/`; the combined
comparison sheet is `docs/screenshots/storybook-comparison.png`.
