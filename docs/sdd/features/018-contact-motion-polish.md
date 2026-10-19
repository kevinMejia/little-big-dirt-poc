# Ground contact and movement polish

Baseline 55d6629. Implement suggestions 4/5 as visual-only refinements: tighter
layered contact patches with wheel-clearance fading, terrain-aligned tire tracks,
wheel-origin dust with drift/soft appearance, radial impact-scaled landing puffs,
and subtle transient equipment vibration driven by travel and debris bumps.
No new dependencies, shadow maps, physics forces, colliders, saved joint poses,
vehicle settings migration or driving geometry changes.

Plan: extend existing VisualPolish owner and file defaults; reuse fixed pools and
existing shadows; keep static tree matrices static, update active rock/tire slots;
apply equipment offsets for rendering only and restore them immediately after
each render. Honor reduced-motion for equipment shake. Add bounded-feedback,
airborne/contact, reset, render-restore and disposal tests, then build/check and
run Edge browser smoke/screenshots on the Pages path. Physical devices unverified.

Implemented in existing `VisualPolish.js`, with file-only defaults under
`contactMotionPolish` in WorldEnvironmentConfig.js. No shadow maps, draw calls,
rigid bodies or textures added. Single contact batch now has per-instance fade
and a layered core/soft edge; tires use their actual radii and clearance.
Scenery seating geometry remains unchanged. Dust uses trailing axle positions
(front axle while reversing), wheel surface cover, bounded drift and soft fade-in.
Landing puffs expand radially with clamped impact energy. Reset/switch clears
effect lifetimes. Equipment offsets affect bucket/hopper/compactor joints for
rendering only, refresh hydraulic visuals, then restore in a finally block.
The reduced-motion media query is read live. Existing debris bump heights and
body-feedback spring settings remain intact. Import-map versions were bumped.

Validation (Windows, 2026-10-19):
- `python tests/run_visual_polish_tests.py`: pass; existing effects/contact checks
  plus actual wheel-clearance fade, bounded shake, 100 repeated pose restorations,
  reduced-motion/airborne suppression, radial landing drift and reset cleanup.
- `python tools/build_site.py` then `python tools/check_project.py`: pass;
  254 production files served unchanged under `/dirty-sandbox-game/`; all existing
  physics, ramps, steering, suspension, terrain, assets, controls and save tests.
- `node tests/contact-motion-browser.cjs`: pass, headless Edge 155.0.4283.62,
  1280×720. Compare baseline 55d6629 with current build, drive for 1.5 seconds
  then measure 3 seconds while moving. Both median frame intervals 7 ms, p95
  about 7.1 ms. Scene draw calls 278 before / 276 after (dynamic effects vary).
  Terrain and collider SHA-256 values identical; 6,336 debris records in both.
  The controlled access-road driving probe travelled exactly 98.36735429157095 m
  in each version. No application or shader errors. Fixed 48 dust / 192 track slots.
  Real Dirty and Stinky GLB joints responded to the vibration probe, restored
  with zero quaternion error, and left Rapier body positions unchanged; reduced
  motion set amplitude to zero. Detailed report: `018-contact-motion-results.json`.
- Reviewed `docs/screenshots/contact-{motion,detail}-{before,after}.png`.
- `git diff --check`: pass.

Known limits: no physical-device, Safari/Firefox or whole-map frame-rate claim.
Contact shading is an approximate local terrain-aligned patch, not screen-space
ambient occlusion; it follows the authoritative height source and does not alter
rock/tree seating transforms. Equipment vibration is deliberately very small
(less than about 0.12 degrees at default strength), not simulated joint looseness.
Dust is cosmetic pooled billboards and does not accumulate or change traction.
No live deployment was performed for this follow-up.
