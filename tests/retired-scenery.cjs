// Browser smoke check. NODE_PATH must include Playwright; installed Edge is used.
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  // Read-only scene instrumentation in the test response, never in production.
  await page.route('**/index.html*',async route=>{
   const source=fs.readFileSync('index.html','utf8');
   const probe=`window.sceneryCheck=()=>({
    debris:groundDebris.objects.length,grid:groundDebris.grid.size,
    meshes:groundDebris.group.children.length,
    details:groundDetails.group.children.map(o=>({name:o.name,count:o.count})),
    trees:treeCollisions.trees.length,rocks:rockInteractions.rocks.length,
    wheels:debrisContacts.wheels.length,bump:groundDebris.getHeightAt(20,20),
    position:vehicleRoot.position.toArray(),environment:!!environmentWorld
   });`;
   assert(source.includes('}animate();'));
   await route.fulfill({contentType:'text/html',body:source.replace('}animate();','}animate();'+probe)});
  });
  await page.goto('http://127.0.0.1:8000/index.html?scenery-cleanup-check=1');
  await page.waitForFunction(()=>window.sceneryCheck?.().wheels>0,{timeout:60000});
  const check=async()=>{
   const state=await page.evaluate(()=>window.sceneryCheck());
   assert.equal(state.debris,0);assert.equal(state.grid,0);assert.equal(state.meshes,0);assert.equal(state.bump,0);
   assert(state.details.length>0 && state.details.every(o=>o.name==='Instanced flowers'));
   assert(state.details.some(o=>o.count>0),'flowers remain');
   assert(state.trees>0 && state.rocks>0 && state.environment,'Blender trees and breakable rocks remain');
   assert(state.position.every(Number.isFinite));
   return state;
  };
  const before=await check();
  await page.evaluate(async()=>{
   const {groundDebrisConfig}=await import('/VehicleConfig.js');
   groundDebrisConfig.enabled=true;
   dispatchEvent(new CustomEvent('lbd:tuning-change',{detail:{paths:['groundDebrisConfig.enabled']}}));
  });
  await page.keyboard.down('w');await page.waitForTimeout(1500);await page.keyboard.up('w');
  const after=await check();assert.notDeepEqual(after.position,before.position,'vehicle still drives');
  assert.deepEqual(errors,[]);
  await page.screenshot({path:'docs/screenshots/retired-ground-scenery.png'});
  console.log('PASS main world: no debris meshes/placements/bump grid; flowers, trees, breakable rocks retained; tuning cannot restore placeholders; driving works.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
