"""Browser timing and lifecycle checks; requires Playwright and Chromium."""
from pathlib import Path
import os
import re
import shutil
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / 'index.html').read_text()
css = re.search(r'<style>([\s\S]*?)</style>', html)[1]
overlay = html[html.index('<div id="gameLoading"'):html.index('<script src="./LoadingScreen.js')]
controller = (ROOT / 'LoadingScreen.js').read_text()

with sync_playwright() as p:
    executable = os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
    browser = p.chromium.launch(**({'executable_path': executable} if executable else {}), headless=True)

    def setup(width=1280, height=800, reduced=False):
        page = browser.new_page(viewport={'width': width, 'height': height}, reduced_motion='reduce' if reduced else 'no-preference')
        page.route('https://loading.test/assets/logo-lossless.webp', lambda route: route.fulfill(path=str(ROOT / 'assets/logo-lossless.webp'), content_type='image/webp'))
        page.route('https://loading.test/assets/fonts/PatrickHand-Regular.ttf', lambda route: route.fulfill(path=str(ROOT / 'assets/fonts/PatrickHand-Regular.ttf'), content_type='font/ttf', headers={'Access-Control-Allow-Origin': '*'}))
        page.set_content(f'<base href="https://loading.test/"><style>{css}</style>{overlay}')
        assert page.locator('.loading-logo').evaluate('(e)=>e.complete && e.naturalWidth === 1706 && e.naturalHeight === 922')
        page.clock.install(time=0)
        page.clock.pause_at(1000)
        page.add_script_tag(content=controller)
        page.evaluate('''() => {
          // CSS has its own timeline; normalize its start after fixture downloads.
          // JS timers are controlled separately so compositor behavior is still real.
          for(const animation of gameLoading.getAnimations({subtree:true})) animation.currentTime=0;
          window.initialLoadingOpacity=getComputedStyle(document.querySelector('.loading-indicator')).opacity;
          window.events=[];
          new MutationObserver(() => events.push({at:performance.now(),hidden:gameLoading.hidden,exit:gameLoading.classList.contains('loading-exit')})).observe(gameLoading,{attributes:true});
          window.began=performance.now();
        }''')
        return page

    page = setup()
    assert page.evaluate('initialLoadingOpacity') == '0'
    page.evaluate('gameLoadingScreen.ready()')
    page.clock.run_for(750)
    assert page.locator('#gameLoading').is_visible()
    assert not page.locator('#gameLoading').evaluate('(e)=>e.classList.contains("indicator-visible")')
    page.clock.run_for(950)
    assert page.locator('#loadingMessage').inner_text() == 'Loading...'
    assert page.locator('.gear-spinner').evaluate('(e)=>getComputedStyle(e).animationDuration') == '2s'
    assert page.locator('.loading-logo').evaluate('(e)=>getComputedStyle(e).animationDuration') == '0.6s'
    assert not page.evaluate('gameLoadingScreen.canPlay')
    page.clock.run_for(1000)
    assert page.evaluate('gameLoadingScreen.canPlay')
    timing = page.evaluate('''() => ({exit:events.find(e=>e.exit).at-began,hidden:events.find(e=>e.hidden).at-began})''')
    assert timing['exit'] >= 1950, timing
    assert 450 <= timing['hidden'] - timing['exit'] <= 750, timing
    assert page.locator('.gear-spinner').evaluate('(e)=>getComputedStyle(e).animationName') == 'none'
    page.close()
    print('PASS: early readiness waits two seconds; delayed indicator, translation, 2s rotation and 500ms exit; animation cleanup.')

    page = setup(844, 390)
    page.clock.run_for(2200)
    assert page.locator('#gameLoading').is_visible()
    assert not page.evaluate('gameLoadingScreen.canPlay')
    box = page.locator('.loading-indicator').bounding_box()
    assert box['y'] >= 0 and box['y'] + box['height'] <= 390, box
    page.evaluate('gameLoadingScreen.ready()')
    page.clock.run_for(1000)
    assert page.evaluate('gameLoadingScreen.canPlay')
    page.close()
    print('PASS: slow initialization retains loader until explicit render readiness; landscape indicator fits.')

    page = setup()
    page.evaluate('gameLoadingScreen.ready(); gameLoadingScreen.fail(new Error("Required physics failed"))')
    page.clock.run_for(2600)
    assert page.locator('#gameLoading').is_visible()
    assert page.locator('#loadingRetry').is_visible()
    assert not page.evaluate('gameLoadingScreen.canPlay')
    assert page.locator('.gear-spinner').evaluate('(e)=>getComputedStyle(e).animationName') == 'none'
    page.close()
    print('PASS: fatal startup error cancels exit, stops gear, shows retry and blocks gameplay.')

    page = setup(390, 844, True)
    page.evaluate('gameLoadingScreen.ready()')
    page.clock.run_for(1100)
    assert page.locator('.gear-spinner').evaluate('(e)=>getComputedStyle(e).animationName') == 'none'
    assert not page.evaluate('gameLoadingScreen.canPlay')
    page.clock.run_for(1000)
    assert page.evaluate('gameLoadingScreen.canPlay')
    page.close()
    print('PASS: reduced motion disables animation and preserves minimum duration.')

    # Pause JS timers while real compositor animation time advances. The visual
    # sequence must not depend on the indicator's JavaScript timer firing.
    page = setup(844, 390)
    page.wait_for_timeout(1800)
    assert not page.locator('#gameLoading').evaluate('(e)=>e.classList.contains("indicator-visible")')
    assert float(page.locator('.loading-indicator').evaluate('(e)=>getComputedStyle(e).opacity')) > .95
    first = page.locator('.gear-spinner').evaluate('(e)=>getComputedStyle(e).transform')
    page.wait_for_timeout(200)
    second = page.locator('.gear-spinner').evaluate('(e)=>getComputedStyle(e).transform')
    assert first != second, (first, second)
    page.close()
    browser.close()
    print('PASS: indicator appears and gear visibly rotates even with JavaScript timers paused.')
