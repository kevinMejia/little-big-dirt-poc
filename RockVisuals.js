import * as THREE from 'three';
import {worldAppearance} from './WorldEnvironmentConfig.js';

export const rockKinds=['Rock_Medium_1','Rock_Medium_2','Rock_Medium_3'];
const sample=(x,z,salt)=>{const n=Math.sin(x*91.7+z*173.3+salt*67.1)*43871.531;return n-Math.floor(n);};
export function rockAppearance(x,z){
  const weights=[worldAppearance.rockMedium1Weight,worldAppearance.rockMedium2Weight,worldAppearance.rockMedium3Weight].map(w=>Math.max(0,Number(w)||0));
  const total=weights.reduce((a,b)=>a+b,0);let pick=sample(x,z,1)*(total||3),variant=2;
  for(let i=0;i<3;i++){pick-=total?weights[i]:1;if(pick<0){variant=i;break;}}
  const low=Math.min(worldAppearance.rockMinScale,worldAppearance.rockMaxScale),high=Math.max(worldAppearance.rockMinScale,worldAppearance.rockMaxScale);
  return {variant,scale:low+(high-low)*sample(x,z,2),yaw:sample(x,z,3)*Math.PI*2};
}

// Normalize horizontal radius to the system's existing r*.85 collision circle.
// Supplied meshes retain their UVs and proportions, with base pivots from Blender.
export function rockTemplate(source){
  const root=new THREE.Group(),copy=source.clone(true);root.add(copy);root.updateMatrixWorld(true);
  const point=new THREE.Vector3();let radius=0;
  root.traverse(o=>{if(o.isMesh){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);radius=Math.max(radius,Math.hypot(point.x,point.z));}}});
  copy.scale.multiplyScalar(.85/radius);root.updateMatrixWorld(true);return root;
}

// Three shared pairs of surface-following seams, generated only at load time.
// This keeps the supplied rock visible when damaged, without runtime fracture.
export function rockDamage(template,material){
  const group=new THREE.Group(),box=new THREE.Box3().setFromObject(template),center=box.getCenter(new THREE.Vector3()),reach=box.getSize(new THREE.Vector3()).length()*2;
  const ray=new THREE.Raycaster(),directions=[[-.65,.9,.6],[-.35,.35,1],[.05,.05,1],[.25,-.35,1],[.65,-.75,.6]];
  template.updateMatrixWorld(true);
  for(const sign of [-1,1]){
    const points=[];
    for(let j=1;j<directions.length;j++)for(let k=0;k<=8;k++){
      const dir=new THREE.Vector3(...directions[j-1]).lerp(new THREE.Vector3(...directions[j]),k/8);dir.x*=sign;dir.normalize();
      ray.set(center.clone().addScaledVector(dir,reach),dir.clone().negate());
      const hit=ray.intersectObject(template,true)[0];if(hit)points.push(hit.point.clone().addScaledVector(dir,.014));
    }
    if(points.length>2){
      const curve=new THREE.Curve();curve.getPoint=(t,target=new THREE.Vector3())=>{const n=t*(points.length-1),i=Math.min(points.length-2,Math.floor(n));return target.copy(points[i]).lerp(points[i+1],n-i);};
      group.add(new THREE.Mesh(new THREE.TubeGeometry(curve,points.length*2,.012,4,false),material));
    }
  }
  return group;
}

