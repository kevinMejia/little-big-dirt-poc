/* Classic script: runs immediately after the overlay, independently of Three.js. */
(() => {
  const loadingScreenConfig = Object.freeze({
    logoScale: 1.2,
    gearSize: 70,
    loadingTextSize: 64,
    logoInitialDelay: 1000,
    logoMoveDuration: 600,
    logoMoveDistance: 60,
    indicatorFadeDuration: 400,
    gearRotationDuration: 2000,
    minimumDisplayDuration: 2000,
    exitFadeDuration: 500
  });
  const screen = document.querySelector('#gameLoading');
  const indicator = screen.querySelector('.loading-indicator');
  const message = screen.querySelector('#loadingMessage');
  const retry = screen.querySelector('#loadingRetry');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const started = performance.now();
  let rendered = false, failed = false, exiting = false, finished = false;
  let minimumTimer, exitTimer;
  for (const [property, value] of Object.entries({
    '--logo-scale': loadingScreenConfig.logoScale,
    '--logo-delay': `${loadingScreenConfig.logoInitialDelay}ms`,
    '--gear-size-max': `${loadingScreenConfig.gearSize}px`,
    '--label-size-max': `${loadingScreenConfig.loadingTextSize}px`,
    '--logo-move': `${loadingScreenConfig.logoMoveDistance}px`,
    '--logo-duration': `${loadingScreenConfig.logoMoveDuration}ms`,
    '--indicator-fade': `${loadingScreenConfig.indicatorFadeDuration}ms`,
    '--gear-duration': `${loadingScreenConfig.gearRotationDuration}ms`,
    '--exit-fade': `${loadingScreenConfig.exitFadeDuration}ms`
  })) screen.style.setProperty(property, value);

  function showIndicator() {
    screen.classList.add('indicator-visible');
    indicator.setAttribute('aria-hidden', 'false');
  }
  const indicatorTimer = setTimeout(showIndicator, loadingScreenConfig.logoInitialDelay);
  function finish() {
    if (failed || finished) return;
    finished = true;
    clearTimeout(exitTimer);
    screen.hidden = true;
    screen.dataset.phase = 'ready';
    screen.dispatchEvent(new Event('loadingcomplete'));
    removeEventListener('error', onError, true);
    removeEventListener('unhandledrejection', onRejection);
  }
  function exit() {
    if (!rendered || failed || exiting || finished) return;
    const remaining = loadingScreenConfig.minimumDisplayDuration - (performance.now() - started);
    if (remaining > 0) {
      clearTimeout(minimumTimer);
      minimumTimer = setTimeout(exit, remaining);
      return;
    }
    exiting = true;
    screen.dataset.phase = 'exiting';
    screen.classList.add('loading-exit');
    clearTimeout(indicatorTimer);
    // The timeout also handles a background tab or a missing transitionend event.
    exitTimer = setTimeout(finish, reducedMotion.matches ? 0 : loadingScreenConfig.exitFadeDuration);
  }
  screen.addEventListener('transitionend', event => {
    if (exiting && event.target === screen && event.propertyName === 'opacity') finish();
  });
  function fail(error) {
    if (finished || failed) return;
    failed = true;
    clearTimeout(indicatorTimer);
    clearTimeout(minimumTimer);
    clearTimeout(exitTimer);
    screen.classList.remove('loading-exit');
    screen.classList.add('loading-error');
    screen.dataset.phase = 'error';
    screen.dataset.error = String(error?.message || error || 'Required game resource failed');
    showIndicator();
    message.textContent = 'The game couldn’t start. Please try again.';
    retry.hidden = false;
    console.error('Game startup failed:', error);
  }
  function onError(event) {
    // Handled optional model failures use the game's existing safe fallbacks.
    // Only uncaught execution failures and required script/logo downloads are fatal.
    const target = event.target;
    if (target === window || target?.matches?.('.loading-logo img, img.loading-logo') ||
        (target?.tagName === 'SCRIPT' && !/SharedNavigation|MobileControlPanel/.test(target.src))) {
      fail(event.error || event.message || 'A required game resource could not be downloaded.');
    }
  }
  function onRejection(event) { fail(event.reason); }
  addEventListener('error', onError, true);
  addEventListener('unhandledrejection', onRejection);
  retry.onclick = () => location.reload();
  // Block keyboard, gamepad and pointer interaction during the overlay, including its fade.
  const blockInput = event => {
    if (!finished && !retry.contains(event.target)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };
  for (const type of ['keydown', 'keyup', 'pointerdown', 'pointermove', 'pointerup', 'click', 'wheel']) {
    addEventListener(type, blockInput, {capture: true, passive: false});
    screen.addEventListener('loadingcomplete', () => removeEventListener(type, blockInput, true), {once: true});
  }
  window.gameLoadingScreen = {
    config: loadingScreenConfig,
    get canPlay() { return finished; },
    // Two frame boundaries let the browser paint/composite before more setup work.
    // This schedules work rather than adding a fixed loading delay.
    yieldToBrowser() {
      return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    },
    ready() {
      if (rendered || failed) return;
      rendered = true;
      screen.dataset.phase = 'rendered';
      exit();
    },
    fail
  };
})();
