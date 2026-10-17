// Pure, reusable sculpted surfaces. All rendering and collision meshes use sample().
import {rampConfig} from './VehicleConfig.js';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
export const playgroundFeatures=(config=rampConfig)=>[
 {id:'gentle',name:'Gentle jump',x:-66,z:30,height:config.gentleRampHeight,width:16,approach:14,tail:7,angle:0},
 {id:'tabletop',name:'Tabletop',x:-22,z:30,height:config.tabletopHeight,width:18,approach:16,tail:18,top:10,angle:0},
 {id:'gap',name:'Gap jump',x:22,z:30,height:config.gapRampHeight,width:18,approach:16,tail:5,gap:13,angle:0},
 {id:'kicker',name:'Big kicker',x:66,z:30,height:config.bigKickerHeight,width:18,approach:13,tail:7,angle:0}
];
export class DirtJumpSystem {
 constructor(baseHeight=()=>0,features=playgroundFeatures(),config=rampConfig){this.baseHeight=baseHeight;this.features=features.map(input=>{const f={...(playgroundFeatures(config).find(f=>f.id===input.id)||playgroundFeatures(config)[0]),...input};return {...f,height:clamp(Number(f.height)||0,0,8),width:Math.max(4,f.width),approach:Math.max(4,f.approach),tail:Math.max(2,f.tail)};});this.config=config;}
 local(x,z,f){const dx=x-f.x,dz=z-f.z,c=Math.cos(f.angle),s=Math.sin(f.angle);return {side:dx*c-dz*s,along:dx*s+dz*c};}
 profile(q,f){
  const h=f.height;
  if(q<-f.approach)return 0;
  if(q<0){const t=(q+f.approach)/f.approach;return h*t*t*(f.id==='kicker'?t:1);}
  if(f.id==='tabletop'){if(q<=f.top)return h;return h*(1-smooth((q-f.top)/f.tail));}
  const takeoff=h*(1-smooth(q/f.tail));
  if(f.id!=='gap'||q<f.gap)return takeoff;
  const t=(q-f.gap)/16;return t<1?h*.85*smooth(t):h*.85*(1-smooth((q-f.gap-16)/18));
 }
 sample(x,z){let raised=0;for(const f of this.features){const p=this.local(x,z,f),across=1-smooth((Math.abs(p.side)-f.width*.32)/(f.width*.18));if(across>0)raised=Math.max(raised,this.profile(p.along,f)*across);}return this.baseHeight(x,z)+raised;}
 dirtMask(x,z){let mask=0;for(const f of this.features){const p=this.local(x,z,f),wide=1-smooth((Math.abs(p.side)-f.width*.3)/(f.width*.25)),start=smooth((p.along+48)/8),end=1-smooth((p.along-65)/12);mask=Math.max(mask,wide*start*end);}return mask*clamp((this.config.dirtBlendPercent??70)/100);}
 contains(x,z,margin=5){return this.features.some(f=>{const p=this.local(x,z,f);return Math.abs(p.side)<f.width*.6+margin&&p.along>-50-margin&&p.along<80+margin;});}
 // One triangle mesh is passed unchanged to Three.js AND Rapier: no height mismatch.
 createSurface(halfSize=120,spacing=.75){const n=Math.ceil(halfSize*2/spacing),vertices=new Float32Array((n+1)**2*3),indices=new Uint32Array(n*n*6);let k=0,j=0;
  for(let z=0;z<=n;z++)for(let x=0;x<=n;x++){const px=(x/n*2-1)*halfSize,pz=(z/n*2-1)*halfSize;vertices[k++]=px;vertices[k++]=this.sample(px,pz);vertices[k++]=pz;}
  for(let z=0;z<n;z++)for(let x=0;x<n;x++){const a=z*(n+1)+x,b=a+1,c=a+n+1,d=c+1;indices[j++]=a;indices[j++]=c;indices[j++]=b;indices[j++]=b;indices[j++]=c;indices[j++]=d;}
  return {vertices,indices,spacing:halfSize*2/n,halfSize,heightAt:(x,z)=>this.sample(x,z)};
 }
}

