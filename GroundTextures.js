import * as THREE from 'three';
import {worldAppearance} from './WorldEnvironmentConfig.js';
import {visualPolishConfig} from './VehicleConfig.js';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const hash=(x,y)=>{const v=Math.sin(x*127.1+y*311.7+37.4)*43758.5453;return v-Math.floor(v);};
function noise(x,y,period){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy),h=(a,b)=>hash((a+period)%period,(b+period)%period);return THREE.MathUtils.lerp(THREE.MathUtils.lerp(h(ix,iy),h(ix+1,iy),sx),THREE.MathUtils.lerp(h(ix,iy+1),h(ix+1,iy+1),sx),sy);}
// Three seamless detail channels: painted grass blades, soil grains/pebbles, rocky flecks.
// Generated once, shared by the existing ground material. No image downloads or new draws.
export function createGroundDetailTexture(size=512){
 const data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const u=x/size,v=y/size,broad=noise(u*8,v*8,8),grain=noise(u*64,v*64,64),fine=hash(x,y),i=(y*size+x)*4;
  data[i]=Math.round(255*clamp(.48+(broad-.5)*.35+(grain-.5)*.13));
  data[i+1]=Math.round(255*clamp(.5+(broad-.5)*.26+(grain-.5)*.27+(fine-.5)*.1));
  data[i+2]=Math.round(255*clamp(.5+(noise(u*24,v*24,24)-.5)*.55+(grain-.5)*.2));data[i+3]=255;
 }
 const put=(x,y,channel,value)=>{x=(Math.round(x)%size+size)%size;y=(Math.round(y)%size+size)%size;data[(y*size+x)*4+channel]=Math.round(255*clamp(value));};
 for(let i=0;i<1700;i++){const x=hash(i,3)*size,y=hash(i,9)*size,length=(.012+hash(i,14)*.024)*size,lean=(hash(i,6)-.5)*length,color=.28+hash(i,12)*.43;
  for(let j=0;j<length;j++){const t=j/length;put(x+lean*t*t,y+j,0,color);if(t<.65)put(x+lean*t*t+1,y+j,0,color*.94);}
 }
 for(let i=0;i<270;i++){const x=hash(i,24)*size,y=hash(i,38)*size,r=(.002+hash(i,51)*.007)*size;
  for(let dy=-Math.ceil(r);dy<=r;dy++)for(let dx=-Math.ceil(r);dx<=r;dx++){const d=Math.hypot(dx,dy*.8)/r;if(d<1){put(x+dx,y+dy,1,.39+.23*(1-d));put(x+dx,y+dy,2,.28+.42*(1-d));}}
 }
 const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;texture.name='Grass / soil / rocky detail';return texture;
}
export function addGroundTextures(terrain,painter,halfSize,renderer,config=visualPolishConfig){
 const detail=createGroundDetailTexture(),size=256,data=new Uint8Array(size*size*4);detail.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const f=painter.surface((x/(size-1)*2-1)*halfSize,(y/(size-1)*2-1)*halfSize),soil=clamp(Math.max(f.path,f.dirtMask)),rock=clamp(f.rockMask)*(1-soil),i=(y*size+x)*4;data[i]=Math.round(soil*255);data[i+1]=Math.round(rock*255);data[i+2]=0;data[i+3]=255;}
 const mask=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);mask.magFilter=mask.minFilter=THREE.LinearFilter;mask.needsUpdate=true;mask.name='Existing terrain surface blend';
 let disposed=false,paintedReady=false,surfaceReady=false;
 const painted=new THREE.TextureLoader().load(new URL('./assets/terrain/painted-grass.png',import.meta.url).href,()=>{if(disposed){painted.dispose();return;}paintedReady=true;},undefined,()=>console.warn('Painted grass unavailable; using original ground.'));
 painted.wrapS=painted.wrapT=THREE.MirroredRepeatWrapping;painted.colorSpace=THREE.SRGBColorSpace;
 painted.magFilter=THREE.LinearFilter;painted.minFilter=THREE.LinearMipmapLinearFilter;painted.generateMipmaps=true;painted.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
 const atlas=new THREE.TextureLoader().load(new URL('./assets/terrain/painted-soil-stone-v1.png',import.meta.url).href,()=>{if(disposed){atlas.dispose();return;}surfaceReady=true;},undefined,()=>console.warn('Painted soil/stone unavailable; retaining original surfaces.'));
 atlas.colorSpace=THREE.SRGBColorSpace;atlas.magFilter=THREE.LinearFilter;atlas.minFilter=THREE.LinearMipmapLinearFilter;atlas.generateMipmaps=true;atlas.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
 const surfaceUniforms={surfaceAtlas:{value:atlas},surfaceReady:{value:0},dirtStrength:{value:0},rockStrength:{value:0},dirtScale:{value:8},rockScale:{value:4.5},edgeVariation:{value:.6}};
 const uniforms={paintedGrass:{value:painted},paintedScale:{value:9},paintedStrength:{value:0},paintedSaturation:{value:.9},paintedDirtBlend:{value:.45}};
 function update(){surfaceUniforms.surfaceReady.value=surfaceReady?1:0;surfaceUniforms.dirtStrength.value=clamp((worldAppearance.dirtTextureStrength??75)/100);surfaceUniforms.rockStrength.value=clamp((worldAppearance.rockTextureStrength??90)/100);surfaceUniforms.dirtScale.value=clamp(worldAppearance.dirtTextureScale??8,2,24);surfaceUniforms.rockScale.value=clamp(worldAppearance.rockTextureScale??4.5,1,16);surfaceUniforms.edgeVariation.value=clamp((worldAppearance.surfaceEdgeVariation??60)/100);uniforms.paintedScale.value=clamp(worldAppearance.grassTextureScale??9,2,40);uniforms.paintedStrength.value=paintedReady?clamp((worldAppearance.grassTextureStrength??85)/100):0;uniforms.paintedSaturation.value=clamp((worldAppearance.grassTextureSaturation??90)/100,0,1.5);uniforms.paintedDirtBlend.value=clamp((worldAppearance.grassDirtBlending??45)/100);}
 const material=terrain.material,previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey;
 material.onBeforeCompile=shader=>{
  previous.call(material,shader,renderer);Object.assign(shader.uniforms,uniforms,surfaceUniforms,{groundDetail:{value:detail},groundBlend:{value:mask},groundHalfSize:{value:halfSize},groundTextureStrength:{value:clamp((config.groundTextureStrengthPercent??75)/100)}});
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vGroundPosition;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvGroundPosition=(modelMatrix*vec4(transformed,1.)).xyz;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
 varying vec3 vGroundPosition;
 uniform sampler2D surfaceAtlas; uniform float surfaceReady,dirtStrength,rockStrength,dirtScale,rockScale,edgeVariation;
 // Fold each panel independently, inset at the split to prevent cross-panel bleed.
 // Mips blend naturally to the average albedo at long distances.
 vec3 surfaceSample(vec2 uv,float panel){vec2 tile=abs(fract(uv*.5)*2.-1.);tile=mix(vec2(.006),vec2(.994),tile);return texture2D(surfaceAtlas,vec2((tile.x+panel)*.5,tile.y)).rgb;}
 uniform sampler2D paintedGrass; uniform float paintedScale; uniform float paintedStrength; uniform float paintedSaturation; uniform float paintedDirtBlend;
 uniform sampler2D groundDetail; uniform sampler2D groundBlend; uniform float groundHalfSize; uniform float groundTextureStrength;`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
 vec2 blendUV=clamp((vGroundPosition.xz/groundHalfSize+1.)*.5,0.,1.);vec2 cover=texture2D(groundBlend,blendUV).rg;
 vec3 detailA=texture2D(groundDetail,vGroundPosition.xz/7.).rgb;
 vec2 rotated=mat2(.8,-.6,.6,.8)*vGroundPosition.xz/19.+vec2(.37,.61);vec3 detailB=texture2D(groundDetail,rotated).rgb;
 float activeDirt=surfaceReady*dirtStrength,activeRock=surfaceReady*rockStrength;
 // Perturb only transition zones: centers/zero masks remain unchanged.
 float edgeNoise=(detailA.g-.5)*2.+(detailB.b-.5)*.8;
 cover.r=clamp(cover.r+edgeNoise*edgeVariation*.55*activeDirt*4.*cover.r*(1.-cover.r),0.,1.);
 cover.g=clamp(cover.g+edgeNoise*edgeVariation*1.8*activeRock*4.*cover.g*(1.-cover.g),0.,1.);
 // Keep the original microdetail weights for an exact zero-strength fallback.
 vec3 weights=vec3(max(0.,1.-cover.r-cover.g),cover.r,cover.g);float detailValue=dot(detailA*.82+detailB*.18,weights);
 float textureDistance=distance(cameraPosition,vGroundPosition);float distanceFade=1.-smoothstep(65.,180.,textureDistance);
 float textureAmount=groundTextureStrength*distanceFade;diffuseColor.rgb*=1.+(detailValue-.5)*1.65*textureAmount;
 // Mirrored wrapping removes image-edge discontinuities. A rotated, differently
 // scaled second sample blends gradually over broad regions, hiding the mirror grid.
 vec2 grassUV=vGroundPosition.xz/paintedScale;
 vec3 grassA=texture2D(paintedGrass,grassUV).rgb;
 vec3 grassB=texture2D(paintedGrass,mat2(.8,-.6,.6,.8)*grassUV*.73+vec2(.37,.61)).rgb;
 float macro=.5+.5*sin(vGroundPosition.x*.023+sin(vGroundPosition.z*.017)*2.);
 vec3 paintedColor=mix(grassA,grassB,.22+macro*.3);
 float gray=dot(paintedColor,vec3(.2126,.7152,.0722));paintedColor=mix(vec3(gray),paintedColor,paintedSaturation);
 float grassWeight=(1.-smoothstep(0.,1.-paintedDirtBlend*.65,cover.r))*(1.-cover.g);
 // Broad color variation breaks repetition; artwork supplies brush-scale detail.
 paintedColor*=mix(vec3(.86),vec3(1.08),macro);
 diffuseColor.rgb=mix(diffuseColor.rgb,paintedColor,paintedStrength*grassWeight);
 vec2 soilUV=vGroundPosition.xz/vec2(dirtScale,dirtScale*2.);
 vec2 stoneUV=vGroundPosition.xz/vec2(rockScale,rockScale*2.);
 vec3 soilA=surfaceSample(soilUV,0.);
 vec3 soilB=surfaceSample(mat2(.8,-.6,.6,.8)*soilUV*.67+vec2(.31,.73),0.);
 vec3 stoneA=surfaceSample(stoneUV,1.);
 vec3 stoneB=surfaceSample(mat2(.6,-.8,.8,.6)*stoneUV*.71+vec2(.63,.27),1.);
 vec3 soilColor=mix(soilA,soilB,.18+macro*.16)*mix(.86,1.02,macro);
 soilColor=mix(vec3(dot(soilColor,vec3(.2126,.7152,.0722))),soilColor,.72)*1.12;
 vec3 stoneColor=mix(stoneA,stoneB,.12+macro*.12)*mix(.86,1.03,macro);
 stoneColor=mix(vec3(dot(stoneColor,vec3(.2126,.7152,.0722)))*vec3(1.03,1.,.94),stoneColor,.45)*1.25;
 // Moderate transition sharpening gives gravel a readable interior while the
 // brush noise keeps the edge irregular; never extend outside existing mask support.
 float dirtWeight=smoothstep(.04,.9,cover.r);
 float stoneWeight=smoothstep(.04,.65,cover.g)*(1.-dirtWeight);
 diffuseColor.rgb=mix(diffuseColor.rgb,soilColor,activeDirt*dirtWeight);
 diffuseColor.rgb=mix(diffuseColor.rgb,stoneColor,activeRock*stoneWeight);
 float groundRelief=(dot(detailA,weights)-.5)*.045*textureAmount;`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
 vec3 sx=dFdx(-vViewPosition),sy=dFdy(-vViewPosition);vec3 rx=cross(sy,normal),ry=cross(normal,sx);float determinant=dot(sx,rx);
 vec3 gradient=sign(determinant)*(dFdx(groundRelief)*rx+dFdy(groundRelief)*ry);if(abs(determinant)>1.e-8)normal=normalize(abs(determinant)*normal-gradient);`);
 };
 material.customProgramCacheKey=()=> 'painted-ground-textures-v3';material.needsUpdate=true;
 return {detail,mask,painted,atlas,update,dispose(){disposed=true;atlas.dispose();painted.dispose();detail.dispose();mask.dispose();material.onBeforeCompile=previous;material.customProgramCacheKey=previousKey;material.needsUpdate=true;}};
}
