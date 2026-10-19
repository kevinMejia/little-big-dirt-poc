# Lighting, color and terrain polish

Baseline 277b9ec (debris pushed to origin/main). Moderate visual-only change.
Implement suggestion 1 (cohesive palette/lighting/atmosphere) and 2 (worn terrain
and natural transitions). No new dependencies/assets, colliders, surface physics,
terrain displacement or saved-settings changes. Existing overrides remain valid.

Plan: tune existing light rig and painted background defaults; add deterministic
visual-only soil around scenery, irregular road shoulders, gravel pockets and
worn lanes using the existing terrain texture channels/shader. Keep gameplay
surface classification and scenery seeds unchanged. Gentle atmospheric color
blending starts beyond 140m and is capped; nearby routes stay clear. No extra
shadow maps, texture fetches or draw calls for dressing.

Validation: build then full checker; add terrain dressing tests, run browser
before/after comparison on the Pages path, inspect screenshots/shader errors and
check driving, debris grounding/bump feedback. Physical phones, Safari and Firefox
remain unverified. Record actual outcomes below.

Implementation completed in existing owners: `VisualPolish.js` light balance,
`StorybookBackgroundConfig.js` calmer sky defaults, `WorldAppearance.js` indexed
visual dressing, `GroundTextures.js` existing texture/shader channels. Main road
lanes also use an analytic curved mask to avoid losing narrow tracks at texture
resolution. Main and rally scenery contribute bare-ground patches. Existing
gameplay masks, geometry, bump footprints and saved overrides remain intact.
`worldPolish` in `WorldEnvironmentConfig.js` controls saturation (0–1.5), dressing
(0–1) and terrain haze (0–1); these shader controls apply live when edited in a
running module, with file edits taking effect on reload. Sky defaults retain
existing Settings overrides. Bumped import-map URLs avoid mixed cached modules.

Validation evidence (Windows, 2026-10-19):
- `python tools/build_site.py` then `python tools/check_project.py`: passed;
  254 production files served and byte-checked under `/dirty-sandbox-game/`,
  existing driving, suspension, scenery, tuning, navigation and asset regressions.
- Focused `run_world_appearance_tests.py` and `run_visual_polish_tests.py`: passed;
  new dressing tests cover deterministic bounded values, bare soil around trees,
  absence away from trees, and main/rally lane location. Ground positions stay fixed.
- `tests/world-polish-browser.cjs`: passed against Git baseline 277b9ec and the
  current production build, headless Edge 155.0.4283.62 at 1280×720. One second
  warmup plus three seconds of frame sampling. Before/after median 7 ms, p95
  approximately 7.1 ms; scene draw calls 289/291 (dynamic activity effects vary).
  No new rendering passes, extra texture lookups, shadow maps or geometry.
  Terrain SHA-256 `7d550ce2db639995744e5c734a27497b604b1686a59810938fe64f6caefc1372`
  and collider SHA-256 `62a66fe82c090e06815a303004d1988cc9dceecc1f19543b58cb998b4a97e302`
  are identical before/after. Both have 6,336 debris records and travel exactly
  100.74645631584646 m in the driving probe. No application/shader errors.
  The preview server lacks a root favicon; the test supplies an empty favicon
  response so that unrelated request does not mask application errors.
- Reviewed matched world and grassy tree-base screenshots in
  `docs/screenshots/{world,terrain}-polish-{before,after}.png`.
- `git diff --check`: passed. Detailed metrics in `017-world-polish-results.json`.

Limitations: measured one desktop view; no physical phone, Safari/Firefox or
whole-map frame-rate certification. Terrain haze is an albedo color blend,
not volumetric fog; nearby driving remains clear. Mask resolution softens small
soil patches and rally wear marks. This pass adds no new landmark areas or
vegetation assets. It does not change physical tire grip or road dimensions.
