import * as THREE from 'three';
const clamp=THREE.MathUtils.clamp;
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};

// Immutable derived samples are rebuilt from config, ready for a future editor.
export class RallyTrack {
 constructor(config,origin={x:0,z:0},closed=true){
  if(!Array.isArray(config.controlPoints)||config.controlPoints.length<(closed?4:2))throw new Error('Rally spline needs at least '+(closed?4:2)+' control points');
  for(const p of config.controlPoints)if(![p.x,p.y,p.z,p.width??12,p.bank??0].every(Number.isFinite)||(p.width??12)<=0)throw new Error('Invalid rally control point: '+p.id);
  this.config=config;this.origin=origin;this.closed=closed;
  this.points=config.controlPoints.map(p=>({...p,x:p.x*(config.horizontalScale??1)+origin.x,z:p.z*(config.horizontalScale??1)+origin.z,y:p.y*(config.elevationScale??1),width:p.width??12,bank:p.bank??0}));
  const rounding=config.cornerSmoothing??0;
  const splinePoints=this.points.map((p,i)=>{
   const v=new THREE.Vector3(p.x,p.y,p.z);if(!rounding||!closed&&(i===0||i===this.points.length-1))return v;
   const a=this.points[(i+this.points.length-1)%this.points.length],b=this.points[(i+1)%this.points.length];return v.multiplyScalar(1-2*rounding).addScaledVector(new THREE.Vector3(a.x,a.y,a.z),rounding).addScaledVector(new THREE.Vector3(b.x,b.y,b.z),rounding);
  });
  this.curve=new THREE.CatmullRomCurve3(splinePoints,closed,'centripetal');
  this.curve.arcLengthDivisions=3000;this.length=this.curve.getLength();
  this.count=Math.ceil(this.length/(config.sampleSpacing??1.5));this.samples=[];
  const fields=t=>{
   const f=t*(closed?this.points.length:this.points.length-1),i=Math.min(this.points.length-1,Math.floor(f)),a=this.points[i],b=this.points[(i+1)%this.points.length],q=smooth(f-i);
   return {surface:a.surface??config.surface??{kind:'compacted-dirt'},controlPointId:a.id,feature:a.feature,width:THREE.MathUtils.lerp(a.width,b.width,q),bank:THREE.MathUtils.degToRad(THREE.MathUtils.lerp(a.bank,b.bank,q))};
  };
  for(let i=0;i<=this.count;i++){
   const u=i/this.count,t=this.curve.getUtoTmapping(u),p=this.curve.getPoint(t),v=this.curve.getTangent(t),n=Math.hypot(v.x,v.z);
   this.samples.push({x:p.x,y:p.y,z:p.z,tx:v.x/n,tz:v.z/n,u,...fields(t)});
  }
  this.cells=new Map();this.cellSize=20;this.influence=(config.terrainBlend??38)+12;
  for(let i=0;i<this.count;i++){
   const a=this.samples[i],b=this.samples[i+1],r=this.influence;
   for(let z=Math.floor((Math.min(a.z,b.z)-r)/20);z<=Math.floor((Math.max(a.z,b.z)+r)/20);z++)for(let x=Math.floor((Math.min(a.x,b.x)-r)/20);x<=Math.floor((Math.max(a.x,b.x)+r)/20);x++){
    const key=x+','+z;if(!this.cells.has(key))this.cells.set(key,[]);this.cells.get(key).push(i);
   }
  }
 }
 at(u){const f=clamp(u,0,1)*this.count,i=Math.min(this.count-1,Math.floor(f)),t=f-i,a=this.samples[i],b=this.samples[i+1],out={};for(const k of ['x','y','z','tx','tz','width','bank'])out[k]=THREE.MathUtils.lerp(a[k],b[k],t);out.u=u;out.surface=t<.5?a.surface:b.surface;out.controlPointId=t<.5?a.controlPointId:b.controlPointId;out.feature=t<.5?a.feature:b.feature;return out;}
 frame(u,side=0){
  const s=this.at(u),a=this.at(Math.max(0,u-.0001)),b=this.at(Math.min(1,u+.0001));
  const tangent=new THREE.Vector3(b.x-a.x,b.y-a.y,b.z-a.z).normalize(),right=new THREE.Vector3(s.tz,Math.tan(s.bank),-s.tx).normalize();
  return {position:new THREE.Vector3(s.x+s.tz*side,s.y+side*Math.tan(s.bank),s.z-s.tx*side),tangent,right,up:new THREE.Vector3().crossVectors(tangent,right).normalize(),width:s.width,surface:s.surface};
 }
 nearest(x,z){
  const candidates=this.cells.get(Math.floor(x/20)+','+Math.floor(z/20));if(!candidates)return null;
  let best=null,d2=Infinity;
  for(const i of candidates){const a=this.samples[i],b=this.samples[i+1],dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1),px=a.x+dx*t,pz=a.z+dz*t,d=(x-px)**2+(z-pz)**2;
   if(d<d2){d2=d;const length=Math.hypot(dx,dz),side=(x-px)*dz/length-(z-pz)*dx/length,width=THREE.MathUtils.lerp(a.width,b.width,t),bank=THREE.MathUtils.lerp(a.bank,b.bank,t);best={distance:Math.sqrt(d),side,width,bank,y:THREE.MathUtils.lerp(a.y,b.y,t)+side*Math.tan(bank),u:(i+t)/this.count,surface:a.surface,controlPointId:a.controlPointId,feature:a.feature};}
  }return best;
 }
 field(x,z){
  const candidates=this.cells.get(Math.floor(x/20)+','+Math.floor(z/20));let sum=0,weight=0;
  for(const i of candidates??[]){const p=this.samples[i],d2=(x-p.x)**2+(z-p.z)**2,w=Math.max(0,1-d2/(this.influence*this.influence))**4;sum+=p.y*w;weight+=w;}
  return {sum,weight};
 }
 createRoad(){
  const vertices=[],indices=[],colors=[],uvs=[],across=4;
  for(const s of this.samples)for(let j=0;j<=across;j++){
   const side=(j/across-.5)*s.width,edge=j===0||j===across,shade=.95+.035*Math.sin(s.u*Math.PI*2*Math.round(this.length/16))+(edge?-.08:0);
   vertices.push(s.x+s.tz*side,s.y+side*Math.tan(s.bank),s.z-s.tx*side);uvs.push(j/across,s.u*(this.closed?Math.round(this.length/8):this.length/8));
   const c=new THREE.Color(edge?0xa78b5b:0xc2a06b).multiplyScalar(shade);colors.push(c.r,c.g,c.b);
  }
  for(let i=0;i<this.count;i++)for(let j=0;j<across;j++){const a=i*(across+1)+j,b=a+1,c=a+across+1,d=c+1;indices.push(a,c,b,b,c,d);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();
  return {geometry,vertices:new Float32Array(vertices),indices:new Uint32Array(indices)};
 }
}

