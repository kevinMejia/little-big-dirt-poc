# Shared navigation

`SharedNavigation.js` supplies the hamburger button, isolated menu styles, native
modal dialog and destination list to `index.html` and all six `viewer/*.html`
pages. The handling course shares the game entry point. The two `tests/*preview.html`
files are internal collision fixtures, not user-facing labs or production pages.

Add future destinations to `navigationItems` and include the same module in the
new page. Paths resolve relative to the module, preserving local hosting and any
GitHub Pages repository prefix. Showroom is a disabled Coming soon placeholder. Settings links to the existing
main-game controls at `index.html#switcher`; no settings page or duplicate UI is
created. On the game itself, Settings focuses the live controls without reloading. Full-page links unload the prior 3D scene.

The modal provides native focus containment, Escape dismissal, Close, backdrop
dismissal and focus return. Opening it calls the existing blur handlers to clear
held driving inputs/camera captures. Menu key events do not reach game shortcuts.
No physics algorithms or tuning values are changed. Embedded garages omit the menu so links
cannot accidentally start a second game inside the garage iframe.

Verified in-browser at desktop size, 390x844 portrait and 844x390 landscape:

- All eight live destinations, including direct lab-to-lab and lab-to-Play links.
- Current-area highlight, disabled future destinations and scrolling menu.
- Close, Escape, backdrop, keyboard vehicle switching outside/blocked inside menu.
- Touch controls remain accessible; menu does not overlap HUD or drive buttons.
- Production build navigation under `/dirty-sandbox-game/`.

`node tests/navigation.mjs` (after build) checks destination files, shared module
coverage and root/project Pages URL resolution. Build and production resource
checks pass. Existing input and environment/model regression suites pass.

The full test run also exposes three existing physics failures with the current
unchanged tuning (`gravityScalePercent: 250`, effectively capped at 200):
`jump-prototype.mjs` assumes a 1.2 m/s gravity delta, `rapier-world.mjs` expects a
cannon peak above 20 m, and `rapier-steering.mjs` fails its legacy side-slip bound.
Those tests do not execute the navigation module. No physics/configuration/test
expectations were changed to address them. Physical iPhone hardware was not used.

## Existing game settings

`GamePreferences.js` stores only the existing Physics Mode, Touch controls and
main-game diagnostics choices in sessionStorage, scoped to the deployment path.
The original controls and handlers remain authoritative. Browser storage failures
fall back to the current defaults. No existing persistence mechanism was present;
this small record preserves choices during same-tab page navigation and refresh.
VehicleConfig.js remains the shared tuning source for game and lab consumers.
The touch visibility choice also applies to the lab; physics mode and game-only
HUD diagnostics do not override lab-specific testing interfaces.

Browser checks cover Settings from game/lab, focus on the original controls,
Original mode and diagnostics retained on return, touch controls shown in the lab
when enabled and hidden at mobile width when disabled. Rapier is the default in
new sessions; the test session was restored to Rapier before handing off Play.
