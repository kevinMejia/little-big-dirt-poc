# Main sandbox dimensions

Main Play now uses a 660 × 660 metre terrain mesh, extending from -330 to +330
on both axes. Previous mesh: 440 × 440m (-220…220). Width/length are 1.5× and
terrain area 2.25×. The unchanged 15m safety inset places the cannon trigger at
±315m (previously ±205m), adjusted for each vehicle footprint as before.

## Tuning

`WorldEnvironmentConfig.js` → `worldAppearance.worldSize` is full width AND length.
It is also available in shared Settings → Environment → Playable world size.
Changes persist through the existing TuningStore and apply after reloading Play.

- 440: previous extent and reference scenery density.
- 660: new default; suggested upper starting point for phones.
- 880: supported maximum; 4× reference area and greater startup/memory/render cost.
- Supported limits: 220–880m. Nonfinite file values fall back to 660; out-of-range
  values clamp. `MainWorldSettings.js` resolves all main-map bounds consistently.

The Dirt Jump Lab retains its fixed halfSize 220 / boundaryLimit 205 and does not
consume the new dimensions setting. The handling test layout retains its ramp and
spawn coordinates; only the main entry's outer world extent grows.

## Preserved scale and behavior

No terrain coordinate is multiplied or stretched: the exact original height
function continues over the new area. The coarse mesh stays at 2m spacing and
ramp refinement at .75m. Existing ramps retain their world coordinates, dimensions
and profiles. Render and Rapier still share the same vertex/index surface. The
origin spawn/reset and chase camera behavior remain unchanged. Both physics modes
receive their cannon limits from the resolved size. No handling/configuration
values in VehicleConfig.js or driving-controller code were changed.

Painterly grass, soil and stone textures retain their metre scales. Painter
thresholds use the original 220m reference half-size so adding area does not
reclassify the old terrain colors. The paint mask grows from 256² to 384² at the
new extent, keeping its approximate metre resolution; capped at 512².
The distant painted horizon attaches to the new terrain perimeter.

## Density and rendering

Main-only area multipliers scale target trees, rocks, grass/flowers/pebbles and
stationary debris by (worldSize/440)², alongside their existing density controls.
At defaults the tree/rock targets are 394/180 before ramp exclusions. Cluster counts
also scale, retaining normal cluster sizes and spacing rather than packing more
objects into the same clusters. Empty roads, ramp exclusions and spawn clearances
remain in force. Existing GLB static instancing and spatial collision queries remain.

Decorative meadow details use shared geometry/materials in 64m spatial batches.
These can be frustum-culled independently, shrink smoothly between 110–150m from
the camera and stop drawing distant cells. This limits fine-detail cost without
changing grass density close to the player. Physics/collision meshes stay complete
and never disappear with visual culling. Debris retains its existing four batches.
No new runtime dependency or large texture asset is introduced. Larger worlds cost
more startup time and memory; physical iPhone frame rate has not been measured.

## Validation

Full `python tools/check_project.py` passed. Tests use the actual Dirty and Stinky
GLB hierarchies and approved active Rapier controller on the expanded rolling mesh:
both vehicles drive, cannon-jump and land at all four new edges, stay within the
collider, and reset correctly. Existing eight ramp/main-lab parity tests still pass.
Tests also check unchanged sampled terrain heights, bounded mesh complexity,
2.25× scenery/detail/debris counts, populated added terrain, spatial detail culling,
resource cleanup and fixed lab bounds. Browser tested Dirty's cannon flight and
Stinky driving/reset on the extended terrain, desktop and iPhone-sized landscape/
portrait rendering, the 660m Settings value, and no console/shader errors.

Screenshots: `docs/screenshots/expanded-world-spawn.png`,
`expanded-world-dirty-boundary.png`, `expanded-world-stinky-landscape.png`.
