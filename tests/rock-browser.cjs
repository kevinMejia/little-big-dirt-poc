// Start :8000 and set NODE_PATH to the bundled Playwright package directory.
const {chromium}=require('playwright');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const report={};
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/Rock_Medium_\d.glb/.test(r.url()))requests.push(r.url());});
  await page.addInitScript(()=>{
   window.rockDraws=0;
   for(const type of [WebGLRenderingContext,WebGL2RenderingContext])for(const name of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']){
    const original=type.prototype[name];if(original)type.prototype[name]=function(...args){window.rockDraws++;return original.apply(this,args);};
   }
  });
  const ready=async()=>{await page.goto('http://127.0.0.1:8000/');await page.waitForSelector('#gameLoading',{state:'hidden',timeout:90000});assert.equal(await page.locator('#environmentAssetWarning').count(),0);};
  const measure=()=>page.evaluate(async()=>{
   const times=[],draws=[];let last=performance.now(),end=last+3000,lastDraws=window.rockDraws;
   await new Promise(resolve=>{function frame(now){times.push(now-last);draws.push(window.rockDraws-lastDraws);last=now;lastDraws=window.rockDraws;if(now<end)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
   times.shift();draws.shift();times.sort((a,b)=>a-b);draws.sort((a,b)=>a-b);
   return {medianFrameMs:times[Math.floor(times.length/2)],p95FrameMs:times[Math.floor(times.length*.95)],medianDrawCallsIncludingShadows:draws[Math.floor(draws.length/2)]};
  });
  await page.route('**/EnvironmentWorld.js*',r=>r.fulfill({contentType:'text/javascript',body:execFileSync('git',['show','HEAD:EnvironmentWorld.js'],{encoding:'utf8'})}));
  await ready();report.before=await measure();await page.screenshot({path:'docs/screenshots/rocks-game-before.png'});
  await page.unroute('**/EnvironmentWorld.js*');requests.length=0;await ready();report.after=await measure();await page.screenshot({path:'docs/screenshots/rocks-game-after.png'});
  assert.equal(requests.length,3);assert.equal(new Set(requests).size,3);report.modelNetworkLoads=requests.length;
  await page.keyboard.press('Digit2');await page.waitForTimeout(200);await page.keyboard.press('Digit1');
  await page.goto('http://127.0.0.1:8000/viewer/environment.html');await page.waitForFunction(()=>!document.querySelector('#rockVariant').disabled);
  report.assetsAndInteractions=await page.evaluate(async()=>{
   const THREE=await import('three'),{EnvironmentAssets}=await import('../EnvironmentAssets.js'),{RockVisuals,rockKinds,rockAppearance,rockTemplate}=await import('../RockVisuals.js'),{RockInteractionSystem}=await import('../RockInteractionSystem.js'),{playableVehicleConfig}=await import('../PlayableVehicleSetup.js'),{rockConfig}=await import('../VehicleConfig.js'),{worldAppearance}=await import('../WorldEnvironmentConfig.js');
   const check=(test,message)=>{if(!test)throw new Error(message);};
   const library=new EnvironmentAssets(),models=await Promise.all(rockKinds.map(k=>library.load(k))),materials=new Set(),maps=new Set(),geometries=new Set(),sizes=[];
   for(const model of models){
    model.traverse(o=>{if(o.isMesh){check(!!o.material.map&&!!o.geometry.attributes.uv,'original diffuse texture and UVs required');materials.add(o.material);maps.add(o.material.map);geometries.add(o.geometry);}});
    const box=new THREE.Box3().setFromObject(model);check(Math.abs(box.min.y)<1e-6,'GLB base pivot');sizes.push(box.getSize(new THREE.Vector3()).toArray());
   }
   check(materials.size===1&&maps.size===1&&geometries.size===3,'shared resources');
   check(JSON.stringify(rockAppearance(12,34))===JSON.stringify(rockAppearance(12,34)),'deterministic appearance');
   const configsBefore=JSON.stringify(rockConfig),cases=[];
   for(let vehicle=0;vehicle<2;vehicle++)for(let variant=0;variant<3;variant++){
    const scene=new THREE.Scene(),system=new RockInteractionSystem(scene),state=system.addRock(0,10,1),config=playableVehicleConfig(vehicle);
    const visuals=await RockVisuals.connect(scene,library,system,{previewVariant:variant}),record=visuals.rockRecords[0],originalAppearance=JSON.stringify(record.appearance);
    check(Math.abs(new THREE.Box3().setFromObject(record.clone).min.y+state.r*worldAppearance.rockGroundInset)<1e-6,'visible rock terrain seating');
    const speed=config.max*config.hill.rockCrackSpeedPercent/100*1.02,settings={baseMaxSpeed:config.max,...config.hill};
    const drive=()=>{const p=new THREE.Vector3();for(let n=0;n<1500;n++){const old=p.z;p.z+=speed*.01;system.resolveMovement(p,p.x,old,0,speed,.01,config.collision,settings);visuals.update();if(state.lastHit===system.time)return;system.update(.01);}throw new Error('No vehicle contact');};
    drive();check(state.state==='CRACKED'&&record.clone.visible&&record.damage.visible,'cracked rock retains supplied model');
    system.update(system.config.hitCooldownSeconds+.01);drive();check(state.state==='BROKEN'&&!record.clone.visible&&!state.group.visible,'break hides correct rock');
    const pieces=system.fragments.filter(f=>f.active);check(pieces.length===system.config.fragmentCount,'configured fragment count');
    const p=new THREE.Vector3(0,0,10);system.resolveMovement(p,0,9.9,0,10,.01,config.collision,settings);check(p.z===10,'no invisible broken-rock collider');
    const positions=pieces.map(f=>f.mesh.position.clone());
    for(let n=0;n<40;n++){system.update(1/60);visuals.update();}
    check(pieces.some((f,i)=>f.mesh.position.distanceTo(positions[i])>.1),'fragments scatter');
    system.setVehicles([{position:new THREE.Vector3(0,0,10),heading:0,bounds:config.collision}]);
    for(let n=0;n<1000;n++){system.update(1/60);visuals.update();}
    check(state.state==='BROKEN'&&pieces.every(f=>!f.active&&!f.mesh.visible),'debris expires; occupied spawn waits');
    system.setVehicles([]);for(let n=0;n<120;n++){system.update(1/60);visuals.update();}
    check(state.state==='INTACT'&&JSON.stringify(record.appearance)===originalAppearance,'same appearance returns after respawn');
    check(system.fragments.length===rockConfig.maxFragments,'pool remains bounded');
    cases.push({vehicle:vehicle?'Stinky':'Dirty',variant:rockKinds[variant],crack:true,break:true,scatter:true,expire:true,safeRespawn:true});visuals.dispose();system.dispose();
   }
   check(JSON.stringify(rockConfig)===configsBefore,'physics defaults unchanged');await library.dispose();
   return {materials:materials.size,textures:maps.size,geometries:geometries.size,sizes,cases};
  });
  await page.locator('main > aside').evaluate(e=>e.scrollTop=e.scrollHeight);await page.click('[data-view=rock]');
  for(let i=0;i<3;i++){await page.selectOption('#rockVariant',String(i));await page.waitForFunction(()=>!document.querySelector('#rockVariant').disabled);await page.waitForTimeout(150);await page.screenshot({path:`docs/screenshots/rock-medium-${i+1}.png`});}
  await page.click('[data-action=crack]');await page.waitForTimeout(250);await page.screenshot({path:'docs/screenshots/rock-cracked.png'});
  await page.click('[data-action=shatter]');await page.waitForTimeout(300);await page.screenshot({path:'docs/screenshots/rock-breaking.png'});
  await page.click('[data-action=respawn]');await page.waitForFunction(()=>document.querySelector('#rockState').textContent==='Rock: intact');await page.screenshot({path:'docs/screenshots/rock-restored.png'});
  report.layouts=[];
  for(const [width,height] of [[1440,900],[390,844],[844,390]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(150);
   const stage=page.locator('#stage'),before=await stage.boundingBox();await page.locator('main > aside').evaluate(e=>e.scrollTop=200);assert.deepEqual(await stage.boundingBox(),before);assert(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1));report.layouts.push({width,height,fixedPreview:true});
   if(width===390)await page.screenshot({path:'docs/screenshots/rocks-workshop-mobile.png'});
  }
  assert.deepEqual(errors,[]);report.errors=errors;
  fs.writeFileSync('docs/rock-browser-validation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
