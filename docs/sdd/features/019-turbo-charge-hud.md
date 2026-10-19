# Turbo charge and circular HUD

Baseline: 9912670. Implemented 2026-10-19 on Windows. Scope: main Play with Dirty, Stinky and Rally Car; no new dependencies or duplicate pickup assets.

## Design and implementation

Replace timed pickup auto-boost and instantaneous velocity assignment with a session charge meter. Begin at 0, recharge 1 percentage point per second when inactive, collect +25 capped at 100, consume 20 per second while boosting. Hold the second separate W/acceleration touch press within 300 ms. Repeat events do not qualify. Release, touch cancellation, control clearing, blur and visibility changes cancel the input. Empty charge latches boost off until release; recharge cannot cause repeated boost flicker. Positive throttle without braking is required. Vehicle selection preserves charge and cancels boost. Assumption: R / existing Reset starts a fresh meter; charge is not saved across page loads.

Responsibilities: TurboBoost owns charge; TurboInput owns press timing; DrivingInput connects existing keyboard/pointers; ArcadeGroundDrive applies the multiplier inside the fixed physics step; TurboHud owns SVG and layout; TurboEffects owns four shared low-poly exhaust cones. Existing TurboPickupSystem/Layout and authored Blender/GLB asset continue to own world collection, cooldowns, instancing and flash. Existing surface effects supply boosted dust. Pickup collection never changes velocity. Steering and per-vehicle handling remain authoritative.

## Configuration

VehicleConfig.js: turboBoostConfig is the single defaults location. turboHudScale: 1.0 scales the complete 120-unit SVG, dirt, ring, flame and glow; .5/.75/1/1.25/1.5/2 mean 50/75/100/125/150/200 percent. Settings > Turbo Boost also exposes a live, saved scale override. Existing saved Settings overrides win over file defaults; reset that field to use the file default. Scale is clamped to available viewport space. The actual scaled box stays at the safe-area right/bottom inset, above the measured acceleration/brake row when touch controls are enabled. Layout measurements are cached until viewport/control-mode/scale changes. No separate mobile setting is necessary.

The same config owns rechargePerSecond, drainPerSecond, pickupCharge, doubleTapWindowMs, speedBoostPercent (default +80% acceleration and top-speed allowance), respawnSeconds, pickupCount and pickupRadius. Rates use percentage points, time uses seconds except the tap window in ms. Existing persisted speed overrides remain honored. Normal speed settling remains the existing hill limiter. Placement continues in TurboPickupLayout.js; cooldown/radius/count are live Settings fields. Obsolete durationSeconds saves are ignored by the whitelist.

The SVG ring uses actual charge each rendered frame, without CSS transition lag or permanent numbers. Zero is grayscale at .5 opacity, 1â€“20 orange ring, >20 blue, 100 a brief ring pulse; boosting animates the blue flame. Reduced-motion preferences disable decorative animation. The widget is a noninteractive accessible meter.

## Validation

- python tools/build_site.py then python tools/check_project.py: PASS (exit 0): 258 production files, complete configured regression suite.
- node tests/turbo-boost.mjs: charge, cap, drain, release, throttle guard, frame independence, separate presses, repeat suppression, timeout, pickup timers/layout, Settings persistence.
- python tests/run_rapier_world_tests.py: passed actual Rapier progressive boost acceleration, speed allowance, smooth release, preserved tuning/charge/momentum and eight boosted ramp launches/landings, alongside existing driving/collision regressions.
- tests/turbo-world.cjs with bundled Playwright and headless Edge 155.0.4283.62 on Windows: PASS (exit 0); passive recharge, pickup +25, all three vehicles, keyboard double tap/hold/release, actual CDP touch double tap/hold/release, .5/1/2 scales in 390x844 and 844x390 viewports, low/full styling, blur cancellation and page errors. Screenshots: docs/screenshots/turbo-charge-{desktop,390,844}.png.
- Production copy explicitly includes root CSS as well as modules.

No physical iPhone/Android, Safari, Firefox or device performance measurements. Browser viewport/touch emulation is not physical-device certification. Effects add four low-poly meshes with shared geometry/materials and no new lights, textures or physics bodies; a comparative FPS regression has not been measured.

## Changed files

Created: TurboInput.js, TurboHud.js, TurboHud.css, TurboEffects.js, this feature note, and docs/screenshots/turbo-charge-desktop.png, turbo-charge-390.png, turbo-charge-844.png.

Modified: TurboBoost.js, DrivingInput.js, ArcadeGroundDrive.js, RapierWorldVehicle.js, VehicleConfig.js, TuningStore.js, index.html, tools/build_site.py, tests/turbo-boost.mjs, tests/turbo-world.cjs, tests/rapier-world.mjs, tests/run_lab_alignment_tests.py. The lab runner now copies the input detector dependency into its isolated test fixture. Existing pickup models and layout are reused unchanged.

## Reusable dirt stamp refinement

Replaced the round bead/scalloped border with a seeded, irregular SVG mud silhouette, broken earthy scuffs and varied tiny splashes. DirtSplatter.js owns the shared 120-unit vector stamp; embed dirtSplatterSvg() behind future UI content, using seed/palette options for consistent variants. No image assets, runtime animation, filters or per-frame work in the stamp. Restrict blue glow to the energy ring so the soil retains brown tones. Existing HUD scale and placement remain unchanged. Validate with production build/checker and existing turbo browser scenarios; inspect screenshots at normal and enlarged sizes.
