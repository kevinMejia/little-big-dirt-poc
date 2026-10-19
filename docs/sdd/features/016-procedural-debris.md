# Procedural environmental debris

Baseline cbdd5bc; Windows desktop, 2026-10-19. Moderate risk, visual feature;
no new runtime dependency, simulation writes, colliders or suspension changes.

## Specification and decisions
Blender script exports an original CC0 GLB containing three variants of eight
types: small/medium rocks, gravel, twigs, branches, logs, fragments, splinters.
Ground origins, metres, flat shading and two untextured materials. Keep editable
source. A separate Three.js owner loads once, instances shared resources, and
disposes them on page exit. Retain the disabled legacy suspension debris system.

Seeded bounded rejection placement uses actual rendered terrain triangles;
surface masks, slopes and tree/rock anchors guide nonuniform habitat placement.
Protect spawn, winding path, rally road/shoulders, ramps and existing scenery.
Exclusion circles/boxes and a biome callback support future gameplay regions.
Current garages are dialogs, not map buildings; reserve future sites via zones.
Coverage follows rendered terrain bounds, including the eastern rally extension
and its tree/rock anchors, with road and shoulder exclusions. Future interactive variants
can consume placement records without changing the Blender pipeline.

## Plan / tasks
- Generate and inspect GLB and editable Blender source.
- Add independent config, deterministic placement and rendered triangle sampler.
- Integrate instancing, spatial visibility and owned-resource disposal.
- Test determinism, terrain interpolation, footprint exclusions, GLB loading,
  browser startup/driving, quality budgets and static Pages build paths.
- Record measured results and limitations below.

## Configuration contract
ProceduralDebrisConfig.js file defaults apply on reload, separate from existing
browser overrides. Global density multiplier 0–3; per-type count per 440m square,
scale ranges, collision footprint metres, seed uint32, yaw radians, cluster odds,
quality auto/desktop/mobile, view distance metres, exclusions and enable flag.
Auto uses coarse pointer as a heuristic; explicit tier overrides it. Counts are
targets, not guarantees; exclusions may exhaust bounded attempts. No new settings
storage or UI is necessary for this first decorative phase.

## Validation / completed tasks
All implementation tasks above are complete. Evidence commands:

- Blender 4.2.3 LTS, `--background --factory-startup --python tools/blender/build_debris.py`:
  successful export; repeated generation produced byte-identical GLB. 96,644 bytes,
  24 meshes, two materials, 876 total source triangles, no textures/external files.
- `node tests/procedural-debris.mjs`: pass; 1,805 test-map records, repeatable
  seed, changed-seed difference, actual barycentric plane heights/normals, zero
  density, mobile reduction, circular/box exclusions, route and biome rejection.
- `python tests/debris-asset.py`: pass; actual GLB origin/material/budget/source checks.
- `python tools/build_site.py` then `python tools/check_project.py`: pass;
  253 production files byte-checked and HTTP served under `/dirty-sandbox-game/`.
  Existing Rapier, suspension, jumps, steering, trees/rocks, rally, tuning,
  saved preferences, navigation, textures and vehicle asset checks all pass.
  Both new non-browser tests are included in the normal checker.
- `node tests/procedural-debris-browser.cjs` (bundled Playwright via NODE_PATH,
  production preview on :8001): pass. Windows, headless Edge 155.0.4283.62,
  1280×720, normal renderer/shadow settings; one second warmup, three seconds
  sampling per tier. Off/desktop/mobile medians were 7 ms and p95 about 7.1 ms.
  Whole-scene draw calls were 194/290/211 and triangles approximately
  2.247M/2.266M/2.252M. These are one static view, not device certification or a
  whole-map performance guarantee. See `016-debris-browser-results.json`.
  Desktop/mobile counts 6,336/2,220, including 2,690/924 east of the sandbox.
  Allocated spatial batches 1,304/873; most are culled at the tested view.
  Zero spawn/path/rally route violations. Every transformed exported vertex was
  tested against rendered terrain: maximum penetration/contact error 0.000016 m,
  below the 0.0001 m acceptance tolerance (Float32 instance matrices).
  Driving travelled the same 100.746456 m with debris off and both tiers on.
  Distance culling and idempotent disposal passed: 24 geometries/two materials
  each released once. No uncaught page errors or debris loading warnings.
- Reviewed game and asset overview screenshots in `docs/screenshots/procedural-debris*.png`.
  `git diff --check`: pass.

## Follow-up: small bumps
User requested reuse of the old bump behavior for the authored debris. Reuse the
existing wheel-contact sampler and body feedback springs, with a new spatial
footprint index built from the exported mesh bounds. Legacy debris generation
remains disabled. Defaults cap visual height at 7 cm with 70% strength (maximum
wheel lift 4.9 cm); wheel footprint filtering softens narrow twigs. Live bump
enable/strength/height configuration is under `proceduralDebrisConfig.bumps`.
Apply offsets to rendered wheels and existing body-feedback targets only; do not
modify Rapier terrain, chassis, traction, colliders or forces. Airborne samples
return zero. Validate field bounds/filtering/toggles, existing suspension tests,
browser loading/driving and the Pages build. This supersedes the original
no-suspension-feedback requirement, while keeping debris non-collidable.

Validation passed: field cap/rotation/filter/toggle/disposal tests; full project
checker after building 254 production files, including existing suspension and
Rapier regressions; desktop/mobile-tier Edge integration each measured 0.049 m
wheel feedback on a controlled footprint and zero after disabling bumps. Driving
travel remains identical across off/desktop/mobile. Final browser timings were
7 ms median, about 7–7.1 ms p95 at the tested view.

## Limitations

Physical iPhone/Android and desktop Safari/Firefox are unverified. Mobile tier was
forced in desktop Edge, not measured on a phone. No physical-device or 60 FPS
claim. Live GitHub publication was not performed; deployment was validated using
the production Pages subdirectory and actual GLB requests. Configuration is
file-based (bump enable/strength/height apply live), with no added saved preferences or settings UI. Distance
culling is chunk-level and can pop at its boundary. Footprint seating checks
vertices; natural irregular undersides can have gaps between contact points.
Terrain sampling assumes the current untransformed indexed terrain mesh. Future
map garages/checkpoints/activity areas must add explicit exclusion zones; current
garages are dialogs, checkpoint routes are protected by the road clearance, and
the current spawn has a 26 m reservation. Debris does not participate in Rapier,
physical suspension forces, raycasts for driving, destruction or displacement.
