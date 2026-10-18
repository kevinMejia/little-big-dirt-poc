// Mobile startup regressions with deliberately blocked resume and a transient download failure.
const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));let attempts=0;
 await page.route('**/dirty-diesel.m4a',route=>++attempts===1?route.fulfill({status:503,body:'retry'}):route.continue());
 await page.goto('http://127.0.0.1:8000/viewer/audio.html');
 await page.evaluate(async()=>{
  const {GameAudio}=await import('../GameAudio.js');const native=AudioContext.prototype.resume;
  // Safari can leave resume pending. Downloads must still start and later gestures retry.
  AudioContext.prototype.resume=function(){native.call(this).catch(()=>{});return new Promise(()=>{});};
  const a=window.startupQA=new GameAudio();let active=0;a.maxLoads=0;const load=a.load.bind(a);
  a.load=async id=>{active++;a.maxLoads=Math.max(active,a.maxLoads);try{return await load(id);}finally{active--;}};
  const target=document.createElement('button');target.id='touch-startup';target.textContent='Start audio';target.style='position:fixed;top:0;left:0;z-index:99999;width:180px;height:80px';
  for(const event of ['pointerdown','pointerup','touchend'])target.addEventListener(event,e=>e.stopPropagation());document.body.append(target);
 });
 await page.locator('#touch-startup').tap();await page.waitForFunction(()=>startupQA.buffers.size===22&&!startupQA.preloaded);
 assert.equal(await page.evaluate(()=>startupQA.maxLoads),4,'limit concurrent decode/load work');
 await page.locator('#touch-startup').tap();await page.waitForFunction(()=>startupQA.buffers.size===23&&!startupQA.preloaded);assert.equal(attempts,2,'retry failed clip on next gesture');
 const state=await page.evaluate(async()=>{const a=startupQA;a.engine(0,0,25,false);const buffer=a.buffers.get('dirty-diesel');a.stopAll(true);await a.context.suspend();return {voices:a.voices.size,loops:a.loops.size,same:a.buffers.get('dirty-diesel')===buffer};});assert.deepEqual(state,{voices:0,loops:0,same:true});
 await page.locator('#touch-startup').tap();await page.waitForFunction(()=>startupQA.context.state==='running');
 await page.evaluate(()=>startupQA.engine(0,0,25,false));assert(await page.evaluate(()=>startupQA.loops.has('dirty-diesel')));
 assert.deepEqual(errors,[]);console.log('PASS: captured mobile touch unlock, pending resume does not block preload, four concurrent loads, failed clip retry, immediate suspension cleanup, gesture resume with cached engines.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
