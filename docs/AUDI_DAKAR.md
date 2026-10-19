# Audi RS Q e-tron · Dakar 204 livery

The game now loads `assets/audi_rs_q_e-tron_dakar.glb` through the existing Audi adapter. The original `assets/audi_rs_q_e-tron.glb` is unchanged and remains the rollback asset.

## Deliverables

- `assets/audi_rs_q_e-tron_dakar.glb`: self-contained game model.
- `assets/audi-dakar/audi_rs_q_e-tron_dakar.blend`: editable Blender project, packed textures, closed door for inspection.
- `tools/blender/build_audi_dakar.py`: reproducible Blender texture-generation/export script.
- `tools/blender/inspect_audi.py`: source mesh, material, bounds and UV inspection.
- `assets/audi-dakar/textures/`: editable 1024px body base-color/packed roughness-metallic atlases and wheel textures.
- `assets/audi-dakar/source-textures/`: extracted original base-color atlases; all original texture data also remains embedded in the original GLB.
- `viewer/audi-dakar.html`: interactive matched-camera original/Dakar comparison. Front three-quarter, side, rear three-quarter and top/front views, plus orbit controls.
- `docs/screenshots/audi-dakar-{hero,side,rear,top}.png`: required before/after comparisons. `audi-dakar-opposite.png` checks the opposite side. Desktop and phone game captures are also included.

## Artwork and materials

New paint replaces the conflicting body albedo artwork, rather than multiplying a color over the old graphics. It uses charcoal/graphite paint, connected gray angular shapes across hood and side surfaces, satin-black lower panels, racing-red intakes/roof/rear accents and an angled sill stripe. Audi rings and a custom **204** number replace the original triangle emblem and number 1. The old spare-tire logos are removed. Wheel UVs retain their tire/tread detail with red-orange rims and a less mirror-like finish. Cabin areas remain dark, with physically based reflections.

The Blender script reads actual mesh triangles, UV coordinates and transforms, evaluates the livery in the closed vehicle pose, rasterizes replacement UV atlases, adds four-pixel texture gutters and exports the existing hierarchy. This keeps shapes aligned across panel materials without adding decal geometry or draw calls. Inspection found substantial intentional shared/mirrored UV coverage in `Puertas`; bilateral paint masks avoid conflicting colors there. Asymmetric number graphics are reversed appropriately on the opposite side, and that side was rendered separately to verify readability.

Useful source normals, lights, tire detail and mechanical materials remain. Exterior normal strength is reduced to suppress the carbon weave, and the original exterior roughness/metallic artwork is replaced with paint/glass/graphic finish maps. These are standard GLTFLoader-compatible PBR materials. No additional shader effects, external texture dependencies or texture-transcoder dependency are introduced.

## Geometry and behavior

- The original GLB SHA256 remains `52aa2eea2f695058b1a576c750eaa318db26cf5d04800b4cee823530b7523e5f`.
- Both models have **19 meshes, 12 materials and 66,340 triangles**. Tests compare every exported mesh's world-space geometry against the original within 0.02 mm, plus UV bounds.
- Normalized model dimensions and all four wheel positions/radii agree within 0.01 mm. Source hierarchy and hinge pose are exported for the existing adapter; the adapter still closes the door before grounding/rigging. The editable Blender file is saved with the door closed for inspection.
- This reskin changes only the Audi asset URL and adds artwork/export/preview artifacts. It does not change physics, suspension, controls, camera or vehicle selection. Other concurrent UI/tuning/terrain work is separate from the reskin.

## Validation

`python tests/audi-dakar-asset.py` verifies the untouched source, geometry, UV bounds, triangle/material counts, embedded resources and editable project. `node tests/audi-dakar-visual.cjs` renders all required comparisons with identical cameras and lighting, checks wheel/bounds parity and verifies the rendered image changes substantially (about 20% of the paired viewport pixels exceed the color-difference threshold in the top view). These renders were visually inspected against the supplied design reference.

`node tests/audi-dakar-game.cjs` loads the new asset in the actual game, selects it through the Cars dropdown and checks keyboard acceleration, braking, reverse, front steering, wheel spin and switching among all three vehicles. It captures desktop 1400×900 and phone 390×844 views and checks for JavaScript errors. In the recorded run the Audi reached about 35 m/s after 1.5 seconds of acceleration; the new GLB returned HTTP 200 and there were no JavaScript errors. Reports are in `docs/audi-dakar-{visual,game}-validation.json`. Playwright/Edge and a local server on port 8000 are required for browser checks.

The four comparison views use a neutral studio environment to expose paint and material differences. Bright glass reflections in some angles are environmental highlights; the front glass is dark in other views. The reference's exact panel proportions, wheel spoke construction and body details differ from this source mesh, so this is a design translation onto the preserved model, not a geometry-matched replica. Some side graphics bend around the source's recessed panels and aerodynamic fins. The phone viewport was checked; physical mobile GPU performance remains unmeasured. Texture resolution and material/draw counts remain comparable to the source; no visible geometry was simplified.

## Rebuild / rollback

Run Blender 4.2.3 LTS (or a compatible version) from the repository root:

```powershell
blender -b -t 4 --python tools/blender/build_audi_dakar.py
```

For the portable copy used in this workspace, the executable is `C:/Users/kevin/.cache/little-big-dirt-tools/blender-4.2.3-windows-x64/blender.exe`.

The script preserves the original GLB. A portable Blender copy was used from the external user cache; no application install was required. To roll back, change the URL in `AudiVehicle.load()` back to `./assets/audi_rs_q_e-tron.glb`. Rebuild the static site with `python tools/build_site.py` after changing either asset.
