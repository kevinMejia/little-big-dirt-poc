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
unchanged from commit `f836ff7`. The head preloads it at high priority, and the
overlay uses an ordinary image with explicit intrinsic dimensions. No runtime
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
