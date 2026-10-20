/** Keep browser gestures out of Play without taking ownership of driving pointers. */
export function installGameTouchGuards(root = document) {
  const surface = 'canvas,#mobile,#vehicleControls,#hud,#status,#help,#touchToggle,#gameLoading';
  const nativeUi = 'input,textarea,select,[contenteditable="true"],dialog,lbd-settings,lbd-navigation';
  const listeners = [];
  let gameplayTouches = false;
  function isSurface(element) {
    return !!element?.closest && !element.closest(nativeUi) && !!element.closest(surface);
  }
  function isNativeUi(event) {
    return event.composedPath().some(node => node.matches?.(nativeUi));
  }
  function on(type, handler) {
    root.addEventListener(type, handler, {capture: true, passive: false});
    listeners.push(() => root.removeEventListener(type, handler, true));
  }
  function prevent(event) { if (event.cancelable) event.preventDefault(); }
  for (const type of ['contextmenu', 'selectstart', 'dragstart', 'dblclick']) {
    on(type, event => { if (!isNativeUi(event) && event.composedPath().some(isSurface)) prevent(event); });
  }
  for (const type of ['touchstart', 'touchend', 'touchcancel']) {
    on(type, event => {
      gameplayTouches = Array.from(event.touches || []).some(touch => isSurface(touch.target));
      // Canvas interaction uses Pointer Events, not synthetic mouse clicks.
      // Keep normal touch-to-click behavior for buttons and native form fields.
      if (type === 'touchstart' && !isNativeUi(event) && event.target?.matches?.('canvas')) prevent(event);
    });
  }
  on('touchmove', event => {
    if (!isNativeUi(event) && (gameplayTouches || event.composedPath().some(isSurface))) prevent(event);
  });
  // WebKit's nonstandard pinch events need an explicit, non-passive guard.
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    on(type, event => {
      if (!isNativeUi(event) && (gameplayTouches || event.composedPath().some(isSurface))) prevent(event);
    });
  }
  on('visibilitychange', () => { if (root.hidden) clear(); });
  root.defaultView?.addEventListener('blur', clear);
  function clear() { gameplayTouches = false; }
  return () => {
    for (const remove of listeners) remove();
    root.defaultView?.removeEventListener('blur', clear);
    clear();
  };
}
