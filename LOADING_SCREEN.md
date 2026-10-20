# Animated loading screen

Scope: preserve the existing beige background and animated central shapes, keep all
loading UI outside Three.js, and use the supplied logo unchanged. No gameplay/HUD
redesign or new runtime dependency. Baseline: `6e83964`.

## Configuration

`LoadingScreen.js` contains the single `loadingScreenConfig` object. Durations are
milliseconds. The defaults are a 1-second initial hold, 600ms upward movement,
60px movement (capped at 8% of viewport height), 400ms indicator fade, 2-second
clockwise gear rotation, 2-second minimum visibility, and 500ms exit fade.
`logoScale` defaults to 1.2; `gearSize` and `loadingTextSize` set responsive maximum sizes in pixels. Responsive CSS in `index.html` uses these values while
preserving proportions and mobile safe areas. Reduced motion removes animation
and the exit fade but retains the minimum display duration.

## Readiness and failures

The existing initializer awaits scene/terrain creation, environment integration
(or its existing fallback), vehicle assets (or their existing procedural fallback),
camera, controls and Rapier. Only after the first successful scene render does it
call `gameLoadingScreen.ready()`. A timer alone never establishes readiness. The
controller begins its exit only after readiness AND the two-second minimum, then
hides the overlay and enables normal input. Word Hunt, rally-car availability and
turbo pickups can continue loading in the background. Safe fallback failures do
not become fatal errors. Uncaught startup failures stop animation, cancel pending
exit, retain the overlay and show a friendly message with a reload button.

## Validation

- `python tools/build_site.py` then `python tools/check_project.py`: production
  file integrity/HTTP/assets and existing gameplay regression suite.
- `python tests/run_loading_screen_tests.py`: Playwright/Chromium timing, early and
  delayed readiness, landscape indicator bounds, errors and reduced motion. Set
  `CHROMIUM_PATH` if needed. Uses a controlled browser clock for deterministic
  timer checks. Does not certify actual iPhone Safari performance or appearance.

## Artwork

`assets/logo.png` is the user's original 1706×922 transparent PNG, incorporated
unchanged from commit `f836ff7`. The head preloads a lossless delivery copy
at high priority, and the overlay uses an ordinary image with explicit intrinsic dimensions. No runtime
rendering, logo recreation, or generated replacement is used. Browser caching
provides quick repeat visits; a first visit still needs to download the original
image before displaying its pixels.

The loading label uses bundled Patrick Hand (SIL Open Font License), with its
license in `assets/fonts/PatrickHand-LICENSE.md`. `tools/build_site.py` includes
TTF assets in production; there is no runtime font CDN or package dependency.

## Recorded results

On this Linux cloud environment (Python 3.12, Node 24, system Chromium): production
build and full existing project verification passed; 270 deployment files were
verified. All four loading lifecycle scenarios passed. Desktop (1440×1000),
portrait (390×844) and landscape (844×390) checks loaded the original PNG and local
font, preserved logo proportions, and confirmed nonoverlapping, in-bounds layouts.
A live-game smoke check reached `ready` without uncaught errors and accelerated
from 0 to 4 MPH after keyboard input. The cloud Chromium lacks the proxy CA for
jsDelivr; that smoke test routed CDN downloads through Python's certificate-verified
system HTTPS client without disabling TLS checks. Physical iPhone/Safari testing
remains outstanding.

## Mobile startup follow-up

The iPhone report (static gear, late logo and abrupt exit) exposed avoidable
startup scheduling dependencies. The visual sequence now uses delayed CSS
keyframes, promoted transform/opacity layers, and no SVG drop-shadow filter, so
its start no longer depends on the indicator's JavaScript timer. Startup yields
to browser paints at stage boundaries and within terrain/tree batches while
preserving calculation order and output. After the first successful render, the
game loop avoids further scene updates/draws until the overlay finishes; this
leaves more rendering capacity for the exit fade. Gameplay then resumes with a
fresh clock delta. No physics parameters, graphics quality or world layout change.

The preload and image use `assets/logo-lossless.webp` (1,594,698 bytes versus
2,046,537 bytes for the PNG, about 22% smaller). Both decode to exactly the same
1706×922 RGBA pixels; the original PNG remains unchanged. Async image decoding
avoids requiring a synchronous decode in a busy startup frame. Network download
and decode are still necessary on a cold visit.

The loading browser suite additionally pauses JavaScript timers while confirming
that the indicator appears and that the gear's actual computed rotation changes.
Reduce Motion deliberately disables these animations and simplifies the exit;
iPhone Low Power Mode may also reduce animation frame rates. The current checks
cannot establish the cause on a specific physical iPhone without device evidence.

The slower-CPU Chromium startup smoke test reached gameplay without uncaught
errors, then reached 26 MPH while holding keyboard drive across 12 rendered
frames. This is emulation using software graphics, not an iPhone benchmark.

## Play touch gesture guards

`GameTouchGestures.js` installs scoped, non-passive WebKit gesture/touch guards on
Play surfaces. CSS disables native touch gestures, selection, dragging and iOS
callouts on the canvas and driving controls. Pointer Events still own driving,
steering, camera orbit and independent multi-touch; the guard does not stop event
propagation or cancel button clicks. Native selects, text fields, navigation and
settings dialogs retain their normal interaction. Text editing is explicitly
restored in the settings shadow root. Existing page overscroll prevention stays
in place. `python tests/run_game_touch_tests.py` checks cancellation scope, native
form editing, real simultaneous Chromium touch pointers, repeat taps and cleanup.
Physical iOS callout/magnifier and pinch behavior still requires device review.


## Startup scheduling recovery

The first mobile optimization used two animation-frame callbacks per startup
batch. That can multiply loading time when iOS throttles frame callbacks, or
prevent a batch from resuming when frame callbacks are suspended. Startup now
uses task yields (`setTimeout(..., 0)`) and does not wait on animation frames.
CSS still owns loading animations. The controller URL is versioned again to avoid
mixing cached old scheduling code with the updated page. This addresses an
identified scheduling risk; the reported physical-device hang still needs a
retry on the updated deployment to confirm its cause.
