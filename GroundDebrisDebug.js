import * as THREE from 'three';
// Opt in via ?debrisDebug=1. No elements, render objects or work in ordinary play.
export function createDebrisDebug(scene,debris,contacts){
 if(!new URLSearchParams(location.search).has('debrisDebug'))return null;
 const panel=document.createElement('details');panel.open=true;panel.style.cssText='position:fixed;right:8px;top:145px;z-index:20;padding:10px;background:#183c39ee;color:white;font:12px monospace;max-height:60vh;overflow:auto';panel.innerHTML='<summary>Ground debris tuning</summary>';document.body.append(panel);
 for(const [key,min,max,step] of [['enabled',0,1,1],['densityPercent',0,100,1],['interactivePercent',0,100,1],['maxBumpHeight',.05,.5,.01],['suspensionEffectPercent',0,100,1]]){
  const label=document.createElement('label');label.style.display='block';label.textContent=key+' ';const input=document.createElement('input');input.type=key==='enabled'?'checkbox':'range';input.min=min;input.max=max;input.step=step;input.value=debris.config[key];input.checked=debris.config[key];label.append(input);panel.append(label);
  input.addEventListener('change',()=>{debris.config[key]=key==='enabled'?input.checked:Number(input.value);if(key!=='suspensionEffectPercent')debris.regenerate();});
 }
 const toggle=document.createElement('button');toggle.textContent='Toggle footprints';toggle.onclick=()=>debris.showFootprints(!debris.footprints);panel.append(toggle);
 const regen=document.createElement('button');regen.textContent='Regenerate';regen.onclick=()=>debris.regenerate();panel.append(regen);
 const readout=document.createElement('pre');panel.append(readout);
 const markers=new THREE.InstancedMesh(new THREE.SphereGeometry(.075,6,4),new THREE.MeshBasicMaterial({color:0xff4477,depthTest:false}),6);markers.frustumCulled=false;markers.renderOrder=20;scene.add(markers);const dummy=new THREE.Object3D();let elapsed=0;
 return {update(dt,root,feedback){
  markers.count=contacts.wheels.length;contacts.wheels.forEach((c,i)=>{const w=c.pivot.userData.wheel;dummy.position.set(w.x,0,w.z);root.localToWorld(dummy.position);dummy.position.y=debris.height(dummy.position.x,dummy.position.z)+c.bump+.08;dummy.updateMatrix();markers.setMatrixAt(i,dummy.matrix);});markers.instanceMatrix.needsUpdate=true;
  elapsed+=dt;if(elapsed<.15)return;elapsed=0;
  readout.textContent=contacts.wheels.map((c,i)=>`Wheel ${i+1}: bump ${c.bump.toFixed(3)}m comp ${c.compression.toFixed(3)}m`).join('\n')+`\nPitch ${(feedback.pitch.value*180/Math.PI).toFixed(2)} Roll ${(feedback.roll.value*180/Math.PI).toFixed(2)}\n${debris.objects.length} fixed details`;
 },dispose(){panel.remove();markers.removeFromParent();markers.geometry.dispose();markers.material.dispose();markers.dispose();}};
}