export class RallyLandscape {
 constructor(baseHeight,track,access,sandboxHalfSize,config){Object.assign(this,{baseHeight,track,access,sandboxHalfSize,config});}
 nearest(x,z){const a=this.track.nearest(x,z),b=this.access.nearest(x,z);return !a?b:!b?a:a.distance-a.width/2<b.distance-b.width/2?a:b;}
 terrainHeight(x,z){
  const core=this.baseHeight(x,z),fade=smooth((x-this.sandboxHalfSize)/90);
  const rolling=12+4*Math.sin(x*.026)*Math.cos(z*.033)+3*Math.sin(z*.051+x*.014);
  const base=THREE.MathUtils.lerp(core,rolling,fade),near=this.nearest(x,z);if(!near)return base;
  const edge=near.distance-near.width/2,blend=1-smooth((edge-(this.config.shoulder??5))/(this.config.terrainBlend??38));
  let roadHeight=near.y-.045;
  if(edge>(this.config.shoulder??5)){const a=this.track.field(x,z),b=this.access.field(x,z),weight=a.weight+b.weight,field=weight?(a.sum+b.sum)/weight:roadHeight;roadHeight=THREE.MathUtils.lerp(roadHeight,field,smooth((edge-(this.config.shoulder??5))/4));}
  return THREE.MathUtils.lerp(base,roadHeight,blend);
 }
 height(x,z){const n=this.nearest(x,z);return n&&n.distance<=n.width/2?n.y:this.terrainHeight(x,z);}
 dirtMask(x,z){const n=this.nearest(x,z);if(!n)return 0;const rough=.35*Math.sin(x*1.1+Math.sin(z*.7));return 1-smooth((n.distance-n.width/2+rough)/(this.config.shoulder??5));}
}

