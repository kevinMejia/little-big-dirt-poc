import * as THREE from 'three';

function label(text,width=512,height=128){
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const c=canvas.getContext('2d');
 c.fillStyle='#3e5035';c.fillRect(0,0,width,height);c.strokeStyle='#d3bf86';c.lineWidth=8;c.strokeRect(5,5,width-10,height-10);c.fillStyle='#fff3d1';c.textAlign='center';c.textBaseline='middle';c.font='bold 38px system-ui';c.fillText(text,width/2,height/2);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
export function createRallyVisuals(scene,track,access,roads,landscape){
 const group=new THREE.Group();group.name='Pine Ridge dirt rally';scene.add(group);
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 // Reuse the game's existing soil atlas on the spline road, with longitudinal grain.
 const texture=new THREE.TextureLoader().load(new URL('./assets/terrain/painted-soil-stone-v1.png',import.meta.url).href);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
 material.onBeforeCompile=shader=>{shader.uniforms.rallySoil={value:texture};shader.fragmentShader='uniform sampler2D rallySoil;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 vec2 grain=vec2(fract(vUv.x*2.)*.47+.015,fract(vUv.y)*.97+.015);
 diffuseColor.rgb*=mix(vec3(1.),texture2D(rallySoil,grain).rgb*1.6,.35);
 float tires=exp(-pow((fract(vUv.x*4.)-.5)*8.,2.));diffuseColor.rgb*=1.-tires*.065;`);shader.vertexShader='#define USE_UV\n'+shader.vertexShader;shader.fragmentShader='#define USE_UV\n'+shader.fragmentShader;};material.customProgramCacheKey=()=> 'rally-dirt-v1';
 roads.forEach(road=>{const mesh=new THREE.Mesh(road.geometry,material);mesh.receiveShadow=true;mesh.name='Spline dirt road / shared collider';group.add(mesh);});
 const wood=new THREE.MeshStandardMaterial({color:0x765638,roughness:1});
 const sign=(s,text)=>{const root=new THREE.Group();root.position.set(s.x,s.y,s.z);root.rotation.y=Math.atan2(s.tx,s.tz);
  for(const x of [-3.5,3.5]){const pole=new THREE.Mesh(new THREE.CylinderGeometry(.14,.2,3.2,6),wood);pole.position.set(x,1.6,0);root.add(pole);}
  const map=label(text),board=new THREE.Mesh(new THREE.BoxGeometry(8,1.65,.18),new THREE.MeshStandardMaterial({map,roughness:1}));board.position.y=3;root.add(board);group.add(root);
 };
 const start=track.at(track.config.startFinish.u);sign({...start,x:start.x+start.tz*(start.width/2+6),z:start.z-start.tx*(start.width/2+6)},'START / FINISH');
 const entrance=access.at(.02);sign({...entrance,x:entrance.x+entrance.tz*11,z:entrance.z-entrance.tx*11},'PINE RIDGE RALLY  →');
 const stripe=new THREE.Mesh(new THREE.PlaneGeometry(start.width,.5).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({color:0x6a5435,roughness:1,polygonOffset:true,polygonOffsetFactor:-2}));stripe.position.set(start.x,start.y+.025,start.z);stripe.rotation.y=Math.atan2(start.tx,start.tz);group.add(stripe);
 let debug=null;
 function setDebug(enabled){
  if(!enabled){if(debug){debug.removeFromParent();dispose(debug);debug=null;}return;}
  if(debug)return;debug=new THREE.Group();debug.name='Rally control-point debug';group.add(debug);
  const line=(points,color)=>{const geometry=new THREE.BufferGeometry().setFromPoints(points),mesh=new THREE.Line(geometry,new THREE.LineBasicMaterial({color,depthTest:false}));mesh.renderOrder=20;debug.add(mesh);};
  for(const path of [track,access]){
   line(path.samples.map(s=>new THREE.Vector3(s.x,s.y+.25,s.z)),0xffe169);
   for(const side of [-1,1])line(path.samples.map(s=>new THREE.Vector3(s.x+s.tz*s.width/2*side,s.y+s.width/2*side*Math.tan(s.bank)+.18,s.z-s.tx*s.width/2*side)),0x6ffff0);
   path.points.forEach((p,i)=>{const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:label(`${i} · ${p.id} · ${p.y.toFixed(1)}m`,768,96),depthTest:false}));sprite.position.set(p.x,p.y+4,p.z);sprite.scale.set(17,2.2,1);sprite.renderOrder=25;debug.add(sprite);const dot=new THREE.Mesh(new THREE.SphereGeometry(.65,8,6),new THREE.MeshBasicMaterial({color:0xffdd69,depthTest:false}));dot.position.set(p.x,p.y+.5,p.z);debug.add(dot);});
   for(let u=.025;u<1;u+=.055){const s=path.at(u),arrow=new THREE.ArrowHelper(new THREE.Vector3(s.tx,0,s.tz),new THREE.Vector3(s.x,s.y+.6,s.z),5,0xffee88,1.5,1);debug.add(arrow);}
  }
 }
 function dispose(root){const gs=new Set(),ms=new Set(),ts=new Set();root.traverse(o=>{if(o.geometry)gs.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){ms.add(m);for(const v of Object.values(m))if(v?.isTexture)ts.add(v);}});for(const g of gs)g.dispose();for(const m of ms)m.dispose();for(const t of ts)t.dispose();}
 return {group,setDebug,dispose(){group.removeFromParent();dispose(group);texture.dispose();}};
}
