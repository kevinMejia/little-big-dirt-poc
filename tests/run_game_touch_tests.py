"""Browser checks for Play gesture guards and real multi-touch driving pointers."""
from pathlib import Path
from urllib.parse import urlsplit
import re
import shutil
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
css=re.search(r'<style>([\s\S]*?)</style>',(ROOT/'index.html').read_text())[1]
fixture='''<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<style>CSS canvas{position:fixed;inset:0;width:100%;height:100%}#vehicleControlsToggle{position:fixed;top:10px;left:200px}input{position:fixed;top:10px;left:260px;width:80px}</style>
<canvas></canvas><div id="mobile"><div class="cluster"><button class="touch" data-drive="left">Left</button></div><div class="cluster"><button class="touch accelerator" data-drive="forward">Drive</button></div><div id="vehicleActions" hidden></div><button id="actionsToggle" hidden>Actions</button></div>
<button id="touchToggle" hidden>Touch</button><div id="vehicleControls"><button id="vehicleControlsToggle">Menu</button><input value="editable"></div>
<script type="module">
import {installGameTouchGuards} from './GameTouchGestures.js';
import {DrivingInput} from './DrivingInput.js';
window.disposeGuards=installGameTouchGuards();
window.controls=new DrivingInput({root:document.querySelector('#mobile'),toggle:document.querySelector('#touchToggle'),keys:new Set(),actionsRoot:document.querySelector('#vehicleActions'),actionsToggle:document.querySelector('#actionsToggle')});
window.menuClicks=0;document.querySelector('#vehicleControlsToggle').onclick=()=>menuClicks++;
</script>'''.replace('CSS',css)

with sync_playwright() as p:
    b=p.chromium.launch(executable_path=shutil.which('chromium'),headless=True)
    page=b.new_page(viewport={'width':844,'height':390},is_mobile=True,has_touch=True)
    def serve(route):
        path=urlsplit(route.request.url).path.lstrip('/')
        if path=='':route.fulfill(body=fixture,content_type='text/html')
        elif path in ['GameTouchGestures.js','DrivingInput.js','TurboInput.js','VehicleConfig.js']:
            route.fulfill(path=str(ROOT/path),content_type='text/javascript')
        else:route.abort()
    page.route('https://touch.test/**',serve)
    page.goto('https://touch.test/')
    page.wait_for_function('!!window.controls')
    assert page.locator('canvas').evaluate('(e)=>getComputedStyle(e).touchAction')=='none'
    assert page.locator('[data-drive=forward]').evaluate('(e)=>getComputedStyle(e).userSelect')=='none'
    for kind in ['contextmenu','selectstart','dragstart','dblclick','gesturestart','gesturechange']:
        assert page.locator('canvas').evaluate('(e,type)=>!e.dispatchEvent(new Event(type,{bubbles:true,cancelable:true}))',kind),kind
        assert page.locator('input').evaluate('(e,type)=>e.dispatchEvent(new Event(type,{bubbles:true,cancelable:true}))',kind),kind
    print('PASS: gameplay browser defaults are canceled; editable/native UI defaults remain available.')

    page.evaluate('''() => {
      window.driveTouchDefaultPrevented=false;
      document.addEventListener('touchstart',e=>{
        if(e.target.closest?.('[data-drive]'))window.driveTouchDefaultPrevented=e.defaultPrevented;
      });
    }''')
    client=page.context.new_cdp_session(page)
    def point(selector,identifier):
        r=page.locator(selector).bounding_box()
        return {'x':r['x']+r['width']/2,'y':r['y']+r['height']/2,'id':identifier}
    touches=[point('[data-drive=left]',1),point('[data-drive=forward]',2)]
    client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':touches})
    state=page.evaluate('controls.read(0,null)')
    assert state['accelerate'] and state['steerLeft'],state
    assert page.evaluate('driveTouchDefaultPrevented')
    client.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{**t,'y':t['y']-2} for t in touches]})
    state=page.evaluate('controls.read(0,null)')
    assert state['accelerate'] and state['steerLeft'],state
    client.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    state=page.evaluate('controls.read(0,null)')
    assert not state['accelerate'] and not state['steerLeft'],state
    print('PASS: simultaneous real touch drive/steer, movement and release retain independent pointer ownership.')

    # Two touches followed by a hold must keep driving via Pointer Events while
    # WebKit's touch-start default is canceled. iOS's native loupe needs device review.
    forward=point('[data-drive=forward]',3)
    client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[forward]})
    client.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[forward]})
    page.wait_for_timeout(600)
    assert page.evaluate('driveTouchDefaultPrevented')
    assert page.evaluate('controls.read(0,null).accelerate')
    assert page.evaluate('getSelection().rangeCount')==0
    client.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    assert not page.evaluate('controls.read(0,null).accelerate')
    print('PASS: double-tap-and-hold cancels the native touch default, retains driving and releases cleanly.')

    page.locator('#vehicleControlsToggle').tap()
    page.locator('#vehicleControlsToggle').tap()
    assert page.evaluate('menuClicks')==2
    assert page.evaluate('visualViewport.scale')==1
    client.send('Input.synthesizePinchGesture',{'x':420,'y':150,'scaleFactor':1.5,'gestureSourceType':'touch'})
    assert page.evaluate('visualViewport.scale')==1
    print('PASS: repeated control taps still click; real pinch gesture and double taps preserve viewport scale.')
    page.locator('input').fill('42')
    assert page.locator('input').input_value()=='42'
    assert page.locator('input').evaluate('(e)=>getComputedStyle(e).userSelect')=='text'
    page.evaluate('disposeGuards()')
    assert page.locator('canvas').evaluate('(e)=>e.dispatchEvent(new Event("contextmenu",{bubbles:true,cancelable:true}))')
    b.close()
    print('PASS: form editing remains usable and gesture listeners clean up correctly.')
