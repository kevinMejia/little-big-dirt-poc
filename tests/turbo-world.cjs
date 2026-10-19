const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});console.log('Browser',browser.version(),'Windows',process.platform);try{
 const page=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true}),errors=[];
 page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message)});
 await page.route('**/index.html*',route=>route.fulfill({contentType:'text/html',body:fs.readFileSync('index.html','utf8').replace('}animate();',`}animate();window.turboQA={ready:()=>!!turboPickups&&!document.querySelector('#rallyCarBtn').disabled,state:()=>({charge:rapierController.turbo.charge,active:rapierController.turbo.active,speed}),charge:n=>rapierController.turbo.charge=n,choose,scale:n=>rapierController.turbo.config.turboHudScale=n,collect:()=>{const r=turboPickups.records.find(r=>r.timer.available);position.set(r.point.x,r.point.y,r.point.z);rapierController.resetAt(position,0);turboPickups.resetVehicle();}};`)}));
 page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text().slice(0,200))});
 await page.goto('http://127.0.0.1:8000/index.html');await page.waitForFunction(()=>window.turboQA?.ready(),null,{timeout:90000});
 await page.evaluate(()=>{turboQA.charge(0)});await page.waitForTimeout(1000);let s=await page.evaluate(()=>turboQA.state());assert(s.charge>.5&&s.charge<2);
 await page.evaluate(()=>{turboQA.charge(0);turboQA.collect()});await page.waitForTimeout(150);s=await page.evaluate(()=>turboQA.state());assert(s.charge>=25&&s.charge<27);
 for(const car of [0,1,2]){
 await page.evaluate(car=>{turboQA.charge(60);turboQA.choose(car)},car);assert((await page.evaluate(()=>turboQA.state())).charge>=60);
 await page.keyboard.down('w');await page.waitForTimeout(40);await page.keyboard.up('w');await page.waitForTimeout(40);await page.keyboard.down('w');await page.waitForTimeout(450);
 s=await page.evaluate(()=>turboQA.state());assert(s.active);assert(s.charge<58);assert(s.speed>0);await page.keyboard.up('w');await page.waitForTimeout(60);assert(!(await page.evaluate(()=>turboQA.state())).active);
 }
 await page.evaluate(()=>turboQA.charge(50));await page.screenshot({path:'docs/screenshots/turbo-charge-desktop.png'});
 for(const viewport of [{width:390,height:844},{width:844,height:390}]){await page.setViewportSize(viewport);
 for(const scale of [.5,1,2]){await page.evaluate(n=>turboQA.scale(n),scale);await page.waitForTimeout(120);const box=await page.locator('#turboHud').boundingBox(),controls=await page.locator('#mobile').boundingBox();assert(box.x>=0&&box.y>=0&&box.x+box.width<=viewport.width);assert(box.y+box.height<controls.y);}
 await page.screenshot({path:`docs/screenshots/turbo-charge-${viewport.width}.png`});}
 const accel=page.locator('[data-drive=forward]'),box=await accel.boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
 await page.evaluate(()=>turboQA.charge(60));
 // Browser-dispatched pointer lifecycle exercises the same existing mobile control handlers.
 // Use CDP touch events for real pointer capture behavior.
 const cdp=await page.context().newCDPSession(page);const touch=type=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y}]});
 await touch('touchStart');await touch('touchEnd');await page.waitForTimeout(50);await touch('touchStart');await page.waitForTimeout(250);assert((await page.evaluate(()=>turboQA.state())).active);await touch('touchEnd');await page.waitForTimeout(80);assert(!(await page.evaluate(()=>turboQA.state())).active);
 await page.evaluate(()=>turboQA.charge(0));await page.waitForTimeout(30);
 await page.evaluate(()=>{turboQA.charge(10)});await page.waitForTimeout(40);assert.equal(await page.locator('#turboHud').getAttribute('data-state'),'low');
 await page.evaluate(()=>turboQA.charge(100));await page.waitForTimeout(40);assert(await page.locator('#turboHud').evaluate(e=>e.classList.contains('full')));
 await page.keyboard.down('w');await page.keyboard.up('w');await page.keyboard.down('w');await page.waitForTimeout(80);assert((await page.evaluate(()=>turboQA.state())).active);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.waitForTimeout(80);assert(!(await page.evaluate(()=>turboQA.state())).active);await page.keyboard.up('w');
 assert.deepEqual(errors,[]);console.log('PASS Edge: passive charge, pickups, all vehicles, keyboard double tap/release, mobile touch double tap/release, scale .5/1/2, portrait/landscape bounds; no page errors.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
