import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from '../three-test.mjs';
import {StinkyGLB} from '../StinkyGLB-test.mjs';
import {groundVisualWheel} from '../VehicleFeedback.js';
import {DebrisWheelContacts} from '../GroundDebrisSystem.js';
import {DirtJumpSystem,playgroundFeatures} from '../DirtJumpSystem.js';
import {stinkyCollision,sanitizeStinkyPose,applyStinkyPose,stinkyActions} from '../StinkyEquipment.js';
const bytes=fs.readFileSync(process.argv[2]),jsonLength=bytes.readUInt32LE(12),g=JSON.parse(bytes.subarray(20,20+jsonLength).toString()),binary=20+jsonLength+8;
const positions=i=>{const a=g.accessors[i],v=g.bufferViews[a.bufferView],array=new Float32Array(a.count*3),stride=v.byteStride||12;for(let j=0;j<a.count;j++)for(let k=0;k<3;k++)array[j*3+k]=bytes.readFloatLE(binary+(v.byteOffset||0)+(a.byteOffset||0)+j*stride+k*4);return array;};
const materials=g.materials.map(m=>new THREE.MeshStandardMaterial({color:new THREE.Color(...(m.pbrMetallicRoughness?.baseColorFactor||[1,1,1,1]).slice(0,3))}));
const nodes=g.nodes.map(n=>{let object;if(n.mesh!==undefined){const meshes=g.meshes[n.mesh].primitives.map(p=>{const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions(p.attributes.POSITION),3));return new THREE.Mesh(geometry,materials[p.material||0]);});object=meshes.length===1?meshes[0]:new THREE.Group();if(meshes.length>1)for(const m of meshes)object.add(m);}else object=new THREE.Group();object.name=n.name;object.userData=n.extras||{};if(n.translation)object.position.fromArray(n.translation);if(n.rotation)object.quaternion.fromArray(n.rotation);if(n.scale)object.scale.fromArray(n.scale);return object;});
g.nodes.forEach((n,i)=>{for(const child of n.children||[])nodes[i].add(nodes[child]);});const group=new THREE.Group();for(const i of g.scenes[g.scene||0].nodes)group.add(nodes[i]);
const authoredBox=new THREE.Box3().setFromObject(group);const manifest=JSON.parse(fs.readFileSync(process.argv[3]));const model=new StinkyGLB(group,manifest);const adaptedBox=new THREE.Box3().setFromObject(group);
console.log('Authored/adapted bounds',authoredBox.min.toArray(),authoredBox.max.toArray(),adaptedBox.min.toArray(),adaptedBox.max.toArray());
assert.ok(authoredBox.max.distanceTo(adaptedBox.max)<.1&&authoredBox.min.distanceTo(adaptedBox.min)<.1,'adapter must retain authored hydraulic pose');
model.setSteering(.3);model.setWheelRotation(2);for(const wheel of model.wheels){assert.ok(Math.abs(wheel.spin.quaternion.x)>0);if(wheel.front)assert.ok(Math.abs(wheel.steering.quaternion.y)>0);}
for(const [method,values] of [['setHopper',[0,.35,.7]],['setCompactor',[-.65,0,.3]]])for(const v of values){model[method](v);model.update(0);group.updateMatrixWorld(true);group.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite)));for(const h of model.hydraulics)assert.ok(h.barrel.scale.y>0&&h.rod.scale.y>0);}
model.reset();const clone=model.clone();assert.equal(clone.wheels.length,6);clone.dispose();assert.ok(!model.disposed);
// Exercise the exact main-world grounding path with the exported nested chassis pivots.
const root=new THREE.Group(),visual=new THREE.Group();root.add(visual);visual.add(group);group.userData.controller=model;
const base=(x,z)=>2.6*Math.sin(x*.035)*Math.cos(z*.044)+3.6*Math.sin((x+z)*.018)+1.4*Math.cos(z*.085+x*.027)+.00034*(x*x+z*z);
const jumps=new DirtJumpSystem(base,playgroundFeatures()),height=(x,z)=>jumps.sample(x,z),contacts=new DebrisWheelContacts();
const debris={config:{suspensionEffectPercent:60},setFocus(){},getWheelHeightAt(x,z){return Math.max(0,.13*Math.sin(x+z));}};
for(const [x,z] of [[0,0],[65,65],...playgroundFeatures().flatMap(f=>[-12,-2,3,18].map(d=>[f.x,f.z+d]))])for(const yaw of [0,.7])for(const roll of [-.06,.06]){
 root.position.set(x,height(x,z)-.09,z);root.rotation.set(.13,yaw,-.09,'YXZ');visual.position.y=.08;visual.rotation.set(-.05,0,roll);
 contacts.sample(group,root,debris,{suspensionBouncePercent:20,bodyPitchPercent:20,bodyRollPercent:25});contacts.ground(root,height,{heave:{value:.08}});root.updateMatrixWorld(true);model.update(0);
 assert.equal(contacts.wheels.length,6);
 for(const c of contacts.wheels){const p=c.pivot.getWorldPosition(new THREE.Vector3()),r=c.pivot.userData.wheel.r;assert(Math.abs(p.y-(height(p.x,p.z)+c.bump-.035+r))<1e-6,'all six nested GLB wheels contact actual terrain/ramp surface under body motion');}
}
assert(Math.abs(authoredBox.max.x-stinkyCollision.radius)<.001);assert(Math.abs(authoredBox.max.z-(stinkyCollision.front+stinkyCollision.radius))<.001);assert(Math.abs(authoredBox.min.z-(stinkyCollision.rear-stinkyCollision.radius))<.001);
assert.equal(sanitizeStinkyPose({hopper:NaN,compactor:0}),null);assert.deepEqual(sanitizeStinkyPose({hopper:90,compactor:-90}),{hopper:40,compactor:-37});
let pose={hopper:0,compactor:0};const actions=stinkyActions(()=>pose,p=>{pose=p;applyStinkyPose(model,p);});actions[0].onPress();actions[1].onPress();assert.deepEqual(pose,{hopper:40,compactor:-37});actions[0].onPress();actions[1].onPress();assert.deepEqual(pose,{hopper:0,compactor:0});
console.log('PASS actual GLB, all six nested terrain contacts on rolling hills and four ramps under yaw/roll/pitch/heave, matching collision envelope, safe garage poses and touchscreen equipment actions');
model.dispose();console.log('PASS six exported wheels, steering, spin, hopper, compactor, hydraulic transforms, reset and clone disposal');
