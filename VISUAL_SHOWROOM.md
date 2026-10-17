# Visual Asset Showroom

Open `viewer/showroom.html`, or choose **Asset Showroom** in the shared menu from
Play, Dirt Jump Lab, or any existing viewer. This is an independent Three.js scene:
no Rapier, vehicle controller, pickups, boost actions, or world generation.

## Turbo Boost v01

- Blender source: `assets/blender/pickups/turbo_boost.blend`.
- Reusable GLB: `assets/pickups/turbo-boost/turbo-boost.glb`.
- Geometry metadata: `assets/pickups/turbo-boost/manifest.json`.
- Rebuild: run Blender with `--background --factory-startup --python tools/blender/build_turbo.py`.
- Exported budget: 14,112 triangles, 31 meshes, 549,176 bytes (536 KB), embedded
  geometry/materials, no external textures or Draco decoder. The source has
  14,228 triangles before the GLB exporter removes degenerate geometry.

Blender provides the beveled lightning core, protective bezel, segmented armor,
gold trim, cyan inlays, terminal caps and independently named ring pivots. Its
source-only studio camera/lights are excluded from the GLB. Three.js animates
rotation, ring movement, floating, pulsing emission, additive glow sprites and a
single pooled particle buffer. Those effects stay live rather than baked.

## Preview controls and approval

Scale (.5–1.6×), rotation (0–90°/s), float height (1.3–3.5m), float speed (0–2Hz),
float amount (0–.4m), glow (0–2.5×), main/accent colors, particle intensity
(0–100%), optional bloom, and lighting (.2–2×) update immediately. Increase float
height when previewing a large scale to keep the pedestal clear. Pause motion,
Reset View and Reset to Defaults are separate controls.

Export visual settings saves a JSON preview document, always `approved: false`.
Load settings JSON validates and restores it. Nothing writes to VehicleConfig.js
or gameplay. Review the asset and exported values before any future integration.

## Reuse and performance

Register future assets in `viewer/showroom-assets.js`; the loader, pedestal,
camera, controls and cleanup are shared. Optional `displaySize` fits larger GLBs
to the stage. Manifests identify material color roles and animation pivots.
Future letters, stars, vehicles and environment categories are disabled selector
entries; only Turbo Boost is developed here.

Full bloom is off by default on every device and is dynamically loaded only when
enabled. Default glow uses emissive surfaces and two sprites. Mobile widths/coarse
pointers cap pixel ratio at 1 and particles at 32 (desktop: 1.5 and 64). Shadow map
is 1024px. Full bloom remains GPU-intensive and can reduce iPhone performance;
actual iPhone hardware testing is still required. Desktop and 390×844 responsive
previews were checked; viewport emulation is not a hardware benchmark.

## Validation

`tests/showroom.mjs` validates the real Blender/GLB artifacts, exported triangle
budget, finite vertices, named pivots/materials, visual JSON validation/round trip,
mobile-safe defaults and absence of physics dependencies. In-browser checks cover
all controls, bloom on/off, defaults, downloaded JSON and loading it back, orbit/
reset view, mobile layout, and shared navigation. Run `npm run build` and `npm test`.
The existing gravity-dependent physics assertions with the current unchanged
`gravityScalePercent: 250` remain separate from showroom validation.
