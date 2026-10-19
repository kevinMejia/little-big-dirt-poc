const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  console.log('Browser:',browser.version());
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   const key='little-big-dirt:preferences:/';
   if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({physicsMode:'original',touchControls:true,showDrivingHud:true}));
  });
  await page.goto('http://127.0.0.1:8000/index.html?qa=rally-car');
  const ready=()=>page.waitForFunction(()=>window.rallyCarQA&&document.querySelector('#gameLoading').hidden,{timeout:90000});
  await ready();
  assert.equal(await page.locator('#physicsMode').count(),0);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('little-big-dirt:preferences:/')));
  assert.equal(saved.physicsMode,'rapier');assert.equal(saved.touchControls,true);assert.equal(saved.showDrivingHud,true);
  for(const [key,index] of [['Digit1',0],['Digit2',1],['Digit3',2]]){
   await page.keyboard.press(key);await page.keyboard.down('KeyW');await page.waitForTimeout(700);await page.keyboard.up('KeyW');
   const state=await page.evaluate(()=>rallyCarQA.read());assert.equal(state.index,index);assert(state.speed>1);
   await page.keyboard.press('KeyR');assert(Math.abs((await page.evaluate(()=>rallyCarQA.read())).speed)<.1);
  }
  await page.reload();await ready();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('little-big-dirt:preferences:/')).physicsMode),'rapier');
  assert.deepEqual(errors,[]);
  const failed=await browser.newPage();let blocked=true;
  await failed.route('**/viewer/vendor/rapier/rapier.mjs',route=>blocked?route.abort():route.continue());
  await failed.goto('http://127.0.0.1:8000/index.html?qa=rally-car');
  await failed.waitForFunction(()=>document.querySelector('#gameLoading').dataset.phase==='physics-error',{timeout:90000});
  assert(await failed.locator('#gameLoading').isVisible());assert(await failed.locator('#loadingRetry').isVisible());
  assert.equal(await failed.evaluate(()=>typeof window.rallyCarQA),'undefined','game never starts on an older fallback');
  blocked=false;await failed.locator('#loadingRetry').click();
  await failed.waitForFunction(()=>window.rallyCarQA&&document.querySelector('#gameLoading').hidden,{timeout:90000});
  console.log('PASS: saved Original migrates without losing display/touch preferences; all vehicles drive/switch/reset; reload preserves Hybrid; failed physics stays blocked and reload recovers.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
