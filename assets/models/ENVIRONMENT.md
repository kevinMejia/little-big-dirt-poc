# Environment assets · playable integration

Open `/viewer/environment.html` using the project's HTTP server. The viewer loads
the actual three exported GLBs through `EnvironmentAssets.js`. The playable world
now uses the same assets through `EnvironmentWorld.js`, retaining existing placement,
colliders, thresholds and interaction animations.

## Editable sources and rebuild

- `assets/blender/trees/cartoon_tree.blend`: curved tapered trunk, branches and seven
  separate rounded foliage layers; `CartoonTree` origin is the trunk base.
- `assets/blender/rocks/cartoon_boulder.blend`: intact shell and five capped Voronoi
  pieces, each with a centered origin and its authored assembly translation.
  Intact and fracture roots intentionally overlap in the editable source for alignment.
  Hide either root to work on the other.
- `tools/blender/build_environment.py`: deterministic Blender Python authoring/export
  script, compatible with installed Blender 2.83. Run with `blender --background
  --python tools/blender/build_environment.py` from the project root.
- `tools/blender/validate_environment.py`: reopens both sources, checks hierarchy,
  base pivot, fracture volume conservation and GLB structure/triangle counts.

Blender uses Z up; exports use glTF Y up. Units are meters. No image textures are
required. Modifiers remain editable in source; export evaluates them. Preview
lighting/camera/grass are not exported into the models. `environment-preview.png`
is a Blender overview, not the game renderer.

## Preview behavior

Tree Wobble/Fall/Recover rotate the imported tree root at its ground pivot. A fall
automatically recovers after eight seconds resting. Crack switches to the five fitted
pieces with a small seam separation. Shatter reuses those same imported pieces,
with lightweight gravity, bounce, friction and spin on the grassy floor. Respawn
interpolates their transforms back to the authored assembly and switches to the
intact GLB. Automatic respawn starts after 15 seconds. The seam slider permits a
static exploded inspection. Buttons deliberately test asset animation, not vehicle
collision thresholds. No general rigidbody engine was introduced.

## Ownership and world integration

EnvironmentAssets caches one load promise per asset type, clones Object3D hierarchies
while sharing geometry/materials, and owns disposal. Remove clones before disposing
the library. `createStaticBatch(kind, transforms)` is an optional instancing building
block with stable slots and visibility toggles, used by the playable world adapter.
It creates an instance batch per imported mesh/material group; future asset-library
expansion may consolidate materials to reduce draw calls further. Hundreds-of-object
performance still requires a real-device benchmark.

The seeded placement calls and collider dimensions are unchanged. Idle objects use
static-instance slots. Imported animation clones are prepared once and share the
GLB geometry/materials. Wobbling/falling trees and moving/cracked/reforming rocks
activate their clones; settled/recovered objects return to their static slots.
Instance bounds update only when slots change, once per batch update.

TreeCollisionSystem and RockInteractionSystem remain authoritative for thresholds,
recovery timing, leaves, dust and fragment physics. A single optional fragment-spawn
hook chooses one of the five imported chunks in the existing bounded debris pool.
No geometry/materials are created on impact. Cracks use slightly separated authored
fracture pieces. Chunk colliders retain the existing approximate radius-based arcade
physics; this is not exact mesh-to-mesh rigidbody collision. Small chips/dust remain
the existing procedural particles. The model tree is scaled from the existing tree
instance scale; boulders are normalized to the existing horizontal collision radius
and seated relative to the terrain-following rock root.

The procedural visuals remain hidden and reusable for fallback. Missing/incompatible
assets produce an explicit in-game warning and console error rather than a silent
substitution. Adapter disposal restores original visuals and hooks; the asset library
alone owns shared geometry/material cleanup. Run `python tests/run_environment_tests.py`
for checks using the actual GLB geometry and existing collision systems. The full
production verifier also runs these tests. No assets were regenerated for integration.

Only one tree and one rock type are supplied now. More variants can be added to the
library URL registry and authored with the same ground/root/piece naming conventions
after these first assets are approved.
