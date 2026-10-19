const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const report={browser:browser.version(),platform:process.platform},errors=[];
 for(const quality of ['off','desktop','mobile']){
  console.log('Starting',quality);const page=await browser.newPage({viewport:{width:1280,height:720}});
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning'&&m.text().includes('debris'))errors.push(m.text());});
  await page.route('**/ProceduralDebrisConfig.js',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace("enabled:true,seed:",`enabled:${quality!=='off'},seed:`).replace("quality:'auto'",`quality:'${quality==='off'?'desktop':quality}'`);await route.fulfill({response,body});});
  page.on('console',m=>console.log('browser',m.type(),m.text().slice(0,200)));
  await page.goto('http://127.0.0.1:8001/dirty-sandbox-game/?debrisQA&qa=rally');
  await page.waitForFunction(()=>window.debrisQA&&document.querySelector('#gameLoading').hidden&&window.rallyQA,null,{timeout:120000});
  console.log('Ready',quality);await page.waitForTimeout(1000);report[quality]=await page.evaluate(async()=>{
   const q=debrisQA,s=q.system;const times=[];let last=performance.now(),end=last+3000;
   await new Promise(resolve=>{const frame=now=>{times.push(now-last);last=now;if(now<end)requestAnimationFrame(frame);else resolve();};requestAnimationFrame(frame);});times.shift();times.sort((a,b)=>a-b);
   const result={count:s.records.length,extensionCount:s.records.filter(r=>r.x>330).length,batches:s.group.children.length,drawCalls:q.renderer.info.render.calls,triangles:q.renderer.info.render.triangles,frames:times.length,medianFrameMs:times[Math.floor(times.length*.5)],p95FrameMs:times[Math.floor(times.length*.95)]};
   const {terrainSampler}=await import('./DebrisTerrainSampler.js');const sample=terrainSampler(q.terrain.geometry.attributes.position.array,q.terrain.geometry.index.array);
   result.groundError=Math.max(0,...s.records.map(r=>Math.abs(r.y-sample(r.x,r.z).y-(r.groundOffset??0))));
   const THREE=await import('three'),matrix=new THREE.Matrix4(),vertex=new THREE.Vector3();let penetration=0,maxContactGap=0;
   for(const mesh of s.group.children)for(let instance=0;instance<mesh.count;instance++){mesh.getMatrixAt(instance,matrix);let contact=Infinity;const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++){vertex.fromBufferAttribute(p,i).applyMatrix4(matrix);const ground=sample(vertex.x,vertex.z);const gap=vertex.y-ground.y;penetration=Math.max(penetration,-gap);contact=Math.min(contact,Math.abs(gap));}maxContactGap=Math.max(maxContactGap,contact);}
   result.penetration=penetration;result.maxContactGap=maxContactGap;
   result.routeViolations=s.records.filter(r=>{const n=rallyQA.landscape?.nearest?.(r.x,r.z);return Math.hypot(r.x,r.z)<26+r.radius||Math.abs(r.x-18*Math.sin(r.z*.025))<8+r.radius||n&&n.distance<n.width/2+7+r.radius;}).length;
   rallyQA.choose(2);const controller=rallyQA.controller();let state=controller.update(0,{});const before={...state.position};for(let i=0;i<360;i++)state=controller.update(1/120,{throttle:1,steering:0,brake:false});result.driveDistance=Math.hypot(state.position.x-before.x,state.position.z-before.z);result.finite=Object.values(state.position).every(Number.isFinite);
   if(s.records.length){s.update({x:1e5,y:0,z:1e5});result.culled=s.group.children.every(m=>!m.visible);s.update(q.camera.position);}
   return result;
  });
  if(quality!=='off'){
   report[quality].bumpFeedback=await page.evaluate(async()=>{
    const q=debrisQA,{DebrisBumpField}=await import('./DebrisBumpField.js'),THREE=await import('three');
    rallyQA.controller().resetAt(q.root.position.clone(),0);
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const saved=q.system.bumpField,c=q.contacts.wheels[0],w=c.pivot.userData.wheel,point=new THREE.Vector3(w.x,0,w.z);q.root.localToWorld(point);
    q.system.bumpField=new DebrisBumpField([{x:point.x,z:point.z,rx:2,rz:2,angle:0,height:.4}],q.config.bumps);
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const bump=q.contacts.wheels[0].bump;
    q.config.bumps.enabled=false;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const disabled=q.contacts.wheels.every(c=>c.bump===0);q.config.bumps.enabled=true;q.system.bumpField.dispose();q.system.bumpField=saved;
    return {bump,disabled};
   });
   assert.ok(report[quality].bumpFeedback.bump>0&&report[quality].bumpFeedback.bump<=.049001);assert.ok(report[quality].bumpFeedback.disabled);
  }
  if(quality==='desktop'){
   await page.screenshot({path:'docs/screenshots/procedural-debris.png'});
   const detail=await page.evaluate(async()=>{const THREE=await import('three'),q=debrisQA,preview=new THREE.Scene();preview.background=new THREE.Color(0xcdd7ce);preview.add(new THREE.HemisphereLight(0xffffff,0x766951,3));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(-6,12,8);preview.add(light);let i=0;q.system.asset.traverse(o=>{if(o.isMesh){const clone=o.clone();clone.position.set((i%8-3.5)*2.6,0,(Math.floor(i/8)-1)*3);preview.add(clone);i++;}});const camera=new THREE.PerspectiveCamera(55,1280/720,.1,100);camera.position.set(0,15,17);camera.lookAt(0,0,0);q.renderer.render(preview,camera);return q.renderer.domElement.toDataURL('image/png');});
   fs.writeFileSync('docs/screenshots/procedural-debris-detail.png',Buffer.from(detail.split(',')[1],'base64'));
  }
  const disposal=await page.evaluate(()=>{const s=debrisQA.system,geometries=new Set(),materials=new Set();s.asset?.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);materials.add(o.material);}});let freed=0;for(const resource of [...geometries,...materials])resource.addEventListener('dispose',()=>freed++);s.dispose();s.dispose();return {expected:geometries.size+materials.size,freed,detached:s.group.parent===null,empty:s.records.length===0};});
  assert.equal(disposal.freed,disposal.expected);assert.ok(disposal.detached&&disposal.empty);report[quality].disposal=disposal;
  assert.equal(report[quality].routeViolations,0);assert.ok(report[quality].groundError<1e-7);assert.ok(report[quality].penetration<.0001);assert.ok(report[quality].maxContactGap<.0001);assert.ok(report[quality].driveDistance>1);assert.ok(report[quality].finite);
  if(quality!=='off'){assert.ok(report[quality].count>100);assert.ok(report[quality].extensionCount>100);assert.ok(report[quality].culled);}
  console.log('Measured',quality,JSON.stringify(report[quality]));await page.close();
 }
 assert.ok(report.mobile.count<report.desktop.count);assert.deepEqual(errors,[]);fs.writeFileSync('docs/sdd/features/016-debris-browser-results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
