# Quaternius pine integration

Only Pine_1–Pine_5 and their three associated texture maps were imported. The
previous cartoon_tree.glb and cartoon_tree.blend remain available. Removing the
visual adapter restores the procedural tree visuals as before; failed asset loads
also retain those procedural visuals. The previous GLB is still accessible through
EnvironmentAssets.load('tree') for a future visual rollback.

## Dimensions inspected before integration

The OBJ vertex bounds agree with the pack's Blender-exported glTF bounds to export
precision. OBJ has no unit metadata; glTF specifies meters. No claim about an
additional OBJ unit conversion is needed. All meshes use Y as the vertical axis.

| Model | Width | Height | Depth | Triangles | Typical game height |
| --- | ---: | ---: | ---: | ---: | ---: |
| Pine_1 | 4.945 | 7.317 | 4.538 | 3,947 | 6.1 |
| Pine_2 | 5.728 | 7.376 | 5.221 | 3,648 | 5.5 |
| Pine_3 | 3.611 | 7.392 | 3.996 | 4,964 | 6.8 |
| Pine_4 | 5.802 | 10.236 | 5.371 | 3,370 | 7.0 |
| Pine_5 | 6.420 | 8.724 | 6.222 | 1,646 | 5.8 |

Dirty's actual GLB bounds are 3.53 × 4.612 × 8.028 (W/H/D); Stinky's are
3.54 × 3.9045 × 7.20. Game pines are taller than both vehicles while retaining
the shorter/broader and taller/narrower source silhouettes. Height varies by up
to 0.2 units around the typical value, within the configured 5.2–7.2 envelope.

All five source bottoms lie near Y=-0.235089, separately measured per model.
Each GLB corrects that offset to zero. X/Z retain the authored trunk axis rather
than the asymmetric crown center. A visual wrapper compensates for the existing
game root's 0.08 terrain embedding; collider positions and animation roots remain
unchanged. Base flare radii after uniform scaling are about 0.19–0.35 units,
comparable to existing trunk collider radii of 0.143–0.341. The collider remains a
simple trunk circle, so it intentionally does not follow individual branch/root
protrusions. Leaf particles originate within the new crown; disposal restores
their prior emission height.

## Configuration

Edit `PineTreeConfig.js`, then reload Play or the workshop:

- `minHeight` and `maxHeight`: world-unit visual height envelope. Both height and
  width change uniformly, preserving proportions. Larger values enlarge crowns
  and trunks without changing density, placements, or collision radii; keep
  extreme changes conservative so visible trunks still fit their colliders.
- `weights`: relative frequencies in Pine_1 through Pine_5 order. `[1,1,1,1,1]`
  gives equal selection odds, not necessarily exact counts in a finite map.
  `[2,1,1,1,1]` doubles Pine_1's relative odds; zero excludes a variant. All zero
  falls back to equal odds. Weights affect only visual selection.

A separate coordinate hash chooses variants, heights and yaw. It never consumes
the layout generator's random sequence. Physics configuration, density controls,
tree coordinates, vehicle geometry and terrain are unchanged.

## Assets and rendering

`tools/import_pines.py` inspects OBJ bounds and packages the kit's existing Blender
glTF exports into five GLBs. This preserves vertex colors, UVs, normal maps,
two-sided surfaces and alpha-mask cutoff settings that OBJ/MTL alone cannot fully
represent. No local Blender install was found; re-exporting through Blender was
unnecessary. Geometry is unmodified, apart from a node-level base correction.

The three PNG maps are reduced to at most 512 pixels, retaining their colors and
alpha. GLBs share these external maps; keep the whole pines directory together.
The library caches each model once and shares two canonical materials across all
five variants. Instances and animated copies share geometry/materials. Idle trees
use ten instanced meshes total (two materials × five variants). Only active trees
use ordinary meshes; transitions do not allocate render objects. Collision grids,
knockdown thresholds, falling/recovery state machines and rigid bodies are unchanged.
No runtime dependencies were added. The imported runtime assets total about 1.8 MB.

Environment Workshop offers all five variants at consistent world scale, source
dimensions, vehicle height comparisons, and the existing wobble/fall/recover
controls. The fixed preview and independent scrolling controls remain intact.

## Validation

- Full project check passed: `python tools/build_site.py`, then
  `python tools/check_project.py` (the package's test command).
- Expanded real-GLB integration checks passed for all variants, unchanged
  placement/colliders, height envelope, terrain seating, idle/animated matrix
  parity, collision wobble/leaves, fall/recovery and cleanup.
- `tests/pine-browser.cjs` loaded every GLB with textured vertex colors, confirmed
  two shared materials and ten geometries, and found no browser errors.
- Desktop, 390×844 and 844×390 viewport checks passed for the fixed preview and
  independently scrolling controls. These are desktop browser viewport checks.
- Short headless Edge desktop samples at 1440×900 measured median frame intervals
  of 7.0 ms before and after, and p95 near 7.1 ms. Median total WebGL draw calls
  including shadows were 290 before / 280 after. These are one stationary-camera
  sample, not a sustained driving or hardware-wide performance guarantee.
- Physical iPhone/Safari rendering, touch interaction, sustained frame rate,
  thermal behavior and memory usage remain unverified.

Raw browser results: `docs/pine-browser-validation.json`.
Screenshots: `docs/screenshots/pines-game-before.png`, `pines-game-after.png`,
`pines-before.png` (old workshop), and `pine-1.png` through `pine-5.png`.
