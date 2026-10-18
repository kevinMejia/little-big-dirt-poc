# Turbo Boost pickups

In main Play, select **Rapier** physics and drive Dirty or Stinky through a floating
Turbo Boost. The default gives an immediate **3× normal forward speed** for
**2 seconds**. The base stays on the terrain; the bolt, rings, glow and particles
disappear for **5 seconds**, independently for each pickup. Another collection
refreshes the duration without multiplying an existing boost. Resetting or
switching vehicles clears the boost but keeps pickup cooldowns.

Open the shared floating **Settings → Turbo Boost** section. All six settings
persist through the existing tuning store and are shared by both vehicles.
File defaults and inline explanations live in `VehicleConfig.js`:

| Setting | Default | Effect |
| --- | --- | --- |
| `enabled` | `true` | Off hides pickups and clears active boost; on restores them. |
| `speedBoostPercent` | `200` | Extra speed: 0 = normal, 100 = 2×, 200 = 3×, 300 = 4×. Higher also increases temporary acceleration. |
| `durationSeconds` | `2` | Higher lasts longer; 0 prevents collection. Used when collected/refreshed. |
| `respawnSeconds` | `5` | Higher waits longer. Running cooldowns keep their deadline. |
| `pickupCount` | `15` | Live integer count, 0–30. Retained slots keep timers; removed slots are retired. |
| `pickupRadius` | `2.5` | Higher makes collection easier. Vertical reach is limited to 3.5 m above the pedestal. |

The seeded layout favors clear ramp approaches, road edges and open terrain,
avoiding trees, boulders, steep slopes and boundaries. Count changes preserve the
prefix of the layout. Neither terrain geometry nor ramp locations are changed.
Original physics and the Dirt Jump Lab do not receive boost gameplay.

## Implementation

`RapierWorldVehicle.collectTurbo()` applies the initial horizontal velocity through
the active Rapier body. `ArcadeGroundDrive` uses the controller-local boost factor
for acceleration and speed limits, then advances the timer on its fixed timestep.
Vertical flight velocity, ordinary steering, brakes and stability stay with the
existing controller. After expiry the existing hill speed-limit settling eases
overspeed back down; airborne horizontal momentum carries through until landing.
No normal tuning objects are modified. Reverse collection uses the vehicle's
reverse limit rather than its forward limit.

`TurboPickupSystem` loads the existing GLB once, animates one shared template and
instances its mesh geometry/materials across all slots. The approved showroom
pedestal was extracted unchanged into `viewer/TurboPedestal.js` and reused in both
places; it was already separate from the floating GLB. Only the floating assembly
is hidden during cooldown. Glow textures and particle buffers are shared; distant
floating assemblies/effects are hidden beyond 120 m. Pickups create no colliders
or rigid bodies. Swept proximity checks handle high-speed crossings.

Collection adds a short pooled sprite flash, stronger existing ground dust and a
small countdown. No bloom pass is added. Reflection lighting for the pickup uses
the same room environment as the showroom, without replacing world lighting.

## Validation

- `node tests/turbo-boost.mjs`: configuration, persistence, timer refresh, independent
  cooldowns, reset isolation, swept/vertical collection and deterministic placement.
- `python tests/run_rapier_world_tests.py`: both authoritative controllers at 3×,
  two-second duration, smooth expiry, reset, unchanged normal tuning, airborne
  velocity, and all eight vehicle/ramp jump-and-landing combinations with boost.
- `tests/turbo-world.cjs`: Playwright with installed Edge; one GLB request, 15 slots,
  both vehicles collecting, pedestal versus floating visibility, independent
  respawns, reset, live Settings count, and the showroom still loading.
- `python tools/build_site.py` and `python tools/check_project.py`: full existing
  build and regression checks, including the new pure Turbo tests.

Browser checks use emulated viewports. Physical iPhone Safari performance and
handling feel still need hands-on review. Nothing is pushed or merged by this work.
