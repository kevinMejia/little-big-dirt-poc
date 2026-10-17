import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const urls={
  tree:new URL('./assets/models/trees/cartoon_tree.glb',import.meta.url),
  boulder:new URL('./assets/models/rocks/cartoon_boulder.glb',import.meta.url),
  fractured:new URL('./assets/models/rocks/cartoon_boulder_fractured.glb',import.meta.url),
};

/** Shared geometry/material ownership. Dispose clones by detaching, then dispose
 * this library once all clones and static batches have been removed. */
export class EnvironmentAssets {
  constructor(){this.loader=new GLTFLoader();this.cache=new Map();this.disposed=false;}
  load(kind){
    if(this.disposed)throw new Error('EnvironmentAssets has been disposed');
    if(!urls[kind])throw new Error('Unknown environment asset: '+kind);
    if(!this.cache.has(kind))this.cache.set(kind,this.loader.loadAsync(urls[kind].href).then(gltf=>{
      gltf.scene.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});return gltf.scene;
    }).catch(error=>{this.cache.delete(kind);throw error;}));
    return this.cache.get(kind);
  }
  async clone(kind){return (await this.load(kind)).clone(true);}
  /** Optional static rendering building block for later approved integration.
   * Slots are stable: hide one while an animated clone uses the same transform.
   * This does not register colliders or change the playable world. */
  async createStaticBatch(kind,transforms){
    const template=await this.load(kind),group=new THREE.Group(),batches=[];
    template.updateMatrixWorld(true);
    template.traverse(o=>{if(!o.isMesh)return;
      const batch=new THREE.InstancedMesh(o.geometry,o.material,transforms.length);
      batch.castShadow=batch.receiveShadow=true;batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      batches.push({batch,local:o.matrixWorld.clone()});group.add(batch);
    });
    const zero=new THREE.Matrix4().makeScale(0,0,0),combined=new THREE.Matrix4();
    const write=(slot,visible=true)=>{for(const {batch,local} of batches){combined.multiplyMatrices(visible?transforms[slot]:zero,local);batch.setMatrixAt(slot,combined);batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();}};
    transforms.forEach((_,i)=>write(i));
    return {group,setVisible:write,dispose(){group.removeFromParent();for(const {batch} of batches)batch.dispose();}};
  }
  async dispose(){
    if(this.disposed)return;this.disposed=true;
    const results=await Promise.allSettled(this.cache.values()),geometries=new Set(),materials=new Set(),textures=new Set();
    for(const r of results)if(r.status==='fulfilled')r.value.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});
    for(const m of materials)for(const value of Object.values(m))if(value?.isTexture)textures.add(value);
    for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();this.cache.clear();
  }
}
