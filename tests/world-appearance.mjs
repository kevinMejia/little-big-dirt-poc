import {mainWorldRamps,rampPoint,rampClearance} from '../MainWorldRamps.js';
import {DirtJumpSystem,playgroundFeatures} from '../DirtJumpSystem.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../three-test.mjs';
import {worldAppearance,createWorldAtmosphere,landscapeNoise,createTerrainPainter,createSceneryLayout,createTerrainDressing,createGroundDetails} from '../WorldAppearance.js';
const dressing=createTerrainDressing({trees:[{x:40,z:30,scale:1}],rocks:[{x:-50,z:20,radius:1}]});
assert.ok(dressing(40,30).bare>.8);assert.equal(dressing(60,30).bare,0);
assert.ok(dressing(18*Math.sin(30*.025)+1.52,30).wear>.6);
assert.equal(dressing(80,30).wear,0);
assert.deepEqual(dressing(40,30),dressing(40,30));
const roadDressing=createTerrainDressing({trees:[],rocks:[]},()=>({distance:2.4,width:12}));assert.ok(roadDressing(100,100).wear>.6);
for(let x=-50;x<=50;x++)for(const v of Object.values(dressing(x,30)))assert.ok(v>=0&&v<=1);
const source=fs.readFileSync(process.argv[2],'utf8'),height=new Function(source.match(/function height\(x,z\)\{[^\n]+/)[0]+';return height;')();
const scene=new THREE.Scene(),world=createWorldAtmosphere(scene,height,220);
assert.equal(scene.fog,null);assert.ok(scene.background.b>scene.background.r,'clear blue sky');assert.equal(world.group.children.length,1);
const geometry=world.group.children[0].geometry,position=geometry.attributes.position,normal=geometry.attributes.normal;
for(let i=0;i<880;i++){
 const x=position.getX(i),z=position.getZ(i);assert.equal(Math.max(Math.abs(x),Math.abs(z)),220);
 assert.ok(Math.abs(position.getY(i)-height(x,z))<.00001,'horizon meets original terrain edge');
}
for(let i=0;i<position.count;i++){assert.ok(Number.isFinite(position.getY(i)));assert.ok(normal.getY(i)>0,'horizon faces upward');}
world.dispose();assert.equal(scene.children.length,0);
const disabled=createWorldAtmosphere(scene,height,220,{...worldAppearance,distantHillsEnabled:false});assert.equal(disabled.group.children.length,0);disabled.dispose();
const hazy=createWorldAtmosphere(scene,height,220,{...worldAppearance,distantHillsEnabled:false,fogEnabled:true});assert.ok(scene.fog.near>=350&&scene.fog.far>10000);hazy.dispose();
for(let i=-20;i<20;i++){assert.equal(landscapeNoise(i*.23,1.7),landscapeNoise(i*.23,1.7));assert.ok(landscapeNoise(i*.23,1.7)>=0&&landscapeNoise(i*.23,1.7)<=1);}
console.log('PASS: fog disabled by default, subtle optional haze, decorative horizon edge continuity, upward/finite geometry, toggles and cleanup.');
const painter=createTerrainPainter(height,220),layout=createSceneryLayout(painter,220);
assert.equal(layout.trees.length,175);assert.equal(layout.rocks.length,80);assert.deepEqual(createSceneryLayout(painter,220),layout,'deterministic placement');
const uniform=createSceneryLayout(painter,220,{...worldAppearance,vegetationClusteringPercent:0});assert.notDeepEqual(uniform,layout,'clustering setting changes distribution');
for(const t of layout.trees){assert.ok(Math.abs(t.x)<=202&&Math.abs(t.z)<=202);assert.ok(Math.hypot(t.x,t.z)>=25);assert.ok(Math.abs(t.x-18*Math.sin(t.z*.025))>=8.5);}
for(const r of layout.rocks){assert.ok(Math.abs(r.x)<=185&&Math.abs(r.z)<=185);assert.ok(Math.hypot(r.x,r.z)>=22);}
const plain=createTerrainPainter(()=>0,220,{...worldAppearance,terrainColorVariation:0,dirtPatchPercent:0,rockyGroundPercent:0});
assert.deepEqual(plain.sampleColor(70,10).toArray(),plain.sampleColor(-70,10).toArray());
const dirt=createTerrainPainter(height,220,{...worldAppearance,dirtPatchPercent:100,rockyGroundPercent:0});assert.equal(dirt.surface(70,10).dirtMask,1);
const rock=createTerrainPainter(height,220,{...worldAppearance,dirtPatchPercent:0,rockyGroundPercent:100});assert.ok(rock.surface(70,10).rockMask>=.5);
const uniqueColors=new Set();let dirtCount=0,rockCount=0;
for(let z=-200;z<=200;z+=10)for(let x=-200;x<=200;x+=10){const color=painter.sampleColor(x,z),surface=painter.surface(x,z);assert.ok(color.toArray().every(v=>Number.isFinite(v)&&v>=0&&v<=1));uniqueColors.add(color.getHex());if(surface.dirtMask>.1)dirtCount++;if(surface.rockMask>.1)rockCount++;}
assert.ok(uniqueColors.size>100);assert.ok(dirtCount>50&&rockCount>20,'visible nonuniform dirt and rock masks');
const coloredHills=createWorldAtmosphere(scene,height,220,worldAppearance,painter),edgeColors=coloredHills.group.children[0].geometry.attributes.color;
for(let i=0;i<880;i+=25){const pos=coloredHills.group.children[0].geometry.attributes.position,c=painter.sampleColor(pos.getX(i),pos.getZ(i));assert.ok(Math.abs(edgeColors.getX(i)-c.r)<1e-6&&Math.abs(edgeColors.getY(i)-c.g)<1e-6&&Math.abs(edgeColors.getZ(i)-c.b)<1e-6,'color-continuous terrain edge');}coloredHills.dispose();
const noDetails=createGroundDetails(scene,height,220,painter,layout,{...worldAppearance,grassDetailDensity:0});assert.equal(noDetails.group.children.length,0);noDetails.dispose();
const details=createGroundDetails(scene,height,220,painter,layout,{...worldAppearance,grassDetailDensity:2});assert.equal(details.group.children.length,3);
const matrix=new THREE.Matrix4(),point=new THREE.Vector3();
for(const batch of details.group.children){assert.ok(batch.isInstancedMesh&&!batch.castShadow);assert.ok(batch.count>0);for(let i=0;i<batch.count;i++){batch.getMatrixAt(i,matrix);point.setFromMatrixPosition(matrix);assert.ok(Math.abs(point.y-height(point.x,point.z)-.008)<.00001,'details follow unmodified terrain');}}
const matrices=details.group.children[0].instanceMatrix.array.slice();details.dispose();
const repeat=createGroundDetails(scene,height,220,painter,layout,{...worldAppearance,grassDetailDensity:2});assert.deepEqual(repeat.group.children[0].instanceMatrix.array,matrices);repeat.dispose();assert.equal(scene.children.length,0);
console.log('PASS: deterministic clustered trees/rock patches, clear meadows/road, terrain palette and patch controls, horizon color seam, instanced detail budgets/terrain seating/cleanup; '+uniqueColors.size+' sampled ground colors.');

const empty=createSceneryLayout(painter,220,{...worldAppearance,treeDensityPercent:0,rockDensityPercent:0});assert.equal(empty.trees.length,0);assert.equal(empty.rocks.length,0);
const sparse=createSceneryLayout(painter,220,{...worldAppearance,treeDensityPercent:50,rockDensityPercent:50});assert.equal(sparse.trees.length,88);assert.equal(sparse.rocks.length,40);
const dense=createSceneryLayout(painter,220,{...worldAppearance,treeDensityPercent:200,rockDensityPercent:200});assert.equal(dense.trees.length,350);assert.equal(dense.rocks.length,160);
assert.deepEqual(createSceneryLayout(painter,220,{...worldAppearance,treeDensityPercent:500,rockDensityPercent:500}),dense,'density capped at 200%');
console.log('PASS: unchanged original counts at defaults; zero/half/double density and supported upper cap affect actual scenery counts.');

const expandedLayout=createSceneryLayout(painter,330,worldAppearance,2.25);
assert.equal(expandedLayout.trees.length,394);assert.equal(expandedLayout.rocks.length,180);
assert(expandedLayout.trees.some(t=>Math.abs(t.x)>220||Math.abs(t.z)>220),'new terrain populated');
const chunked=createGroundDetails(scene,height,330,painter,expandedLayout,{...worldAppearance,grassDetailDensity:2},{areaScale:2.25,viewDistance:150});
assert.equal(chunked.group.userData.budgets.grass,450);assert(chunked.group.children.length>3,'spatial detail batches');
chunked.update(new THREE.Vector3(0,0,0));assert(chunked.group.children.some(c=>!c.visible),'distant cells culled');
chunked.update(new THREE.Vector3(300,0,300));assert(chunked.group.children.some(c=>c.visible),'details follow vehicle/camera in extension');
const shader={vertexShader:'#include <begin_vertex>'};chunked.group.children[0].material.onBeforeCompile(shader);assert(shader.vertexShader.includes('smoothstep(110.,150.'));
chunked.dispose();assert.equal(scene.children.length,0);
console.log('PASS: area-scaled scenery/detail counts, populated outer region, spatial culling, gentle distance shrink and cleanup.');

const flowersOnly=createGroundDetails(scene,height,220,painter,layout,worldAppearance,{kinds:['flowers'],viewDistance:150});
assert.equal(flowersOnly.group.userData.budgets.grass,0);
assert.equal(flowersOnly.group.userData.budgets.pebbles,0);
assert(flowersOnly.group.children.length>0,'flowers preserved');
assert(flowersOnly.group.children.every(batch=>batch.name==='Instanced flowers'),'no grass tufts or decorative pebbles spawned');
flowersOnly.dispose();assert.equal(scene.children.length,0);
console.log('PASS: flowers-only main-world details preserve flowers and exclude grass/pebbles; reusable defaults still pass.');

const scattered=mainWorldRamps({halfSize:330,height,layout:expandedLayout});
assert.deepEqual(scattered,mainWorldRamps({halfSize:330,height,layout:expandedLayout}),'stable seeded layout');
assert.deepEqual(scattered.map(f=>f.id),playgroundFeatures().map(f=>f.id),'all existing ramp types');
assert(new Set(scattered.map(f=>f.angle)).size===4,'varied orientations');
for(const f of scattered){
 const trees=expandedLayout.trees.filter(t=>!scattered.some(r=>rampClearance(r,t.x,t.z,t.scale*.35+3)));
 assert(!trees.some(t=>rampClearance(f,t.x,t.z,t.scale*.35+3)));
 const rocks=expandedLayout.rocks.filter(r=>!scattered.some(f=>rampClearance(f,r.x,r.z,r.radius+4)));
 assert(!rocks.some(r=>rampClearance(f,r.x,r.z,r.radius+4)));
 for(const other of scattered)if(other!==f)assert(Math.hypot(f.x-other.x,f.z-other.z)>=200,'separate jump corridors');
 for(let along=-60;along<=95;along+=2)for(const side of [-f.width*.6-6,0,f.width*.6+6]){
  const p=rampPoint(f,side,along);
  assert(Math.max(Math.abs(p.x),Math.abs(p.z))<=305,'boundary clearance');
  assert(Math.abs(p.x-18*Math.sin(p.z*.025))>21,'road clearance');
 }
}
const scatteredTerrain=new DirtJumpSystem(height,scattered),scatteredSurface=scatteredTerrain.createWorldSurface(330,2,1.5);
assert(scatteredSurface.indices.length/3<450000,'bounded scattered ramp terrain budget');
console.log('Main-world terrain triangles:',scatteredSurface.indices.length/3);
for(let i=0;i<scatteredSurface.vertices.length;i+=3){
 const [x,y,z]=scatteredSurface.vertices.subarray(i,i+3);
 assert(Math.abs(y-scatteredTerrain.sample(x,z))<.001,'shared render/collider mesh follows scattered ramps');
}
for(const f of scattered)for(const along of [-61,96]){
 const p=rampPoint(f,0,along);assert(Math.abs(scatteredTerrain.sample(p.x,p.z)-height(p.x,p.z))<1e-8,'ramps meet base terrain');
}
assert(playgroundFeatures().every(f=>f.z===30&&f.angle===0),'lab remains organized');
console.log('PASS: seeded main-world ramps, all four types, varied orientations, clear approaches/landings, obstacles/roads/boundaries avoided, shared mesh and terrain joins; lab unchanged.');
console.log('Scattered ramps:',JSON.stringify(scattered.map(({id,x,z,angle})=>({id,x,z,angle}))));
