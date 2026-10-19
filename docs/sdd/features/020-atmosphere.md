# Crisp sky and layered mountain environment

Baseline 9912670, Windows, Blender 4.2.3 LTS. Environment-only scope; preserve
terrain buffers, colliders, controls, HUD, turbo and saved settings. Existing
warm sunlight/PCF shadows are retained. No new dependency.

Implementation: replace the default painted panorama with a procedural gradient,
opaque instanced rounded clouds and three complete 360-degree Blender ranges.
Soften only the decorative outer skirt and add a single instanced distant forest;
retain all terrain-edge vertices and all playable terrain geometry.
Scenery uses a separate depth pass, real camera translation and orientation,
world-relative distances including rally bounds, no collision or shadow maps.
The gameplay camera retains its 600m far plane and existing fog. Distant color
grading supplies atmospheric perspective without fogging nearby driving.

Settings: AtmosphericEnvironmentConfig.js, file defaults, reload required.
enabled=false restores the existing background. ?storybook=1 retains the painted
review route and its existing controls. New settings do not write local storage.
No bitmap backdrop is used: sky, mountains and clouds render at display resolution
with the existing antialiasing/device-pixel-ratio policy (cap 2).

Assets: tools/blender/build_mountains.py generates mountain-ranges.blend and GLB,
23,040 mountain triangles, 1,798,924-byte self-contained mountain GLB, plus
three fused metaball cloud variants (66,164-byte GLB and editable clouds.blend).
No textures; original CC0 assets. Runtime backdrop: seven draw calls (sky, three
ranges, three cloud instance batches), plus one main-scene forest draw with
2,100 tiny decorative trees. No per-mountain updates; static clouds by default.
Only camera copying and rendering run each frame; optional slow cloud rotation.

Validation: production build then tools/check_project.py passed. Headless Edge
155.0.4283.62 on Windows compiled/rendered without console or page errors at
1600x1000 and 390x844; east/west and elevated viewpoints also rendered. Camera far
remained 600. Screenshots and results are adjacent in docs/screenshots and
020-atmosphere-results.json. Browser test uses existing QA hooks and the actual integrated
backdrop with an optional render-only camera for deterministic viewpoints. Recorded submission times include
PNG readback and shader startup: they are not FPS measurements. Main-world scene
draw/triangle totals include its existing shadows, not just the new backdrop.

Limitations: physical iPhone/Android, Safari/Firefox and sustained device frame
timing remain untested. No 60 FPS claim. Stylized geometry follows the reference's
palette/depth direction, without changing the playable map to add its lake or terrain layout.

Revision after user feedback: the first version missed the reference and was
rejected visually. Replaced thin silhouette walls with broad terrain massifs,
branching ridges, multi-scale surface variation, slope lighting, green lower
slopes, pale summit highlights and altitude haze. Fused cloud surfaces replace
intersecting sphere clusters. Mountain framing was lowered after the skirt was
softened. Visual similarity remains an artistic judgment, not a passed numeric
acceptance test.
