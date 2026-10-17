import * as THREE from 'three';
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
 const material=terrain.material,previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey;
 material.onBeforeCompile=shader=>{
  previous.call(material,shader,renderer);Object.assign(shader.uniforms,{groundDetail:{value:detail},groundBlend:{value:mask},groundHalfSize:{value:halfSize},groundTextureStrength:{value:clamp((config.groundTextureStrengthPercent??75)/100)}});
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vGroundPosition;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvGroundPosition=(modelMatrix*vec4(transformed,1.)).xyz;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
 varying vec3 vGroundPosition; uniform sampler2D groundDetail; uniform sampler2D groundBlend; uniform float groundHalfSize; uniform float groundTextureStrength;`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
 vec2 blendUV=clamp((vGroundPosition.xz/groundHalfSize+1.)*.5,0.,1.);vec2 cover=texture2D(groundBlend,blendUV).rg;
 vec3 detailA=texture2D(groundDetail,vGroundPosition.xz/7.).rgb;
 vec2 rotated=mat2(.8,-.6,.6,.8)*vGroundPosition.xz/19.+vec2(.37,.61);vec3 detailB=texture2D(groundDetail,rotated).rgb;
 vec3 weights=vec3(max(0.,1.-cover.r-cover.g),cover.r,cover.g);float detailValue=dot(detailA*.82+detailB*.18,weights);
 float textureDistance=distance(cameraPosition,vGroundPosition);float distanceFade=1.-smoothstep(65.,180.,textureDistance);
 float textureAmount=groundTextureStrength*distanceFade;diffuseColor.rgb*=1.+(detailValue-.5)*1.65*textureAmount;
 float groundRelief=(dot(detailA,weights)-.5)*.045*textureAmount;`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
 vec3 sx=dFdx(-vViewPosition),sy=dFdy(-vViewPosition);vec3 rx=cross(sy,normal),ry=cross(normal,sx);float determinant=dot(sx,rx);
 vec3 gradient=sign(determinant)*(dFdx(groundRelief)*rx+dFdy(groundRelief)*ry);if(abs(determinant)>1.e-8)normal=normalize(abs(determinant)*normal-gradient);`);
 };
 material.customProgramCacheKey=()=> 'cartoon-ground-textures-v1';material.needsUpdate=true;
 return {detail,mask,dispose(){detail.dispose();mask.dispose();material.onBeforeCompile=previous;material.customProgramCacheKey=previousKey;material.needsUpdate=true;}};
}
