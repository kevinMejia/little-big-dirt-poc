/** Presentation only. DrivingInput continues to own all pointer and turbo gestures. */
export const mobileControlsConfig = Object.freeze({
  buttonSize: 112,
  buttonGap: 14,
  horizontalInset: 20,
  bottomInset: 20,
  pressedScale: 0.96
});
const directory = new URL('./assets/little_big_dirt_mobile_controls_verified/', import.meta.url);
const names = ['left', 'right', 'brake', 'accelerate', 'accelerate_turbo'];
let preloaded;
function preloadArtwork() {
  return preloaded ??= Promise.all(names.flatMap(name => ['normal', 'pressed'].map(state => {
    const image = new Image();
    image.src = new URL(`${name}_${state}.png`, directory).href;
    return image.decode();
  })));
}
// Fetch/decode in parallel with game startup on touch devices; never await in the game initializer.
if (navigator.maxTouchPoints > 0 || matchMedia('(any-pointer: coarse)').matches) preloadArtwork().catch(() => {});

export function installMobileDrivingControls(root = document.querySelector('#mobile')) {
  const c = mobileControlsConfig;
  for (const [key, value] of Object.entries({
    '--drive-button-size': `${c.buttonSize}px`, '--drive-button-gap': `${c.buttonGap}px`,
    '--drive-horizontal-inset': `${c.horizontalInset}px`, '--drive-bottom-inset': `${c.bottomInset}px`,
    '--drive-pressed-scale': c.pressedScale
  })) root.style.setProperty(key, value);
  root.dataset.illustratedControls = '';
  root.dataset.artLoading = '';
  const buttons = [];
  for (const [control, name] of Object.entries({left: 'left', right: 'right', back: 'brake', forward: 'accelerate'})) {
    const button = root.querySelector(`[data-drive="${control}"]`);
    button.classList.add('drive-art');
    button.inert = true;
    button.replaceChildren();
    for (const variant of control === 'forward' ? [name, 'accelerate_turbo'] : [name]) {
      for (const state of ['normal', 'pressed']) {
        const image = document.createElement('img');
        image.src = new URL(`${variant}_${state}.png`, directory).href;
        image.alt = ''; image.draggable = false; image.width = image.height = 400;
        image.className = `art-${state}${variant.endsWith('_turbo') ? ' art-turbo' : ''}`;
        image.setAttribute('aria-hidden', 'true');
        button.append(image);
      }
    }
    buttons.push(button);
  }
  const ready = preloadArtwork().then(() => {
    delete root.dataset.artLoading;
    for (const button of buttons) button.inert = false;
  }).catch(error => {
    // Leave controls inert rather than silently enabling an invisible hit target.
    root.dataset.artError = '';
    const retry = document.createElement('button');
    retry.type = 'button'; retry.className = 'control-art-retry';
    retry.textContent = 'Reload touch controls'; retry.onclick = () => location.reload();
    root.append(retry);
    console.warn('Touch artwork could not load', error);
  });
  let wasActive = false;
  return {
    ready,
    updateTurbo(active) {
      active = !!active;
      if (active === wasActive) return;
      wasActive = active;
      root.toggleAttribute('data-turbo-active', active);
    }
  };
}
