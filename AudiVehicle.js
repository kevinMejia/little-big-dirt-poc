import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

// Runtime pivots preserve every source mesh, material and embedded texture.
export class AudiVehicle {
 static async load(){return (await new GLTFLoader().loadAsync(new URL('./assets/audi_rs_q_e-tron.glb',import.meta.url).href)).scene;}
 constructor(template){
  this.point=new THREE.Vector3();this.group=new THREE.Group();const asset=template.clone(true);this.group.add(asset);
  asset.updateMatrixWorld(true);let bounds=new THREE.Box3().setFromObject(asset);
  asset.scale.multiplyScalar(5/bounds.getSize(new THREE.Vector3()).z);asset.updateMatrixWorld(true);
  bounds.setFromObject(asset);const center=bounds.getCenter(new THREE.Vector3());asset.position.set(-center.x,-bounds.min.y,-center.z);this.group.updateMatrixWorld(true);
  const meshes=[];asset.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;if(/^Rueda(?:004|005|006)?_Ruedas_0$/.test(o.name))meshes.push(o);}});
  if(meshes.length!==4)throw new Error('Audi requires four road wheels');
  this.wheels=meshes.map(mesh=>{
   const box=new THREE.Box3().setFromObject(mesh),c=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()),radius=Math.max(size.y,size.z)/2;
   const steering=new THREE.Group(),spin=new THREE.Group();steering.position.copy(c);this.group.add(steering);steering.add(spin);spin.attach(mesh);
   steering.userData.wheel={x:c.x,z:c.z,r:radius};steering.userData.roll=spin;
   return {x:c.x,z:c.z,radius,front:c.z>0,steering,spin};
  });
  this.suspension=[];
  asset.traverse(mesh=>{
   if(!mesh.isMesh||!mesh.name.startsWith('Suspension'))return;
   const point=mesh.getWorldPosition(new THREE.Vector3());
   const distance=w=>(w.x-point.x)**2+(w.z-point.z)**2;
   const wheel=this.wheels.reduce((nearest,w)=>distance(w)<distance(nearest)?w:nearest);
   this.suspension.push({mesh,rest:mesh.position.clone(),wheel});
  });
  this.wheelAngle=0;this.wheelReferenceRadius=.75;this.group.userData.controller=this;
 }
 setSteering(angle){for(const w of this.wheels)w.steering.rotation.y=w.front?angle:0;}
 setWheelRotation(angle){this.wheelAngle=angle;for(const w of this.wheels)w.spin.rotation.x=angle*this.wheelReferenceRadius/w.radius;}
 update(){for(const s of this.suspension){s.mesh.position.copy(s.rest);const delta=s.wheel.steering.position.y-s.wheel.radius;s.mesh.updateWorldMatrix(true,false);const world=s.mesh.getWorldPosition(this.point);world.y+=delta*.45;s.mesh.position.copy(s.mesh.parent.worldToLocal(world));}}
 dispose(){this.group.removeFromParent();} // Geometry/textures belong to the cached template.
 static dispose(template){const gs=new Set(),ms=new Set(),ts=new Set();template?.traverse(o=>{if(o.isMesh){gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])ms.add(m);}});for(const m of ms){for(const v of Object.values(m))if(v?.isTexture)ts.add(v);m.dispose();}for(const g of gs)g.dispose();for(const t of ts)t.dispose();}
}
