# Dirty — Blender review asset

Review in the running local server: http://127.0.0.1:8000/viewer/dirty.html

- dirty.blend: editable source with custom lofts/surface meshes, bevel and weighted-normal modifiers, named pivots, studio lights and a review camera.
- dirty.glb: game-ready review export, approximately 1.96 MB and 55,992 triangles, 65 mesh nodes / 10 materials. One shared 512x512 paint-patina texture is embedded in the GLB; no external runtime image dependencies.
- manifest.json: wheel radii, names, joint limits and hydraulic anchors.
- DirtyGLB.js: separate GLTFLoader adapter exposing the same driving/equipment methods as BackhoeLoader. The viewer and playable backhoe now both use it.
- reference.png: the new primary multi-view reference sheet, displayed beside the viewer. It is not used as model geometry or a texture.
- blender-preview.png: transparent studio render from Blender.

The verified installed Blender is 2.83.0 at H:\Program Files\Blender2.83\blender.exe, matching the user's Start Menu shortcut. Command-line and embedded Python execution succeeded; Blender was not reinstalled.

Rebuild from the repository root in PowerShell:

```powershell
& 'H:\Program Files\Blender2.83\blender.exe' --background --factory-startup --python tools/blender/build_dirty.py
python tests/dirty-asset.py
```

Coordinate convention: +X right, +Y up, +Z forward after glTF export, one unit per meter. Blender stores this as X right, Z up, -Y forward. Wheels touch Y=0. The root is Dirty. All equipment pivots use X rotations except rear swing and steering (Y rotations). Angles are radians, loader height is normalized 0..1. Joint controls are offsets from the model's resting pose. Cylinders use world-space anchor endpoints and the adapter refreshes them after posing. Equipment extremes are for review and are not a rigid-body collision simulation.

In the viewer, drag to orbit, scroll/pinch to zoom, right-drag to pan. Front/Side/Rear/Above buttons frame the vehicle. Sliders independently test the front loader and rear boom/stick/bucket; wheel spin and steering can run together. Reset pose returns all parts to rest. Reference and artifact download links are in the sidebar.

The user approved integration after reviewing this version. index.html now loads the GLB and uses independent model clones for vehicle switching. Existing terrain contact, driving, collisions, hills and stopping remain connected. The original procedural BackhoeLoader is retained only as a loading fallback. Hold vehicle 1 to open the in-game garage. Equipment pose changes carry back to driving for this session. This remains an editable first model, not a claim of exact reference reproduction.


## Reference-sheet revision
The previous working source, GLB, adapter, manifest, script, reference and render are preserved in backups/pre-reference-sheet/. A failed new-model load first falls back to that Blender GLB before using the procedural backup.

The revised model corrects cab-to-wheel proportions, front overhang, side glazing width, bucket clearance and rear bucket orientation. It adds integrated chevron tread, recessed rims, smoothly connected window gaskets, a deep J-section bucket, rolled side rims, a flush cutting blade, cast hinge washers, visible hydraulic rams and low-resolution mottled paint wear. Front bucket rotation now pivots at its rear hinge, not its cavity center. Meshes are consolidated only within the same material and moving parent; named joints and cylinders remain independent.

Six direct Blender renders are in comparison/: front, side, rear, top, front-three-quarter and rear-three-quarter. Open /viewer/comparison.html for the new renders beside the supplied sheet and the expandable previous model. /viewer/dirty.html inspects the actual exported GLB. The rebuild was staged in candidate/ and visually checked before copying into the active asset paths.

To stage another revision:
```powershell
& 'H:\Program Files\Blender2.83\blender.exe' --background --factory-startup --python tools/blender/build_dirty.py -- --candidate
python tests/dirty-asset.py --candidate
python tests/run_dirty_tests.py --candidate
```
Review at /viewer/dirty.html?asset=candidate and /viewer/comparison.html?asset=candidate. Promotion requires copying the validated blend, GLB, manifest, embedded-paint source, preview and comparison renders into this directory. The .blend retains individual meshes and editable bevels; the GLB consolidates stationary parts. Blender's old exporter may emit tangent warnings for untextured n-gons; the asset uses no tangent-space normal map, and exported positions/normals/articulation are independently validated.
