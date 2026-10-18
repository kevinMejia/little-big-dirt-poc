// Run local server :8000; NODE_PATH should point to bundled Playwright packages.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const report={};
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],audioRequests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/audio-candidates/'))audioRequests.push(r.url());});
  await page.goto('http://127.0.0.1:8000/');await page.waitForSelector('#gameLoading',{state:'hidden',timeout:90000});
  assert.equal(audioRequests.length,0,'Play loads audio only after a user gesture');
  await page.goto('http://127.0.0.1:8000/viewer/audio.html');await page.waitForSelector('.candidate');
  assert.equal(await page.locator('.candidate').count(),23);assert.equal(audioRequests.filter(u=>u.endsWith('.m4a')).length,0,'audio loads only after audition');
  await page.click('#play');await page.waitForFunction(()=>document.querySelector('#playbackStatus').textContent.startsWith('Playing'));
  await page.click('#stop');
  report.audio=await page.evaluate(async()=>{
   const {AudioPreview}=await import('./AudioPreview.js');const manifest=await (await fetch('../assets/audio-candidates/manifest.json')).json();
   if(!manifest.integrated||manifest.candidates.some(c=>!c.approved))throw new Error('Approved library metadata mismatch');
   const p=new AudioPreview(manifest.candidates),ids=new WeakMap(),starts=[];await p.unlock();
   for(const entry of manifest.candidates){
    const buffer=await p.buffer(entry.id);ids.set(buffer,entry.id);
    if(await p.buffer(entry.id)!==buffer)throw new Error('Duplicate buffer');
    if(Math.abs(buffer.duration-entry.duration)>.08)throw new Error('Duration mismatch '+entry.id);
    let peak=0;const values=buffer.getChannelData(0);for(const sample of values){if(!Number.isFinite(sample))throw new Error('Invalid audio sample');peak=Math.max(peak,Math.abs(sample));}
    if(peak>.99)throw new Error('Clipped audition: '+entry.id);
   }
   const original=AudioBufferSourceNode.prototype.start;
   AudioBufferSourceNode.prototype.start=function(...args){starts.push({id:ids.get(this.buffer),loop:this.loop});return original.apply(this,args);};
   const wait=ms=>new Promise(r=>setTimeout(r,ms));
   try{
    await p.play('dirty-diesel',{speed:0});const idle=p.engineSource.playbackRate.value;p.setEngineSpeed(1);await wait(650);const fast=p.engineSource.playbackRate.value;
    if(!(fast>idle+.4))throw new Error('Engine pitch does not respond');
    p.setEngineVolume('dirty',.2);await wait(400);if(!(p.engineGain.gain.value<.2))throw new Error('Individual engine volume');
    p.setMuted(true);await wait(200);if(p.output.gain.value>.001)throw new Error('Mute failed');p.setMuted(false);
    const count=starts.length;await p.play('stinky-diesel',{driveDemo:true});await wait(200);if(starts.length!==count+1||!starts.at(-1).loop)throw new Error('Engine restarted or not looping');
    p.stop();await wait(100);if(p.voices.size)throw new Error('Stop did not clear voices');
    const sequenceStart=starts.length;await p.sequence('cannon');const cannon=starts.slice(sequenceStart);if(cannon.filter(c=>c.id==='cannon-boom').length!==1||cannon.length!==3)throw new Error('Launch demo must schedule exactly one boom');
    p.stop();await wait(100);if(p.voices.size)throw new Error('Scheduled sequence not canceled');
    p.enginesEnabled=false;let rejected=false;try{await p.play('dirty-diesel');}catch{rejected=true;}if(!rejected)throw new Error('Engine disable failed');
    return {decoded:p.buffers.size,cached:true,distinctEngineBuffers:await p.buffer('dirty-diesel')!==await p.buffer('stinky-diesel'),idleRate:idle,fastRate:fast,oneEngineSourcePerDemo:true,cannonBoomsPerDemo:1,stopCancelsScheduledVoices:true,approved:true};
   }finally{AudioBufferSourceNode.prototype.start=original;p.dispose();}
  });
  await page.selectOption('#group','Trees');assert.equal(await page.locator('.candidate').count(),6);
  await page.click('[data-listen="wood-crack-a"]');await page.waitForFunction(()=>document.querySelector('#candidateTitle').textContent.includes('crack A'));
  await page.click('#stop');
  await page.locator('.candidate input[type=checkbox]').first().check();const downloadPromise=page.waitForEvent('download');await page.click('#exportReview');const download=await downloadPromise;const content=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.equal(content.approved,false);assert.equal(content.integrated,false);assert.equal(content.selectedCandidates.length,1);
  await page.selectOption('#group','');
  report.layouts=[];
  for(const [name,width,height] of [['desktop',1440,900],['portrait',390,844],['landscape',844,390]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(100);
   const stage=page.locator('#stage'),bounds=await stage.boundingBox();await page.locator('main > aside').evaluate(e=>e.scrollTop=500);assert.deepEqual(await stage.boundingBox(),bounds,'library scroll keeps player fixed');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.documentElement.scrollHeight<=innerHeight+1),'no page overflow');
   await page.locator('main > aside').evaluate(e=>e.scrollTop=0);await page.screenshot({path:`docs/screenshots/audio-auditions-${name}.png`});report.layouts.push({name,width,height,fixedPlayer:true});
  }
  assert.deepEqual(errors,[]);report.errors=errors;
  fs.writeFileSync('docs/audio-auditions-validation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
