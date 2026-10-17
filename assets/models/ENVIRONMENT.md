# Environment assets · review milestone

Open `/viewer/environment.html` using the project's HTTP server. The viewer loads
the actual three exported GLBs through `EnvironmentAssets.js`. The playable world
has not been changed; integration requires visual approval first.

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

## Ownership and later world integration

EnvironmentAssets caches one load promise per asset type, clones Object3D hierarchies
while sharing geometry/materials, and owns disposal. Remove clones before disposing
the library. `createStaticBatch(kind, transforms)` is an optional instancing building
block with stable slots and visibility toggles. It is not connected to the game yet.
It creates an instance batch per imported mesh/material group; future asset-library
expansion may consolidate materials to reduce draw calls further. Hundreds-of-object
performance has not been benchmarked at this review milestone.

After approval: preserve the seeded placement calls, register the same tree/rock
colliders, use hidden static-instance slots plus pooled animated clones, then return
recovered objects to their slots. TreeCollisionSystem and RockInteractionSystem
remain authoritative for collision responses, speed thresholds, recovery timing,
particles and fragment physics. Replace their visuals via an adapter rather than
rewriting movement. Adapt rock fragment pooling to these five meshes and their
authored rest transforms; do not replace them with primitive placeholder debris.
Keep all procedural code as fallback. Scale the tree collider/trunk and boulder
collider to the chosen world instance dimensions explicitly; model nominal size is
not an automatic change to existing gameplay collision bounds.

Only one tree and one rock type are supplied now. More variants can be added to the
library URL registry and authored with the same ground/root/piece naming conventions
after these first assets are approved.
