import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {ShowroomAssetPreview} from './viewer/ShowroomAssetPreview.js';
import {showroomAssets} from './viewer/showroom-assets.js';
import {showroomDefaults} from './viewer/showroom-config.js';
import {createTurboPedestal,turboPedestalTop} from './viewer/TurboPedestal.js';
import {turboBoostConfig} from './VehicleConfig.js';
import {TurboPickupTimer,crossesPickup} from './TurboBoost.js';
import {turboPickupLayout} from './TurboPickupLayout.js';

// One loaded/animated GLB; every mesh is instanced across all pickup slots.
// Geometry, materials, glow texture and animated particle buffer are shared.
export class TurboPickupSystem {
 static async load(scene,options){
  const preview=await ShowroomAssetPreview.load(showroomAssets[0]);
  preview.mobile=true;preview.setSettings({...showroomDefaults});
  // Use the same reflection lighting as the approved showroom for this asset
  // only. Do not alter the world's lighting or any authored material values.
  const generator=new THREE.PMREMGenerator(options.renderer),room=new RoomEnvironment();
  const environment=generator.fromScene(room,.04);room.dispose();generator.dispose();
  for(const material of preview.materials){material.envMap=environment.texture;material.needsUpdate=true;}
  const system=new TurboPickupSystem(scene,options,preview);system.environment=environment;return system;
 }
 constructor(scene,options,preview){
  this.preview=preview;this.options=options;this.config=turboBoostConfig;
  this.group=new THREE.Group();this.group.name='Turbo Boost pickups';scene.add(this.group);
  this.records=[];this.batches=[];this.matrix=new THREE.Matrix4();this.zero=new THREE.Matrix4().makeScale(0,0,0);
  this.previous=null;this.capacity=30;this.base=createTurboPedestal();this.base.updateMatrixWorld(true);
  const add=(mesh,part)=>{
   const batch=new THREE.InstancedMesh(mesh.geometry,mesh.material,this.capacity);
   batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);batch.count=0;batch.name='Turbo '+part+' '+mesh.name;
   batch.frustumCulled=false;batch.receiveShadow=true;batch.castShadow=false;
   this.batches.push({batch,source:mesh,part});this.group.add(batch);
  };
  this.base.traverse(o=>{if(o.isMesh)add(o,'pedestal');});
  preview.model.traverse(o=>{if(o.isMesh)add(o,'collectible');});
  this.sync();
 }
 sync(){
  const count=Math.max(0,Math.min(this.capacity,Math.round(this.config.pickupCount)));
  if(count===this.count)return;
  const layout=turboPickupLayout({...this.options,count});
  while(this.records.length>layout.length){const r=this.records.pop();r.root.removeFromParent();r.flash.material.dispose();}
  for(let i=this.records.length;i<layout.length;i++){
   const point=layout[i],root=new THREE.Group();root.position.set(point.x,point.y+.015,point.z);
   root.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(-point.sx,1,-point.sz).normalize());
   const effects=new THREE.Group();effects.matrixAutoUpdate=false;
   for(const glow of this.preview.glows)effects.add(glow.clone());
   effects.add(this.preview.particles.clone());root.add(effects);
   const flash=new THREE.Sprite(new THREE.SpriteMaterial({map:this.preview.texture,color:0xffe3a3,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));
   flash.visible=false;flash.position.y=2.5;flash.scale.set(7,7,1);root.add(flash);this.group.add(root);root.updateMatrixWorld(true);
   this.records.push({point,root,effects,flash,timer:new TurboPickupTimer(),flashTime:0});
  }
  this.count=count;
 }
 update(dt,position,controller){
  this.sync();const enabled=this.config.enabled;this.group.visible=enabled;
  this.preview.update(dt,turboPedestalTop);this.preview.object.updateMatrixWorld(true);
  for(const r of this.records){
   // Check first, then advance: a hidden pickup cannot be collected again in
   // the same update in which its cooldown expires.
   if(enabled&&controller&&r.timer.available&&crossesPickup(this.previous??position,position,r.point,this.config.pickupRadius)&&controller.collectTurbo()){
    r.timer.collect(this.config.respawnSeconds);r.flashTime=.35;
   }else r.timer.step(dt);
   r.flashTime=Math.max(0,r.flashTime-dt);r.flash.material.opacity=r.flashTime/.35;r.flash.visible=r.flashTime>0;
   const nearby=Math.hypot(position.x-r.point.x,position.z-r.point.z)<120;
   r.effects.visible=enabled&&r.timer.available&&nearby;
   r.effects.matrix.copy(this.preview.object.matrix);
   r.root.updateMatrixWorld(true);
  }
  for(const {batch,source,part} of this.batches){
   batch.count=this.records.length;
   for(let i=0;i<this.records.length;i++){
    const r=this.records[i];
    if(part==='collectible'&&(!r.timer.available||Math.hypot(position.x-r.point.x,position.z-r.point.z)>120))batch.setMatrixAt(i,this.zero);
    else{this.matrix.multiplyMatrices(r.root.matrixWorld,source.matrixWorld);batch.setMatrixAt(i,this.matrix);}
   }
   batch.instanceMatrix.needsUpdate=true;
  }
  this.previous??=new THREE.Vector3();this.previous.copy(position);
 }
 resetVehicle(){this.previous=null;}
 dispose(){
  this.group.removeFromParent();for(const {batch} of this.batches)batch.dispose();
  const materials=new Set();this.base.traverse(o=>{if(o.isMesh){o.geometry.dispose();materials.add(o.material);}});for(const m of materials)m.dispose();
  for(const r of this.records)r.flash.material.dispose();this.preview.dispose();this.environment?.dispose();
 }
}
