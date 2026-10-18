import {rampPoint} from './MainWorldRamps.js';

export function turboPickupLayout({halfSize,height,trees,rocks,ramps,count}){
 let seed=812731;
 const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const points=[];
 const accept=(x,z)=>{
  if(Math.max(Math.abs(x),Math.abs(z))>halfSize-25 || Math.hypot(x,z)<12)return false;
  if(trees.some(t=>Math.hypot(t.x-x,t.z-z)<t.scale*.35+5) || rocks.some(r=>Math.hypot(r.x-x,r.z-z)<r.radius+5))return false;
  const y=height(x,z),sx=(height(x+1,z)-height(x-1,z))/2,sz=(height(x,z+1)-height(x,z-1))/2;
  if(Math.hypot(sx,sz)>.3 || points.some(p=>Math.hypot(p.x-x,p.z-z)<16))return false;
  // The base is flat but tilted to the local tangent; avoid convex terrain that
  // would cut through its underside, without changing the terrain mesh.
  for(const [dx,dz] of [[2,0],[-2,0],[0,2],[0,-2]])if(Math.abs(height(x+dx,z+dz)-y-sx*dx-sz*dz)>.12)return false;
  points.push({x,y,z,sx,sz});return true;
 };
 for(const ramp of ramps){if(points.length>=count)break;const p=rampPoint(ramp,0,-34);accept(p.x,p.z);}
 for(let tries=0;tries<15000&&points.length<count;tries++){
  const z=(random()*2-1)*(halfSize-30);
  const x=tries%3===0?18*Math.sin(z*.025)+(random()<.5?-1:1)*(10+random()*8):(random()*2-1)*(halfSize-30);
  accept(x,z);
 }
 return points;
}
