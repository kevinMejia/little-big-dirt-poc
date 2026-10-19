const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.location().url.endsWith('/favicon.ico'))errors.push(m.text());});
 await page.goto('http://127.0.0.1:8000/?qa=rally-car');await page.waitForFunction(()=>window.rallyCarQA&&document.querySelector('#gameLoading').hidden&&!document.querySelector('#rallyCarBtn').disabled,{timeout:90000});
 await page.evaluate(async()=>{(await import('./VehicleConfig.js')).turboBoostConfig.enabled=false;});
 const read=()=>page.evaluate(()=>rallyCarQA.read());
 const drive=async(key,ms)=>{await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);};
 const asset=await page.evaluate(()=>rallyCarQA.assetInfo());assert(asset.loaded&&asset.geometry===15&&asset.textures===39);
 const baseline=await read();await page.keyboard.press('Digit3');await page.waitForTimeout(300);let state=await read();assert.equal(state.index,2);assert.equal(state.wheels.length,4);assert(state.wheels.every(w=>w.radius>.4&&w.radius<.8));assert.equal(state.wheels.filter(w=>w.z>0).length,2);
 await drive('KeyW',1700);state=await read();assert(state.speed>10,JSON.stringify(state));assert(state.wheels.some(w=>Math.abs(w.spin)>1));
 await page.keyboard.down('KeyW');await drive('KeyA',500);await page.keyboard.up('KeyW');state=await read();assert(state.wheels.filter(w=>w.z>0).every(w=>Math.abs(w.steer)>.02));assert(state.wheels.filter(w=>w.z<0).every(w=>w.steer===0));
 const before=Math.abs(state.speed);await drive('Space',1400);state=await read();assert(Math.abs(state.speed)<before);
 await page.evaluate(()=>rallyCarQA.place(0,0));await drive('KeyS',1000);state=await read();assert(state.speed< -2);
 await page.evaluate(()=>{rallyCarQA.place(0,0);rallyCarQA.jump();});await page.waitForTimeout(350);assert((await read()).airborne);await page.waitForFunction(()=>!rallyCarQA.read().airborne,{timeout:10000});state=await read();assert.equal(state.contacts,4);assert(state.compression.every(Number.isFinite));
 const ramps=[];
 for(const site of await page.evaluate(()=>rallyCarQA.sites)){
  await page.evaluate(s=>rallyCarQA.place(s.x,s.z,s.heading),site);await page.keyboard.down('KeyW');let took=false,landed=false,maxSpeed=0;
  for(let i=0;i<120;i++){await page.waitForTimeout(100);const sample=await read();maxSpeed=Math.max(maxSpeed,Math.abs(sample.speed));if(sample.airborne)took=true;if(took&&!sample.airborne){landed=true;break;}}
  await page.keyboard.up('KeyW');ramps.push({id:site.id,took,landed,maxSpeed});assert(took&&landed,JSON.stringify(ramps));
 }
 console.log('Rally Car ramps',JSON.stringify(ramps));
 await page.evaluate(()=>rallyCarQA.place(0,0));await page.keyboard.down('KeyW');await drive('KeyE',600);await page.keyboard.up('KeyW');assert(Number.isFinite((await read()).speed));
 await page.evaluate(()=>rallyCarQA.place(0,0));await page.screenshot({path:'docs/screenshots/rally-car-rally-desktop.png'});
 const memoryStart=(await read()).memory;
 for(let i=0;i<3;i++){for(const key of ['Digit1','Digit2','Digit3']){await page.keyboard.press(key);await page.waitForTimeout(150);}}
 const memoryEnd=(await read()).memory;assert(memoryEnd.geometries<=memoryStart.geometries+10);assert(memoryEnd.textures<=memoryStart.textures+2);
 for(const key of ['Digit1','Digit2']){await page.keyboard.press(key);await page.evaluate(()=>rallyCarQA.place(0,0));await drive('KeyW',500);assert((await read()).speed>0);}
 await page.keyboard.press('Digit3');await drive('KeyW',600);assert((await read()).speed>0);assert.equal(await page.locator('#physicsMode').count(),0);
 console.log(JSON.stringify({asset,baseline,memoryStart,memoryEnd,rallyCar:await read(),errors},null,2));assert.deepEqual(errors,[]);
 await page.setViewportSize({width:390,height:844});await page.locator('#vehicleControlsToggle').click();await page.locator('#rallyCarBtn').click();await page.screenshot({path:'docs/screenshots/rally-car-rally-mobile.png'});
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});


