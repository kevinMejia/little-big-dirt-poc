import {rampClearance} from './MainWorldRamps.js';
export function letterLayout({halfSize,height,trees=[],rocks=[],ramps=[],count,minSpacing=24,random=Math.random}){
 const points=[];const bound=halfSize-30;
 for(let attempt=0;attempt<18000&&points.length<count;attempt++){
  // Start near the meadow, then cover a comfortable central portion of any map size.
  const radius=Math.min(bound,Math.max(65,halfSize*.65)),x=(random()*2-1)*radius,z=(random()*2-1)*radius;
  if(Math.hypot(x,z)<15||ramps.some(r=>rampClearance(r,x,z,7))||trees.some(t=>Math.hypot(x-t.x,z-t.z)<t.scale*.35+8)||rocks.some(r=>Math.hypot(x-r.x,z-r.z)<r.radius+8)||points.some(p=>Math.hypot(x-p.x,z-p.z)<minSpacing))continue;
  const y=height(x,z);if(!Number.isFinite(y))continue;
  let safe=true;for(const [dx,dz] of [[4,0],[-4,0],[0,4],[0,-4]]){const h=height(x+dx,z+dz);if(!Number.isFinite(h)||Math.abs(h-y)>1.2)safe=false;}
  if(safe)points.push({x,y,z});
 }
 return points.length===count?points:[]; // Never create an impossible partial word.
}
