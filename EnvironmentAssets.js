import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const urls={
  ...Object.fromEntries([1,2,3].map(i=>['Rock_Medium_'+i,new URL('./assets/models/rocks/quaternius/Rock_Medium_'+i+'.glb',import.meta.url)])),
  ...Object.fromEntries([1,2,3,4,5].map(i=>['Pine_'+i,new URL('./assets/models/trees/pines/Pine_'+i+'.glb',import.meta.url)])),
  tree:new URL('./assets/models/trees/cartoon_tree.glb',import.meta.url),
  boulder:new URL('./assets/models/rocks/cartoon_boulder.glb',import.meta.url),
  fractured:new URL('./assets/models/rocks/cartoon_boulder_fractured.glb',import.meta.url),
};

/** Shared geometry/material ownership. Dispose clones by detaching, then dispose
 * this library once all clones and static batches have been removed. */
export class EnvironmentAssets {
  constructor(){this.loader=new GLTFLoader();this.cache=new Map();this.pineMaterials=new Map();this.rockMaterial=null;this.disposed=false;}
  load(kind){
    if(this.disposed)throw new Error('EnvironmentAssets has been disposed');
    if(!urls[kind])throw new Error('Unknown environment asset: '+kind);
    if(!this.cache.has(kind))this.cache.set(kind,this.loader.loadAsync(urls[kind].href).then(gltf=>{
      gltf.scene.traverse(o=>{if(o.isMesh){
        o.castShadow=o.receiveShadow=true;
        if(kind.startsWith('Rock_Medium_')){
          if(!this.rockMaterial)this.rockMaterial=o.material;
          else if(o.material!==this.rockMaterial){
            const retained=new Set(Object.values(this.rockMaterial).filter(v=>v?.isTexture));
            for(const value of Object.values(o.material))if(value?.isTexture&&!retained.has(value))value.dispose();
            o.material.dispose();o.material=this.rockMaterial;
          }
        }
        // All five exports use the same two authored materials and three maps.
        // Canonicalize them across variants as well as across tree instances.
        if(kind.startsWith('Pine_')){
          const share=material=>{
            const shared=this.pineMaterials.get(material.name);
            if(!shared){this.pineMaterials.set(material.name,material);return material;}
            const retained=new Set(Object.values(shared).filter(v=>v?.isTexture));
            for(const value of Object.values(material))if(value?.isTexture&&!retained.has(value))value.dispose();
            material.dispose();return shared;
          };
          o.material=Array.isArray(o.material)?o.material.map(share):share(o.material);
        }
      }});return gltf.scene;
    }).catch(error=>{this.cache.delete(kind);throw error;}));
    return this.cache.get(kind);
  }
  async clone(kind){return (await this.load(kind)).clone(true);}
  /** Static rendering shared by the playable environment and optional previews.
   * Slots are stable: hide one while an animated clone uses the same transform.
   * The visual adapter owns visibility; interaction systems still own colliders. */
  async createStaticBatch(kind,transforms,preparedTemplate=null){
    const template=preparedTemplate??await this.load(kind),group=new THREE.Group(),batches=[];
    template.updateMatrixWorld(true);
    template.traverse(o=>{if(!o.isMesh)return;
      const batch=new THREE.InstancedMesh(o.geometry,o.material,transforms.length);
      batch.castShadow=batch.receiveShadow=true;batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      batches.push({batch,local:o.matrixWorld.clone()});group.add(batch);
    });
    const zero=new THREE.Matrix4().makeScale(0,0,0),combined=new THREE.Matrix4();let dirty=true;
    const write=(slot,visible=true)=>{for(const {batch,local} of batches){combined.multiplyMatrices(visible?transforms[slot]:zero,local);batch.setMatrixAt(slot,combined);batch.instanceMatrix.needsUpdate=true;}dirty=true;};
    const flush=()=>{if(!dirty)return;for(const {batch} of batches)batch.computeBoundingSphere();dirty=false;};
    transforms.forEach((_,i)=>write(i));
    flush();return {group,setVisible:write,flush,dispose(){group.removeFromParent();for(const {batch} of batches)batch.dispose();}};
  }
  async dispose(){
    if(this.disposed)return;this.disposed=true;
    const results=await Promise.allSettled(this.cache.values()),geometries=new Set(),materials=new Set(),textures=new Set();
    for(const r of results)if(r.status==='fulfilled')r.value.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});
    for(const m of materials)for(const value of Object.values(m))if(value?.isTexture)textures.add(value);
    for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();this.cache.clear();this.pineMaterials.clear();this.rockMaterial=null;
  }
}
