import assert from 'node:assert/strict';
import * as THREE from '../three-test.mjs';
import {TreeCollisionSystem} from '../TreeCollisionSystem.js';
const bounds={radius:1,rear:-1,front:1};
const fixture=(z=5)=>{let falls=0;const s=new TreeCollisionSystem(new THREE.Scene(),{onImpact:(speed,kind)=>{if(kind==='fall')falls++;}});const g=new THREE.Group();g.position.z=z;const t=s.addTree(g,.3,3);return {s,t,g,falls:()=>falls};};
const drive=(f,speed,percent=60,base=20,x=0)=>{const p=new THREE.Vector3(x,0,0);const result=f.s.move(p,0,speed,.4,bounds,{baseMaxSpeed:base,treeKnockdownSpeedPercent:percent});return {p,result};};
let f=fixture();drive(f,8);assert.equal(f.t.state,'WOBBLING');
f=fixture();const hit=drive(f,12);assert.equal(f.t.state,'FALLING','exact threshold knocks down');assert.ok(hit.result>0&&hit.result<12,'soft impact keeps driving');
const axis=f.t.axis.clone();assert.ok(axis.x>0,'forward hit tips forward');
f.s.move(hit.p,0,20,.2,bounds,{baseMaxSpeed:20,treeKnockdownSpeedPercent:60});assert.equal(f.falls(),1,'cannot retrigger falling tree');
for(let i=0;i<17;i++)f.s.update(.05);assert.equal(f.t.state,'FALLEN');
const blocked=new THREE.Vector3(0,0,5);f.s.setVehicles([{position:blocked,heading:0,bounds}]);for(let i=0;i<200;i++)f.s.update(.05);assert.equal(f.t.state,'FALLEN','occupied base postpones recovery');
const through=new THREE.Vector3(0,0,0);assert.equal(f.s.move(through,0,20,.5,bounds),20);assert.ok(through.z>9,'fallen tree is nonblocking');
f.s.setVehicles([]);f.s.update(.05);assert.equal(f.t.state,'RECOVERING');
f.s.setVehicles([{position:blocked,heading:0,bounds}]);f.s.update(.05);assert.equal(f.t.state,'FALLEN','entering during recovery defers collider restoration');
f.s.setVehicles([]);for(let i=0;i<40;i++)f.s.update(.05);assert.equal(f.t.state,'IDLE');assert.ok(f.g.quaternion.angleTo(new THREE.Quaternion())<1e-8);
drive(f,12);assert.equal(f.t.state,'FALLING','can knock down again after recovery');
f=fixture(-5);drive(f,-12);assert.equal(f.t.state,'FALLING');assert.ok(f.t.axis.x<0,'reverse impact falls backward');
f=fixture();drive(f,21,60,20,1.2);assert.notEqual(f.t.state,'FALLING','fast glancing contact stays below normal-speed threshold');
f=fixture();drive(f,7,35,17);assert.equal(f.t.state,'FALLING','truck uses lower percentage');
f=fixture();drive(f,13,60,21);assert.equal(f.t.state,'FALLING','base top speed, not boosted top speed');
f=fixture();drive(f,1,0,21);assert.equal(f.t.state,'IDLE'); // no contact yet
const p=new THREE.Vector3(0,0,2.65);f.s.move(p,0,1,.1,bounds,{baseMaxSpeed:21,treeKnockdownSpeedPercent:0});assert.equal(f.t.state,'FALLING','0% accepts any positive normal impact');
for(const dt of [1/30,1/60,1/144]){const check=fixture();drive(check,15);for(let time=0;time<11;time+=dt)check.s.update(dt);assert.equal(check.t.state,'IDLE','recovery works across frame rates');}
console.log('PASS: low/high/exact/glancing/reverse impacts, base-speed thresholds, soft drive-through, nonblocking states, repeat-hit guard, safe recovery/re-entry, re-knockdown and variable frame rates.');
