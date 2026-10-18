import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from '../three-test.mjs';
import {createStorybookTransition,createStorybookBackground} from '../StorybookBackground.js';
import {storybookBackgroundConfig as config} from '../StorybookBackgroundConfig.js';
import {isStorybookEnabled,isStorybookPreview} from '../StorybookPreviewMode.js';
assert.equal(isStorybookEnabled(''),true);assert.equal(isStorybookEnabled('?storybook=0'),false);assert.equal(isStorybookEnabled('?storybook=1'),true);assert.equal(isStorybookPreview(''),false);assert.equal(isStorybookPreview('?storybook=0'),false);assert.equal(isStorybookPreview('?storybook=1'),true);
const height=(x,z)=>4*Math.sin(x*.02)*Math.cos(z*.03),painter={sampleColor:(x,z,target)=>target.set('#79a956')};
for(const scale of [.75,1,1.5]){
 const geometry=createStorybookTransition(height,painter,220,scale),p=geometry.attributes.position;
 assert(geometry.index.count/3<11000,'bounded horizon mesh');
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  assert([x,y,z].every(Number.isFinite));assert(Math.max(Math.abs(x),Math.abs(z))>=220-.001,'background geometry never enters playable terrain');
  if(i<512)assert(Math.abs(y-height(x,z))<.00001,'inner edge matches original terrain at every scale');
 }
 assert([...geometry.attributes.normal.array].every(Number.isFinite));geometry.dispose();
}
let textureDisposals=0;const load=THREE.TextureLoader.prototype.loadAsync;
THREE.TextureLoader.prototype.loadAsync=async function(url){assert(url.includes('/assets/backgrounds/storybook-v1/'));const texture=new THREE.Texture();texture.addEventListener('dispose',()=>textureDisposals++);return texture;};
const scene=new THREE.Scene(),original={group:new THREE.Group()},camera=new THREE.PerspectiveCamera(66,1,.1,600),fog=new THREE.Fog('#c6dfdc',350,9000);scene.fog=fog;scene.background=new THREE.Color('#b5e1ee');scene.add(original.group);
const defaults={...config};
try{
 const preview=await createStorybookBackground(scene,{height,painter,halfSize:220,camera,original});
 assert.equal(original.group.visible,false);assert.equal(scene.fog,null,'no foreground fog');assert.equal(camera.far,2200);
 camera.position.set(100,25,60);preview.update(1/60);assert.deepEqual(preview.sky.position,camera.position,'sky follows camera without moving terrain');
 config.brightness=.8;config.skyTint='#aabbcc';config.cloudSpeed=0;config.mountainsVisible=false;preview.update(1/60);
 assert.equal(preview.sky.material.uniforms.brightness.value,.8);assert.equal(preview.sky.material.uniforms.cloudOffset.value,0);assert.equal(preview.transition.visible,false);
 let oldDisposed=false;preview.transition.geometry.addEventListener('dispose',()=>oldDisposed=true);config.backgroundScale=1.5;preview.update(1/60);assert(oldDisposed,'scale replaces and disposes only distant geometry');
 preview.setEnabled(false);assert.equal(original.group.visible,true);assert.equal(scene.fog,fog);assert.equal(camera.far,600);assert.equal(preview.group.visible,false);
 preview.setEnabled(true);assert.equal(original.group.visible,false);preview.dispose();assert.equal(original.group.visible,true);assert.equal(camera.far,600);assert.equal(textureDisposals,2);assert.equal(scene.children.length,1);
}finally{Object.assign(config,defaults);THREE.TextureLoader.prototype.loadAsync=load;}
let partialDisposed=false;
THREE.TextureLoader.prototype.loadAsync=async function(url){if(url.endsWith('painted-meadow.png'))throw new Error('art unavailable');const texture=new THREE.Texture();texture.addEventListener('dispose',()=>partialDisposed=true);return texture;};
try{await assert.rejects(()=>createStorybookBackground(scene,{height,painter,halfSize:220,camera,original}),/art unavailable/);assert(partialDisposed);assert.equal(original.group.visible,true);assert.equal(camera.far,600);assert.equal(scene.children.length,1,'failed artwork load preserves original scene');}finally{THREE.TextureLoader.prototype.loadAsync=load;}
const root=process.argv[2];
const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/backgrounds/storybook-v1/manifest.json'),'utf8'));
assert.equal(manifest.approved,true);assert.equal(manifest.defaultEnabled,true);assert.equal(manifest.colliders,0);
for(const name of ['countryside-panorama.png','painted-meadow.png']){
 const bytes=fs.readFileSync(path.join(root,'assets/backgrounds/storybook-v1',name));assert.equal(bytes.subarray(1,4).toString(),'PNG');
 const w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20);assert(w<=4096&&h<=2048,'mobile texture budget');assert(bytes.length>100000,'actual painted artwork asset');if(name.startsWith('countryside'))assert.equal(w,2*h,'equirectangular 2:1 panorama');
}
console.log('PASS: real painted textures, bounded non-collidable horizon, exact terrain-edge attachment, live uniforms, stable camera following, no foreground fog, comparison restoration and geometry/material/texture cleanup.');
