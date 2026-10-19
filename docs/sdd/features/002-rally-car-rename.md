# 002: Rally Car naming

Status: complete, 2026-10-19. Risk: small/moderate, explicitly authorized. No separate spec/plan approval gate. Naming only: retain artwork/logos, physics, sounds and gameplay.

## Specification and plan

- R01: Present the vehicle as Rally Car in selection, HUD, settings, audio controls, errors and comparison viewer.
- R02: Use RallyCarConfig/RallyCarVehicle, rallyCar identifiers, rally-car sound IDs and canonical viewer/test/document names. Preserve unrelated Audio/audition words.
- R03: Read legacy saved vehicle/sound overrides, prefer canonical values in mixed records, and save canonical paths on the next edit. Canonical exports and safe defaults when storage fails.
- R04: Retain legacy module, QA and viewer URLs where practical. Preserve binary asset URLs, artwork and authoring sources; no changes to movement or sound equations.
- R05: Update SDD principles/templates for autonomous risk-based work; approvals only for high-risk/material categories.

Tasks completed: rename runtime owners/consumers; retain thin adapters; normalize saved names; update tests/docs; run targeted and production validation. Binary filenames, authoring tools and historical evidence are deliberately exempt. No dependencies added.

## Validation

| Check | Requirements | Actual result |
| --- | --- | --- |
| node tests/rally-car-settings.cjs | R01,R03 | Passed independent live tuning, reload/reset and zero page errors. |
| node tests/tuning-store.mjs; node tests/rally-car-rename.mjs | R02,R03 | Passed legacy/mixed keys, canonical precedence/exports/save and blocked storage. Rename regression added to main checker. |
| node tests/rally-car-naming.cjs at root and production Pages prefix | R01-R04 | Passed actual saved migration, labels/exports, live voices/mute, module/QA aliases, old viewer redirect with query/hash and comparison model loading. |
| node tests/rally-car-dakar-game.cjs | R01,R04 | Passed GLB HTTP 200, acceleration, braking/reverse, wheel steering/spin, switching three vehicles, desktop/phone viewport captures and zero page errors. |
| python tests/rally-car-dakar-asset.py | R04 | Passed original hash, 19 meshes, 66,340 triangles, UV/bounds, embedded resources and editable source. |
| Exact HEAD comparison after name substitution; git diff --exit-code -- assets tools/blender | R04 | Adapter, tuning and audio implementation differ only by names; artwork/assets/authoring scripts unchanged. |
| python tools/build_site.py; python tools/check_project.py | R01-R04 | Passed 245 production files, hash/syntax/resource/subdirectory checks and configured regression suite including physics/rally/input/models and rename migration. |
| Review SDD workflow/principles/templates and AGENTS.md | R05 | Updated proportional documentation, autonomous execution, meaningful risk gates, automatic validation and practical compatibility. |

Environment: Windows, Python 3.14.7, Node 24.19.0, Playwright with installed Edge headless. Existing bundled Playwright used through NODE_PATH; no project dependency installation. Baseline revision: 95e53f9. Production browser base: http://127.0.0.1:8001/dirty-sandbox-game/. New report: docs/rally-car-dakar-game-validation.json. New screenshots: docs/screenshots/rally-car-dakar-game-{desktop,phone}.png; phone screenshot visually inspected. Viewport emulation is not physical-device evidence. Other browsers and physical iPhone/Android were not newly tested. 60 FPS remains a target.

## Intentionally preserved Audi references

- AudiConfig.js/AudiVehicle.js compatibility re-exports; TuningStore legacy selector/saved-key migration and corresponding test fixtures.
- ?qa=audi, window.audiQA and comparison window.audiDakarQA aliases.
- viewer/audi-dakar.html redirect and legacy JS module URL; docs/AUDI_RALLY.md and docs/AUDI_DAKAR.md pointers.
- assets/audi* paths, embedded original model metadata/logos, tools/blender/build_audi_dakar.py and inspect_audi.py: unchanged source identity, reproducibility and old asset URLs.
- Historical JSON/screenshots and factual artwork/provenance descriptions. New gameplay evidence uses rally-car names.

Pilot 001 remains an unscheduled draft; the old mandatory spec/plan gates have been removed from its documents.
