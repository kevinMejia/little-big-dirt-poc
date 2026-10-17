import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from '../three-test.mjs';
import {DirtyGLB} from '../DirtyGLB-test.mjs';
import {groundVisualWheel} from '../VehicleFeedback.js';
const bytes=fs.readFileSync(process.argv[2]),jsonLength=bytes.readUInt32LE(12),g=JSON.parse(bytes.subarray(20,20+jsonLength).toString()),binary=20+jsonLength+8;
const positions=i=>{const a=g.accessors[i],v=g.bufferViews[a.bufferView],array=new Float32Array(a.count*3),stride=v.byteStride||12;for(let j=0;j<a.count;j++)for(let k=0;k<3;k++)array[j*3+k]=bytes.readFloatLE(binary+(v.byteOffset||0)+(a.byteOffset||0)+j*stride+k*4);return array;};
const materials=g.materials.map(m=>new THREE.MeshStandardMaterial({color:new THREE.Color(...(m.pbrMetallicRoughness?.baseColorFactor||[1,1,1,1]).slice(0,3))}));
const nodes=g.nodes.map(n=>{let object;if(n.mesh!==undefined){const meshes=g.meshes[n.mesh].primitives.map(p=>{const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions(p.attributes.POSITION),3));return new THREE.Mesh(geometry,materials[p.material||0]);});object=meshes.length===1?meshes[0]:new THREE.Group();if(meshes.length>1)for(const m of meshes)object.add(m);}else object=new THREE.Group();object.name=n.name;object.userData=n.extras||{};if(n.translation)object.position.fromArray(n.translation);if(n.rotation)object.quaternion.fromArray(n.rotation);if(n.scale)object.scale.fromArray(n.scale);return object;});
g.nodes.forEach((n,i)=>{for(const child of n.children||[])nodes[i].add(nodes[child]);});const group=new THREE.Group();for(const i of g.scenes[g.scene||0].nodes)group.add(nodes[i]);
const authoredBox=new THREE.Box3().setFromObject(group);const manifest=JSON.parse(fs.readFileSync(process.argv[3]));const model=new DirtyGLB(group,manifest);const adaptedBox=new THREE.Box3().setFromObject(group);
console.log('Authored/adapted bounds',authoredBox.min.toArray(),authoredBox.max.toArray(),adaptedBox.min.toArray(),adaptedBox.max.toArray());
assert.ok(authoredBox.max.distanceTo(adaptedBox.max)<.1&&authoredBox.min.distanceTo(adaptedBox.min)<.1,'adapter must retain authored hydraulic pose');
model.setSteering(.3);model.setWheelRotation(2);for(const wheel of model.wheels){assert.ok(Math.abs(wheel.spin.quaternion.x)>0);if(wheel.front)assert.ok(Math.abs(wheel.steering.quaternion.y)>0);}
for(const [method,values] of [['setFrontLoaderHeight',[0,.5,1]],['setFrontBucketTilt',[-.7,0,.9]],['setRearBoomAngle',[-.3,0,.35]],['setRearStickAngle',[-.65,0,.75]],['setRearBucketCurl',[-.85,0,1.15]],['setRearArmRotation',[-1.15,0,1.15]]]){for(const v of values){model[method](v);model.update(.016);group.updateMatrixWorld(true);group.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite)));}}
model.reset();const clone=model.clone();assert.equal(clone.wheels.length,4);for(const h of clone.hydraulics)assert.ok(h.barrel.scale.y>0&&h.rod.scale.y>0);
assert.equal(clone.wheelReferenceRadius,manifest.wheels.find(w=>w.front).radius);clone.dispose();assert.ok(!model.disposed,'switching instances retains template');
// Actual exported pivots remain grounded independently of visual body movement.
const root=new THREE.Group(),visual=new THREE.Group();root.add(visual);visual.add(group);
root.position.set(4,2,8);root.rotation.set(.08,.7,-.06,'YXZ');
const terrain=(x,z)=>.1*x+.05*z;
for(const roll of [-.06,0,.06]){
 visual.position.y=.05;visual.rotation.set(.04,0,roll);root.updateMatrixWorld(true);
 for(const wheel of model.wheels){
  groundVisualWheel(wheel.steering,root,terrain);root.updateMatrixWorld(true);
  const center=wheel.steering.getWorldPosition(new THREE.Vector3());
  assert.ok(Math.abs(center.y-(terrain(center.x,center.z)-.035+wheel.radius))<1e-6,'wheel remains on terrain under body roll/heave');
 }
 model.update(1/60);assert.ok(model.hydraulics.every(h=>Number.isFinite(h.barrel.scale.y)&&h.barrel.scale.y>0));
}
console.log('PASS: actual GLB wheels compensate visual chassis roll/pitch/heave while hydraulics stay finite.');
model.setFrontLoaderHeight(.5);model.update(.016);model.reset();model.dispose();
console.log('PASS: real exported geometry/hierarchy, authored hydraulic pose, wheel steering/spin, every equipment joint/range, finite hydraulic transforms, reset and instance cloning/disposal.');