// A coarse terrain triangle can cross a curved road even when all its vertices
// are below the analytic road height. Compare planes over their exact overlap;
// lowering all three terrain vertices preserves the guarantee between samples.
export function carveRoadClearance(vertices,indices,roads,clearance=.06){
 const cells=new Map(),size=8;
 const triangle=(v,ids,i)=>[0,1,2].map(j=>{const k=ids[i+j]*3;return {x:v[k],y:v[k+1],z:v[k+2]};});
 const bounds=t=>({minX:Math.min(...t.map(p=>p.x)),maxX:Math.max(...t.map(p=>p.x)),minZ:Math.min(...t.map(p=>p.z)),maxZ:Math.max(...t.map(p=>p.z))});
 const cross=(a,b,p)=>(b.x-a.x)*(p.z-a.z)-(b.z-a.z)*(p.x-a.x);
 const height=(t,p)=>{const [a,b,c]=t,d=cross(a,b,c);return a.y+((p.x-a.x)*(c.z-a.z)-(p.z-a.z)*(c.x-a.x))/d*(b.y-a.y)+cross(a,b,p)/d*(c.y-a.y);};
 for(const road of roads)for(let i=0;i<road.indices.length;i+=3){
  const t=triangle(road.vertices,road.indices,i),b=bounds(t);
  for(let x=Math.floor(b.minX/size);x<=Math.floor(b.maxX/size);x++)for(let z=Math.floor(b.minZ/size);z<=Math.floor(b.maxZ/size);z++){
   const key=x+','+z;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(t);
  }
 }
 for(let i=0;i<indices.length;i+=3){
  const t=triangle(vertices,indices,i),b=bounds(t),candidates=new Set();
  for(let x=Math.floor(b.minX/size);x<=Math.floor(b.maxX/size);x++)for(let z=Math.floor(b.minZ/size);z<=Math.floor(b.maxZ/size);z++)for(const road of cells.get(x+','+z)??[])candidates.add(road);
  let lower=0;
  for(const road of candidates){
   let polygon=t;const sign=Math.sign(cross(...road));
   for(let edge=0;edge<3&&polygon.length;edge++){
    const a=road[edge],b=road[(edge+1)%3],clipped=[];
    for(let j=0;j<polygon.length;j++){
     const p=polygon[j],q=polygon[(j+1)%polygon.length],dp=sign*cross(a,b,p),dq=sign*cross(a,b,q);
     if(dp>=0)clipped.push(p);
     if((dp>=0)!==(dq>=0)){const f=dp/(dp-dq);clipped.push({x:p.x+(q.x-p.x)*f,z:p.z+(q.z-p.z)*f});}
    }
    polygon=clipped;
   }
   for(const p of polygon)lower=Math.max(lower,height(t,p)-height(road,p)+clearance);
  }
  if(lower>0)for(let j=0;j<3;j++){const k=indices[i+j]*3+1;vertices[k]-=lower;}
 }
}

// Keep the existing sandbox vertex/index arrays, then add an eastern patch.
// Its western edge uses the exact original Z samples: no cracks at the join.
export function extendRallySurface(original,landscape,roads,config){
 const vertices=Array.from(original.vertices),indices=Array.from(original.indices),half=original.halfSize,zs=[];
 for(let i=0;i<original.vertices.length;i+=3){const z=original.vertices[i+2];if(!zs.length||z!==zs[zs.length-1])zs.push(z);vertices[i+1]=landscape.terrainHeight(vertices[i],z);}
 const xs=[half];for(let x=half+config.terrainSpacing;x<half+config.extension;x+=config.terrainSpacing)xs.push(x);xs.push(half+config.extension);
 const start=vertices.length/3;
 for(const z of zs)for(const x of xs)vertices.push(x,landscape.terrainHeight(x,z),z);
 for(let z=0;z<zs.length-1;z++)for(let x=0;x<xs.length-1;x++){const a=start+z*xs.length+x,b=a+1,c=a+xs.length,d=c+1;indices.push(a,c,b,b,c,d);}
 // Road render and collision use these exact buffers; terrain remains beneath it.
 carveRoadClearance(vertices,indices,roads);
 const terrainVertices=new Float32Array(vertices),terrainIndices=new Uint32Array(indices);
 for(const road of roads){const offset=vertices.length/3;for(const n of road.vertices)vertices.push(n);for(const i of road.indices)indices.push(i+offset);}
 return {vertices:new Float32Array(vertices),indices:new Uint32Array(indices),terrainVertices,terrainIndices,halfSize:half,heightAt:(x,z)=>landscape.height(x,z),isContinuousRoad:(x,z)=>{const n=landscape.nearest(x,z);return !!n&&n.distance<=n.width/2+(config.shoulder??5)&&!['jump','ramp'].includes(n.feature);},bounds:{minX:-half,maxX:half+config.extension,minZ:-half,maxZ:half}};
}
