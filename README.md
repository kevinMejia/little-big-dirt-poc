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
  viewer/environment.html is their standalone preview; world integration is pending.
- EnvironmentAssets.js: shared loading and optional static instancing for those assets.
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
terrain, collisions or touch behavior. The approved environment integration remains
pending rather than being included in these deployment changes.
