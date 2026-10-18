// Run with NODE_PATH pointing to a Playwright installation; uses installed Edge.
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const fs = require('node:fs');
(async () => {
 const browser = await chromium.launch({channel:'msedge',headless:true});
 try {
  fs.mkdirSync('docs/screenshots', {recursive:true});
  for (const [name,width,height] of [['desktop',1440,900],['portrait',390,844],['landscape',844,390]]) {
   const context = await browser.newContext({viewport:{width,height},hasTouch:name!=='desktop',deviceScaleFactor:1});
   const page = await context.newPage();
   for (const destination of ['showroom','environment','dirty','stinky']) {
    const errors=[];
    page.on('pageerror', error=>errors.push(error.message));
    await page.goto(`http://127.0.0.1:8000/viewer/${destination}.html`);
    await page.waitForSelector('#stage canvas', {timeout:30000});
    await page.waitForFunction(() => {
     const inputs=[...document.querySelectorAll('aside input[type=range]')];
     return inputs.length && inputs.every(input=>!input.disabled && !input.closest('fieldset[disabled]'));
    });
    const stage=page.locator('#stage'), settings=page.locator('main > aside');
    await page.evaluate(()=>{
     window.previewWheelEvents=0;
     document.querySelector('#stage canvas').addEventListener('wheel',()=>window.previewWheelEvents++);
    });
    const before=await stage.boundingBox();
    const panel=await settings.boundingBox();
    assert(before.height>100 && panel.height>100);
    assert(Math.abs(panel.y-(before.y+before.height))<2,'settings underneath preview');
    assert(panel.y+panel.height<=height+1,'settings fit viewport');
    assert(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1),'no page overflow');
    await page.mouse.move(panel.x+panel.width/2,panel.y+panel.height/2);
    await page.mouse.wheel(0,1000);
    await page.waitForTimeout(150);
    assert.deepEqual(await stage.boundingBox(),before,'scroll leaves preview in place');
    assert.equal(await page.evaluate(()=>scrollY),0);
    assert.equal(await page.evaluate(()=>window.previewWheelEvents),0,'settings scroll never zooms canvas');
    for (const slider of await page.locator('aside input[type=range]').all()) {
     await slider.scrollIntoViewIfNeeded();
     const box=await slider.boundingBox();
     assert(box.y>=panel.y && box.y+box.height<=height+1,'every slider reachable');
     await slider.focus();
     const previous=await slider.inputValue();
     await page.keyboard.press('ArrowRight');
     assert.notEqual(await slider.inputValue(),previous,'slider accepts keyboard adjustment');
    }
    await page.mouse.move(before.x+before.width*.6,before.y+before.height*.5);
    await page.mouse.down();
    await page.mouse.move(before.x+before.width*.7,before.y+before.height*.6,{steps:6});
    await page.mouse.up();
    await page.mouse.wheel(0,-100);
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(()=>window.previewWheelEvents),1,'preview still receives zoom');
    assert.deepEqual(await stage.boundingBox(),before);
    await page.getByRole('button',{name:'Open navigation menu'}).click();
    for (const label of ['Turbo & Collectibles','Environment Workshop','Dirty Garage','Stinky Garage']) {
     await page.getByRole('link',{name:label,exact:false}).waitFor({state:'visible'});
    }
    await page.getByRole('button',{name:'Close navigation menu'}).click();
    await page.screenshot({path:`docs/screenshots/showroom-${destination}-${name}.png`});
    await page.getByRole('button',{name:'Open navigation menu'}).click();
    const next={showroom:'environment',environment:'dirty',dirty:'stinky',stinky:'showroom'}[destination];
    await page.locator(`lbd-navigation a[href$="/viewer/${next}.html"]`).click();
    await page.waitForURL(`**/viewer/${next}.html`);
    assert.deepEqual(errors,[]);
    console.log(`PASS ${destination} ${name}: loaded viewer, all sliders reachable, fixed preview, orbit/zoom input, navigation`);
   }
   await context.close();
  }
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
