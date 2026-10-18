import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {EnvironmentAssets} from '../EnvironmentAssets.js';
import {RockVisuals} from '../RockVisuals.js';
import {RockInteractionSystem} from '../RockInteractionSystem.js';
import {pineKinds,pineHeight,preparePine} from '../PineTreeConfig.js';

const stage=document.querySelector('#stage'),status=document.querySelector('#status');
const scene=new THREE.Scene();scene.background=new THREE.Color(0xc6e6ec);scene.fog=new THREE.Fog(0xc6e6ec,28,65);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;stage.prepend(renderer.domElement);
const camera=new THREE.PerspectiveCamera(42,1,.1,100);camera.position.set(10,7,12);
const orbit=new OrbitControls(camera,renderer.domElement);orbit.target.set(0,1.8,0);orbit.enableDamping=true;orbit.minDistance=3;orbit.maxDistance=28;orbit.maxPolarAngle=Math.PI*.49;
scene.add(new THREE.HemisphereLight(0xe4f4ff,0x727b4d,2));
const sun=new THREE.DirectionalLight(0xffefd0,3.2);sun.position.set(-5,10,6);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10});sun.shadow.normalBias=.025;scene.add(sun);
// A subtly sloped grassy floor also exercises gravity and ground contact for debris.
const groundHeight=(x,z)=>-.025+.018*x+.012*z;
const groundGeometry=new THREE.PlaneGeometry(100,100,1,1);groundGeometry.rotateX(-Math.PI/2);
const positions=groundGeometry.attributes.position;for(let i=0;i<positions.count;i++)positions.setY(i,groundHeight(positions.getX(i),positions.getZ(i)));groundGeometry.computeVertexNormals();
const groundMaterial=new THREE.MeshStandardMaterial({color:0x93b86a,roughness:1});const ground=new THREE.Mesh(groundGeometry,groundMaterial);ground.receiveShadow=true;scene.add(ground);
const library=new EnvironmentAssets(),clock=new THREE.Clock();let tree,rockSystem,rockVisuals,previewRock,treeMode='idle',treeTime=0,treeStart=0,disposed=false;
const treeBase=new THREE.Vector3(-2.5,groundHeight(-2.5,0),0),rockBase=new THREE.Vector3(2.5,groundHeight(2.5,0),0);
const smooth=t=>t*t*(3-2*t);
function treeAction(mode){treeStart=tree.rotation.z;treeMode=mode;treeTime=0;}
function rockAction(mode){
  if(!previewRock)return;
  rockVisuals.damageMaterial.opacity=1;
  if(['cracked','shattered'].includes(mode)&&!['INTACT','CRACKED'].includes(previewRock.state))rockAction('intact');
  if(mode==='cracked'){previewRock.state='CRACKED';previewRock.cracks.visible=true;rockSystem.hit(previewRock,{nx:0,nz:-1},6,'crack');}
  else if(mode==='shattered')rockSystem.shatter(previewRock,.4,.8,14);
  else if(mode==='reforming'){
    if(previewRock.state!=='BROKEN')rockSystem.shatter(previewRock,.4,.8,14);
    // Fast-forward the preview clock, so pooled debris expires through the same
    // lifecycle as the game rather than remaining beside the restored rock.
    rockSystem.update(Math.max(0,rockSystem.config.respawnSeconds-previewRock.elapsed));
  }else{
    previewRock.state='INTACT';previewRock.group.visible=true;previewRock.group.scale.setScalar(1);previewRock.cracks.visible=false;rockSystem.active.delete(previewRock);
    for(const f of rockSystem.fragments){f.active=false;f.mesh.visible=false;f.owner=null;}
  }
  document.querySelector('#seams').value=mode==='cracked'?100:0;
  document.querySelector('#seamValue').value=mode==='cracked'?'100%':'0%';
}
function setView(name){const target=name==='tree'?treeBase.clone().add(new THREE.Vector3(0,2.4,0)):name==='rock'?rockBase.clone().add(new THREE.Vector3(0,.8,0)):new THREE.Vector3(0,1.8,0);orbit.target.copy(target);camera.position.copy(target).add(name==='above'?new THREE.Vector3(.01,15,.01):name==='tree'?new THREE.Vector3(6,3.5,7):name==='rock'?new THREE.Vector3(5,2.5,5):new THREE.Vector3(10,5.2,12));orbit.update();}
for(const button of document.querySelectorAll('[data-view]'))button.onclick=()=>setView(button.dataset.view);
for(const button of document.querySelectorAll('[data-action]'))button.onclick=()=>{const action=button.dataset.action;if(['wobble','fall','recover'].includes(action))treeAction(action);else if(action==='crack')rockAction('cracked');else if(action==='shatter')rockAction('shattered');else if(action==='respawn')rockAction('reforming');else{treeAction('recover');rockAction('intact');setView('both');}};
document.querySelector('#seams').oninput=event=>{const value=Number(event.target.value)/100;rockAction(value?'cracked':'intact');rockVisuals.damageMaterial.transparent=true;rockVisuals.damageMaterial.opacity=value;document.querySelector('#seams').value=Math.round(value*100);document.querySelector('#seamValue').value=Math.round(value*100)+'%';};
function resize(){const {width,height}=stage.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();}const observer=new ResizeObserver(resize);observer.observe(stage);resize();
try{
  const pineTemplates=await Promise.all(pineKinds.map(kind=>library.load(kind)));
  const dimensions=await (await fetch('../assets/models/trees/pines/dimensions.json')).json();
  const selectPine=index=>{
    tree?.removeFromParent();

    // Match the gameplay height band for each silhouette, keeping relative sizes.
    const height=pineHeight(index);
    tree=preparePine(THREE,pineTemplates[index],height);tree.position.copy(treeBase);scene.add(tree);treeMode='idle';
    const d=dimensions[index];document.querySelector('#pineDimensions').textContent=`Source: ${d.width.toFixed(2)} × ${d.height.toFixed(2)} × ${d.depth.toFixed(2)} m (W/H/D). Preview height: ${height.toFixed(1)} m. Dirty: 4.61 m; Stinky: 3.90 m.`;
  };
  selectPine(0);document.querySelector('#pineVariant').disabled=false;document.querySelector('#pineVariant').onchange=e=>selectPine(Number(e.target.value));
  const rockManifest=await (await fetch('../assets/models/rocks/quaternius/manifest.json')).json();
  const selectRock=async index=>{
    document.querySelector('#rockVariant').disabled=true;
    rockVisuals?.dispose();rockSystem?.dispose();
    rockSystem=new RockInteractionSystem(scene,{groundHeight});
    previewRock=rockSystem.addRock(rockBase.x,rockBase.z,1.4);
    rockVisuals=await RockVisuals.connect(scene,library,rockSystem,{previewVariant:index});
    const d=rockManifest.models[index];document.querySelector('#rockDimensions').textContent=`Source: ${d.width.toFixed(2)} × ${d.height.toFixed(2)} × ${d.depth.toFixed(2)} m (W/H/D). Preview collision radius: ${(previewRock.r*.85).toFixed(2)} m.`;
    document.querySelector('#rockVariant').disabled=false;rockAction('intact');
  };
  await selectRock(0);document.querySelector('#rockVariant').onchange=e=>selectRock(Number(e.target.value)).catch(error=>{document.querySelector('#error').textContent=error.message;});
  for(const button of document.querySelectorAll('[data-action]'))button.disabled=false;document.querySelector('#seams').disabled=false;
  status.textContent='Five pines + three textured rocks loaded · shared materials · pooled destruction';
}catch(error){document.querySelector('#error').textContent='Could not load preview: '+error.message;console.error(error);}
function animate(){if(disposed)return;requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);
  if(tree){treeTime+=dt;
    if(treeMode==='wobble'){tree.rotation.z=treeStart*Math.exp(-treeTime*4)+Math.sin(treeTime*12)*.14*Math.exp(-treeTime*2.2);if(treeTime>3){tree.rotation.z=0;treeMode='idle';}}
    if(treeMode==='fall'){tree.rotation.z=THREE.MathUtils.lerp(treeStart,-1.47,smooth(Math.min(treeTime/.8,1)));if(treeTime>8.8)treeAction('recover');}
    if(treeMode==='recover'){tree.rotation.z=treeStart*(1-smooth(Math.min(treeTime/1.5,1)));if(treeTime>=1.5)treeMode='idle';}
    if(rockVisuals){rockSystem.update(dt);rockVisuals.update();}
    document.querySelector('#treeState').textContent='Tree: '+treeMode;document.querySelector('#rockState').textContent='Rock: '+(previewRock?.state.toLowerCase()??'loading');
  }orbit.update();renderer.render(scene,camera);
}animate();
addEventListener('pagehide',()=>{disposed=true;observer.disconnect();orbit.dispose();groundGeometry.dispose();groundMaterial.dispose();renderer.dispose();rockVisuals?.dispose();rockSystem?.dispose();library.dispose();},{once:true});
