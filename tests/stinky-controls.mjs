import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from '../three-test.mjs';
import {StinkyGLB} from '../StinkyGLB-test.mjs';
import {groundVisualWheel} from '../VehicleFeedback.js';
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
model.reset();const clone=model.clone();assert.equal(clone.wheels.length,6);clone.dispose();assert.ok(!model.disposed);model.dispose();console.log('PASS six exported wheels, steering, spin, hopper, compactor, hydraulic transforms, reset and clone disposal');
