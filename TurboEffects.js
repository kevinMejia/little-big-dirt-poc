import * as THREE from 'three';
// Four shared low-poly cones; no lights, textures, allocations or physics bodies per frame.
export class TurboEffects {
 constructor(root){
  this.group=new THREE.Group();root.add(this.group);this.time=0;
  this.geometry=new THREE.ConeGeometry(.25,1.4,7);this.material=new THREE.MeshBasicMaterial({color:0x159dff,transparent:true,opacity:.8,depthWrite:false,blending:THREE.AdditiveBlending});
  this.coreMaterial=this.material.clone();this.coreMaterial.color.set(0x9afaff);
  for(const x of [-.6,.6])for(const core of [false,true]){const m=new THREE.Mesh(this.geometry,core?this.coreMaterial:this.material);m.rotation.x=-Math.PI/2;m.position.set(x,.65,0);m.scale.setScalar(core?.55:1);this.group.add(m);}
  this.group.visible=false;
 }
 update(dt,active,rear){this.group.visible=active;if(!active)return;this.time+=dt;this.group.position.z=rear-0.7;this.group.scale.z=1+Math.sin(this.time*45)*.12;}
 dispose(){this.group.removeFromParent();this.geometry.dispose();this.material.dispose();this.coreMaterial.dispose();}
}
