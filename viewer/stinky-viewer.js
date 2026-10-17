import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {StinkyGLB} from '../assets/stinky/StinkyGLB.js';

const params=new URLSearchParams(location.search),embedded=params.get('embedded')==='1',isTruck=false;
document.body.classList.toggle('embedded',embedded);document.body.classList.toggle('truck',isTruck);
document.querySelector('h1').textContent=isTruck?'Garbage truck · Explore & play':'Stinky · Model review';
if(params.get('asset')==='candidate')document.querySelector('#comparisonLink').href='./comparison.html?asset=candidate';
let active=true;
const initPromise=embedded?new Promise(resolve=>{const receive=event=>{if(event.origin===location.origin&&event.source===parent&&event.data?.type==='garage:init'){removeEventListener('message',receive);resolve(event.data);}};addEventListener('message',receive);parent.postMessage({type:'garage:ready'},location.origin);}):Promise.resolve(null);
addEventListener('message',event=>{if(event.origin===location.origin&&event.source===parent&&event.data?.type==='garage:visibility'){active=!!event.data.visible;if(model&&event.data.pose)for(const key of ['hopper','compactor']){const value=event.data.pose[key];if(Number.isFinite(value)){document.getElementById(key).value=value;document.getElementById(key+'Value').textContent=value+'°';setters[key](value);}}}});
addEventListener('keydown',event=>{if(event.code==='Escape'&&embedded){event.preventDefault();parent.postMessage({type:'garage:close'},location.origin);}});
const stage=document.querySelector('#stage'),scene=new THREE.Scene();scene.background=new THREE.Color(0xe7e9e4);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;stage.prepend(renderer.domElement);
const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();const studioEnvironment=pmrem.fromScene(room,.04);scene.environment=studioEnvironment.texture;scene.environmentIntensity=.3;room.dispose();pmrem.dispose();
const camera=new THREE.PerspectiveCamera(38,1,.1,150);const orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.minDistance=5;orbit.maxDistance=28;orbit.maxPolarAngle=Math.PI*.94;orbit.target.set(0,2,.1);
scene.add(new THREE.HemisphereLight(0xfff9e9,0x7f8f7a,1.35));
for(const [x,y,z,intensity] of [[-7,12,8,2.5],[8,6,2,.8],[0,9,-8,1.3]]){const light=new THREE.DirectionalLight(0xfff6dc,intensity);light.position.set(x,y,z);scene.add(light);if(intensity>2){light.castShadow=true;light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-8,right:8,top:8,bottom:-8});light.shadow.normalBias=.025;}}
const ground=new THREE.Mesh(new THREE.CircleGeometry(30,80),new THREE.MeshStandardMaterial({color:0xe0e3d9,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.025;ground.receiveShadow=true;scene.add(ground);
const views={hero:[8,5.8,11],front:[0,3.5,14],side:[15,2.8,-.1],rear:[0,3.5,-14],above:[.01,15,.01]};
function view(name){camera.position.set(...views[name]);orbit.target.set(0,2,0);orbit.update();for(const b of document.querySelectorAll('[data-view]'))b.classList.toggle('active',b.dataset.view===name);}
for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>view(b.dataset.view);view('hero');
function resize(){const {width,height}=stage.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(stage);resize();
let model,angle=0;
const rad=THREE.MathUtils.degToRad;
function sendPose(){if(!embedded||isTruck)return;const pose={};for(const key of ['hopper','compactor'])pose[key]=Number(document.getElementById(key).value);parent.postMessage({type:'garage:pose',pose},location.origin);}
const setters={steer:v=>model.setSteering(rad(v)),hopper:v=>model.setHopper(rad(v)),compactor:v=>model.setCompactor(rad(v))};
for(const [id,set] of Object.entries(setters)){const input=document.getElementById(id);input.oninput=()=>{document.getElementById(id+'Value').textContent=input.value+(id==='lift'?'%':'°');if(model){set(Number(input.value));model.update(0);sendPose();}};}
document.querySelector('#reset').onclick=()=>{if(!model)return;model.reset();angle=0;document.querySelector('#spin').checked=false;for(const id of Object.keys(setters)){const input=document.getElementById(id);input.value=0;document.getElementById(id+'Value').textContent='0'+(id==='lift'?'%':'°');}sendPose();};
try{
  const init=await initPromise;if(init)active=init.visible!==false;
  model=await StinkyGLB.load(new URL('../assets/stinky/stinky.glb',import.meta.url).href);scene.add(model.group);
  if(!isTruck&&init?.pose){for(const [key,value] of Object.entries(init.pose)){if(!setters[key])continue;document.getElementById(key).value=value;document.getElementById(key+'Value').textContent=value+(key==='lift'?'%':'°');setters[key](value);}model.update(0);}
  const box=new THREE.Box3().setFromObject(model.group),size=box.getSize(new THREE.Vector3());
  document.querySelector('#status').textContent=isTruck?'Garbage truck · Steering and wheel controls':`Blender model · ${size.x.toFixed(1)} × ${size.y.toFixed(1)} × ${size.z.toFixed(1)} m`;
}catch(error){document.querySelector('#error').hidden=false;document.querySelector('#error').textContent='Model could not load: '+error.message;document.querySelector('#status').textContent='Load failed';console.error(error);}
const clock=new THREE.Clock();function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);if(!active)return;if(model){if(document.querySelector('#spin').checked){angle+=dt*1.6;model.setWheelRotation(angle);}model.update(dt);}orbit.update();renderer.render(scene,camera);}animate();
addEventListener('pagehide',()=>{model?.dispose();orbit.dispose();ground.geometry.dispose();ground.material.dispose();studioEnvironment.dispose();renderer.dispose();},{once:true});
