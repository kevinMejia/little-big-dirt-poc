import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {proceduralDebrisConfig} from './ProceduralDebrisConfig.js';
import {placeDebris} from './DebrisPlacement.js';
import {terrainSampler} from './DebrisTerrainSampler.js';
import {DebrisBumpField} from './DebrisBumpField.js';

export class ProceduralDebrisSystem {
  static async create(scene,{terrain,config=proceduralDebrisConfig,...options}){
    const system=new ProceduralDebrisSystem(scene,config);
    if(!config.enabled)return system;
    try{
      system.asset=(await new GLTFLoader().loadAsync(new URL('./assets/models/debris/debris.glb',import.meta.url).href)).scene;
      const sample=terrainSampler(terrain.geometry.attributes.position.array,terrain.geometry.index.array);
      system.records=placeDebris({...options,config,tier:system.tier,sample});
      const dummy=new THREE.Object3D(),up=new THREE.Vector3(0,1,0),groups=new Map();
      // Seat the actual exported footprint, including long logs across triangle
      // edges. Reject sharp curvature rather than leaving hovering/embedded props.
      const vertex=new THREE.Vector3();
      system.records=system.records.filter(r=>{
        const template=system.asset.getObjectByName(r.kind+'_'+r.variant);
        if(!template?.isMesh)throw new Error('Missing debris mesh: '+r.kind);
        dummy.position.set(r.x,r.y,r.z);dummy.quaternion.setFromUnitVectors(up,new THREE.Vector3(...r.normal));dummy.rotateY(r.yaw);dummy.scale.setScalar(r.scale);dummy.updateMatrix();
        const positions=template.geometry.attributes.position;let offset=-Infinity;
        for(let i=0;i<positions.count;i++){vertex.fromBufferAttribute(positions,i).applyMatrix4(dummy.matrix);const ground=sample(vertex.x,vertex.z);if(!ground)return false;offset=Math.max(offset,ground.y-vertex.y);}
        if(Math.abs(offset)>.06)return false;r.y+=offset;r.groundOffset=offset;return true;
      });
      for(const record of system.records){const key=[record.kind,record.variant,Math.floor(record.x/config.chunkSize),Math.floor(record.z/config.chunkSize)].join(':');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(record);}
      system.asset.updateMatrixWorld(true);
      const footprints=system.records.map(r=>{const geometry=system.asset.getObjectByName(r.kind+'_'+r.variant).geometry;if(!geometry.boundingBox)geometry.computeBoundingBox();const b=geometry.boundingBox;return {x:r.x,z:r.z,angle:-r.yaw,rx:Math.max(.025,(b.max.x-b.min.x)*r.scale*.5),rz:Math.max(.025,(b.max.z-b.min.z)*r.scale*.5),height:(b.max.y-b.min.y)*r.scale};});
      system.bumpField=new DebrisBumpField(footprints,config.bumps??{enabled:false});
      for(const records of groups.values()){
        const template=system.asset.getObjectByName(records[0].kind+'_'+records[0].variant);
        if(!template?.isMesh)throw new Error('Missing debris mesh: '+records[0].kind);
        const mesh=new THREE.InstancedMesh(template.geometry,template.material,records.length);
        records.forEach((r,i)=>{dummy.position.set(r.x,r.y,r.z);dummy.quaternion.setFromUnitVectors(up,new THREE.Vector3(...r.normal));dummy.rotateY(r.yaw);dummy.scale.setScalar(r.scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
        mesh.computeBoundingSphere();mesh.receiveShadow=true;mesh.name='Debris '+template.name;system.group.add(mesh);
      }
      return system;
    }catch(error){system.dispose();throw error;}
  }
  constructor(scene,config){this.config=config;this.records=[];this.group=new THREE.Group();this.group.name='Decorative debris (no collisions)';scene.add(this.group);const mobile=globalThis.matchMedia?.('(pointer: coarse)').matches;this.tier=config.tiers[config.quality==='auto'?(mobile?'mobile':'desktop'):config.quality]??config.tiers.desktop;this.last=new THREE.Vector3(Infinity,Infinity,Infinity);}
  update(position){if(this.last.distanceToSquared(position)<64)return;this.last.copy(position);const distance=this.config.distance??this.tier.distance;for(const mesh of this.group.children){const sphere=mesh.boundingSphere;mesh.visible=Math.hypot(position.x-sphere.center.x,position.z-sphere.center.z)<distance+sphere.radius;}}
  // Adapter for the existing wheel-contact sampler; no legacy meshes are used.
  setFocus(){}
  getWheelHeightAt(x,z,r){return this.config.enabled?this.bumpField?.getWheelHeightAt(x,z,r)??0:0;}
  dispose(){if(this.disposed)return;this.disposed=true;this.bumpField?.dispose();this.group.removeFromParent();for(const mesh of this.group.children)mesh.dispose();const geometries=new Set(),materials=new Set();this.asset?.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();this.group.clear();this.records=[];}
}
