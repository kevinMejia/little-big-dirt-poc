# Dirty Sandbox Game

Little Big Dirt is an existing Three.js driving sandbox with a Blender backhoe,
garbage truck, hills, tree knockdowns, destructible rocks, touch controls and a vehicle garage.

## Run locally

Use Python 3.10+ and a modern browser with WebGL 2. From this directory:

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Open http://127.0.0.1:8000/ . Substitute `python3` if that is your system's command.
Do not open index.html through file://; modules and GLBs require HTTP.
Three.js 0.168.0/addons use pinned HTTPS jsDelivr imports, so internet access is required.
There is no Vite, npm install step, runtime backend or external physics engine.
Node.js 22+ is needed only for regression tests. Optional npm scripts wrap Python commands.

## Controls

Per-vehicle speed tuning is in `VehicleConfig.js`: `speedAdjustmentPercent` defaults
to `0` for both vehicles. `25` gives 1.25x normal acceleration and forward/reverse
speed limits, `100` gives 2x, and `-50` gives .5x. Use `0`, `""`, or omit the setting
to retain original tuning; leave an empty value as a quoted string so JavaScript
remains valid. `-100` or lower disables powered driving. Vehicles still start stopped;
hill percentages compose with the adjusted limits. Braking, hill hold and collision
thresholds retain their existing settings. Edits apply without changing physics code.

| Control | Action |
| --- | --- |
| W / up | Accelerate |
| S / down | Reverse |
| A / D or left / right | Steer |
| Space | Brake |
| E | Emergency brake |
| 1 / 2 | Select backhoe / garbage truck |
| Hold 1 / 2 or the numbered vehicle button | Open vehicle garage |
| R | Reset |
| H | Honk |
| Gamepad | Left stick steering, triggers drive/reverse, A brake |

Touch controls appear automatically on touch-capable devices; the Touch controls
button also toggles them. Green accelerates; orange brakes forward travel, then
reverses. Use another finger to steer. Landscape is recommended. Input releases on
cancellation, lost capture, backgrounding, rotation and resize. Garage equipment
poses persist for the session. Existing movement and interaction settings remain
in VehicleConfig.js; release braking brings the vehicle to zero on hills.

## Build and verify production

```sh
python tools/build_site.py
python tools/check_project.py
python tools/serve_site.py --production --port 8001
```

Open http://127.0.0.1:8001/dirty-sandbox-game/ . The build copies runtime code and
assets unchanged into ignored `dist/`. Relative imports, model/texture paths,
garage frames and downloads work under the repository subdirectory. No Vite base
setting is needed. package.json records the Pages base and provides optional
`npm run build`, `npm test` and `npm run preview` scripts without dependencies.

Verification checks original/build hashes, local links, GLB structure and image/buffer
resources, and HTTP delivery of every deployed file at `/dirty-sandbox-game/`.
It then runs existing hill, stop, touch input, garage, tree, rock, model and articulation
regressions. Some tests fetch pinned Three.js on their first run. Deployment does
not require Blender. Build artifacts contain no Git metadata, environment files,
credentials, dependency folders, logs or Blender autosaves.

## Create/connect GitHub and publish after approval

1. Create an **empty** repository named `dirty-sandbox-game` in your GitHub account.
   For GitHub Free Pages hosting use a public repository. Do not initialize the remote
   with a README, license or .gitignore; those would create a separate initial history.
2. Review `git status`, .gitignore, this README and .github/workflows/pages.yml.
   The actual game root is initialized on `main`. The separate nested
   `Little-Big-Dirt/` checkout is ignored and untouched. Run commands from the game root.
3. After approving publication, replace YOUR-USERNAME below and run:

   ```sh
   git add .
   git diff --cached --stat
   git commit -m "Prepare Dirty Sandbox Game for GitHub Pages"
   git remote add origin https://github.com/YOUR-USERNAME/dirty-sandbox-game.git
   git push -u origin main
   ```

   Use your normal GitHub sign-in or credential manager, never a token embedded in
   the remote URL. If origin already exists, inspect `git remote -v`; use
   `git remote set-url origin ...` only when deliberately changing it. If connecting
   a nonempty remote, fetch and reconcile its history first; do not force-push.
