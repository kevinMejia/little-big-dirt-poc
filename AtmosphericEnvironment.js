import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {environmentConfig as defaults} from './AtmosphericEnvironmentConfig.js';
const clamp=THREE.MathUtils.clamp;

// Separate depth buffer pass: distant scenery never changes gameplay clipping,
// fog, terrain, physics, shadow budgets, or the playable world's coordinates.
export async function createAtmosphericEnvironment({scene,camera,renderer,bounds,halfSize,config=defaults}){
 const gltf=await new GLTFLoader().loadAsync(new URL('./assets/models/mountains/mountain-ranges.glb',import.meta.url).href);
 const backdrop=new THREE.Scene(),view=camera.clone();view.near=1;view.far=12000;
 const center=new THREE.Vector3(bounds?(bounds.minX+bounds.maxX)/2:0,0,0);
 const extent=Math.hypot(bounds?(bounds.maxX-bounds.minX)/2:halfSize,halfSize);
 const radius=extent*2.8*clamp(config.mountains.distance,.8,2),haze=clamp(config.mountains.hazeStrength,0,1);
 view.far=Math.max(12000,radius*2.5+extent);
 const sky=new THREE.Mesh(new THREE.SphereGeometry(10000,32,16),new THREE.ShaderMaterial({
  side:THREE.BackSide,depthWrite:false,toneMapped:false,
  uniforms:{top:{value:new THREE.Color(config.sky.zenith)},bottom:{value:new THREE.Color(config.sky.horizon)}},
  vertexShader:'varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec3 direction;uniform vec3 top;uniform vec3 bottom;void main(){float h=max(0.,normalize(direction).y);vec3 c=mix(bottom,top,smoothstep(0.,.65,pow(h,.65)));gl_FragColor=vec4(c,1.);#include <colorspace_fragment>}`.replace('#include','\n#include'),
 }));sky.renderOrder=-10;sky.frustumCulled=false;sky.visible=config.sky.enabled;backdrop.add(sky);
 const palettes={far:['#729ebc','#c2dbe4'],middle:['#426f91','#a5c6d0'],foothills:['#548348','#95b276']};
 const sunlight=new THREE.Vector3(-.5,.8,.3).normalize();
 gltf.scene.traverse(o=>{if(!o.isMesh)return;const old=o.material,pair=palettes[o.name]??palettes.middle;
  o.material=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,toneMapped:false});
  const indexed=o.geometry;o.geometry=indexed.toNonIndexed();if(indexed!==o.geometry)indexed.dispose();o.geometry.computeVertexNormals();
  const p=o.geometry.attributes.position,n=o.geometry.attributes.normal,colors=[],color=new THREE.Color(),low=new THREE.Color(pair[0]),mist=new THREE.Color(pair[1]),snow=new THREE.Color('#e4edf0'),green=new THREE.Color('#638d57');
  for(let i=0;i<p.count;i++){
   const y=p.getY(i),normal=new THREE.Vector3().fromBufferAttribute(n,i);
   const light=.65+.42*Math.max(0,normal.dot(sunlight));
   color.copy(low);
   if(o.name!=='foothills'){
    color.lerp(green,Math.max(0,1-y/.22)*(o.name==='middle'?.55:.12));
    const snowLine=o.name==='far'?.31:.27;
    const snowAmount=THREE.MathUtils.smoothstep(y+normal.x*.018,snowLine,snowLine+.07)*Math.max(0,normal.y)*.85;
    color.lerp(snow,snowAmount);
   }
   color.multiplyScalar(light).lerp(mist,clamp(haze*.28+(1-THREE.MathUtils.smoothstep(y,0,.32))*.24,0,.6));
   colors.push(color.r,color.g,color.b);
  }
  o.geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));old.dispose();o.castShadow=o.receiveShadow=false;
 });
 gltf.scene.scale.set(radius,radius*clamp(config.mountains.scale,.5,1.5),radius);gltf.scene.position.copy(center);gltf.scene.position.y=radius*.09;gltf.scene.visible=config.mountains.enabled;backdrop.add(gltf.scene);
 const ambient=new THREE.HemisphereLight('#ffffff','#b4c9df',2.1),sun=new THREE.DirectionalLight('#fff3d9',2);sun.position.set(-55,100,48);backdrop.add(ambient,sun);
 const cloudAsset=await new GLTFLoader().loadAsync(new URL('./assets/models/mountains/clouds.glb',import.meta.url).href);
 const templates=[];cloudAsset.scene.traverse(o=>{if(o.isMesh)templates.push(o);});
 const clouds=new THREE.Group(),count=Math.round(clamp(config.clouds.density,0,1)*42),dummy=new THREE.Object3D();
 const cloudMaterial=new THREE.MeshStandardMaterial({color:'#fffdf4',roughness:1});
 let seed=83;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 for(let v=0;v<templates.length;v++){
  const source=templates[v],batchCount=Math.ceil(count/templates.length),batch=new THREE.InstancedMesh(source.geometry,cloudMaterial,batchCount);
  source.material.dispose();
  for(let j=0;j<batchCount;j++){
   const i=j*templates.length+v,a=i*2.39996,r=radius*(1.1+random()*1.1),y=radius*(.45+random()*.65),size=radius*(.035+random()*.04);
   dummy.position.set(center.x+Math.cos(a)*r,y,Math.sin(a)*r);dummy.rotation.y=-a-Math.PI/2;dummy.scale.set(size,size*(1.05+random()*.35),size);dummy.updateMatrix();batch.setMatrixAt(j,dummy.matrix);
  }
  batch.computeBoundingSphere();clouds.add(batch);
 }
 clouds.visible=config.clouds.enabled;backdrop.add(clouds);
 // Only the non-playable skirt is softened; retain every terrain-edge vertex.
 const skirt=scene.getObjectByName('Decorative distant rolling hills')?.children[0];
 const skirtPosition=skirt?.geometry.attributes.position,originalSkirt=skirtPosition?.array.slice();
 if(skirtPosition&&config.mountains.enabled){for(let i=880;i<skirtPosition.count;i++){
  const ring=Math.floor(i/880),x=skirtPosition.getX(i),z=skirtPosition.getZ(i),blend=THREE.MathUtils.smoothstep(ring,0,5);
  const rolling=18+Math.sin(x*.009+Math.sin(z*.006))*12+Math.cos(z*.012-x*.003)*8;
  skirtPosition.setY(i,THREE.MathUtils.lerp(skirtPosition.getY(i),rolling,blend));
 }skirtPosition.needsUpdate=true;skirt.geometry.computeVertexNormals();}
 // Distant forest texture is geometry on decorative hills only, outside the map.
 const forest=new THREE.Group();forest.name='Non-collidable foothill forest';
 if(skirtPosition&&config.mountains.enabled){
  const positions=[];
  for(const [bottom,top,width] of [[0,3.4,1.15],[1.5,4.8,.95]])for(let k=0;k<5;k++){
   const a=k*Math.PI*2/5,b=(k+1)*Math.PI*2/5;
   positions.push(Math.cos(a)*width,bottom,Math.sin(a)*width,0,top,0,Math.cos(b)*width,bottom,Math.sin(b)*width);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();
  const trees=new THREE.InstancedMesh(geometry,new THREE.MeshBasicMaterial({color:'#ffffff'}),2100),tint=new THREE.Color();let used=0;
  for(let ring=2;ring<9;ring++)for(let k=0;k<300;k++){
   const index=ring*880+Math.floor(random()*880),next=ring*880+(index+1)%880,t=random();
   const x=THREE.MathUtils.lerp(skirtPosition.getX(index),skirtPosition.getX(next),t),z=THREE.MathUtils.lerp(skirtPosition.getZ(index),skirtPosition.getZ(next),t),y=THREE.MathUtils.lerp(skirtPosition.getY(index),skirtPosition.getY(next),t);
   dummy.position.set(x,y-.25,z);dummy.rotation.set(0,random()*6.28,0);dummy.scale.setScalar(.8+random()*1.1);dummy.updateMatrix();trees.setMatrixAt(used,dummy.matrix);
   tint.set('#315e48').lerp(new THREE.Color('#8baa89'),(ring-2)/10+random()*.15);trees.setColorAt(used++,tint);
  }
  trees.computeBoundingSphere();forest.add(trees);scene.add(forest);
 }
 const previous=scene.background;scene.background=null;
 return {backdrop,radius,render(dt=0,sourceCamera=camera){
  const camera=sourceCamera;
  view.projectionMatrix.copy(camera.projectionMatrix);view.fov=camera.fov;view.aspect=camera.aspect;view.updateProjectionMatrix();view.quaternion.copy(camera.quaternion);
  // True world-relative parallax for mountains; sky stays centered on the viewer.
  view.position.copy(camera.position);sky.position.copy(view.position);clouds.rotation.y+=Math.min(dt,.05)*clamp(config.clouds.movementSpeed,0,.01);
  const clear=renderer.autoClear;renderer.autoClear=true;renderer.render(backdrop,view);renderer.autoClear=false;renderer.clearDepth();renderer.render(scene,camera);renderer.autoClear=clear;
 },dispose(){scene.background=previous;if(originalSkirt){skirtPosition.array.set(originalSkirt);skirtPosition.needsUpdate=true;skirt.geometry.computeVertexNormals();}forest.removeFromParent();for(const root of [forest,backdrop])root.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();if(o.isInstancedMesh)o.dispose();}});}};
}
