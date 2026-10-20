"""Real browser presentation/input integration; no physical iPhone claim."""
from pathlib import Path
from urllib.parse import urlsplit
import re, shutil
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'index.html').read_text()
css=re.search(r'<style>([\s\S]*?)</style>',html)[1]
mobile=html[html.index('<div id="mobile"'):html.index('<dialog id="vehicleGarage"')]
fixture=f'''<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<style>{css}body{{background:#748d65}}canvas{{position:fixed;inset:0;width:100%;height:100%}}</style>
<link rel="stylesheet" href="./MobileDrivingControls.css"><link rel="stylesheet" href="./TurboHud.css">
<canvas></canvas><button id="touchToggle" hidden>Touch</button>{mobile}
<script type="module">
import {{DrivingInput}} from './DrivingInput.js';
import {{installGameTouchGuards}} from './GameTouchGestures.js';
import {{installMobileDrivingControls}} from './MobileDrivingControls.js';
import {{TurboBoost}} from './TurboBoost.js';
import {{TurboHud}} from './TurboHud.js';
installGameTouchGuards();
window.controls=new DrivingInput({{root:document.querySelector('#mobile'),toggle:document.querySelector('#touchToggle'),keys:new Set(),actionsRoot:document.querySelector('#vehicleActions'),actionsToggle:document.querySelector('#actionsToggle')}});
window.ui=installMobileDrivingControls();window.turbo=new TurboBoost();window.hud=new TurboHud();
window.artReady=false;ui.ready.then(()=>{{artReady=true;hud.update(turbo)}});
window.renderState=()=>{{ui.updateTurbo(turbo.active);hud.update(turbo)}};
</script>'''

def visible_image(page,control):
    return page.locator(f'[data-drive={control}] img').evaluate_all('(images)=>images.filter(i=>getComputedStyle(i).opacity==="1").map(i=>i.src.split("/").pop())')
