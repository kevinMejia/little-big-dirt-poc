# Shared live tuning

Open the shared hamburger menu → **Settings** from Play, Dirt Jump Lab or any
standalone viewer. Settings stays on the current page. Its floating left window
is nonmodal: there is no backdrop, pause, vehicle reset or navigation. Minimize
reduces it to a small title bar. The contents scroll independently.

The window is at most 330 px wide and 66% of the visible viewport height. It
measures visible driving/equipment buttons and ends at least 10 px above any
button under its horizontal span. ResizeObserver and visualViewport resize
updates account for touch-control visibility, orientation and keyboard size.
CSS safe-area insets account for the notch. Very restricted space minimizes the
contents automatically. Only panel-owned pointers and editing keys are consumed;
WASD reaches driving while a slider is focused. Arrow keys on a focused slider
adjust that slider; click the game to use arrow-key driving. Number/select editing
owns its typing. Key releases always reach the driving handlers.

## Defaults and persistence

- `VehicleConfig.js` remains the source of every default. No defaults changed.
- `TuningStore.js` whitelists implemented settings and mutates those same exported
  objects. It introduces no independent physics parameters or controller.
- The vehicle selector chooses whose tuning to edit; it does not switch or reset
  the car. Dirty and Stinky have separate overrides. Global settings explicitly
  say “Both vehicles”.
- Only explicit overrides are saved to localStorage, scoped to the deployment
  base path. Refresh, Play/lab navigation and other open tabs reuse them. Browser
  storage denial leaves live controls functional but displays an unsaved notice.
- Every numeric control shows its value, units, file default and override status.
  Sliders with no engine upper cap use a documented practical window; their number
  inputs accept finite values above that window. Actual engine clamps are enforced
  for new edits. Reset preserves the exact file value, including existing gravity
  250% (effective 200%) and interactive debris 450% (effective 100%).
- Reset works per field/category; Reset all tuning requires an explicit second
  confirmation. It resets both vehicles and global tuning, preserving display and
  input preferences. Export downloads executable `VehicleConfig.tuned.js` with all
  current values. Review it before replacing the source file; comments remain in
  the original file. Export does not write into the project automatically.
- Existing UI preferences use the existing GamePreferences key, now persisted in
  localStorage. Previous session preferences migrate once. Touch Controls uses
  the existing DrivingInput toggle and pointer-capture implementation. Its reset
  restores automatic device detection.
- **Display / HUD → Show Driving HUD** and **Show Keyboard Controls Guide** both
  default off. They independently hide/restore the existing `#hud` and `#help`.
  Inline head CSS hides both before initialization; only saved preferences reveal
  them. Vehicle reset/switch never changes these preferences. Preference updates do not clear a held driving input.

## Active controls

Driving covers acceleration, forward/reverse limits, steering/smoothing, brakes,
coasting and hill modifiers. Body controls tune visual lean, pitch, return spring
and damping. Hybrid wheel compression/extension are visual response rates, not
physical chassis springs. Grounded stability is terrain alignment, with no active
center-of-mass/rollover parameter to expose.

Jump controls use shared hybrid gravity, pitch/roll torque, angular damping,
takeoff conditions, landing compression, momentum retention and body feedback.
`jumpVehicleConfig` contributes only its genuinely active per-vehicle landing
bounce scale here; legacy raycast acceleration and suspension fields are hidden.
Original-only terrain bounce appears only when Play uses Original. Original
cannon gravity is fixed, so no ineffective gravity slider is shown in that mode.

Cannon controls affect the next launch; hybrid air steering and landing feedback
also read configuration during flight. Original captures cannon values at launch.
World interaction thresholds apply in Play; other environments clearly explain
that they save those values for Play. Debris edits regenerate existing debris in
Play, without rebuilding the world or resetting the vehicle.

Camera return affects Play's chase camera. Dust and tracks are live in Play/lab.
Setup-only terrain colors/textures/shadow quality are omitted. Asset-showroom
lighting, bloom and model controls remain local visual controls.

## Tuning cheat sheet

| Problem | Try |
| --- | --- |
| Slow acceleration | Increase Acceleration; Speed adjustment also raises top speed. |
| Poor turning | Increase Turning rate/Steering response; lower Full steering speed for earlier turning. |
| Too much body wobble | Increase Body damping; reduce Body roll/pitch. |
| Too much airborne rotation | Increase Air rotation damping; reduce air pitch/roll control and cannon launch rotation. |
| Long cannon flights | Lower Vertical launch speed; hybrid gravity caps at 200%. |
| Hard-looking landings | Reduce Landing bounce/Vehicle bounce scale and Landing body movement; increase Landing damping. |

## Validation

- Store tests cover exact default preservation, independent vehicles, safe
  whitelist, clamps, refresh/reload semantics, reset, invalid/blocked storage and
  executable config export.
- 16 real-model main/lab comparison scenarios plus running-controller edits cover
  both vehicles, acceleration/turning/braking, ramps, flight, cannon and landing.
  A live zero-acceleration edit changes the next step without replacing the body
  or moving its position at edit time; the other vehicle remains unchanged.
- Existing multitouch/gamepad tests cover independent fingers, capture loss,
  cancellation, brake-before-reverse and input merging.
- Browser checks cover navigation into Settings in place, independent values,
  Play/lab persistence, HUD hiding/restoration/refresh, desktop and iPhone-sized
  390×844 / 844×390 layouts, minimize and outside-panel acceleration. In landscape
  the panel ended at y=296, left steering began at y=306; accelerator remained
  available at the right. A real held accelerator drove the vehicle with Settings
  open. This is browser viewport testing, not physical iPhone hardware testing.
- Project build and new checks pass. The existing full-check command still stops
  at `jump-prototype.mjs`'s gravity expectation, which assumes different tuning
  from the current approved configuration. No physics defaults were changed to
  make that legacy assertion pass.

Screenshots: [portrait](docs/screenshots/settings-portrait.png),
[landscape](docs/screenshots/settings-landscape.png),
[desktop](docs/screenshots/settings-desktop.png).

## Navigation grouping

The shared menu now has exactly four top-level entries: Play, Dirt Jump Lab,
Asset Showroom and Settings. Asset Showroom expands to Turbo & Collectibles,
Environment Workshop, Dirty Garage and Stinky Garage. Native details/summary
provides mouse, touch, Enter/Space and Tab behavior. Each current child is
highlighted; the parent automatically expands whenever the menu opens on an asset
page. Reference-comparison pages remain linked from their existing garages and
highlight their garage's area. Existing direct routes, including the handling
course, remain unchanged. Settings continues opening the live floating window.

[Mobile grouped navigation](docs/screenshots/navigation-assets-mobile.png).

## Display visibility regression

HUD and keyboard guide now have separate saved toggles, both off by default.
Their inline head CSS hides them before JavaScript/module initialization. Reset
and vehicle switching never set visibility. pagehide removes only the applied
visibility attributes (not preferences); pageshow reads saved values again, which
also protects restored pages from stale visibility. Saving a physics/touch option
no longer writes default display values as if they were explicit choices.

Browser validation: enable HUD alone → only HUD visible; enable guide → both
visible; Reset → refresh → both remain enabled. Then disable both → Reset →
switch to Stinky → Dirt Jump Lab → Play → refresh: both elements remained hidden,
and both Settings toggles were off. Browser console had no errors. Source checks
verify the initial hide rules precede the HUD markup. VehicleConfig.js and all
vehicle models/controllers are unchanged by this fix.

[Verified display toggles](docs/screenshots/display-visibility.png).
