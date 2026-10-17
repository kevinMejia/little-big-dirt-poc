import assert from 'node:assert/strict';
import fs from 'node:fs';
import {showroomDefaults,visualControls,normalizeVisualSettings,visualSettingsDocument,readVisualSettingsDocument} from '../viewer/showroom-config.js';
import {showroomAssets} from '../viewer/showroom-assets.js';

assert.equal(showroomDefaults.bloom,false,'mobile-safe default uses no full-screen bloom');
assert.equal(new Set(visualControls.map(control=>control.key)).size,Object.keys(showroomDefaults).length);
const changed={...showroomDefaults,scale:1.2,rotationSpeed:35,mainColor:'#ff9400',accentColor:'#008dff',bloom:true};
assert.deepEqual(readVisualSettingsDocument(visualSettingsDocument('turbo-boost',changed),'turbo-boost'),changed,'visual JSON round trip');
assert.equal(visualSettingsDocument('turbo-boost',changed).approved,false,'export never approves or integrates gameplay');
assert.throws(()=>readVisualSettingsDocument({format:'other'},'turbo-boost'));
assert.throws(()=>readVisualSettingsDocument(visualSettingsDocument('other',changed),'turbo-boost'));
const bounded=normalizeVisualSettings({scale:100,particleIntensity:-1,mainColor:'javascript:bad',glowIntensity:NaN,lightingIntensity:Infinity,bloom:'yes',unknown:10});
assert.equal(bounded.scale,1.6);assert.equal(bounded.particleIntensity,0);assert.equal(bounded.mainColor,showroomDefaults.mainColor);assert.equal(bounded.bloom,false);assert(!('unknown' in bounded));
const entry=showroomAssets[0],bytes=fs.readFileSync(new URL(entry.url));
assert.equal(bytes.subarray(0,4).toString(),'glTF');assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
const length=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+length).toString());
assert(gltf.nodes.some(node=>node.name==='Turbo_Boost'));assert(gltf.nodes.some(node=>node.name==='Turbo_Core'));assert(gltf.nodes.some(node=>node.name==='Turbo_OuterRing'));
assert(!gltf.cameras?.length,'studio/camera excluded from reusable GLB');assert(!gltf.extensionsUsed?.includes('KHR_draco_mesh_compression'),'no extra decoder dependency');
for(const buffer of gltf.buffers)assert(!buffer.uri,'self-contained GLB');
const triangles=gltf.meshes.reduce((sum,mesh)=>sum+mesh.primitives.reduce((sum,primitive)=>sum+gltf.accessors[primitive.indices].count/3,0),0);
const manifest=JSON.parse(fs.readFileSync(new URL(entry.manifest)));
assert.equal(triangles,manifest.triangles);assert(triangles<20000&&bytes.length<1024*1024,'mobile asset budget');
assert.equal(manifest.prototypeOnly,true);
assert.equal(fs.readFileSync(new URL(entry.source)).subarray(0,7).toString(),'BLENDER','real editable Blender source');
for(const name of [...manifest.materials.main,...manifest.materials.accent])assert(gltf.materials.some(material=>material.name===name),'named material control '+name);
for(const name of manifest.spinners)assert(gltf.nodes.some(node=>node.name===name),'animation pivot '+name);
const binOffset=20+length+8;
for(const mesh of gltf.meshes)for(const primitive of mesh.primitives){
 const accessor=gltf.accessors[primitive.attributes.POSITION],view=gltf.bufferViews[accessor.bufferView],stride=view.byteStride??12;
 for(let i=0;i<accessor.count;i++)for(let axis=0;axis<3;axis++)assert(Number.isFinite(bytes.readFloatLE(binOffset+(view.byteOffset??0)+(accessor.byteOffset??0)+i*stride+axis*4)),'finite exported vertices');
}
for(const file of ['showroom.js','ShowroomAssetPreview.js','showroom-assets.js','showroom-config.js'])assert(!/Rapier|VehicleConfig|BoundaryCannon/.test(fs.readFileSync(new URL('../viewer/'+file,import.meta.url),'utf8')),'showroom stays independent of game physics');
console.log(`PASS: real Blender source / self-contained ${triangles}-triangle GLB, material/pivot controls, mobile budget, visual setting validation/export round trip, no approval/gameplay effects or physics dependency.`);
