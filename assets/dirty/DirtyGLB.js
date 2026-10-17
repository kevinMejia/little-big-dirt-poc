import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

/** Shared GLB adapter for driving and the vehicle garage. */
export class DirtyGLB {
  static async load(url){
    const [gltf,response]=await Promise.all([new GLTFLoader().loadAsync(url),fetch(new URL('manifest.json',url))]);
    if(!response.ok)throw new Error('Unable to load model manifest');
    return new DirtyGLB(gltf.scene,await response.json());
  }
  constructor(group,manifest,ownsTextures=true){
    this.group=group;this.manifest=manifest;this.rest=new Map();this.wheelAngle=0;this.wheelReferenceRadius=manifest.wheels.find(w=>w.front)?.radius??.59;this.ownsTextures=ownsTextures;
    for(const name of Object.keys(manifest.jointLimits)){const joint=group.getObjectByName(name);if(!joint)throw new Error('Missing joint: '+name);this.rest.set(name,joint.quaternion.clone());}
    this.wheels=manifest.wheels.map(w=>{const steering=group.getObjectByName(w.steer),spin=group.getObjectByName(w.spin);if(!steering||!spin)throw new Error('Missing wheel: '+w.spin);return {...w,steering,spin,restSteering:steering.quaternion.clone(),restSpin:spin.quaternion.clone()};});
    this.hydraulics=manifest.hydraulics.map(h=>{const entry={};for(const key of ['a','b','barrel','rod']){entry[key]=group.getObjectByName(h[key]);if(!entry[key])throw new Error('Missing hydraulic: '+h[key]);}return entry;});
    for(const w of this.wheels){w.steering.userData.wheel={x:w.x,z:w.z,r:w.radius};w.steering.userData.roll=w.spin;}
    group.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;}});
    this.update(0);
  }
  setJoint(name,angle,axis=new THREE.Vector3(1,0,0)){
    const range=this.manifest.jointLimits[name];angle=THREE.MathUtils.clamp(angle,...range);
    this.group.getObjectByName(name).quaternion.copy(this.rest.get(name)).multiply(new THREE.Quaternion().setFromAxisAngle(axis,angle));
  }
  setSteering(angle){for(const w of this.wheels)if(w.front)w.steering.quaternion.copy(w.restSteering).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),THREE.MathUtils.clamp(angle,-.55,.55)));}
  setWheelRotation(angle){this.wheelAngle=angle;for(const w of this.wheels)w.spin.quaternion.copy(w.restSpin).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),angle*this.wheelReferenceRadius/w.radius));}
  setFrontLoaderHeight(value){this.setJoint('FrontLoaderPivot',THREE.MathUtils.lerp(0,-.85,THREE.MathUtils.clamp(value,0,1)));}
  setFrontBucketTilt(angle){this.setJoint('FrontBucketPivot',angle);}
  setRearBoomAngle(angle){this.setJoint('RearBoomPivot',angle);}
  setRearStickAngle(angle){this.setJoint('RearStickPivot',angle);}
  setRearBucketCurl(angle){this.setJoint('RearBucketPivot',angle);}
  setRearArmRotation(angle){this.setJoint('RearSwingPivot',angle,new THREE.Vector3(0,1,0));}
  reset(){for(const [name,quaternion] of this.rest)this.group.getObjectByName(name).quaternion.copy(quaternion);this.setSteering(0);this.setWheelRotation(0);this.update(0);}
  clone(){
    // Clone render resources so disposing a switched-out vehicle keeps the template valid.
    const geometries=new Map(),materials=new Map();
    // Controller references are not serializable Object3D user data.
    const saved=[];this.group.traverse(o=>{saved.push([o,o.userData]);o.userData={...o.userData};delete o.userData.roll;delete o.userData.controller;});
    let copy;try{copy=this.group.clone(true);}finally{for(const [o,data] of saved)o.userData=data;}
    copy.traverse(o=>{if(o.isMesh){if(!geometries.has(o.geometry))geometries.set(o.geometry,o.geometry.clone());o.geometry=geometries.get(o.geometry);const clone=m=>{if(!materials.has(m))materials.set(m,m.clone());return materials.get(m);};o.material=Array.isArray(o.material)?o.material.map(clone):clone(o.material);}});
    return new DirtyGLB(copy,this.manifest,false);
  }
  update(deltaTime){
    this.group.updateWorldMatrix(true,true);
    for(const h of this.hydraulics){
      const a=h.a.getWorldPosition(new THREE.Vector3()),b=h.b.getWorldPosition(new THREE.Vector3());
      for(const [key,center,fraction] of [['barrel',.3,.6],['rod',.79,.42]]){
        const part=h[key],localA=part.parent.worldToLocal(a.clone()),localB=part.parent.worldToLocal(b.clone());
        const delta=localB.clone().sub(localA),length=delta.length();
        part.position.copy(localA).addScaledVector(delta,center);part.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());part.scale.set(1,length*fraction,1);
      }
    }
  }
  dispose(){if(this.disposed)return;this.disposed=true;this.group.removeFromParent();const geometries=new Set(),materials=new Set();this.group.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});const textures=new Set();for(const m of materials)for(const value of Object.values(m))if(value?.isTexture)textures.add(value);for(const g of geometries)g.dispose();for(const m of materials)m.dispose();if(this.ownsTextures)for(const texture of textures)texture.dispose();}
}