export class RockVisuals {
  static async connect(scene,library,system,{previewVariant=null}={}){
    const [sources,fractured,response]=await Promise.all([Promise.all(rockKinds.map(k=>library.load(k))),library.load('fractured'),fetch(new URL('./assets/models/rocks/quaternius/manifest.json',import.meta.url))]);
    if(!response.ok)throw new Error('Rock manifest could not load');
    const visuals=new RockVisuals(scene,library,system,sources,fractured,await response.json());
    visuals.previewVariant=previewVariant;
    try{await visuals.initialize();return visuals;}catch(error){visuals.dispose();throw error;}
  }
  constructor(scene,library,system,sources,fractured,manifest){
    Object.assign(this,{scene,library,system,sources,fractured,manifest});this.rockRecords=[];this.fragmentRecords=[];this.dustRecords=[];this.batches=[];
    this.emptyGeometry=new THREE.BufferGeometry();this.emptyGeometry.setAttribute('position',new THREE.Float32BufferAttribute([],3));
    this.damageMaterial=new THREE.MeshBasicMaterial({color:0x283024});
    // Old chunk meshes have no UVs. Use texture-sampled colors rather than
    // projecting the atlas onto incompatible surfaces or showing old gray material.
    const base=new THREE.Color().setRGB(...manifest.fragmentColorSRGB,THREE.SRGBColorSpace);
    this.fragmentMaterials=[.9,1,1.1].map(f=>new THREE.MeshStandardMaterial({color:base.clone().multiplyScalar(f),roughness:1,flatShading:true}));
    this.previousFragmentHook=system.onFragmentSpawn;
  }
  async initialize(){
    this.templates=this.sources.map(rockTemplate);
    this.damageTemplates=this.templates.map(t=>rockDamage(t,this.damageMaterial));
    for(const dust of this.system.dust){const index=this.system.materials.indexOf(dust.mesh.material);if(index>=0){this.dustRecords.push({mesh:dust.mesh,material:dust.mesh.material});dust.mesh.material=this.fragmentMaterials[index];}}
    for(const state of this.system.rocks){
      const appearance=rockAppearance(state.spawnX,state.spawnZ),originalGeometry=state.mesh.geometry;
      if(this.previewVariant!==null){appearance.variant=this.previewVariant;appearance.scale=1;appearance.yaw=0;}
      const originals=state.cracks.children.map(o=>[o,o.visible]);for(const [o] of originals)o.visible=false;
      const clone=new THREE.Group();clone.quaternion.copy(state.mesh.quaternion).invert();
      clone.position.set(0,-.52-worldAppearance.rockGroundInset,0).applyQuaternion(clone.quaternion);
      clone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),appearance.yaw));
      clone.scale.setScalar(appearance.scale);clone.add(this.templates[appearance.variant].clone(true));
      const damage=clone.clone(false);damage.add(this.damageTemplates[appearance.variant].clone(true));damage.visible=false;
      state.mesh.geometry=this.emptyGeometry;state.mesh.add(clone,damage);
      this.rockRecords.push({state,appearance,clone,damage,originals,originalGeometry,matrix:new THREE.Matrix4(),static:false});
    }
    const pieces=[];this.fractured.traverse(o=>{if(/^Boulder_piece_\d+$/.test(o.name))pieces.push(o);});pieces.sort((a,b)=>a.name.localeCompare(b.name));
    if(pieces.length!==5)throw new Error('Expected five existing pooled chunk geometries');
    this.fractured.updateMatrixWorld(true);
    this.pieceTemplates=pieces.map((piece,i)=>{
      const root=new THREE.Group(),copy=piece.clone(true);piece.matrixWorld.decompose(copy.position,copy.quaternion,copy.scale);copy.position.set(0,0,0);
      copy.traverse(o=>{if(o.isMesh)o.material=this.fragmentMaterials[i%3];});root.add(copy);root.updateMatrixWorld(true);
      const box=new THREE.Box3().setFromObject(root);copy.position.sub(box.getCenter(new THREE.Vector3()));root.scale.setScalar(.65/Math.max(.01,box.getSize(new THREE.Vector3()).length()/2));return root;
    });
    for(const state of this.system.fragments){
      const originalGeometry=state.mesh.geometry,variants=this.pieceTemplates.map(t=>{const clone=t.clone(true);clone.visible=false;state.mesh.add(clone);return clone;});
      state.mesh.geometry=this.emptyGeometry;this.fragmentRecords.push({state,originalGeometry,variants});
    }
    const records=new Map(this.fragmentRecords.map(r=>[r.state,r]));
    this.fragmentHook=(fragment,index,rock)=>{
      this.previousFragmentHook?.(fragment,index,rock);
      const record=records.get(fragment);record.variants.forEach((o,i)=>o.visible=i===index%5);
      // Visual-only orientation; radius, launch velocity, spin and pool are untouched.
      const selected=record.variants[index%5];selected.rotation.set(sample(rock.spawnX,rock.spawnZ,index+4)*Math.PI,sample(rock.spawnX,rock.spawnZ,index+12)*Math.PI*2,0);
    };
    this.system.onFragmentSpawn=this.fragmentHook;
    for(let variant=0;variant<3;variant++){
      const records=this.rockRecords.filter(r=>r.appearance.variant===variant);if(!records.length)continue;
      for(const r of records){r.state.mesh.updateWorldMatrix(true,false);r.clone.updateMatrix();r.matrix.multiplyMatrices(r.state.mesh.matrixWorld,r.clone.matrix);}
      const batch=await this.library.createStaticBatch(rockKinds[variant],records.map(r=>r.matrix),this.templates[variant]);
      this.batches.push(batch);this.scene.add(batch.group);records.forEach((r,slot)=>Object.assign(r,{batch,slot}));
    }
    this.update();
  }
  update(){
    for(const r of this.rockRecords){
      const idle=r.state.state==='INTACT'&&!this.system.active.has(r.state);
      r.clone.visible=!idle&&r.state.state!=='BROKEN';r.damage.visible=r.state.state==='CRACKED';
      if(idle!==r.static){
        if(idle){r.state.mesh.updateWorldMatrix(true,false);r.clone.updateMatrix();r.matrix.multiplyMatrices(r.state.mesh.matrixWorld,r.clone.matrix);}
        r.batch.setVisible(r.slot,idle);r.static=idle;
      }
    }
    for(const batch of this.batches)batch.flush();
  }
  dispose(){
    if(this.disposed)return;this.disposed=true;for(const batch of this.batches)batch.dispose();
    for(const r of this.rockRecords){r.clone.removeFromParent();r.damage.removeFromParent();r.state.mesh.geometry=r.originalGeometry;for(const [o,v] of r.originals)o.visible=v;}
    for(const r of this.fragmentRecords){for(const o of r.variants)o.removeFromParent();r.state.mesh.geometry=r.originalGeometry;}
    for(const r of this.dustRecords)r.mesh.material=r.material;
    if(this.system.onFragmentSpawn===this.fragmentHook)this.system.onFragmentSpawn=this.previousFragmentHook;
    for(const template of this.damageTemplates??[])template.traverse(o=>{if(o.isMesh)o.geometry.dispose();});
    this.damageMaterial.dispose();for(const material of this.fragmentMaterials)material.dispose();this.emptyGeometry.dispose();
  }
}
