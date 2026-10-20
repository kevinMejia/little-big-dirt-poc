"""Exercise real menu links: returning to current Play must keep its document alive."""
from pathlib import Path
from urllib.parse import urlsplit
import re, shutil
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
fixture='''<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<canvas id="game"></canvas><div id="gameLoading" hidden>Loading...</div>
<script>window.sessionMarker={position:123,turboCharge:77};window.savedCanvas=document.querySelector('canvas');</script>
<script type="module" src="/game/SharedNavigation.js"></script>'''
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=shutil.which('chromium'),headless=True)
    for path in ['/game/','/game/index.html?debug=1#retained','/game/index.html?handling=1','/game/viewer/showroom.html']:
        page=b.new_page(viewport={'width':667,'height':375},is_mobile=True,has_touch=True)
        documents=[]
        def serve(route):
            request=route.request;url=urlsplit(request.url)
            if request.resource_type=='document':
                documents.append(request.url);route.fulfill(body=fixture,content_type='text/html');return
            file=ROOT/url.path.removeprefix('/game/')
            if file.resolve().is_relative_to(ROOT) and file.is_file():route.fulfill(path=str(file),content_type='text/javascript')
            else:route.abort()
        page.route('https://nav.test/**',serve)
        page.goto('https://nav.test'+path)
        toggle=page.get_by_role('button',name='Open navigation menu')
        toggle.wait_for()
        original=page.url
        page.evaluate('sessionMarker.position=456;sessionMarker.turboCharge=61')
        toggle.tap()
        link=page.get_by_role('link',name=re.compile('^Play'))
        if path in ['/game/','/game/index.html?debug=1#retained']:
            assert link.get_attribute('href')=='https://nav.test/game/index.html'
            link.tap()
            assert toggle.get_attribute('aria-expanded')=='false'
            assert page.url==original and len(documents)==1,(page.url,documents)
            assert page.evaluate('sessionMarker.position===456&&sessionMarker.turboCharge===61&&savedCanvas===document.querySelector("canvas")')
            assert page.locator('#gameLoading').is_hidden()
            # Enter also resumes; modified clicks keep their native link behavior.
            toggle.tap();link.focus();page.keyboard.press('Enter')
            assert toggle.get_attribute('aria-expanded')=='false' and len(documents)==1
            toggle.tap()
            assert link.evaluate('(e)=>e.dispatchEvent(new MouseEvent("click",{bubbles:true,cancelable:true,ctrlKey:true,button:0}))')
            assert toggle.get_attribute('aria-expanded')=='true'
            print('PASS:',path,'touch/keyboard resume preserves document, URL, session state and canvas; loader stays hidden; modified link remains available.')
        else:
            link.tap();page.wait_for_url('https://nav.test/game/index.html')
            assert len(documents)==2,documents
            print('PASS:',path,'Play still navigates to main game from handling/labs.')
        page.close()
    b.close()
