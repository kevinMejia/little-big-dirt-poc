import assert from 'node:assert/strict';
import {placeDebris,excluded} from '../DebrisPlacement.js';
import {terrainSampler} from '../DebrisTerrainSampler.js';
import {proceduralDebrisConfig as config} from '../ProceduralDebrisConfig.js';
import {DebrisBumpField} from '../DebrisBumpField.js';
const bumpConfig={enabled:true,strength:.7,maxHeight:.07};
const bumpField=new DebrisBumpField([{x:0,z:0,rx:1,rz:.15,angle:-Math.PI/2,height:.4}],bumpConfig);
assert.ok(Math.abs(bumpField.getHeightAt(0,0)-.049)<1e-9);
assert.equal(bumpField.getHeightAt(.2,0),0);assert.ok(bumpField.getHeightAt(0,.5)>0);
assert.ok(bumpField.getWheelHeightAt(0,0)>0&&bumpField.getWheelHeightAt(0,0)<=.049);
assert.equal(bumpField.getHeightAt(20,20),0);bumpConfig.enabled=false;assert.equal(bumpField.getWheelHeightAt(0,0),0);bumpConfig.enabled=true;bumpConfig.strength=0;assert.equal(bumpField.getHeightAt(0,0),0);bumpField.dispose();assert.equal(bumpField.grid.size,0);
const sample=terrainSampler(new Float32Array([-220,-22,-220,220,22,-220,220,22,220,-220,-22,220]),[0,2,1,0,3,2]);
for(const [x,z] of [[0,0],[71,29],[-100,30],[220,220]]){const s=sample(x,z);assert.ok(Math.abs(s.y-x*.1)<1e-6);assert.ok(Math.abs(Math.hypot(...s.normal)-1)<1e-9);assert.ok(s.normal[1]>0);}
assert.equal(sample(221,0),null);
const options={config,tier:config.tiers.desktop,halfSize:220,painter:{surface:()=>({slope:.2,ramp:0,dirtMask:.6})},trees:[{x:60,z:60,scale:2}],rocks:[],sample,blocked:(x,z,r)=>Math.abs(z)<10+r};
const a=placeDebris(options),b=placeDebris(options);assert.deepEqual(a,b);assert.ok(a.length>1000);
assert.notDeepEqual(a,placeDebris({...options,config:{...config,seed:2}}));
for(const r of a){assert.ok(!excluded(r.x,r.z,r.radius,config.exclusions));assert.ok(Math.abs(r.z)>=10+r.radius);assert.ok(Math.abs(r.x-18*Math.sin(r.z*.025))>=8+r.radius);assert.ok(Math.abs(r.y-r.x*.1)<1e-6);assert.equal(r.collision,'none');}
assert.ok(excluded(3,3.9,1,[{minX:0,maxX:3,minZ:0,maxZ:3}]));
assert.equal(placeDebris({...options,config:{...config,density:0}}).length,0);
assert.ok(placeDebris({...options,tier:config.tiers.mobile}).length<a.length);
assert.equal(placeDebris({...options,biome:()=>false}).length,0);
console.log('Procedural debris: deterministic placement, grounding, exclusions, mobile budget and biome hook passed;',a.length,'desktop records');
