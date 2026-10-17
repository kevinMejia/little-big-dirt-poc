import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {EnvironmentAssets} from '../EnvironmentAssets.js';

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
const library=new EnvironmentAssets(),clock=new THREE.Clock();let tree,rock,fractured,pieces=[],treeMode='idle',treeTime=0,treeStart=0,rockMode='intact',rockTime=0,seam=0,disposed=false;
const treeBase=new THREE.Vector3(-2.5,groundHeight(-2.5,0),0),rockBase=new THREE.Vector3(2.5,groundHeight(2.5,0),0);
const smooth=t=>t*t*(3-2*t);
function treeAction(mode){treeStart=tree.rotation.z;treeMode=mode;treeTime=0;}
function restPieces(spread=0){for(const p of pieces){p.object.position.copy(p.rest).addScaledVector(p.outward,spread);p.object.quaternion.copy(p.quaternion);}}
function rockAction(mode){rockMode=mode;rockTime=0;seam=0;document.querySelector('#seams').value=0;document.querySelector('#seamValue').value='0%';
  rock.visible=mode==='intact';fractured.visible=mode!=='intact';if(mode!=='reforming')restPieces(mode==='cracked'?.025:0);
  if(mode==='shattered')pieces.forEach((p,i)=>{const a=i*Math.PI*2/pieces.length;p.velocity.set(Math.cos(a)*(1.5+i*.16),2.8+i*.22,Math.sin(a)*(1.5+i*.16));p.spin.set(.6+i*.17,.4-i*.15,.5+i*.1);});
  if(mode==='reforming')for(const p of pieces){p.from.copy(p.object.position);p.fromQuaternion.copy(p.object.quaternion);}
}
function setView(name){const target=name==='tree'?treeBase.clone().add(new THREE.Vector3(0,2.4,0)):name==='rock'?rockBase.clone().add(new THREE.Vector3(0,.8,0)):new THREE.Vector3(0,1.8,0);orbit.target.copy(target);camera.position.copy(target).add(name==='above'?new THREE.Vector3(.01,15,.01):name==='tree'?new THREE.Vector3(6,3.5,7):name==='rock'?new THREE.Vector3(5,2.5,5):new THREE.Vector3(10,5.2,12));orbit.update();}
for(const button of document.querySelectorAll('[data-view]'))button.onclick=()=>setView(button.dataset.view);
for(const button of document.querySelectorAll('[data-action]'))button.onclick=()=>{const action=button.dataset.action;if(['wobble','fall','recover'].includes(action))treeAction(action);else if(action==='crack')rockAction('cracked');else if(action==='shatter')rockAction('shattered');else if(action==='respawn')rockAction('reforming');else{treeAction('recover');rockAction('intact');setView('both');}};
document.querySelector('#seams').oninput=event=>{seam=Number(event.target.value)/100;rockMode=seam?'inspect':'intact';rock.visible=!seam;fractured.visible=!!seam;restPieces(seam*.65);document.querySelector('#seamValue').value=Math.round(seam*100)+'%';};
function resize(){const {width,height}=stage.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();}const observer=new ResizeObserver(resize);observer.observe(stage);resize();
try{
  [tree,rock,fractured]=await Promise.all(['tree','boulder','fractured'].map(kind=>library.clone(kind)));
  tree.position.copy(treeBase);rock.position.copy(rockBase);scene.add(tree,rock,fractured);
  // Bevels lift the lowest corner slightly; seat the evaluated GLB on the floor.
  rock.updateMatrixWorld(true);const floorBounds=new THREE.Box3().setFromObject(rock);rockBase.y-=floorBounds.min.y-groundHeight(rockBase.x,rockBase.z);rock.position.copy(rockBase);fractured.position.copy(rockBase);fractured.visible=false;
  fractured.traverse(o=>{if(!/^Boulder_piece_\d+$/.test(o.name))return;const outward=o.position.clone().sub(new THREE.Vector3(0,.9,0)).normalize();pieces.push({object:o,rest:o.position.clone(),quaternion:o.quaternion.clone(),outward,velocity:new THREE.Vector3(),spin:new THREE.Vector3(),from:new THREE.Vector3(),fromQuaternion:new THREE.Quaternion(),radius:0});});
  // Piece origins are authored at each chunk's center; rest translations tile the intact shell.
  fractured.updateMatrixWorld(true);for(const p of pieces){const b=new THREE.Box3().setFromObject(p.object);p.radius=Math.max(.15,p.object.getWorldPosition(new THREE.Vector3()).y-b.min.y);}
  if(pieces.length!==5)throw new Error('Expected five named imported fracture meshes');
  for(const button of document.querySelectorAll('[data-action]'))button.disabled=false;document.querySelector('#seams').disabled=false;
  status.textContent='Three Blender GLBs loaded · 1 tree · 1 boulder · 5 reusable fracture pieces';
}catch(error){document.querySelector('#error').textContent='Could not load preview: '+error.message;console.error(error);}
function animate(){if(disposed)return;requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);
  if(tree){treeTime+=dt;
    if(treeMode==='wobble'){tree.rotation.z=treeStart*Math.exp(-treeTime*4)+Math.sin(treeTime*12)*.14*Math.exp(-treeTime*2.2);if(treeTime>3){tree.rotation.z=0;treeMode='idle';}}
    if(treeMode==='fall'){tree.rotation.z=THREE.MathUtils.lerp(treeStart,-1.47,smooth(Math.min(treeTime/.8,1)));if(treeTime>8.8)treeAction('recover');}
    if(treeMode==='recover'){tree.rotation.z=treeStart*(1-smooth(Math.min(treeTime/1.5,1)));if(treeTime>=1.5)treeMode='idle';}
    rockTime+=dt;
    if(rockMode==='shattered'){
      for(const p of pieces){const steps=3,h=dt/steps;for(let i=0;i<steps;i++){p.velocity.y-=8*h;p.object.position.addScaledVector(p.velocity,h);const worldX=rockBase.x+p.object.position.x,worldZ=rockBase.z+p.object.position.z,floor=groundHeight(worldX,worldZ)-rockBase.y+p.radius;
        if(p.object.position.y<floor){p.object.position.y=floor;p.velocity.y=Math.abs(p.velocity.y)>.55?-p.velocity.y*.32:0;p.velocity.x-=.018*8*h;p.velocity.z-=.012*8*h;p.velocity.x*=Math.exp(-2.5*h);p.velocity.z*=Math.exp(-2.5*h);}}
        p.object.rotation.x+=p.spin.x*dt;p.object.rotation.y+=p.spin.y*dt;p.object.rotation.z+=p.spin.z*dt;p.spin.multiplyScalar(Math.exp(-1.2*dt));
      }if(rockTime>15)rockAction('reforming');
    }
    if(rockMode==='reforming'){const t=smooth(Math.min(rockTime/.9,1));for(const p of pieces){p.object.position.lerpVectors(p.from,p.rest,t);p.object.quaternion.slerpQuaternions(p.fromQuaternion,p.quaternion,t);}if(t===1)rockAction('intact');}
    document.querySelector('#treeState').textContent='Tree: '+treeMode;document.querySelector('#rockState').textContent='Boulder: '+rockMode;
  }orbit.update();renderer.render(scene,camera);
}animate();
addEventListener('pagehide',()=>{disposed=true;observer.disconnect();orbit.dispose();groundGeometry.dispose();groundMaterial.dispose();renderer.dispose();library.dispose();},{once:true});
