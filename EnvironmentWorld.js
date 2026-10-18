import * as THREE from 'three';
import {pineKinds,pineAppearance,preparePine} from './PineTreeConfig.js';

const namedPieces=group=>{const result=[];group.traverse(o=>{if(/^Boulder_piece_\d+$/.test(o.name))result.push(o);});return result.sort((a,b)=>a.name.localeCompare(b.name));};

/** Visual adapter only: interaction systems retain all collider and animation state.
 * Imported clones are prepared once, sharing library geometry/materials. Idle objects
 * render as instances; animated roots keep the same base pivots as their colliders.
 */
export class EnvironmentWorld {
  static async connect(scene,library,trees,rocks){
    const templates=[null,...await Promise.all(['boulder','fractured',...pineKinds].map(kind=>library.load(kind)))];
    if(namedPieces(templates[2]).length<4)throw new Error('Fractured boulder needs at least four named pieces');
    const world=new EnvironmentWorld(scene,library,trees,rocks,templates);
    try{await world.initialize();return world;}catch(error){world.dispose();throw error;}
  }
  constructor(scene,library,trees,rocks,templates){
    Object.assign(this,{scene,library,trees,rocks,templates});this.treeRecords=[];this.rockRecords=[];this.fragmentRecords=[];
    this.emptyGeometry=new THREE.BufferGeometry();this.emptyGeometry.setAttribute('position',new THREE.Float32BufferAttribute([],3));this.previousFragmentHook=rocks.onFragmentSpawn;
  }
  async initialize(){
    const [,intact,fractured]=this.templates;
    intact.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(intact);
    const size=bounds.getSize(new THREE.Vector3()),factor=.85/(Math.max(size.x,size.z)/2);
    const normalized=source=>{const root=new THREE.Group(),copy=source.clone(true);copy.scale.multiplyScalar(factor);copy.position.y-=bounds.min.y*factor+.52;root.add(copy);return root;};
    this.intactTemplate=normalized(intact);this.crackedTemplate=normalized(fractured);
    // Open actual fracture seams slightly; retain all authored piece transforms.
    const crackedPieces=namedPieces(this.crackedTemplate);this.crackedTemplate.updateMatrixWorld(true);
    const center=new THREE.Box3().setFromObject(this.crackedTemplate).getCenter(new THREE.Vector3());
    for(const piece of crackedPieces){const point=piece.getWorldPosition(new THREE.Vector3()),offset=point.clone().sub(center).normalize().multiplyScalar(.025);piece.position.copy(piece.parent.worldToLocal(point.add(offset)));}

    for(const t of this.trees.trees){
      const originals=t.group.children.map(o=>[o,o.visible]);for(const [o] of originals)o.visible=false;
      const appearance=pineAppearance(t.x,t.z);
      const clone=preparePine(THREE,this.templates[3+appearance.variant],appearance.height,appearance.yaw);
      // Existing roots are embedded .08 into terrain. Correct visuals only.
      clone.position.y=.08;t.group.add(clone);clone.visible=false;
      const originalFoliageHeight=t.foliageHeight;t.foliageHeight=appearance.height*.65;
      this.treeRecords.push({state:t,clone,appearance,originalFoliageHeight,originals,static:false,matrix:new THREE.Matrix4()});
    }
    for(const r of this.rocks.rocks){
      const originalGeometry=r.mesh.geometry,originals=r.cracks.children.map(o=>[o,o.visible]);for(const [o] of originals)o.visible=false;
      // Keep the original mesh as the system's rotation/scale driver, with no draw.
      r.mesh.geometry=this.emptyGeometry;
      const clone=this.intactTemplate.clone(true),cracks=this.crackedTemplate.clone(true);r.mesh.add(clone);r.cracks.add(cracks);
      this.rockRecords.push({state:r,clone,cracks,originals,originalGeometry,static:false,matrix:new THREE.Matrix4()});
    }
    // Each imported chunk is recentered and normalized for the existing pooled
    // fragment radius. Their geometry/materials remain shared with the loaded GLB.
    fractured.updateMatrixWorld(true);
    const pieceTemplates=namedPieces(fractured).map(piece=>{
      const root=new THREE.Group(),copy=piece.clone(true);piece.matrixWorld.decompose(copy.position,copy.quaternion,copy.scale);copy.position.set(0,0,0);root.add(copy);
      root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(root),center=box.getCenter(new THREE.Vector3());copy.position.sub(center);
      root.scale.setScalar(.65/Math.max(.01,box.getSize(new THREE.Vector3()).length()/2));return root;
    });
    for(const f of this.rocks.fragments){
      const originalGeometry=f.mesh.geometry,variants=pieceTemplates.map(template=>{const clone=template.clone(true);clone.visible=false;f.mesh.add(clone);return clone;});
      f.mesh.geometry=this.emptyGeometry;this.fragmentRecords.push({state:f,variants,originalGeometry});
    }
    const records=new Map(this.fragmentRecords.map(r=>[r.state,r]));
    this.fragmentHook=(f,index,rock)=>{this.previousFragmentHook?.(f,index,rock);const record=records.get(f);record.variants.forEach((o,i)=>{o.visible=i===index%pieceTemplates.length;});};
    this.rocks.onFragmentSpawn=this.fragmentHook;
    for(const record of this.treeRecords){record.state.group.updateWorldMatrix(true,false);record.matrix.copy(record.state.group.matrixWorld);}
    for(const record of this.rockRecords){record.state.mesh.updateWorldMatrix(true,false);record.matrix.copy(record.state.mesh.matrixWorld);}
    this.treeBatches=[];
    for(let variant=0;variant<5;variant++){
      const records=this.treeRecords.filter(r=>r.appearance.variant===variant);if(!records.length)continue;
      // Each record has a different uniform height/yaw. Bake its visual wrapper
      // into the instance transform, retaining the original base-root animation.
      for(const r of records){r.clone.updateMatrix();r.matrix.multiply(r.clone.matrix);}
      const template=preparePine(THREE,this.templates[3+variant],1);
      // preparePine(1) normalizes height; records already carry their target size.
      for(const r of records)r.matrix.scale(new THREE.Vector3(r.appearance.height,r.appearance.height,r.appearance.height));
      const batch=await this.library.createStaticBatch(pineKinds[variant],records.map(r=>r.matrix),template);
      records.forEach((r,slot)=>Object.assign(r,{batch,slot}));this.treeBatches.push(batch);this.scene.add(batch.group);
    }
    // Compatibility handle for existing integration diagnostics.
    this.treeBatch=this.treeRecords[0]?.batch;
    this.rockBatch=await this.library.createStaticBatch('boulder',this.rockRecords.map(r=>r.matrix),this.intactTemplate);this.scene.add(this.rockBatch.group);
    this.update();
  }
  update(){
    for(let i=0;i<this.treeRecords.length;i++){
      const r=this.treeRecords[i],idle=r.state.state==='IDLE';r.clone.visible=!idle;
      if(idle!==r.static){r.batch.setVisible(r.slot,idle);r.static=idle;}
    }
    for(let i=0;i<this.rockRecords.length;i++){
      const r=this.rockRecords[i],idle=r.state.state==='INTACT'&&!this.rocks.active.has(r.state);
      r.clone.visible=!idle&&r.state.state!=='CRACKED';r.cracks.visible=r.state.state==='CRACKED';
      if(idle!==r.static){if(idle){r.state.mesh.updateWorldMatrix(true,false);r.matrix.copy(r.state.mesh.matrixWorld);}this.rockBatch.setVisible(i,idle);r.static=idle;}
    }
    for(const batch of this.treeBatches)batch.flush();this.rockBatch.flush();
  }
  dispose(){
    if(this.disposed)return;this.disposed=true;for(const batch of this.treeBatches??[])batch.dispose();this.rockBatch?.dispose();
    for(const r of this.treeRecords){r.clone.removeFromParent();r.state.foliageHeight=r.originalFoliageHeight;for(const [o,visible] of r.originals)o.visible=visible;}
    for(const r of this.rockRecords){r.clone.removeFromParent();r.cracks.removeFromParent();r.state.mesh.geometry=r.originalGeometry;for(const [o,visible] of r.originals)o.visible=visible;}
    for(const r of this.fragmentRecords){for(const o of r.variants)o.removeFromParent();r.state.mesh.geometry=r.originalGeometry;}
    if(this.rocks.onFragmentSpawn===this.fragmentHook)this.rocks.onFragmentSpawn=this.previousFragmentHook;
    this.emptyGeometry.dispose();
  }
}
