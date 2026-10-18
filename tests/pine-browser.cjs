// NODE_PATH must point to the bundled Playwright packages; run local server :8000.
const {chromium}=require('playwright');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const report={};
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.addInitScript(()=>{
   window.pineDraws=0;
   for(const type of [WebGLRenderingContext,WebGL2RenderingContext])for(const name of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']){
    const original=type.prototype[name];if(!original)continue;
    type.prototype[name]=function(...args){window.pineDraws++;return original.apply(this,args);};
   }
  });
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const measure=async()=>page.evaluate(async()=>{
   const times=[],draws=[];let last=performance.now(),end=last+3000,lastDraws=window.pineDraws;
   await new Promise(resolve=>{function frame(now){times.push(now-last);draws.push(window.pineDraws-lastDraws);lastDraws=window.pineDraws;last=now;if(now<end)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
   times.shift();times.sort((a,b)=>a-b);
   draws.shift();draws.sort((a,b)=>a-b);
   return {medianFrameMs:times[Math.floor(times.length/2)],p95FrameMs:times[Math.floor(times.length*.95)],medianDrawCallsIncludingShadows:draws[Math.floor(draws.length/2)]};
  });
  const ready=async()=>{await page.goto('http://127.0.0.1:8000/');await page.waitForSelector('#gameLoading',{state:'hidden',timeout:90000});assert.equal(await page.locator('#environmentAssetWarning').count(),0);};
  const baseline=execFileSync('git',['show','HEAD:EnvironmentWorld.js'],{encoding:'utf8'});
  await page.route('**/EnvironmentWorld.js*',r=>r.fulfill({contentType:'text/javascript',body:baseline}));
  await ready();await page.screenshot({path:'docs/screenshots/pines-game-before.png'});report.before=await measure();
  await page.unroute('**/EnvironmentWorld.js*');await ready();report.after=await measure();await page.screenshot({path:'docs/screenshots/pines-game-after.png'});
  await page.goto('http://127.0.0.1:8000/viewer/environment.html');
  await page.waitForFunction(()=>!document.querySelector('#pineVariant').disabled);
  for(let i=0;i<5;i++){await page.selectOption('#pineVariant',String(i));await page.waitForTimeout(100);await page.screenshot({path:`docs/screenshots/pine-${i+1}.png`});}
  report.assets=await page.evaluate(async()=>{
   const {EnvironmentAssets}=await import('../EnvironmentAssets.js');const library=new EnvironmentAssets();
   const scenes=await Promise.all([1,2,3,4,5].map(i=>library.load('Pine_'+i)));
   const materials=new Set(),geometries=new Set();
   for(const scene of scenes)scene.traverse(o=>{if(o.isMesh){materials.add(o.material);geometries.add(o.geometry);if(!o.material.map||!o.material.vertexColors)throw new Error('Missing original color data');}});
   const result={models:scenes.length,materials:materials.size,geometries:geometries.size};await library.dispose();return result;
  });assert.equal(report.assets.materials,2);
  report.layouts=[];
  for(const [width,height] of [[1440,900],[390,844],[844,390]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(100);
   const stage=page.locator('#stage'),aside=page.locator('main > aside'),before=await stage.boundingBox();
   await aside.evaluate(e=>e.scrollTop=300);assert.deepEqual(await stage.boundingBox(),before);
   assert(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1));
   report.layouts.push({width,height,fixedPreview:true});
  }
  assert.deepEqual(errors,[]);report.errors=errors;
  fs.writeFileSync('docs/pine-browser-validation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
