import * as THREE from 'three';
import {pineKinds,pineAppearance,preparePine} from './PineTreeConfig.js';
import {RockVisuals} from './RockVisuals.js';

/** Visual adapter only: interaction systems retain all collider and animation state.
 * Imported clones are prepared once, sharing library geometry/materials. Idle objects
 * render as instances; animated roots keep the same base pivots as their colliders.
 */
export class EnvironmentWorld {
  static async connect(scene,library,trees,rocks){
    const templates=[null,null,null,...await Promise.all(pineKinds.map(kind=>library.load(kind)))];
    const world=new EnvironmentWorld(scene,library,trees,rocks,templates);
    try{await world.initialize();return world;}catch(error){world.dispose();throw error;}
  }
  constructor(scene,library,trees,rocks,templates){
    Object.assign(this,{scene,library,trees,rocks,templates});this.treeRecords=[];
  }
  async initialize(){
    for(const t of this.trees.trees){
      const originals=t.group.children.map(o=>[o,o.visible]);for(const [o] of originals)o.visible=false;
      const appearance=pineAppearance(t.x,t.z);
      const clone=preparePine(THREE,this.templates[3+appearance.variant],appearance.height,appearance.yaw);
      // Existing roots are embedded .08 into terrain. Correct visuals only.
      clone.position.y=.08;t.group.add(clone);clone.visible=false;
      const originalFoliageHeight=t.foliageHeight;t.foliageHeight=appearance.height*.65;
      this.treeRecords.push({state:t,clone,appearance,originalFoliageHeight,originals,static:false,matrix:new THREE.Matrix4()});
    }
    this.rockVisuals=await RockVisuals.connect(this.scene,this.library,this.rocks);
    this.rockRecords=this.rockVisuals.rockRecords;this.fragmentRecords=this.rockVisuals.fragmentRecords;
    for(const record of this.treeRecords){record.state.group.updateWorldMatrix(true,false);record.matrix.copy(record.state.group.matrixWorld);}
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
    this.rockBatch=this.rockRecords[0]?.batch;
    this.update();
  }
  update(){
    for(let i=0;i<this.treeRecords.length;i++){
      const r=this.treeRecords[i],idle=r.state.state==='IDLE';r.clone.visible=!idle;
      if(idle!==r.static){r.batch.setVisible(r.slot,idle);r.static=idle;}
    }
    for(const batch of this.treeBatches)batch.flush();this.rockVisuals.update();
  }
  dispose(){
    if(this.disposed)return;this.disposed=true;for(const batch of this.treeBatches??[])batch.dispose();this.rockVisuals?.dispose();
    for(const r of this.treeRecords){r.clone.removeFromParent();r.state.foliageHeight=r.originalFoliageHeight;for(const [o,visible] of r.originals)o.visible=visible;}

  }
}
