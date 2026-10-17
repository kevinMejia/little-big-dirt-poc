import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {showroomAssets,futureAssetCategories} from './showroom-assets.js';
import {showroomDefaults,visualControls,normalizeVisualSettings,visualSettingsDocument,readVisualSettingsDocument} from './showroom-config.js';
import {ShowroomAssetPreview} from './ShowroomAssetPreview.js';

const $=selector=>document.querySelector(selector),stage=$('#stage');
const scene=new THREE.Scene();scene.background=new THREE.Color('#e8ece4');scene.fog=new THREE.Fog('#e8ece4',15,38);
let renderer,orbit,preview,composer,bloomPass,environment,disposed=false,bloomGeneration=0;
let settings={...showroomDefaults},paused=false,frames=0,statsStart=performance.now(),assetGeneration=0;
const camera=new THREE.PerspectiveCamera(37,1,.1,80),clock=new THREE.Clock();
const hemisphere=new THREE.HemisphereLight('#ecfaff','#89917a',2),key=new THREE.DirectionalLight('#fff1d2',4),rim=new THREE.DirectionalLight('#b7edff',3),fill=new THREE.DirectionalLight('#ffffff',1.1);
key.position.set(-4,8,6);rim.position.set(4,5,-4);fill.position.set(0,3,6);scene.add(hemisphere,key,rim,fill);
const pedestalTop=.46;
const studioMaterials=[];
function material(color,metalness,roughness){const m=new THREE.MeshStandardMaterial({color,metalness,roughness});studioMaterials.push(m);return m;}
function pedestal(){
 const base=new THREE.Mesh(new THREE.CylinderGeometry(1.95,2.08,.32,80),material('#344f49',.5,.38));base.position.y=.16;base.castShadow=base.receiveShadow=true;scene.add(base);
 const top=new THREE.Mesh(new THREE.CylinderGeometry(1.88,1.95,.14,80),material('#5c7569',.38,.35));top.position.y=.39;top.receiveShadow=true;scene.add(top);
 const lightMaterial=new THREE.MeshBasicMaterial({color:'#85d7ca'});studioMaterials.push(lightMaterial);const edge=new THREE.Mesh(new THREE.TorusGeometry(1.92,.018,8,100),lightMaterial);edge.rotation.x=Math.PI/2;edge.position.y=.32;scene.add(edge);
 const detail=new THREE.Mesh(new THREE.RingGeometry(1.3,1.31,80),material('#a3b19c',.5,.4));detail.rotation.x=-Math.PI/2;detail.position.y=pedestalTop+.003;scene.add(detail);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),material('#e8ece4',0,.92));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
}
function resetView(){camera.position.set(4.5,3.7,7.8);orbit.target.set(0,2.35,0);orbit.update();}
function updateControls(){
 for(const definition of visualControls){
  const input=$('#visual-'+definition.key);if(definition.type==='checkbox')input.checked=settings[definition.key];else input.value=settings[definition.key];
  const output=$('#value-'+definition.key);if(output)output.value=definition.type==='color'?settings[definition.key].toUpperCase():`${Number(settings[definition.key]).toFixed(definition.step<1?2:0)} ${definition.unit}`;
 }
}
function buildControls(){
 const groups=new Map();
 for(const definition of visualControls){
  let group=groups.get(definition.group);
  if(!group){group=document.createElement('details');group.open=true;const summary=document.createElement('summary');summary.textContent=definition.group;group.append(summary);$('#controls').append(group);groups.set(definition.group,group);}
  const label=document.createElement('label'),input=document.createElement('input');input.id='visual-'+definition.key;input.type=definition.type??'range';input.setAttribute('aria-label',definition.label);
  if(!definition.type){input.min=definition.min;input.max=definition.max;input.step=definition.step;}
  const title=document.createElement('span');title.textContent=definition.label;
  if(definition.type==='checkbox'){label.className='check-row';label.append(title,input);}
  else{const output=document.createElement('output');output.id='value-'+definition.key;output.htmlFor=input.id;
   if(definition.type==='color'){label.className='color-row';const wrap=document.createElement('span');wrap.className='color-input';wrap.append(output,input);label.append(title,wrap);}
   else{label.className='setting';const row=document.createElement('span');row.className='label-row';row.append(title,output);label.append(row,input);}}
  input.addEventListener('input',()=>{settings=normalizeVisualSettings({...settings,[definition.key]:definition.type==='checkbox'?input.checked:definition.type==='color'?input.value:Number(input.value)});updateControls();applySettings();});group.append(label);
  if(definition.key==='bloom'){const note=document.createElement('p');note.className='hint';note.id='bloomHint';note.textContent='Off by default. Emission and soft glow stay available without full-screen post-processing.';group.append(note);}
 }
 updateControls();
}
function applySettings(){
 preview?.setSettings(settings);
 hemisphere.intensity=2*settings.lightingIntensity;key.intensity=4*settings.lightingIntensity;rim.intensity=3*settings.lightingIntensity;fill.intensity=1.1*settings.lightingIntensity;
 if(bloomPass)bloomPass.strength=.38*settings.glowIntensity;
 if(settings.bloom&&!composer)enableBloom();
 else $('#bloomHint').textContent=settings.bloom?'Full bloom is on. Turn it off for lower GPU use, especially on iPhone.':'Off by default. Emission and soft glow stay available without full-screen post-processing.';
}
async function enableBloom(){
 const generation=++bloomGeneration;$('#bloomHint').textContent='Loading optional bloom…';
 try{
  const [{EffectComposer},{RenderPass},{UnrealBloomPass},{OutputPass}]=await Promise.all([import('three/addons/postprocessing/EffectComposer.js'),import('three/addons/postprocessing/RenderPass.js'),import('three/addons/postprocessing/UnrealBloomPass.js'),import('three/addons/postprocessing/OutputPass.js')]);
  if(disposed||generation!==bloomGeneration||!settings.bloom)return;
  composer=new EffectComposer(renderer);composer.setPixelRatio(1);composer.addPass(new RenderPass(scene,camera));
  bloomPass=new UnrealBloomPass(new THREE.Vector2(stage.clientWidth,stage.clientHeight),.38*settings.glowIntensity,.45,1.1);composer.addPass(bloomPass);composer.addPass(new OutputPass());resize();
  $('#bloomHint').textContent='Full bloom is on. Turn it off for lower GPU use, especially on iPhone.';
 }catch(error){console.warn('Optional bloom unavailable',error);settings.bloom=false;updateControls();$('#bloomHint').textContent='Bloom unavailable; the lightweight soft glow remains active.';}
}
function resize(){
 if(!renderer)return;const width=stage.clientWidth,height=stage.clientHeight,mobile=matchMedia('(max-width:800px), (pointer:coarse)').matches;
 renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1:1.5));renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();composer?.setSize(width,height);
 if(preview){preview.mobile=mobile;preview.setSettings(settings);}
}
async function chooseAsset(id){
 const entry=showroomAssets.find(asset=>asset.id===id);if(!entry)return;const generation=++assetGeneration;
 $('#visualSettings').disabled=true;$('#loadStatus').hidden=false;$('#loadStatus').textContent='Loading the Blender asset…';$('#error').textContent='';
 try{
  const loaded=await ShowroomAssetPreview.load(entry);if(disposed||generation!==assetGeneration){loaded.dispose();return;}
  preview?.dispose();preview=loaded;scene.add(preview.object);settings={...showroomDefaults};updateControls();resize();applySettings();resetView();
  $('#sourceLink').href=entry.source;$('#glbLink').href=entry.url;$('#visualSettings').disabled=false;$('#loadStatus').hidden=true;
 }catch(error){console.error(error);$('#error').textContent='The preview could not load. '+error.message;$('#loadStatus').hidden=true;}
}
function downloadSettings(){
 const data=visualSettingsDocument($('#assetSelect').value,settings),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'}));
 const link=document.createElement('a');link.href=url;link.download=data.assetId+'-visual-preview.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);$('#settingsStatus').textContent='Exported preview values. No gameplay or approval state changed.';
}
buildControls();
for(const entry of showroomAssets){const option=document.createElement('option');option.value=entry.id;option.textContent=entry.label;$('#assetSelect').append(option);}
const upcoming=document.createElement('optgroup');upcoming.label='Future previews';for(const label of futureAssetCategories){const option=document.createElement('option');option.textContent=label+' — planned';option.disabled=true;upcoming.append(option);}$('#assetSelect').append(upcoming);
$('#assetSelect').onchange=event=>chooseAsset(event.target.value);
$('#resetView').onclick=()=>orbit&&resetView();$('#resetDefaults').onclick=()=>{settings={...showroomDefaults};if(preview){preview.time=0;preview.angle=0;}updateControls();applySettings();preview?.update(0,pedestalTop);$('#settingsStatus').textContent='Visual defaults restored.';};
$('#pauseMotion').onclick=()=>{paused=!paused;$('#pauseMotion').setAttribute('aria-pressed',String(paused));$('#pauseMotion').textContent=paused?'Resume motion':'Pause motion';};
$('#exportSettings').onclick=downloadSettings;$('#importSettings').onclick=()=>$('#settingsFile').click();
$('#settingsFile').onchange=async event=>{
 const file=event.target.files[0];if(!file)return;
 try{if(file.size>32768)throw new Error('Choose a preview JSON smaller than 32 KB.');settings=readVisualSettingsDocument(JSON.parse(await file.text()),$('#assetSelect').value);updateControls();applySettings();$('#settingsStatus').textContent='Preview settings loaded. Gameplay is unchanged.';}catch(error){$('#settingsStatus').textContent=error.message;}event.target.value='';
};
function render(){
 if(disposed)return;requestAnimationFrame(render);const dt=Math.min(clock.getDelta(),.05);if(document.hidden)return;
 preview?.update(paused?0:dt,pedestalTop);orbit.update();if(settings.bloom&&composer)composer.render();else renderer.render(scene,camera);
 frames++;const now=performance.now();if(now-statsStart>1000&&preview){$('#performance').textContent=`${preview.manifest.triangles.toLocaleString()} triangles · ${Math.round(preview.manifest.glbBytes/1024)} KB · ${Math.round(frames*1000/(now-statsStart))} FPS`;frames=0;statsStart=now;}
}
const observer=new ResizeObserver(resize);observer.observe(stage);
document.addEventListener('visibilitychange',()=>{clock.getDelta();frames=0;statsStart=performance.now();});
try{
 renderer=new THREE.WebGLRenderer({antialias:true});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;stage.prepend(renderer.domElement);
 key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-5,right:5,top:7,bottom:-3,near:.1,far:20});key.shadow.normalBias=.035;key.shadow.bias=-.0001;
 orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.enablePan=false;orbit.minDistance=4;orbit.maxDistance=15;orbit.maxPolarAngle=Math.PI*.49;
 const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();environment=pmrem.fromScene(room,.04).texture;scene.environment=environment;room.dispose();pmrem.dispose();
 pedestal();resize();resetView();chooseAsset(showroomAssets[0].id);render();
}catch(error){console.error(error);$('#error').textContent='The studio needs WebGL. '+error.message;$('#loadStatus').hidden=true;}
addEventListener('pagehide',event=>{if(event.persisted)return;disposed=true;bloomGeneration++;observer.disconnect();preview?.dispose();orbit?.dispose();scene.traverse(object=>{if(object.isMesh)object.geometry.dispose();});for(const material of studioMaterials)material.dispose();environment?.dispose();composer?.passes.forEach(pass=>pass.dispose?.());composer?.dispose();key.shadow.map?.dispose();renderer?.dispose();});
