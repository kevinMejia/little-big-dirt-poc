import * as THREE from 'three';
import {storybookBackgroundConfig as config} from './StorybookBackgroundConfig.js';

const vertex=`varying vec2 vUv;varying vec3 vDirection;void main(){vUv=uv;vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const colorFunctions=`
uniform float brightness;uniform float saturation;uniform float haze;uniform vec3 tint;
vec3 grade(vec3 c){float l=dot(c,vec3(.2126,.7152,.0722));return max(vec3(0.),mix(vec3(l),c,saturation)*brightness*tint);}
`;
const skyFragment=`
uniform sampler2D panorama;uniform float rotation;uniform float alignment;uniform float cloudOffset;uniform float mountains;uniform vec3 sunDirection;uniform float sunGlow;
varying vec2 vUv;varying vec3 vDirection;
${colorFunctions}
vec3 painted(vec2 p){p.x=fract(p.x);p.y=clamp(p.y,.005,.995);vec3 seam=(texture2D(panorama,vec2(.005,p.y)).rgb+texture2D(panorama,vec2(.995,p.y)).rgb)*.5;float edge=smoothstep(0.,.025,min(p.x,1.-p.x));return mix(seam,texture2D(panorama,p).rgb,edge);}
void main(){
 vec2 uv=vUv;uv.y=.5+(uv.y-.5)*2.-alignment;uv.x+=rotation+cloudOffset*smoothstep(.48,.66,uv.y);
 vec3 c=painted(uv);float mountainBand=1.-smoothstep(.47,.53,uv.y);
 vec3 horizon=painted(vec2(uv.x,.53));c=mix(c,horizon,mountainBand*(1.-mountains));
 c=mix(c,vec3(.66,.82,.76),mountainBand*haze*.2);
 vec3 direction=normalize(vDirection);float facing=max(0.,dot(direction,sunDirection));
 float halo=pow(facing,50.)*.16+pow(facing,900.)*.5;
 c=mix(c,vec3(1.,.91,.65),clamp(halo*sunGlow,0.,.85)*smoothstep(.45,.6,uv.y));
 gl_FragColor=vec4(grade(c),1.);
 #include <colorspace_fragment>
}`;

export function createStorybookTransition(height,painter,halfSize,scale=1){
 const segments=512,distances=[0,12,35,70,120,190,280,410,610,900],positions=[],colors=[],uvs=[],indices=[],color=new THREE.Color(),meadowColor=new THREE.Color('#79a35d');
 for(let ring=0;ring<distances.length;ring++)for(let i=0;i<segments;i++){
  const side=Math.floor(i/(segments/4)),t=(i%(segments/4))/(segments/4),d=distances[ring]*scale,r=halfSize+d;
  const x=side===0?r:side===1?r*(1-2*t):side===2?-r:r*(-1+2*t),z=side===0?r*(-1+2*t):side===1?r:side===2?r*(1-2*t):-r;
  const ex=x*halfSize/r,ez=z*halfSize/r,edge=height(ex,ez),blend=THREE.MathUtils.smoothstep(d,0,190),angle=Math.atan2(z,x);
  const hills=18+Math.sin(angle*3+.4)*12+Math.sin(angle*7-1)*7+Math.sin(d*.017+angle*4)*14;
  const y=THREE.MathUtils.lerp(edge,hills,blend)-THREE.MathUtils.smoothstep(d,410,900)*35;
  positions.push(x,y,z);painter.sampleColor(ex,ez,color);color.lerp(meadowColor,THREE.MathUtils.smoothstep(d,0,180));colors.push(color.r,color.g,color.b);uvs.push(i/segments,d/(900*scale));
  if(ring<distances.length-1){const a=ring*segments+i,b=ring*segments+(i+1)%segments,c=a+segments,e=b+segments;indices.push(a,b,c,b,e,c);}
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry;
}

export async function createStorybookBackground(scene,{height,painter,halfSize,camera,original}){
 const previous={background:scene.background,fog:scene.fog,far:camera.far};
 const loader=new THREE.TextureLoader();const loaded=await Promise.allSettled([
  loader.loadAsync(new URL('./assets/backgrounds/storybook-v1/countryside-panorama.png',import.meta.url).href),
  loader.loadAsync(new URL('./assets/backgrounds/storybook-v1/painted-meadow.png',import.meta.url).href),
 ]);
 const failed=loaded.find(result=>result.status==='rejected');
 if(failed){for(const result of loaded)if(result.status==='fulfilled')result.value.dispose();throw failed.reason;}
 const textures=loaded.map(result=>result.value);
 const [panorama,meadow]=textures;for(const texture of textures){texture.colorSpace=THREE.SRGBColorSpace;texture.generateMipmaps=true;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;}
 meadow.wrapS=meadow.wrapT=THREE.RepeatWrapping;
 const uniforms={brightness:{value:1},saturation:{value:1},haze:{value:0},tint:{value:new THREE.Color()},panorama:{value:panorama},rotation:{value:0},alignment:{value:0},cloudOffset:{value:0},mountains:{value:1},sunDirection:{value:new THREE.Vector3()},sunGlow:{value:0},meadow:{value:meadow}};
 const group=new THREE.Group();group.name='Storybook background review · non-collidable';scene.add(group);
 const sky=new THREE.Mesh(new THREE.SphereGeometry(1800,64,32),new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:skyFragment,uniforms,side:THREE.BackSide,depthWrite:false,fog:false,toneMapped:false}));sky.frustumCulled=false;sky.renderOrder=-100;group.add(sky);
 // Match the existing terrain's real lighting at the inner edge, then fade in
 // actual painted meadow color. No physics or collision meshes are created.
 const transitionMaterial=new THREE.MeshStandardMaterial({map:meadow,vertexColors:true,roughness:1,fog:false});
 transitionMaterial.onBeforeCompile=shader=>{
  for(const key of ['brightness','saturation','haze','tint'])shader.uniforms[key]=uniforms[key];
  shader.vertexShader='varying float vStoryDistance;\n'+shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvStoryDistance=uv.y;');
  shader.fragmentShader='varying float vStoryDistance;\n'+colorFunctions+shader.fragmentShader.replace('#include <map_fragment>',`vec3 painting=texture2D(map,vMapUv*vec2(12.,3.)).rgb;vec3 base=diffuseColor.rgb;diffuseColor.rgb=mix(base,painting,smoothstep(0.,.12,vStoryDistance)*.57);diffuseColor.rgb=mix(base,grade(diffuseColor.rgb),smoothstep(0.,.035,vStoryDistance));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.43,.66,.57),vStoryDistance*haze*.15);`);
 };
 transitionMaterial.customProgramCacheKey=()=> 'storybook-painted-transition-v1';
 const transition=new THREE.Mesh(createStorybookTransition(height,painter,halfSize,config.backgroundScale),transitionMaterial);transition.name='Painted non-playable horizon transition';group.add(transition);
 let enabled=true,time=0,scale=config.backgroundScale;
 function setEnabled(value){enabled=value;group.visible=value;original.group.visible=!value;scene.background=previous.background;scene.fog=value?null:previous.fog;camera.far=value?2200:previous.far;camera.updateProjectionMatrix();}
 setEnabled(true);
 return {group,sky,transition,setEnabled,get enabled(){return enabled;},update(dt){
  if(!enabled)return;time+=Math.min(dt,.1);sky.position.copy(camera.position);
  uniforms.brightness.value=config.brightness;uniforms.saturation.value=config.saturation;uniforms.haze.value=config.hazePercent/100;uniforms.tint.value.set(config.skyTint);
  uniforms.rotation.value=config.panoramaRotation/360;uniforms.alignment.value=config.horizonAlignment/90;uniforms.cloudOffset.value=time*config.cloudSpeed/360;
  uniforms.mountains.value=Number(config.mountainsVisible);transition.visible=config.mountainsVisible;
  const az=THREE.MathUtils.degToRad(config.sunAzimuth),el=THREE.MathUtils.degToRad(config.sunElevation);uniforms.sunDirection.value.set(Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el));uniforms.sunGlow.value=config.sunGlow;
  if(scale!==config.backgroundScale){scale=config.backgroundScale;transition.geometry.dispose();transition.geometry=createStorybookTransition(height,painter,halfSize,scale);}
 },dispose(){setEnabled(false);group.removeFromParent();sky.geometry.dispose();sky.material.dispose();transition.geometry.dispose();transition.material.dispose();for(const texture of textures)texture.dispose();}};
}
