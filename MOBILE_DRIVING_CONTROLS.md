# Illustrated mobile driving controls

The four existing Play buttons now display the ten supplied PNGs from
`assets/little_big_dirt_mobile_controls_verified/`. The files are unchanged.
`DrivingInput.js`, turbo rules, vehicle handling and the loading screen are
unchanged. Baseline: `42da582`.

## Size and position

Edit `mobileControlsConfig` at the top of `MobileDrivingControls.js`, then reload:

```js
export const mobileControlsConfig = Object.freeze({
  buttonSize: 112,
  buttonGap: 14,
  horizontalInset: 20,
  bottomInset: 20,
  pressedScale: 0.96
});
```

Sizes and spacing are CSS pixels. `buttonSize` controls all four circular targets;
`buttonGap` separates adjacent buttons, with at least twice that gap reserved
between groups. Insets use the greater of the configured value and browser safe
area. CSS automatically caps size to available width and 30% of viewport height,
with a 44px minimum touch target. The minimum supported/tested landscape layout
is 667×375. Portrait also scales down rather than overlapping groups. Increasing
the default does not bypass these responsive caps. No live settings UI is added.

`MobileDrivingControls.css` owns layout and image states. Target circles do not
shrink on press; only their artwork scales to 0.96. Default transparent edges make
the target slightly larger than the visible tire. Uniform turbo image translation
and scaling compensate for the supplied pair's different transparent padding;
there is no source trimming, distortion, recoloring or added glow. Normal/pressed
bounds match within each pair. All images remain proportional.

## States and startup

The existing input handlers set `.pressed` and `aria-pressed`. CSS immediately
selects the matching decoded normal/pressed image; the scale transition is 80ms
and respects reduced motion. The game passes the actual `TurboBoost.active`
boolean to `mobileDrivingControls.updateTurbo()`. Charge availability alone never
selects blue artwork. A boost ending or depleting switches to regular artwork on
the same controller update; if still held, the regular pressed image is shown.

Images are fetched/decode-preloaded in parallel with initialization on touch
browsers. The game initializer never awaits the presentation module. All four
buttons stay inert/hidden until all ten images decode, preventing an unpainted
first press or first-use flicker. A failed download leaves them inert and offers
a reload control. No extra animation loop, pointer handlers, physics work, or
asset polling is introduced. Each game update only compares the active boost
boolean and changes the DOM when it changes. Equipment controls retain their
original styling; their existing action area sits above the brake side to avoid
the turbo gauge above the accelerator side. `TurboHud.js` exposes its existing
computed width to the controls so that equipment actions reserve enough room
even when buttons shrink in portrait; the gauge artwork and charge behavior
are unchanged.

## Validation

- `python tests/run_mobile_driving_controls_tests.py`: actual PNG decode barrier,
  667×375 first, then 844×390, 932×430, 390×844 and 1280×720 touch emulation;
  circular nonoverlapping targets, viewport and turbo gauge bounds; normal,
  pressed and four turbo combinations; real simultaneous pointer drive/steer and
  brake/steer; double-tap hold, depletion, cancellation, blur, fixed hit targets,
  configuration resizing and simulated nonzero safe-area margins.
- `python tests/run_game_touch_tests.py`: native gesture cancellation, double-tap
  hold, independent multi-touch, native form editing and repeated button clicks.
- `python tools/build_site.py` followed by `python tools/check_project.py`:
  production file integrity/HTTP delivery and existing gameplay regressions.

Physical iPhone/Safari and real safe-area environment values cannot be verified
with this desktop browser. No physical-device FPS or load-time guarantee is
claimed. The new art totals about 1.6 MB and adds ten decoded 400×400 image layers;
there is no new dependency or graphics-quality change.

## Recorded results

All requested landscape sizes passed with 112px circular targets: 667×375,
844×390 and 932×430. Portrait 390×844 passed at 73.5px; desktop touch emulation
1280×720 passed at 112px. Open equipment controls also fit without overlapping
the driving controls or turbo gauge. Configuration resizing to 84px changed all
four targets together. Browser integration exercised actual touch pointers and
actual TurboInput/TurboBoost, including the charge-only, active, release and
exhausted cases. The live game reached readiness without uncaught errors and
accelerated after keyboard input. These observations are Linux Chromium checks,
not physical iPhone measurements.