def no_overlap(a,b):
    return a['x']+a['width']<=b['x']+.1 or b['x']+b['width']<=a['x']+.1 or a['y']+a['height']<=b['y']+.1 or b['y']+b['height']<=a['y']+.1

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=shutil.which('chromium'),headless=True)
    # Smallest landscape first, then larger landscapes, portrait and desktop emulation.
    for width,height in [(667,375),(844,390),(932,430),(390,844),(1280,720)]:
        page=browser.new_page(viewport={'width':width,'height':height},is_mobile=True,has_touch=True)
        pending=[];hold=[True]
        def fulfill(route):
            path=urlsplit(route.request.url).path.lstrip('/')
            if not path:route.fulfill(body=fixture,content_type='text/html');return
            file=ROOT/path
            if not file.resolve().is_relative_to(ROOT) or not file.is_file():route.abort();return
            content_type={'.js':'text/javascript','.css':'text/css','.png':'image/png'}.get(file.suffix,'application/octet-stream')
            route.fulfill(path=str(file),content_type=content_type)
        def serve(route):
            if hold[0] and route.request.url.endswith('.png'):pending.append(route)
            else:fulfill(route)
        page.route('https://controls.test/**',serve)
        page.goto('https://controls.test/',wait_until='domcontentloaded')
        page.wait_for_function('!!window.ui')
        assert page.locator('.drive-art').evaluate_all('(buttons)=>buttons.length===4&&buttons.every(b=>b.inert)')
        hold[0]=False
        for route in pending:fulfill(route)
        page.wait_for_function('artReady')
        assert page.locator('.drive-art img').count()==10
        assert page.locator('.drive-art img').evaluate_all('(images)=>images.every(i=>i.complete&&i.naturalWidth===400)')
        assert page.locator('.drive-art').evaluate_all('(buttons)=>buttons.every(b=>!b.inert)')
        assert visible_image(page,'forward')==['accelerate_normal.png']
        buttons=[page.locator(f'[data-drive={c}]') for c in ['left','right','back','forward']]
        boxes=[b.bounding_box() for b in buttons]
        for i,box in enumerate(boxes):
            assert box['width']>=44 and abs(box['width']-box['height'])<.1,box
            assert box['x']>=0 and box['y']>=0 and box['x']+box['width']<=width+.1 and box['y']+box['height']<=height+.1,box
            for other in boxes[i+1:]:assert no_overlap(box,other),(box,other)
        gauge=page.locator('#turboHud').bounding_box()
        assert all(no_overlap(gauge,box) for box in boxes),(gauge,boxes)
        page.screenshot(path=f'/tmp/lbd-tire-controls-{width}x{height}.png')
        page.evaluate('controls.setVehicleActions([{id:"hopper",label:"Hopper"},{id:"compactor",label:"Compact"}])')
        page.locator('#actionsToggle').tap()
        for element in page.locator('#actionArea .equipment-action,#actionsToggle').all():
            box=element.bounding_box()
            assert box['x']>=0 and box['y']>=0 and box['x']+box['width']<=width and box['y']+box['height']<=height,box
            assert no_overlap(box,gauge),(box,gauge)
            assert all(no_overlap(box,b) for b in boxes),(box,boxes)
        page.evaluate('controls.setVehicleActions([])')
        print(f'PASS {width}x{height}: all 10 images decoded before enabling; targets {boxes[0]["width"]:.1f}px; bounds, spacing and turbo gauge clear.')
        if width==667:
            client=page.context.new_cdp_session(page)
            def touch(control,id):
                r=page.locator(f'[data-drive={control}]').bounding_box();return {'x':r['x']+r['width']/2,'y':r['y']+r['height']/2,'id':id}
            # A real second touch and hold drives the actual TurboInput + TurboBoost.
            points=[touch('left',1),touch('forward',2)]
            client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':points})
            assert visible_image(page,'left')==['left_pressed.png']
            assert visible_image(page,'forward')==['accelerate_pressed.png']
            state=page.evaluate('controls.read(0,null)');assert state['accelerate'] and state['steerLeft']
            assert page.locator('[data-drive=forward]').bounding_box()==boxes[3],'pressed scale must not shrink the touch target'
            client.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
            page.evaluate('turbo.charge=100;renderState()')
            assert visible_image(page,'forward')==['accelerate_normal.png'],'charge alone must not turn blue'
            point=touch('forward',3)
            client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[point]})
            client.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
            client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[point]})
            assert page.evaluate('controls.turboInput.held'),'double tap should still activate turbo request'
            page.evaluate('turbo.request(controls.turboInput.held);turbo.step(.01,true);renderState()')
            assert visible_image(page,'forward')==['accelerate_turbo_pressed.png']
            page.screenshot(path='/tmp/lbd-tire-controls-turbo.png')
            client.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
            assert visible_image(page,'forward')==['accelerate_turbo_normal.png'],'released blue artwork during current active frame'
            page.evaluate('turbo.request(false);renderState()')
            assert visible_image(page,'forward')==['accelerate_normal.png']
            client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[point]})
            page.evaluate('turbo.charge=.01;turbo.request(true);turbo.step(1,true);renderState()')
            assert visible_image(page,'forward')==['accelerate_pressed.png'],'depletion while held returns to regular pressed image'
            client.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]})
            assert visible_image(page,'forward')==['accelerate_normal.png']
            client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[touch('back',4),touch('right',5)]})
            state=page.evaluate('controls.read(10,null)');assert state['brake'] and state['steerRight']
            assert visible_image(page,'back')==['brake_pressed.png']
            page.evaluate('dispatchEvent(new Event("blur"))')
            assert page.locator('.drive-art.pressed').count()==0
            client.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
            # Simulate resolved safe-area values, because desktop Chromium has zero env() insets.
            page.locator('#mobile').evaluate('(e)=>{e.style.setProperty("--drive-left","64px");e.style.setProperty("--drive-right","52px");e.style.bottom="34px";}')
            safe=page.locator('#mobile').bounding_box()
            assert safe['x']==64 and abs(safe['x']+safe['width']-(width-52))<.1 and abs(safe['y']+safe['height']-(height-34))<.1,safe
            page.locator('#mobile').evaluate('(e)=>e.style.setProperty("--drive-button-size","84px")')
            assert page.locator('.drive-art').evaluate_all('(buttons)=>buttons.every(b=>Math.abs(b.getBoundingClientRect().width-84)<.1)')
            print('PASS: normal/pressed/all four turbo states, real double-tap hold, charge/depletion, steer+drive/brake, cancellation, blur, fixed hit targets and simulated safe areas.')
        page.close()
    browser.close()
