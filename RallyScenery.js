import * as THREE from 'three';
export function rallySceneryLayout(landscape,bounds,config){
 let state=config.seed>>>0;const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296),placements=[];
 for(const [kind,count] of [['tree',config.trees],['rock',config.rocks],['gravel',config.gravel]].map(([kind,count])=>[kind,Math.round(count*(config.density??1))]))for(let tries=0,placed=0;placed<count&&tries<count*100;tries++){
  const x=bounds.minX+15+random()*(bounds.maxX-bounds.minX-30),z=-155+random()*310,n=landscape.nearest(x,z),y=landscape.terrainHeight(x,z),slope=Math.hypot(landscape.terrainHeight(x+1,z)-landscape.terrainHeight(x-1,z),landscape.terrainHeight(x,z+1)-landscape.terrainHeight(x,z-1))/2;
  if(y<config.minElevation||y>config.maxElevation||slope>config.maxSlope||config.exclusions.some(e=>Math.hypot(x-e.x,z-e.z)<e.radius))continue;
  const gap=n?n.distance-n.width/2:Infinity;
  if(kind==='gravel'?(gap<.9||gap>5):(gap<config.minRoadDistance+2))continue;
  placements.push({kind,x,y,z,scale:kind==='tree'?.8+random()*.9:kind==='rock'?.4+random()*1.1:.06+random()*.13,yaw:random()*Math.PI*2});placed++;
 }
 return placements;
}
// Static decorative instances have no distant collision or per-frame updates.
// Retained placements/IDs can later be promoted into separate interactive objects.
export function createRallyScenery(scene,placements){
 const group=new THREE.Group();group.name='Rally static natural scenery';scene.add(group);const dummy=new THREE.Object3D();
 const geometries={trunk:new THREE.CylinderGeometry(.16,.24,2.8,6).translate(0,1.4,0),leaves:new THREE.ConeGeometry(1.5,4.4,7).translate(0,3.6,0),rock:new THREE.IcosahedronGeometry(1,0),gravel:new THREE.IcosahedronGeometry(1,0)};
 const materials={trunk:new THREE.MeshStandardMaterial({color:0x7b5737,roughness:1}),leaves:new THREE.MeshStandardMaterial({color:0x366c42,flatShading:true,roughness:1}),rock:new THREE.MeshStandardMaterial({color:0x89917d,flatShading:true,roughness:1}),gravel:new THREE.MeshStandardMaterial({color:0xb7ab8d,roughness:1})};
 const chunks=new Map();placements.forEach((p,i)=>{p.id='rally-scenery-'+i;const key=Math.floor(p.x/110)+','+Math.floor(p.z/110);if(!chunks.has(key))chunks.set(key,[]);chunks.get(key).push(p);});
 for(const list of chunks.values())for(const type of ['trunk','leaves','rock','gravel']){
  const items=list.filter(p=>p.kind===(type==='trunk'||type==='leaves'?'tree':type));if(!items.length)continue;
  const mesh=new THREE.InstancedMesh(geometries[type],materials[type],items.length*(type==='leaves'?2:1));mesh.name='Static rally '+type;mesh.receiveShadow=true;
  items.forEach((p,i)=>{dummy.position.set(p.x,p.y+(type==='rock'?p.scale*.35:0),p.z);dummy.rotation.set(0,p.yaw,0);dummy.scale.setScalar(p.scale);if(type==='rock')dummy.scale.y*=.65;dummy.updateMatrix();mesh.setMatrixAt(type==='leaves'?i*2:i,dummy.matrix);
   if(type==='leaves'){dummy.position.y+=p.scale*1.7;dummy.scale.multiplyScalar(.72);dummy.updateMatrix();mesh.setMatrixAt(i*2+1,dummy.matrix);}});mesh.computeBoundingSphere();group.add(mesh);
 }
 return {group,placements,interactive:[],dispose(){group.removeFromParent();group.traverse(o=>{if(o.isInstancedMesh)o.dispose();});Object.values(geometries).forEach(g=>g.dispose());Object.values(materials).forEach(m=>m.dispose());}};
}
