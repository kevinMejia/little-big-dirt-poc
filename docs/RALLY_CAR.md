# Rally Car

Select **3 · Rally Car**, or press **3**, in Free Drive. Existing keyboard, gamepad, touchscreen and camera orbit controls apply. Use E for a handbrake slide. Rapier mode provides terrain jumps; Original mode retains the legacy terrain-following behavior. Holding the Rally Car button selects it; construction equipment garages remain available for Dirty and Stinky.

## Implementation

- `RallyCarVehicle.js` loads the actual GLB with the same Three.js GLTFLoader used by the other vehicles. The source faces +Z already. Runtime normalization makes it 5 meters long, centers its footprint, and puts the tire bottoms at ground level. No source geometry, materials or textures are edited.
- The 22,556,408-byte GLB has 19 meshes, 66,340 triangles, 12 materials and 39 embedded images. GLTFLoader shares repeated geometry: 15 unique GPU geometries. Road wheels are `Rueda`, `Rueda004`, `Rueda005`, and `Rueda006`; spare tires remain attached to the body. Bounds-derived steering/spin pivots preserve the original wheel transforms. Four existing suspension meshes follow their nearest wheel with restrained movement.
- `RallyCarConfig.js` owns acceleration (25 m/s² before drag), forward/reverse limits (72/13 m/s), steering, brakes, visual suspension, landing response, and the 1,800 kg Rapier chassis. Dirty/Stinky defaults are unchanged. All four ground contacts support the arcade drivetrain; this is an arcade AWD approximation, not a mechanical differential simulation.
- The existing hybrid controller owns grounded motion and Rapier owns flight. Rally Car-only lateral velocity provides handbrake slides and recovery, with steering sensitivity reduced at speed. Wheel travel remains bounded by the shared terrain-contact system. Ground suspension is visual, consistent with the existing architecture.
- The chase camera reuses orbit/touch controls, pulls back at speed and widens from 72 to 78 degrees. Existing terrain clearance remains active. Dust and temporary dirt tire tracks reuse the bounded pools in `VisualPolish.js`.
- Electric motor and dirt tire sounds use two synthesized voices in the existing audio mixer. Both have independent persistent mute/volume/test controls. Landing impacts reuse existing sounds. Tire noise stops in flight.
- The GLB loads asynchronously without delaying the construction vehicles. The Rally Car button enables when it is ready and reports an unavailable asset on failure. Instances share model geometry/materials/textures; switching removes pivots without disposing cached resources. Page teardown disposes the template's unique resources.

Original asset SHA256: `52aa2eea2f695058b1a576c750eaa318db26cf5d04800b4cee823530b7523e5f`.

## Historical validation

The original measurements/screenshots below predate the rename. Current rename validation is recorded in [feature 002](sdd/features/002-rally-car-rename.md).

Run `python tools/build_site.py` and `python tools/check_project.py` for the production build and existing regressions. With the development server on port 8000, run `node tests/rally-car-smoke.cjs` with Playwright installed/available via NODE_PATH. It checks embedded textures, four wheel pivots, steering/spin, acceleration, brakes/reverse, gravity/landing, all four world ramps, switching and GPU resource counts, Original/Rapier transfer, desktop and phone layout, and browser errors. Only the pre-existing missing favicon is excluded from console error assertions. The `?qa=rally-car` URL enables the test adapter; ordinary play has no QA global.

The existing regression suite covers Dirty/Stinky speed/yaw parity, their world ramp jumps, equipment articulation, garages, terrain, collisions and controls. Rally Car testing uses desktop Edge headless WebGL and phone viewport emulation; physical iOS/Android performance has not been measured. The full-detail model is retained, including all 39 textures; mobile texture memory remains a device-dependent limitation. Screenshots are in `docs/screenshots/audi-rally-desktop.png` and `audi-rally-mobile.png`.

Racing tracks, checkpoints and lap timing are intentionally outside this change.

Desktop sample (Edge headless WebGL, 1280×800, 90 warmed frames per vehicle at spawn): Dirty 143.8 FPS / 189 draw calls; Rally Car 143.8 FPS / 150 draw calls. Different chase-camera fields of view affect visible scenery and draw counts. This short measurement found no regression on this machine and is not a physical-phone benchmark. Both synthesized sound auditions and the active electric motor loop were verified through the running mixer.
