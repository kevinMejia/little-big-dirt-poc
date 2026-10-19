const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const mobile=process.env.TURBO_MOBILE==='1';
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:800},hasTouch:mobile}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));let loads=0;
  page.on('request',r=>{if(r.url().endsWith('/turbo-boost.glb'))loads++;});
  await page.route('**/index.html*',async route=>{
   const source=fs.readFileSync('index.html','utf8');
   const probe=`window.turboQA={
    ready:()=>physicsMode==='rapier'&&!!turboPickups&&!document.querySelector('#rallyCarBtn').disabled,
    place:(slot,car,offset=-1)=>{choose(car);const p=turboPickups.records[slot].point;position.set(p.x,surfaceHeight(p.x,p.z+offset)-.09,p.z+offset);heading=0;rapierController.resetAt(position,0);turboPickups.resetVehicle();},
    reset:()=>reset(),
    status:()=>({speed:rapierController?.physics.state.speed,normal:rapierController?.cfg.max*(1+rapierController.cfg.hill.speedAdjustmentPercent/100),boost:rapierController?.turbo.remaining,count:turboPickups.records.length,calls:renderer.info.render.calls,
     available:turboPickups.records.map(r=>r.timer.available),cooldowns:turboPickups.records.map(r=>r.timer.remaining),
     effects:turboPickups.records.map(r=>r.effects.visible),
     pedestal:turboPickups.batches.filter(b=>b.part==='pedestal').map(({batch})=>{const m=new THREE.Matrix4();batch.getMatrixAt(0,m);return m.determinant();}),
     floating:turboPickups.batches.filter(b=>b.part==='collectible').map(({batch})=>{const m=new THREE.Matrix4();batch.getMatrixAt(0,m);return m.determinant();})})
   };`;
   await route.fulfill({contentType:'text/html',body:source.replace('}animate();','}animate();'+probe)});
  });
  await page.goto('http://127.0.0.1:8000/index.html?turbo-check=1');
  await page.waitForFunction(()=>window.turboQA?.ready(),{timeout:60000});
  assert.equal((await page.evaluate(()=>turboQA.status())).count,15);assert.equal(loads,1);
  await page.evaluate(()=>turboQA.place(0,0,-9));await page.waitForTimeout(300);
  await page.screenshot({path:'docs/screenshots/turbo-world-available'+(mobile?'-mobile':'')+'.png'});
  await page.evaluate(()=>turboQA.place(0,0));
  await page.waitForFunction(()=>turboQA.status().cooldowns[0]>4);
  let state=await page.evaluate(()=>turboQA.status());
  assert(state.boost>1.5);assert(state.speed>state.normal*2.5,'pickup accelerates the vehicle');assert(!state.effects[0]);assert(state.pedestal.every(x=>x>.5));assert(state.floating.every(x=>x===0));
  await page.screenshot({path:'docs/screenshots/turbo-world-collected'+(mobile?'-mobile':'')+'.png'});
  await page.evaluate(()=>turboQA.reset());
  state=await page.evaluate(()=>turboQA.status());assert.equal(state.boost,0);assert(!state.available[0]);
  await page.evaluate(()=>turboQA.place(1,1));
  await page.waitForFunction(()=>turboQA.status().cooldowns[1]>4);
  state=await page.evaluate(()=>turboQA.status());assert(state.boost>1.5);assert(state.speed>state.normal*2.5,'truck receives full turbo acceleration');assert(state.cooldowns[0]<state.cooldowns[1]);
  await page.evaluate(()=>turboQA.reset());
  await page.waitForFunction(()=>turboQA.status().available[0]&&turboQA.status().available[1],{timeout:12000});
  await page.evaluate(()=>turboQA.place(2,2));
  await page.waitForFunction(()=>turboQA.status().cooldowns[2]>4);
  state=await page.evaluate(()=>turboQA.status());assert(state.boost>1.5);assert(state.speed>state.normal*2.5,'rally car receives full turbo acceleration');
  await page.evaluate(()=>turboQA.reset());
  await page.getByRole('button',{name:'Open navigation menu'}).click();
  await page.getByRole('button',{name:'Settings',exact:false}).click();
  await page.locator('summary').filter({hasText:/^Turbo Boost$/}).click();
  await page.getByRole('slider',{name:'Extra boost speed',exact:true}).waitFor({state:'visible'});
  const count=page.getByRole('spinbutton',{name:'Pickup count value'});await count.fill('12');await count.press('Tab');
  await page.waitForFunction(()=>turboQA.status().count===12);
  await page.screenshot({path:'docs/screenshots/turbo-settings'+(mobile?'-mobile':'')+'.png'});
  if(mobile){await page.setViewportSize({width:844,height:390});await page.screenshot({path:'docs/screenshots/turbo-settings-landscape.png'});}
  console.log('Viewport:',mobile?'iPhone-sized':'desktop','render calls:',(await page.evaluate(()=>turboQA.status())).calls);
  assert.deepEqual(errors,[]);
  const showroom=await browser.newPage({viewport:{width:390,height:844}});
  await showroom.goto('http://127.0.0.1:8000/viewer/showroom.html');
  await showroom.waitForFunction(()=>!document.querySelector('#visualSettings').disabled);
  assert.equal(await showroom.locator('#stage canvas').count(),1);
  console.log('PASS world: one GLB load, 15 slots, all three vehicles collect and accelerate, only floating assembly hides, pedestal remains, independent cooldowns/respawn, reset isolation, live Settings count, showroom works.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