4. Open repository **Settings -> Pages -> Build and deployment -> Source** and
   select **GitHub Actions**. Ensure repository Actions are enabled. If the first
   run failed because Pages was not configured, rerun it after enabling the setting.
5. In **Actions**, run/rerun **Build and deploy game to Pages**. Pushes to `main`
   build, test and deploy automatically. Pull requests build/test without deploying.
6. Visit `https://YOUR-USERNAME.github.io/dirty-sandbox-game/`. The successful
   deployment environment also displays the actual URL. Check driving and garages.

The workflow uses configure-pages, upload-pages-artifact and deploy-pages; only
its deployment job has Pages/OIDC write permissions. It uses GITHUB_TOKEN and needs
no custom token or secret. See the [official custom workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
If renaming the repository, update the documented preview base, package config and
verification base together. Runtime relative paths also support a custom-domain root.
Nothing is pushed by the preparation scripts. No remote or initial commit is created
until you choose to perform the publication steps.

## Source and assets

- index.html: bootstrap, main loop, terrain, procedural truck, camera and interface.
- VehicleConfig.js, VehicleMotion.js, HillSpeedPhysics.js: existing custom movement.
- DrivingInput.js and VehicleGarage.js: input merging and vehicle garage.
- TreeCollisionSystem.js and RockInteractionSystem.js: existing gameplay interactions.
- assets/dirty/: active dirty.blend, dirty.glb, manifest, adapter, embedded paint
  texture authoring image, references and comparison renders.
- assets/dirty/backups/pre-reference-sheet/: previous Blender loading fallback.
  BackhoeLoader.js remains the final procedural fallback.
- assets/dirty/candidate/: unpromoted work, loaded only with explicit candidate
  viewer URLs. Deployment does not promote or replace the active model.
- assets/blender/ and assets/models/: approved tree/boulder sources and GLBs.
  viewer/environment.html remains their standalone preview. EnvironmentWorld.js
  connects the same imported assets to the playable world's existing interactions.
- EnvironmentAssets.js: shared loading and optional static instancing for those assets.
- WorldAppearance.js: centralized visual settings, decorative horizon, terrain
  vertex colors, deterministic clustered placement and static instanced ground details.
- viewer/dirty.html and viewer/comparison.html: vehicle inspection and reference views.
- tools/blender/: authoring/validation scripts. Blender is needed only to rebuild models.
- tests/: existing regression scripts and local collision preview fixtures.

Necessary editable .blend sources, GLBs, textures and fallback assets are included
as normal Git binaries. Current files are all below GitHub's 100 MiB normal-file
limit, so Git LFS is unnecessary for this snapshot. Viewers' Blender downloads are
also included in the deployed site. Sounds are generated using Web Audio in
index.html; no external audio files are required. The build supports audio files
if added later. Existing references/renders are preserved. Blender autosaves, logs,
local screenshots, build outputs, dependency folders and the suspension handoff ZIP
are ignored. No source files were moved into the unrelated nested checkout.

## Mobile Safari

Target modern Safari **16.4+** with WebGL 2; [native import maps arrived in Safari 16.4](https://webkit.org/blog/13966/webkit-features-in-safari-16-4/) and are required by the
unchanged modules. Pages uses HTTPS and CDN imports are HTTPS. Existing safe-area
CSS, pointer capture, independent multitouch ownership, touch-action rules and
user-gesture audio unlock remain unchanged.

Automated regressions cover simultaneous drive/steer, finger slides, capture loss,
cancellation, backgrounding, rotation and resize. Windows browser checks cannot
certify actual iOS Safari behavior. Before announcing the site, test its published
HTTPS URL on a real iPhone/iPad:

- Vehicle GLB and both garages load; sliders and returning to driving work.
- Two-finger drive/steer, brake-to-reverse, release-to-stop and touch toggle work.
- Rotation/backgrounding clears held inputs; notches and browser bars do not cover controls.
- Honk/impact audio unlocks after touch; frame rate remains acceptable.
- Reloading the game and viewer URLs has no missing assets.

This deployment setup does not change driving physics, suspension, vehicle models,
terrain, collisions or touch behavior. Environment integration is documented below.

## Camera, visual body feedback and airborne boundary return

Drag an empty area of the game canvas with a mouse or one finger to orbit the
selected vehicle. Driving buttons retain their own pointer IDs, so another finger
can still accelerate or steer. Vertical orbit is limited to elevations .12–1.15
radians; the rendered camera stays at least 1.3 units above sampled terrain.

In VehicleConfig.js, cameraSettings.cameraReturnSpeedPercent defaults to 50.
Released orbit offsets are multiplied by exp(-8 * percent/100 * dt). At 0 the view
holds its offset; at 50 the return rate is 4/s (95% offset decay in .75 seconds);
at 100 it is 8/s (95% in .375 seconds). The existing camera-follow interpolation
still smooths its final position. Reset returns to the default chase view.

Each vehicle exposes bodyRollPercent (25), bodyPitchPercent (20),
suspensionBouncePercent (20), boundaryBouncePercent (25) and
boundaryBodyRockPercent (30). These settings do not change collider orientation.
VehicleFeedback.js is a small math/feedback helper, not a rigidbody suspension engine.

- Body roll scales a maximum 12-degree visual turn angle, reached at lateral
  acceleration 12 units/s². At 25%, that is up to 3 degrees of outward roll.
- Pitch scales a maximum 10-degree acceleration/braking angle, reached at
  longitudinal acceleration magnitude 12 units/s². At 20%, that is up to 2 degrees.
- Bounce scales a .3-unit maximum terrain-response heave target, plus up to
  5 degrees of terrain rocking. At 20%, these are .06 units and 1 degree.
- A bounded damped spring smooths and settles these visual targets with substeps
  no larger than 1/120 second. The visual parent receives feedback after terrain
  alignment; wheels compensate through their own parent transforms. Hydraulic
  updates run afterward. Logical position/heading and the chase target do not bounce.
- Reaching the existing boundary triggers `BoundaryCannon.js`: a velocity-based
  projectile, not a target position or timed animation. `SoftBoundary.resolve`
  retains the original vehicle-footprint boundary detection. The cannon owns
  logical position only while airborne; grounded driving, hills, braking and
  obstacle response are skipped until touchdown. Tree/rock updates continue.
- Each vehicle has its own `boundaryCannon` object in `VehicleConfig.js`:
  `enabled`, `horizontalLaunchSpeed` (Dirty 45, Stinky 45),
  `verticalLaunchSpeed` (28 / 29), `launchSpinPercent` (20 / 15),
  `airControlPercent` (15 / 15), `landingBouncePercent` (30 / 38).
  Speeds use world units/second. Horizontal speed is bounded to 8–65 and vertical
  speed to 8–40; percentages are bounded to 0–100. Disabled cannon retains the wall.
- Gravity is 12 units/s², with substeps <=1/120 second and exact constant-gravity
  position integration within each substep. On level ground Dirty's default arc
  lasts about 4.67 seconds, rises 32.7 units and travels 210 units. Actual landing
  depends on terrain height. There is no center target or interpolation.
- Air steering rotates horizontal velocity at up to .7 * airControlPercent/100
  radians/second. Heading eases toward velocity for chase-camera comfort. Spin
  scales slow bounded visual pitch/roll, not collision orientation. Wheels keep
  spinning and extend .12 units unloaded; equipment/hydraulics continue updating.
- Terrain crossing is located within the landing substep. Touchdown retains 72%
  of horizontal speed, aligned with travel, then resumes existing hill overspeed
  settling and normal release braking. It never forces a normal landing to zero.
  `landingImpact` receives actual downward impact speed: heave impulse is
  `-min(3.4, impact * .32 * landingBouncePercent/100)`. Existing chassis springs
  provide compression and rebound, with reduced heave damping for 1.8 seconds.
  Landing uses the existing pooled dust and a quiet Web Audio thud.
- One latch prevents repeated launch while airborne/at the wall; it rearms only
  grounded at least 12 units inside the boundary. Extreme settings redirect an
  outward airborne velocity near the edge without teleporting. A 15-second or
  non-finite-state emergency guard is the only automatic reset. Vehicle switching
  retains the active flight; manual reset cancels it. No new dependencies/assets.

Visual front-wheel steering uses the same turn sign as the heading update for both
vehicles; reverse preserves the normal reversed yaw response. Model/asset files and
the existing hill, release-stop and obstacle thresholds are unchanged. Regression
coverage includes frame-rate-independent return/feedback, every wall/corner, reverse,
rebound caps, held-wall input, settling, and ground contact using the real GLB pivots.

## World appearance

Edit the exported `worldAppearance` object in `WorldAppearance.js`, then reload:

```js
export const worldAppearance = {
  fogEnabled: false,
  distantHillsEnabled: true,
  terrainColorVariation: 25,
  dirtPatchPercent: 15,
  rockyGroundPercent: 8,
  grassDetailDensity: 40,
  vegetationClusteringPercent: 60,
  hazeStrengthPercent: 8
};
```

All numeric appearance percentages clamp to 0–100. These are rendering/placement
settings; they do not change the analytic terrain height, terrain grid, vehicle
physics, camera, map bounds or obstacle collision thresholds.

| Setting | Mapping |
| --- | --- |
| fogEnabled | False removes scene fog entirely. True enables only the optional distant haze. |
| distantHillsEnabled | Adds/removes one decorative landscape mesh beyond the original 220-unit terrain edge; never registered for collision. |
| terrainColorVariation | Grass palette blend is min(1, percent/50), plus fine brightness variation up to ±9% at 100. At 0 the grass uses the original base green; dirt/rock/path remain separately controlled. |
| dirtPatchPercent | Selects approximately this percentage of a calibrated broad noise field for dirt patch regions. A .06-wide noise transition softens edges. Steep-slope earth exposure also scales with this percentage. The existing winding path is retained independently. |
| rockyGroundPercent | Selects approximately this percentage of another noise field for muted stone-colored regions, strengthened on slopes. These are vertex colors, not additional colliders. |
| grassDetailDensity | Instance budgets scale linearly from zero to 10,000 grass tufts, 700 flowers and 450 tiny pebbles at 100. Default 40 caps these at 4,000 / 280 / 180. Road/trunk/boulder avoidance and surface masks may reduce actual counts. |
| vegetationClusteringPercent | Fraction of tree/rock position proposals drawn from small cluster neighborhoods rather than uniform positions. The same percentage scales woodland/meadow placement bias. At 0 proposals are uniform; fixed spawn/path clearings and minimum spacing still apply. |
| hazeStrengthPercent | Only used when fogEnabled is true. Linear haze starts at 350 units; far distance is 350 + 1000/(percent/100). Default 8 gives far=12,850, about 2% haze at 600 units. Zero disables haze. |

Terrain uses vertex colors without repeating image textures. Distant hills share
all 880 playable perimeter vertices and their colors, then roll into a continuous
outer landscape skirt. This hides terrain edges without changing the playable map.
The sky remains clear blue. Decorative hills, grass, flowers and pebbles have no
colliders. The existing Blender tree/rock assets remain unchanged; placement still
registers the same interaction systems with the same scale ranges, using a stable
local seed (175 trees, 80 rocks). The spawn clearing and winding path stay open.

Ground details use three static InstancedMesh draws; the horizon adds one mesh.
Details receive shadows but do not cast them, and nothing in this appearance module
updates each animation frame. Lower grassDetailDensity first on slower phones.
Actual iPhone Safari frame rate has not been hardware-benchmarked here.

Run `python tests/run_world_appearance_tests.py` for horizon seam geometry/colors,
fog toggles, deterministic clustering, clearings, color/patch controls, instance
budgets and terrain seating tests. These checks also run in the production verifier.

### Stationary ground debris and wheel feedback

`GroundDebrisSystem.js` adds four shared instanced batches (dirt mounds, stones,
branches and earth clumps). These are fixed height features, separate from the
pushable/destructible rocks. No colliders or driving forces are added.

Tune `groundDebrisConfig` in `VehicleConfig.js`:
- `densityPercent`: 0–100 maps to 0–1,000 details (500 by default).
- `interactivePercent`: deterministic probability of a detail producing a bump.
- `minBumpHeight` / `maxBumpHeight`: world units, constrained to 0–0.5 m.
- `suspensionEffectPercent`: 0–100 scales the existing chassis spring targets;
  zero disables debris wheel/chassis reactions while keeping visuals.
- `maxInteractiveDistance`: lookup cutoff from the active vehicle, in world units.
- Four type percentages are normalized placement weights, not separate densities.

Placement uses a fixed seed, favors rocks near boulders, twigs under trees and
soil near dirt, and excludes spawn, trunks, boulders, steep slopes and boundaries.
Only nearby interactive grid cells are sampled. Five tire-footprint samples filter
small details. Overlaps use the maximum height, preventing stacked launch spikes.
There are four extra draw calls and no per-debris frame updates or shadow casting.

Independent wheel supports follow `terrain + debris`; average wheel rise and
front/rear/left/right differences feed the existing `VehicleFeedback` springs.
Existing per-vehicle bounce, pitch and roll percentages scale those body targets.
The authoritative terrain sampler and collision root are unchanged. Both Dirty's
four wheels and Stinky's six wheels are supported, including reverse and flight.

Open `?debrisDebug=1` for live enable/density/interactive/height/effect controls,
controlled regeneration, footprint outlines, contact markers and wheel readings.
Density/height/category changes regenerate deterministically on release; effect
changes apply on the next frame. Debug settings are temporary and are not saved.
`groundDebris.regenerate()` is the reusable controlled regeneration API.

This is visual suspension: wheels follow a smooth footprint-filtered surface
while the chassis uses the existing spring/damper. It is not tire deformation or
physical suspension travel. Small mesh/profile differences on slopes and tire
contact averaging are intentional approximations. No debris can push or launch a
vehicle. Production regressions and controlled wheel scenarios are tested by
`python tools/check_project.py`, including `tests/run_ground_debris_tests.py`.
Actual iPhone Safari performance still requires device testing.

### Visual polish settings

`visualPolishConfig` is exported from `VehicleConfig.js`; reload after editing.
The implementation lives in `VisualPolish.js` and never changes terrain heights,
vehicle movement, collision state, model resources, camera input or object placement.

| Setting | Mapping |
| --- | --- |
| `shadowQuality` | `low`: 1024 map / 100-unit width; `medium`: 2048 / 130; `high`: 2048 / 96. High prioritizes nearby detail, not extra render passes. |
| `contactShadowStrengthPercent` | 0–100 scales radial terrain contact opacity from 0 to .6. One shared instanced batch follows wheel contacts and moving rocks, hidden for airborne wheels and broken rocks. |
| `terrainColorVariationPercent` | 0–100 scales subtle, deterministic vertex-color variation (up to about 26% at 100). Terrain geometry and height stay unchanged. |
| `dirtBlendSoftnessPercent` | 0–100 softens road-edge color coverage using the existing dirt mask; does not change placement or gameplay surface classification. |
| `dustIntensityPercent` | Scales pooled dust size and opacity; zero hides driving and landing dust. Only grounded travel on dirt emits driving dust, with acceleration, turn rate and lateral slip increasing volume. |
| `tireTrackOpacityPercent` | 0–100 maps to opacity 0–.5; rear wheel marks only appear on dirt and fade over 9 seconds. A 192-mark ring buffer prevents unbounded geometry. |
| `debrisColorVariationPercent` | 0–100 adds deterministic instance brightness variation of ±30%; soil-colored debris also blends toward its ground palette. |

Warm sunlight, sky/earth ambient fill and a cool unshadowed fill use ACES/sRGB.
The single directional shadow map follows the selected vehicle, snapped in light
space to reduce shimmer. Small debris does not cast new shadows. Dust has a fixed
48-particle pool, and tracks/contact shading use shared geometry. These add three
render draws total, without screen-space effects, new dependencies or textures.
Debris density and interactive height profiles are preserved. Landing adds 8%
more visual compression to the existing spring impulse; launch velocities and
landing momentum are unchanged.

The HUD's **i** button toggles driving diagnostics and measured FPS/draw/triangle
counts (`?debug=1` starts with them visible). Existing `?debrisDebug=1` still opens
wheel/debris tuning. Touch controls retain their bindings, sizes and safe-area
insets. Idle status and prototype text are hidden in ordinary play.

Validation: production path/assets, gameplay regressions, surface effect gating,
pool limits/fade/cleanup and unchanged terrain positions are covered by
`python tools/check_project.py`. Browser review includes same reset-camera captures
for the baseline and each phase, dirt tracks, flight/landing and portrait layout.
Phone-sized desktop browser checks are emulation, not an actual iPhone Safari
performance measurement. Desktop diagnostics varied with browser load; use the
on-screen counter for the target device before increasing quality or density.

Ground textures (`GroundTextures.js`) add visible, seamless grass blades, soil
grains/pebbles and rocky detail using a generated 512px packed texture and a 256px
surface-blend mask. The existing Standard material retains lighting and shadows;
small derivative-based bump shading adds relief without moving any vertices.
`visualPolishConfig.groundTextureStrengthPercent` defaults to **75**; 0 disables
texture contrast/relief and 100 gives full detail. Two rotated sampling scales
break up repetition; mipmaps, up to 4x anisotropy and fading from 65–180 world units
limit distant shimmer. No extra draw calls or downloads; approximately 1.6 MiB
of texture storage including mipmaps. Physics height and surface classification
remain unchanged. Reload the served game after changing the setting.

### Dirt jump review prototype

Open `viewer/jumps.html` for the isolated Rapier jump lab: one-ramp physics test,
four-ramp playground, and rolling-terrain geometry review. The normal playable
world is unchanged. `DirtJumpSystem.js` provides the shared ramp-aware mesh;
`JumpVehiclePrototype.js` owns real rigid-body motion in the lab at fixed 120 Hz.
`jumpConfig`, `rampConfig`, and `jumpVehicleConfig` in `VehicleConfig.js` expose
ramp, gravity, air-control, spring, mass and cartoon-response tuning.

See [JUMP_DEVELOPMENT.md](JUMP_DEVELOPMENT.md) for review controls, Rapier evaluation,
known limits and the integration plan. Do not enable this in normal gameplay until
ramp feel and the actual tree/rock/six-wheel-truck adapters have been reviewed.
The existing custom driving controller remains the fallback. Rapier is loaded only
by the lab, with its vendored license/source metadata under `viewer/vendor/rapier`.


### Main-world hybrid driving

Play uses **Rapier / Hybrid** exclusively: arcade grounded acceleration, turning
and hills with Rapier gravity and controls in flight. Legacy saved Original mode
selections migrate to Rapier. A physics loading failure offers a reload button.
No models or input devices were replaced. Use the **Handling course** link for
an open comparison area with a long straight, circles, hills, bumps and ramps.

`VehicleConfig.js` is the main tuning file, with verified property-level mode,
units, limits, examples and related settings. Read [VEHICLE_TUNING.md](VEHICLE_TUNING.md)
for the short cheat sheet and [HANDLING_REVIEW.md](HANDLING_REVIEW.md) for findings
and gameplay test steps. `npm test` includes actual WASM integration scenarios
and checks Original-equation parity at the normal boosted vehicle speeds.
