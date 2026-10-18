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

All four Asset Showroom destinations use `viewer/ShowroomLayout.css`. The shell
fills the dynamic viewport, reserves safe areas and the navigation header, and
splits the remaining height 58% preview / 42% settings. Only the settings pane
scrolls, with scroll chaining contained; the canvas keeps its own orbit/zoom/pan
handlers. This also applies inside embedded vehicle garages.

New assets registered in `viewer/showroom-assets.js` inherit this shell and its
controls automatically. A new standalone viewer should load `ShowroomLayout.css`,
use `body.showroom-layout`, and provide a direct `header` followed by `main` with
`#stage` and `aside` children. Put the viewer canvas in `#stage` and all settings
in the labelled, focusable `aside`; do not add page heights or inner scrolling
containers. Observe the stage size with `ResizeObserver`, as the existing viewers
do. Register its destination in `navigationItems`'s Asset Showroom children in
`SharedNavigation.js` so the shared menu groups and highlights it automatically.

`tests/showroom-layout.cjs` runs installed Edge through Playwright at desktop
1440×900, portrait 390×844, and landscape 844×390. It checks all four loaded
viewers, slider access, fixed preview bounds during settings scroll, preview
input and the grouped navigation. Run with Playwright available through
`NODE_PATH`; the existing CDN imports need network access. Screenshots are saved
under `docs/screenshots/showroom-*.png`. These are browser viewport checks, not
physical iPhone Safari testing.

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
The full project check also passes with the unchanged `gravityScalePercent: 250`.
Physics regression expectations now account for the effective 200% gravity cap;
the legacy tire-grip benchmark explicitly uses its original 100% gravity fixture.
