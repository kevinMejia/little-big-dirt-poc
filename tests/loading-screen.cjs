const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 let release;const gate=new Promise(resolve=>release=resolve);
 await page.route('**/MainWorldRamps.js',async route=>{await gate;await route.continue();});
 await page.goto('http://127.0.0.1:8000/index.html?loader-check=1',{waitUntil:'commit'});
 await page.locator('#gameLoading').waitFor({state:'visible'});
 const gear=page.locator('.gear-spinner');
 const before=await gear.evaluate(e=>getComputedStyle(e).transform);
 await page.waitForTimeout(200);
 assert.notEqual(await gear.evaluate(e=>getComputedStyle(e).transform),before,'gear rotates');
 await page.screenshot({path:'docs/screenshots/loading-portrait.png'});
 await page.setViewportSize({width:844,height:390});
 await page.screenshot({path:'docs/screenshots/loading-landscape.png'});
 release();
 await page.locator('#gameLoading').waitFor({state:'hidden',timeout:60000});
 assert.equal(await page.locator('#loadingRetry').isVisible(),false);
 console.log('PASS: first-paint loader, rotating gear, portrait/landscape, hides when rendered world and physics are ready.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

