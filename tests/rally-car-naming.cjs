const {chromium}=require('playwright'),assert=require('node:assert/strict');
const base=(process.env.BASE_URL||'http://127.0.0.1:8000/').replace(/\/?$/,'/');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
   if(!sessionStorage.getItem('rename-fixture')){
    const path=new URL('.',location.href).pathname;
    localStorage.setItem('little-big-dirt:tuning:'+path,JSON.stringify({version:1,overrides:{'audiTuning.handling.acceleration':31,'audioConfig.sounds.audi-electric.volume':23,'audioConfig.sounds.audi-tires.enabled':false}}));
    sessionStorage.setItem('rename-fixture','1');
   }
  });
  await page.goto(base+'?qa=audi');
  await page.waitForFunction(()=>window.rallyCarQA&&document.querySelector('#gameLoading').hidden&&!document.querySelector('#vehicleSelect option[value="2"]').disabled,null,{timeout:120000});
  assert.equal(await page.locator('#vehicleSelect option[value="2"]').textContent(),'Rally Car');
  assert(await page.evaluate(()=>rallyCarQA===audiQA),'old QA URL and object still work');
  const migrated=await page.evaluate(async()=>{
   const store=await import('./TuningStore.js'),current=await import('./RallyCarConfig.js'),legacy=await import('./AudiConfig.js');
   return {acceleration:current.rallyCarConfig().handling.acceleration,volume:store.tuningValue('audioConfig.sounds.rally-car-electric.volume'),enabled:store.tuningValue('audioConfig.sounds.rally-car-tires.enabled'),same:legacy.audiTuning===current.rallyCarTuning};
  });
  assert.deepEqual(migrated,{acceleration:31,volume:23,enabled:false,same:true});
  await page.keyboard.press('Digit3');await page.keyboard.down('KeyW');await page.waitForTimeout(1200);await page.keyboard.up('KeyW');
  assert.equal(await page.locator('#vehicleName').textContent(),'Rally Car');
  const sound=await page.evaluate(async()=>{const a=(await import('./GameAudio.js')).getGameAudio();return {electric:a.loops.has('rally-car-electric'),tires:a.loops.has('rally-car-tires')};});
  assert.deepEqual(sound,{electric:true,tires:false},'renamed voices preserve saved volume/mute behavior');
  await page.evaluate(async()=>(await import('./SettingsPanel.js')).openSettingsPanel());
  await page.getByLabel('Tune vehicle',{exact:true}).selectOption('rally-car');
  assert.equal(await page.getByLabel('Acceleration value',{exact:true}).inputValue(),'31');
  assert(await page.getByRole('button',{name:'Export RallyCarConfig.js',exact:true}).isVisible());
  assert(await page.getByText('Rally Car electric drivetrain',{exact:true}).count());
  await page.getByLabel('Acceleration value',{exact:true}).fill('32');await page.getByLabel('Acceleration value',{exact:true}).press('Tab');
  assert(await page.evaluate(()=>!Object.keys(JSON.parse(localStorage.getItem('little-big-dirt:tuning:'+new URL('.',location.href).pathname)).overrides).some(k=>k.startsWith('audiTuning.')||k.startsWith('audioConfig.sounds.audi-'))));
  await page.goto(base+'viewer/audi-dakar.html?legacy=1#side');
  await page.waitForURL('**/viewer/rally-car-dakar.html?legacy=1#side');
  await page.waitForFunction(()=>window.rallyCarDakarQA,null,{timeout:120000});
  assert.equal(await page.locator('h1').textContent(),'Rally Car · Dakar livery');
  assert(await page.evaluate(()=>rallyCarDakarQA===audiDakarQA));
  assert.deepEqual(errors,[]);
  console.log('PASS Rally Car naming, real saved-settings migration, canonical save/export, live voices, legacy module/QA/viewer URLs and comparison loading at '+base);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
