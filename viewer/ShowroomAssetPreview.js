import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

function radialTexture(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const context=canvas.getContext('2d');
 const gradient=context.createRadialGradient(64,64,0,64,64,64);gradient.addColorStop(0,'rgba(255,255,255,.6)');gradient.addColorStop(.2,'rgba(255,255,255,.22)');gradient.addColorStop(.55,'rgba(255,255,255,.05)');gradient.addColorStop(1,'rgba(255,255,255,0)');
 context.fillStyle=gradient;context.fillRect(0,0,128,128);return new THREE.CanvasTexture(canvas);
}

export class ShowroomAssetPreview {
 static async load(entry){
  const [gltf,response]=await Promise.all([new GLTFLoader().loadAsync(entry.url),fetch(entry.manifest)]);
  if(!response.ok)throw new Error('The asset manifest could not load.');
  return new ShowroomAssetPreview(entry,gltf.scene,await response.json());
 }
 constructor(entry,model,manifest){
  Object.assign(this,{entry,model,manifest});this.object=new THREE.Group();this.object.name='ShowroomAssetSlot';this.object.add(model);this.time=0;this.angle=0;this.materials=new Set();this.spinners=[];this.mobile=false;
  const bounds=new THREE.Box3().setFromObject(model),center=bounds.getCenter(new THREE.Vector3());model.position.sub(center);
  if(entry.displaySize){const size=bounds.getSize(new THREE.Vector3()),scale=entry.displaySize/Math.max(size.x,size.y,size.z);model.scale.multiplyScalar(scale);model.position.multiplyScalar(scale);}
  model.traverse(object=>{if(object.isMesh){object.castShadow=object.receiveShadow=true;for(const material of Array.isArray(object.material)?object.material:[object.material])this.materials.add(material);}});
  for(const name of manifest.spinners??[]){const object=model.getObjectByName(name);if(object)this.spinners.push({object,rest:object.rotation.clone(),multiplier:object.userData.spinMultiplier??1});}
  if(entry.energyEffects){
   this.texture=radialTexture();this.glows=[];
   for(const [color,size,z] of [[0xffb52e,2.1,.06],[0x27d9f2,3.9,-.22]]){
    const material=new THREE.SpriteMaterial({map:this.texture,color,transparent:true,opacity:.35,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
    const sprite=new THREE.Sprite(material);sprite.scale.set(size,size,1);sprite.position.z=z;sprite.renderOrder=2;this.object.add(sprite);this.glows.push(sprite);
   }
   const positions=new Float32Array(64*3),colors=new Float32Array(64*3);this.particleGeometry=new THREE.BufferGeometry();this.particleGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));this.particleGeometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
   this.particleMaterial=new THREE.PointsMaterial({map:this.texture,size:.115,transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending,vertexColors:true,toneMapped:false});
   this.particles=new THREE.Points(this.particleGeometry,this.particleMaterial);this.particles.frustumCulled=false;this.object.add(this.particles);
  }
 }
 setSettings(settings){
  this.settings=settings;this.object.scale.setScalar(settings.scale);
  const main=new THREE.Color(settings.mainColor),accent=new THREE.Color(settings.accentColor);
  for(const material of this.materials){
   if(this.manifest.materials?.main?.includes(material.name))material.color.copy(main);
   if(this.manifest.materials?.accent?.includes(material.name))material.color.copy(accent);
   if(material.name==='Turbo_Gold'){material.color.copy(main);material.metalness=.65;material.roughness=.27;}
   if(material.name==='Turbo_Energy'){material.color.copy(main).multiplyScalar(.65);material.emissive.copy(main);material.emissiveIntensity=settings.glowIntensity*1.8;}
   if(material.name==='Turbo_HotCore'){material.color.copy(main).lerp(new THREE.Color('#fff4cc'),.7);material.emissive.copy(material.color);material.emissiveIntensity=settings.glowIntensity*2;}
   if(material.name==='Turbo_Cyan'){material.color.copy(accent).multiplyScalar(.5);material.emissive.copy(accent);material.emissiveIntensity=settings.glowIntensity*.65;}
  }
  if(this.glows){this.glows[0].material.color.copy(main);this.glows[1].material.color.copy(accent);for(const glow of this.glows)glow.material.opacity=settings.glowIntensity*.24;}
  if(this.particles){
   const colors=this.particleGeometry.attributes.color;
   for(let i=0;i<64;i++){const color=i%3===0?main:accent;colors.setXYZ(i,color.r,color.g,color.b);}colors.needsUpdate=true;
   this.particleGeometry.setDrawRange(0,Math.round((this.mobile?32:64)*settings.particleIntensity/100));
  }
 }
 update(dt,pedestalTop){
  if(!this.settings)return;this.time+=dt;const s=this.settings;this.angle+=dt*s.rotationSpeed*Math.PI/180;
  this.object.rotation.y=this.angle;this.object.position.y=pedestalTop+s.floatHeight+Math.sin(this.time*s.floatSpeed*Math.PI*2)*s.floatAmount;
  for(const spinner of this.spinners)spinner.object.rotation.z=spinner.rest.z+this.angle*spinner.multiplier;
  const pulse=.85+.15*Math.sin(this.time*2.8);
  for(const material of this.materials)if(['Turbo_Energy','Turbo_HotCore','Turbo_Cyan'].includes(material.name))material.emissiveIntensity=s.glowIntensity*(material.name==='Turbo_HotCore'?2:material.name==='Turbo_Cyan'?.65:1.6)*pulse;
  if(this.glows)for(const glow of this.glows)glow.material.opacity=s.glowIntensity*.24*pulse;
  if(this.particles){
   const positions=this.particleGeometry.attributes.position;
   for(let i=0;i<64;i++){
    const phase=i*2.399963+this.time*(.23+(i%5)*.035),radius=1.55+(i%7)*.075;
    positions.setXYZ(i,Math.cos(phase)*radius,Math.sin(i*4.7+this.time*.75)*1.65,Math.sin(phase)*radius*.75);
   }
   positions.needsUpdate=true;this.particleMaterial.opacity=(.65+.2*pulse)*Math.min(1,s.glowIntensity+.2);
  }
 }
 dispose(){
  this.object.removeFromParent();const geometries=new Set();this.model.traverse(object=>{if(object.isMesh)geometries.add(object.geometry);});for(const geometry of geometries)geometry.dispose();
  const textures=new Set();for(const material of this.materials){for(const value of Object.values(material))if(value?.isTexture)textures.add(value);material.dispose();}for(const texture of textures)texture.dispose();
  this.texture?.dispose();if(this.glows)for(const glow of this.glows)glow.material.dispose();this.particleGeometry?.dispose();this.particleMaterial?.dispose();
 }
}
