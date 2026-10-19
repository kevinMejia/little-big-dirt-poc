# Current architecture

Source review: 2026-10-19; vehicle names updated for feature 002. This architecture overview is not a platform compatibility certification.

| Concern | Existing ownership |
| --- | --- |
| Bootstrap and orchestration | index.html: scene setup, loading, vehicle selection, update/render loop, camera, lifecycle and feature connections |
| Rendering | Three.js 0.168.0 from pinned jsDelivr imports; native ES modules/import maps, GLTFLoader, procedural meshes and instancing |
| Hybrid driving | RapierWorldVehicle.js, ArcadeGroundDrive.js and JumpVehiclePrototype.js; vendored Rapier 0.21.0, fixed 1/120-second simulation, interpolated rendering |
| Vehicle adaptation | DirtyGLB/StinkyGLB adapters, BackhoeLoader.js fallback, RallyCarVehicle.js, StinkyEquipment.js and PlayableVehicleSetup.js |
| World | EnvironmentWorld.js/assets, world appearance/textures/debris, existing tree/rock interactions, ramps and rally landscape |
| Rally geometry | RallyTrackConfig.js and RallyTrack.js; startFinish.u, empty checkpoints data, normalized arc-length at(u)/frame(u), shared rendered/collider road buffers |
| Activities | WordHuntState/Layout/System, floating letters, turbo state/layout/system |
| Preferences and tuning | VehicleConfig.js and domain config modules; TuningStore.js browser overrides, GamePreferences.js deployment-scoped localStorage with older session migration, Word Hunt records |
| Audio | GameAudio.js and AudioConfig.js; cached recorded clips and existing horn, gesture unlocking and lifecycle handling |
| UI and inspection | SharedNavigation.js, SettingsPanel.js and domain settings; separate viewer pages, garages, showroom and jump lab |
| Build and delivery | Python static copy into ignored dist/, hash manifest and Pages deployment workflow |

## Constraints and validation

No npm package dependencies are declared. Python 3.10+ and Node 22+ are documented tooling requirements; browser tests additionally need Playwright and a browser. Blender is authoring-only. Three.js/CDN access is required; some test runners download/cache Three.js. Modern WebGL 2 and import-map support are assumed.

Build: python tools/build_site.py. Main check: python tools/check_project.py, which expects an existing current dist/. Preview: python tools/serve_site.py --production --port 8001. Production paths must work under /dirty-sandbox-game/.

The main checker verifies copied hashes, links, syntax, GLB resources and HTTP delivery, then runs an explicit fail-fast test list. It does not execute every test file: separate browser/asset checks must be selected for feature impacts. Some browser tests write reports/screenshots into docs/; inspect their side effects before running them.

README/NAVIGATION and historical feature notes contain older descriptions of Rapier, navigation, audio and storage. Inspect current code and obtain intent before resolving conflicts. Historical failure reports are not current baseline results.

Preserve editable asset sources, licenses, adapters and fallback models. Keep the ignored Little-Big-Dirt/ checkout separate. Physical-device mobile compatibility and performance remain evidence requirements, not established guarantees.
