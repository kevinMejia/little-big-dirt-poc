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
- Reaching the boundary launches the vehicle back toward the central 20% of the
  map, preserving the original 3-second flight and 20%-of-map-width arc height.
  Flight progress eases at departure and arrival instead of hitting the ground
  with an abrupt vertical velocity change. Tree/rock ground collisions are bypassed
  while airborne; parked/grounded collisions remain unchanged.
- Landing adds a short chassis compression, rebound and rocking reaction on the
  visual parent. Wheels fit the ground as the sprung body settles. Boundary bounce
  percent scales the landing compression impulse: min(3, 6 * percent/100) units/s.
  Boundary body rock percent scales up to .8 rad/s pitch impulse. Vertical damping
  is reduced briefly for 1.8 seconds to allow a visible rebound before normal settling.
  These impulses never move the logical collider or restart a parked vehicle.
  Setting each percentage to zero disables its landing contribution.

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
