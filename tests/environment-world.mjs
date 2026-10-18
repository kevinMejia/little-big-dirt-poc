import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from '../three-test.mjs';
import {EnvironmentAssets} from '../EnvironmentAssets.js';
import {EnvironmentWorld} from '../EnvironmentWorld.js';
import {TreeCollisionSystem} from '../TreeCollisionSystem.js';
import {RockInteractionSystem} from '../RockInteractionSystem.js';

// Decode actual GLB geometry/hierarchy, following the existing Dirty asset tests.
function readGLB(path){
 const data=fs.readFileSync(path),length=data.readUInt32LE(12),g=JSON.parse(data.subarray(20,20+length)),binary=20+length+8;
 const positions=index=>{const a=g.accessors[index],v=g.bufferViews[a.bufferView],out=new Float32Array(a.count*3);for(let i=0;i<a.count;i++)for(let k=0;k<3;k++)out[i*3+k]=data.readFloatLE(binary+(v.byteOffset||0)+(a.byteOffset||0)+i*(v.byteStride||12)+k*4);return out;};
 const materials=g.materials.map(m=>new THREE.MeshStandardMaterial({color:new THREE.Color(...(m.pbrMetallicRoughness.baseColorFactor??[1,1,1,1]).slice(0,3))}));
 const nodes=g.nodes.map(n=>{let o=new THREE.Group();if(n.mesh!==undefined){const meshes=g.meshes[n.mesh].primitives.map(p=>{const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions(p.attributes.POSITION),3));return new THREE.Mesh(geo,materials[p.material]);});if(meshes.length===1)o=meshes[0];else for(const mesh of meshes)o.add(mesh);}o.name=n.name;o.userData=n.extras||{};if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);return o;});
 g.nodes.forEach((n,i)=>{for(const j of n.children||[])nodes[i].add(nodes[j]);});const root=new THREE.Group();for(const i of g.scenes[g.scene||0].nodes)root.add(nodes[i]);return root;
}
const assets=process.argv[2],library=new EnvironmentAssets();
for(const [kind,path] of [['tree','trees/cartoon_tree.glb'],['boulder','rocks/cartoon_boulder.glb'],['fractured','rocks/cartoon_boulder_fractured.glb']])library.cache.set(kind,Promise.resolve(readGLB(assets+'/'+path)));
for(let i=1;i<=5;i++)library.cache.set('Pine_'+i,Promise.resolve(readGLB(assets+'/trees/pines/Pine_'+i+'.glb')));
assert.equal(library.load('tree'),library.load('tree'),'one cached load per type');
const scene=new THREE.Scene(),trees=new TreeCollisionSystem(scene),rocks=new RockInteractionSystem(scene);
const tree=new THREE.Group();tree.position.set(0,0,5);const oldTree=new THREE.Mesh(new THREE.BoxGeometry(.4,3,.4),new THREE.MeshStandardMaterial());tree.add(oldTree);scene.add(tree);const t=trees.addTree(tree,.22,3.5);
for(let i=1;i<=30;i++){const g=new THREE.Group();g.position.set(i*9,-.08,20);scene.add(g);trees.addTree(g,.22);}
const layoutBefore=trees.trees.map(t=>[t.x,t.z,t.radius,...t.group.position.toArray()]);
const rock=rocks.addRock(10,5,1),small=rocks.addRock(20,5,.5);const oldGeometry=rock.mesh.geometry;
const world=await EnvironmentWorld.connect(scene,library,trees,rocks),r=world.rockRecords[0];
assert.deepEqual(trees.trees.map(t=>[t.x,t.z,t.radius,...t.group.position.toArray()]),layoutBefore,'layout/colliders unchanged');
assert.equal(world.treeBatches.length,5,'all five variants instanced');
for(const record of world.treeRecords){
 const visual=new THREE.Box3().setFromObject(record.clone);
 assert.ok(Math.abs(visual.getSize(new THREE.Vector3()).y-record.appearance.height)<1e-5);
 assert.ok(record.appearance.height>=5.2&&record.appearance.height<=7.2);
 assert.ok(Math.abs(visual.min.y-record.state.group.position.y-.08)<1e-5,'visual base seated');
 record.clone.updateWorldMatrix(true,true);
 let meshIndex=0;record.clone.traverse(o=>{if(!o.isMesh)return;
  const actual=new THREE.Matrix4();record.batch.group.children[meshIndex++].getMatrixAt(record.slot,actual);
  assert.ok(actual.elements.every((v,i)=>Math.abs(v-o.matrixWorld.elements[i])<1e-5),'idle/animated transforms match');
 });
}
const slotVisible=(batch,index)=>{const matrix=new THREE.Matrix4();batch.group.children[0].getMatrixAt(index,matrix);return matrix.determinant()!==0;};
assert.ok(!oldTree.visible&&slotVisible(world.treeBatch,0)&&!world.treeRecords[0].clone.visible);
assert.notEqual(rock.mesh.geometry,oldGeometry);assert.ok(slotVisible(world.rockBatch,0));
const rootPosition=tree.position.clone();
let p=new THREE.Vector3(0,0,2.7);trees.move(p,0,3,.1,{radius:1,rear:-1,front:1},{baseMaxSpeed:20,treeKnockdownSpeedPercent:90});world.update();
assert.equal(t.state,'WOBBLING');assert.ok(world.treeRecords[0].clone.visible&&!slotVisible(world.treeBatch,0));
assert.ok(trees.particles.some(p=>p.life>0));
for(let i=0;i<600;i++){trees.update(1/60);world.update();}assert.equal(t.state,'IDLE');assert.ok(slotVisible(world.treeBatch,0));
trees.knockDown(t,0,1,20);for(let i=0;i<700;i++){trees.update(1/60);world.update();}assert.equal(t.state,'IDLE');assert.ok(tree.position.equals(rootPosition),'base collider stays fixed');
const drive=speed=>{const p=new THREE.Vector3(10,0,0);for(let i=0;i<160;i++){const oldZ=p.z;p.z+=speed*.01;rocks.resolveMovement(p,p.x,oldZ,0,speed,.01,{radius:1,rear:-1,front:1},{baseMaxSpeed:20,rockCrackSpeedPercent:25,rockBreakSpeedPercent:55});world.update();if(rock.lastHit===rocks.time)return;rocks.update(.01);}};
drive(6);assert.equal(rock.state,'CRACKED');assert.ok(r.cracks.visible&&!r.clone.visible&&!slotVisible(world.rockBatch,0));
rocks.update(.7);drive(6);assert.equal(rock.state,'BROKEN');assert.ok(!slotVisible(world.rockBatch,0)&&!rock.group.visible);
const fragments=world.fragmentRecords.filter(r=>r.state.active);assert.equal(fragments.length,5);assert.equal(new Set(fragments.flatMap(r=>r.variants.filter(o=>o.visible).map(o=>o.children[0].name))).size,5,'all five imported chunks used');
assert.ok(fragments.every(r=>r.variants.filter(o=>o.visible).length===1));
const objectCount=scene.children.length;for(let i=0;i<1000;i++){rocks.update(1/60);world.update();}
assert.equal(rock.state,'INTACT');assert.ok(slotVisible(world.rockBatch,0));assert.ok(rocks.fragments.every(f=>!f.active));assert.equal(scene.children.length,objectCount,'recovery creates no objects');
small.v.set(1,0,0);rocks.active.add(small);world.update();assert.ok(!slotVisible(world.rockBatch,1),'moving rock activates clone');
small.v.set(0,0,0);rocks.active.delete(small);world.update();assert.ok(slotVisible(world.rockBatch,1),'settled rock returns to instances');
// Shared loaded geometry is not disposed when the visual adapter is removed.
const template=await library.load('tree');let disposals=0;template.traverse(o=>{if(o.isMesh)o.geometry.addEventListener('dispose',()=>disposals++);});
world.dispose();assert.equal(disposals,0);assert.ok(oldTree.visible);assert.equal(rock.mesh.geometry,oldGeometry);assert.equal(rocks.onFragmentSpawn,undefined);
trees.dispose();rocks.dispose();await library.dispose();assert.ok(disposals>0);
console.log('PASS: actual Blender models, shared resources/idle instancing, collision wobble/leaves/fall/recovery, crack/second-hit destruction using all five GLB chunks, bounded reuse/respawn, moving rock transitions and cleanup.');
