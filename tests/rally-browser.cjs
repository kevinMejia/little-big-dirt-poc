const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1400,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.location().url.endsWith('/favicon.ico'))errors.push(m.text());});
 const started=Date.now();await page.goto('http://127.0.0.1:8000/?qa=rally');await page.waitForFunction(()=>window.rallyQA&&document.querySelector('#gameLoading').hidden&&!document.querySelector('#rallyCarBtn').disabled,null,{timeout:120000});
 console.log('Startup ms',Date.now()-started);
 const runs=await page.evaluate(()=>{
  const runs=[];
  for(const index of [0,1,2])for(const access of [false,true]){
   rallyQA.choose(index);rallyQA.place(0,access);const game=rallyQA.controller(),path=access?rallyQA.access:rallyQA.track;let state=game.update(0,{}),progress=0,lastU=0,maxError=0,maxAir=0,air=0,complete=false;
   for(let step=0;step<24000;step++){
    const n=path.nearest(state.position.x,state.position.z),u=n?.u??lastU,advance=u-lastU;if(Math.abs(advance)<.1)progress+=advance;lastU=u;
    const look=path.at(access?Math.min(1,u+5/path.length):(u+5/path.length)%1),far=path.at(access?Math.min(1,u+12/path.length):(u+12/path.length)%1),here=path.at(u);
    const bend=Math.abs(Math.atan2(here.tx*far.tz-here.tz*far.tx,here.tx*far.tx+here.tz*far.tz))/12,target=Math.min(index===2?18:12,Math.sqrt(2.2/Math.max(.003,bend))),heading=Math.atan2(look.x-state.position.x,look.z-state.position.z),error=Math.atan2(Math.sin(heading-state.heading),Math.cos(heading-state.heading));
    const steering=Math.max(-1,Math.min(1,-error*2.8));
    state=game.update(1/120,{throttle:state.speed<target?1:0,steering,brake:state.speed>target+1});
    const edge=(n?.distance??100)-(n?.width??12)/2;maxError=Math.max(maxError,edge);air=state.airborne?air+1/120:0;maxAir=Math.max(maxAir,air);
    if(!Object.values(state.position).every(Number.isFinite))throw new Error('Non-finite driving pose');
    if((access&&u>.998)||(!access&&progress>1.015)){complete=true;break;}
   }
   runs.push({index,access,complete,progress,maxError,maxAir});
  }
  return runs;
 },null,{timeout:120000});
 console.log('Driving',JSON.stringify(runs));for(const r of runs){assert(r.complete,JSON.stringify(r));assert(r.maxError<2,'stay within road plus shoulder');assert(r.maxAir<1,'no seam launches');}
 await page.keyboard.press('Digit3');
 for(const mode of ['original','rapier']){
  await page.locator('#vehicleControlsToggle').click();await page.locator('#physicsMode').selectOption(mode);await page.waitForTimeout(500);await page.locator('#vehicleControlsToggle').click();
  await page.evaluate(()=>rallyQA.place(.1,true));await page.keyboard.down('KeyW');await page.waitForTimeout(2300);await page.keyboard.up('KeyW');
  const gate=await page.evaluate(()=>rallyQA.read());assert(gate.position.x>330&&gate.speed>0&&!gate.airborne,mode+' access boundary '+JSON.stringify(gate));
 }
 await page.keyboard.press('Digit3');await page.evaluate(()=>rallyQA.place(.3));await page.waitForTimeout(1500);await page.screenshot({path:'docs/screenshots/rally-uphill.png'});
 await page.evaluate(()=>rallyQA.place(.49));await page.waitForTimeout(1500);await page.screenshot({path:'docs/screenshots/rally-downhill.png'});
 await page.evaluate(()=>{window.rallyAerial=true;const frame=()=>{if(window.rallyAerial){rallyQA.aerial();requestAnimationFrame(frame);}};frame();});await page.waitForTimeout(500);await page.screenshot({path:'docs/screenshots/rally-aerial.png'});
 await page.locator('#vehicleControlsToggle').click();await page.getByRole('button',{name:'Track debug',exact:true}).click();await page.waitForTimeout(300);assert(await page.locator('[aria-pressed="true"]').count()>0);await page.screenshot({path:'docs/screenshots/rally-debug.png'});await page.getByRole('button',{name:'Track debug',exact:true}).click();await page.locator('#vehicleControlsToggle').click();await page.evaluate(()=>{window.rallyAerial=false;});
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>rallyQA.place(0));await page.waitForTimeout(1300);await page.locator('#vehicleControlsToggle').click();await page.screenshot({path:'docs/screenshots/rally-phone.png'});
 console.log('errors',errors);assert.deepEqual(errors,[]);fs.writeFileSync('docs/rally-validation.json',JSON.stringify({runs,errors,keyboardAccessModes:['original','rapier'],desktop:[1400,900],phone:[390,844]},null,2)+'\n');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
