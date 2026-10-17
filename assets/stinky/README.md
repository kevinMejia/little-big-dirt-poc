# Stinky — approval candidate

Open http://127.0.0.1:8000/viewer/stinky.html with the local server running.
Six Blender views alongside the primary reference: /viewer/stinky-comparison.html.

The existing playable truck and driving system have not been changed. Approval is required before integrating this asset.

Artifacts: stinky.blend (editable meshes, modifiers, named joints and studio), stinky.glb (embedded textures), manifest.json (motion contract), comparison/ (six direct renders). Approximately 52,366 triangles; shared materials and meshes consolidated per stationary material/moving parent on export. No runtime Blender dependency.

Rebuild from the repository root:

```powershell
& 'H:\Program Files\Blender2.83\blender.exe' --background --factory-startup --python tools/blender/build_stinky.py
python tests/run_stinky_tests.py
```

The builder reuses Dirty's established geometry helpers and studio/export pipeline. It adds rounded cab/hood/body lofts, open front fenders, single windshield, ribbed enclosure, reflective-style tape, recessed brown wheel hubs, tread, patina chips, rear loading trough, cast cheeks, compactor blade, pins and tracking hydraulic cylinders. Reflective tape uses metallic/roughness appearance; it is not physically retroreflective. Geometry is intentionally simpler and surface wear lighter than the supplied sheet.

Coordinates: exported +X right, +Y up, +Z forward, meters. Blender stores X right, Z up, -Y forward. Front axle Z=2.25; rear axles Z=-0.8/-2.15; wheel centers X=±1.43, Y=.72. Tire shoulder tread reaches approximately -.035 at ground. Export bounds roughly 3.54 × 3.90 × 7.20 meters.

Hierarchy: Stinky > Chassis > Cabin / GarbageCompartment / RearHopperPivot / six Steering_* pivots. Each steering pivot owns one Wheel_* roll pivot. CompactorPivot is a child of RearHopperPivot. Hydraulic barrel/rod meshes remain separate, driven by fixed/moving anchor world positions. Hopper range 0..0.7 rad; compactor -.65..0.3 rad. These are inspection poses, not a simulated packing cycle.

StinkyGLB.js is used only by the standalone viewer. It supports independent wheel steering/spin, hopper and compactor controls, reset, clone/disposal and dynamic hydraulics. No changes were made to index.html, VehicleConfig.js, VehicleFeedback.js or vehicle physics for this task.

Existing truck inspection: procedural body approximately 2.95 wide, roof Y=3.89, bumper front Z=3.535; six wheels use the centers/radius above. Current tuning is mass 19, acceleration 7, max speed 17, reverse 7, turn 1.05, drag .8, grip 2.4 (before configured speed/hill modifiers). VehicleFeedback grounds wheels independently from body roll/heave; movement, hills, tree/rock collision, camera and touch input live outside the model. Future integration should attach these same wheel metadata and controller hooks without replacing those systems.

Validation: tests/run_stinky_tests.py reconstructs the actual exported geometry and hierarchy with Three.js, compares authored/adapted bounds, exercises steering/spin and both joint ranges, checks finite hydraulic transforms, reset and independent clone disposal. The production builder includes these assets and viewer with relative URLs for GitHub Pages. Browser visual/device performance testing is still needed before integration.
