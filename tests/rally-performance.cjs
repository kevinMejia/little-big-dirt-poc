const {chromium}=require('playwright'),fs=require('node:fs');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),results=[];
 const measure=()=>page.evaluate(()=>new Promise(resolve=>{let first,n=0;function frame(t){first??=t;if(++n===120){const r=window.rallyQA?.read()??window.audiQA.read();resolve({fps:119000/(t-first),calls:r.calls,triangles:r.triangles,memory:r.memory,course:window.rallyQA?{length:rallyQA.track.length,accessLength:rallyQA.access.length,elevationRange:Math.max(...rallyQA.track.samples.map(s=>s.y))-Math.min(...rallyQA.track.samples.map(s=>s.y)),triangles:rallyQA.surface.indices.length/3}:undefined});}else requestAnimationFrame(frame);}requestAnimationFrame(frame);}));
 for(const disabled of [true,false]){
  const start=Date.now();await page.goto('http://127.0.0.1:8000/?qa='+(disabled?'audi&noRally=1':'rally'));await page.waitForFunction(()=>document.querySelector('#gameLoading').hidden&&!document.querySelector('#audiBtn').disabled,null,{timeout:120000});const startupMs=Date.now()-start;
  await page.keyboard.press('Digit3');await page.waitForTimeout(1500);results.push({region:disabled?'sandbox baseline':'sandbox expanded',startupMs,...await measure()});
  if(!disabled){await page.evaluate(()=>rallyQA.place(.28));await page.waitForTimeout(1500);results.push({region:'rally uphill',...await measure()});}
 }
 const report={date:new Date().toISOString(),browser:'Edge headless WebGL',viewport:'1280x800',frames:120,results};console.log(JSON.stringify(report,null,2));fs.writeFileSync('docs/rally-performance.json',JSON.stringify(report,null,2)+'\n');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
