const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage({viewport:{width:1400,height:900}}),errors=[],assets=[];p.on('pageerror',e=>{errors.push(e.message);console.log('Page error:',e.message);});p.on('response',r=>{if(r.url().endsWith('audi_rs_q_e-tron_dakar.glb'))assets.push(r.status());});
 await p.goto('http://127.0.0.1:8000/?qa=rally');await p.waitForFunction(()=>window.rallyQA&&document.querySelector('#gameLoading').hidden&&!document.querySelector('#audiBtn').disabled,null,{timeout:120000});
 console.log('Game ready');await p.locator('#vehicleControlsToggle').click();await p.locator('#vehicleSelect').selectOption('2');await p.locator('#vehicleControlsToggle').click();
 assert.equal(await p.evaluate(()=>rallyQA.read().index),2);await p.keyboard.down('KeyW');await p.waitForTimeout(1500);await p.keyboard.up('KeyW');const acceleration=await p.evaluate(()=>rallyQA.read());assert(acceleration.speed>15);
 await p.keyboard.down('KeyA');await p.keyboard.down('KeyW');await p.waitForTimeout(350);await p.keyboard.up('KeyA');await p.keyboard.up('KeyW');
 const wheels=await p.evaluate(()=>rallyQA.controller().vehicle.userData.controller.wheels.map(w=>({front:w.front,spin:w.spin.rotation.x,steer:w.steering.rotation.y})));assert(wheels.some(w=>Math.abs(w.spin)>1));assert(wheels.filter(w=>w.front).every(w=>Math.abs(w.steer)>.02));
 await p.keyboard.down('Space');await p.waitForTimeout(1400);await p.keyboard.up('Space');assert(Math.abs((await p.evaluate(()=>rallyQA.read())).speed)<acceleration.speed);
 await p.evaluate(()=>rallyQA.place(0));await p.keyboard.down('KeyS');await p.waitForTimeout(1000);await p.keyboard.up('KeyS');assert((await p.evaluate(()=>rallyQA.read())).speed< -2);
 await p.evaluate(()=>rallyQA.place(.25));await p.waitForTimeout(1300);await p.screenshot({path:'docs/screenshots/audi-dakar-game-desktop.png'});
 for(const index of [0,1,2]){await p.evaluate(i=>{rallyQA.choose(i);rallyQA.place(0);},index);await p.keyboard.down('KeyW');await p.waitForTimeout(400);await p.keyboard.up('KeyW');assert((await p.evaluate(()=>rallyQA.read())).speed>1);}
 await p.setViewportSize({width:390,height:844});await p.evaluate(()=>rallyQA.place(.25));await p.waitForTimeout(1000);await p.screenshot({path:'docs/screenshots/audi-dakar-game-phone.png'});
 assert(assets.includes(200));assert.deepEqual(errors,[]);const result={assets,acceleration:acceleration.speed,wheels,errors,desktop:[1400,900],phone:[390,844]};fs.writeFileSync('docs/audi-dakar-game-validation.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
