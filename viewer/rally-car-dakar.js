import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RallyCarVehicle} from '../RallyCarVehicle.js';
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;document.body.append(renderer.domElement);
const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.04);room.dispose();pmrem.dispose();
const scenes=[],models=[],cameras=[];
for(let i=0;i<2;i++){
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x687277);scene.environment=environment.texture;scene.environmentIntensity=.65;scene.add(new THREE.HemisphereLight(0xf1f8ff,0x525950,1.65));
 const key=new THREE.DirectionalLight(0xfff2dc,3.2);key.position.set(3,7,5);scene.add(key);const fill=new THREE.DirectionalLight(0xe3f1ff,1.8);fill.position.set(-4,4,-2);scene.add(fill);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({color:0x697176,roughness:.85}));floor.position.y=-.018;scene.add(floor);
 const camera=new THREE.PerspectiveCamera(32,1,.05,300);scenes.push(scene);cameras.push(camera);
}
const orbit=new OrbitControls(cameras[0],renderer.domElement);orbit.target.set(0,1.05,0);orbit.enablePan=false;orbit.enableDamping=true;orbit.minDistance=5;orbit.maxDistance=16;
const views={hero:[6.6,3.4,8],side:[10.5,2.8,0],opposite:[-10.5,2.8,0],rear:[6.6,3.6,-8],top:[4.8,9,8]};
function setView(view){cameras[0].position.set(...views[view]);orbit.target.set(0,1.05,0);orbit.update();document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));setView('hero');
let width,height;
function resize(){width=innerWidth;height=innerHeight-document.querySelector('header').offsetHeight;renderer.setSize(width,height);for(const c of cameras){c.aspect=width/2/height;c.updateProjectionMatrix();}}
addEventListener('resize',resize);resize();
try{
 const loader=new GLTFLoader();const loaded=await Promise.all(['audi_rs_q_e-tron.glb','audi_rs_q_e-tron_dakar.glb'].map(file=>loader.loadAsync(new URL('../assets/'+file,import.meta.url).href)));
 loaded.forEach((gltf,i)=>{const model=new RallyCarVehicle(gltf.scene);models.push(model);scenes[i].add(model.group);});
 document.querySelector('#status').textContent='Original geometry and wheel pivots preserved · 1024px replacement paint atlases';
 window.rallyCarDakarQA=window.audiDakarQA={setView,models,scenes,renderer,read:()=>models.map(m=>({wheels:m.wheels.map(w=>({x:w.x,z:w.z,r:w.radius})),bounds:new THREE.Box3().setFromObject(m.group).getSize(new THREE.Vector3()).toArray()}))};
}catch(error){document.querySelector('#status').textContent=error.message;console.error(error);}
function draw(){requestAnimationFrame(draw);orbit.update();cameras[1].position.copy(cameras[0].position);cameras[1].quaternion.copy(cameras[0].quaternion);renderer.setScissorTest(true);for(let i=0;i<2;i++){renderer.setViewport(i*width/2,0,width/2,height);renderer.setScissor(i*width/2,0,width/2,height);renderer.render(scenes[i],cameras[i]);}renderer.setScissorTest(false);}draw();

addEventListener('pagehide',event=>{if(event.persisted)return;orbit.dispose();for(const scene of scenes)RallyCarVehicle.dispose(scene);environment.dispose();renderer.dispose();});
