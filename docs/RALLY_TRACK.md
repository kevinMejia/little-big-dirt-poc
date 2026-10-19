# Pine Ridge rally expansion

A seamless eastern addition to Free Drive: a roughly **653 m** closed dirt loop, connected by a roughly **221 m** winding access road. From the sandbox, drive east toward the signed road near **X 275, Z 85** at the default world size. All three vehicles use their existing controls and physics. Open the top-right controls and select **Track debug** to see numbered source handles, IDs, elevations, centerline, road edges and travel direction. `?trackDebug=1` enables the same view at startup.

The clockwise route has a long climb on the right, a summit, descending central switchbacks, a western ridge hairpin, an S-shaped return and a longer lower straight. A wooden roadside sign and a dark soil marker identify start/finish. There are no race timers, checkpoints, boost interactions, grandstands or buildings.

## Configuration and modules

- **RallyTrackConfig.js** owns the course handles, access-road handles, width, bank angles in degrees, elevation scale, origin, sampling resolution, shoulders, scenery rules and start/finish reference. Track X/Z handles are relative to an origin 195 m east of the original sandbox boundary, then scaled by `horizontalScale`; derived `track.points` exposes their world positions. Access X values are relative to that boundary. Unspecified access elevations sample the original sandbox. Edit the file and reload to rebuild everything together.
- **RallyTrack.js** rounds the control polygon slightly (`cornerSmoothing`), then samples a closed centripetal Catmull-Rom spline by arc length. The handles influence the shape rather than necessarily lying directly on the rounded centerline. Width and banking interpolate smoothly. `at(u)` and `frame(u, side)` expose the same normalized arc-length positions, banked surface frames and metadata for future editor, checkpoint, minimap, racing-line and track-object systems.
- The same generated road vertex/index buffers are rendered and appended unchanged to the existing Rapier terrain collider. The eastern terrain patch joins the sandbox using its exact boundary Z samples. There is no second physics world, streaming system, or runtime loading transition.
- **RallyLandscape** blends the road into rolling terrain. Compact weighted height fields avoid steps between nearby roads at different heights; road shoulders provide recovery space. A small 4.5 cm terrain underlay offset avoids overlapping road/grass surfaces; the road itself supplies the visible and physical driving surface.
- **RallyVisuals.js** uses shared dirt material and the existing soil atlas, subtle tire grain, wooden signs and a disposable optional debug group. The debug view allocates labels and lines only when enabled.
- **RallyScenery.js** uses deterministic rules for road clearance, elevation, slope, density, seed and exclusion zones. Trunks, tiered pine foliage, rocks and gravel are instanced in spatial chunks and frustum culled. There are no added scenery colliders or distant per-frame physics checks. Placement IDs and a separate interactive-object collection provide a future promotion path for destructible objects.

The course has about **32 m** of elevation range, widths **12–14 m**, banks up to **5°**, and a maximum short centerline grade of about **29%**. Height changes are real terrain/road geometry. The existing grounded controller simulates grade-dependent speed changes; it does not model free gravitational rolling on the ground. Rapier still owns gravity during flight. Dirty, Stinky and Audi handling configurations are untouched.

The original sandbox layout, ramps, object density, collectibles and spawn remain based on the original bounds. Only the access-road corridor is blended and cleared. The playable boundary and decorative horizon extend east to include the new terrain. Original and hybrid boundary code accept optional rectangular bounds while retaining their scalar defaults for the lab and existing tests.

## Future data, without premature gameplay

`startFinish.u`, `checkpoints`, and `boostPads` use normalized arc length. Pad records can specify width, length, strength, duration, cooldown, appearance, particle and sound references. `frame(u, side)` supplies a banked transform basis. Per-point `surface` and feature/ID metadata survive sampling. These are data hooks; this phase does not activate boosts, checkpoint logic, lap timing, ghosts, leaderboards or an interactive editor. The existing sandbox turbo pickups remain unchanged.

## Validation

- `python tools/build_site.py` and `python tools/check_project.py`: production assets, links, syntax and the complete existing regression suite. The new `run_rally_tests.py` is included.
- `python tests/run_rally_tests.py`: closed spline, length, width/grade, non-folded upward road triangles, non-adjacent clearance, continuous landscape, deterministic clear scenery, configuration regeneration, banked future-object frames and exact shared render/collision buffers. It uses the Three.js cache created by the existing physics test runners.
- With the development server on port 8000, `node tests/rally-browser.cjs`: all three actual hybrid vehicle controllers complete the circuit across its closing seam and the access road; real keyboard driving crosses the former eastern boundary in both Original and Rapier modes. Checks browser errors, the visible debug toggle and desktop/phone layouts. Playwright must be available through Node/NODE_PATH, consistent with the other browser tests.
- `node tests/rally-performance.cjs`: comparable warmed baseline (`?noRally=1`), expanded sandbox and rally-climb frame samples. Reports are in `docs/rally-performance.json` and `docs/rally-validation.json`.

Measured desktop Edge headless WebGL at 1280×800 measured **143.8 FPS** before the addition, **136.9 FPS** in the expanded sandbox and **141.4 FPS** on the climb. The latest sample's initial load grew from about **6.4 to 10.9 seconds**. Earlier runs varied around 7.7/11.8 seconds and 144 FPS; timing depends on cache and background load. A phone viewport was inspected, but physical iOS/Android devices and typical midrange desktop hardware have not been benchmarked. The short warmed sample is not a universal 60 FPS guarantee. Debug rendering is intentionally more expensive and stays disabled by default.

Screenshots: `docs/screenshots/rally-aerial.png`, `rally-uphill.png`, `rally-downhill.png`, `rally-debug.png`, and `rally-phone.png`.
