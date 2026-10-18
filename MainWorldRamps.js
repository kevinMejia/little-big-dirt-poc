import {playgroundFeatures} from './DirtJumpSystem.js';

// Shared clearance envelope: 40m run-up before the approach and a long landing
// beyond even the gap's landing mound. Coordinates follow DirtJumpSystem.local.
export function rampPoint(f,side,along){
 return {x:f.x+side*Math.cos(f.angle)+along*Math.sin(f.angle),z:f.z-side*Math.sin(f.angle)+along*Math.cos(f.angle)};
}
export function rampClearance(f,x,z,margin=0){
 const dx=x-f.x,dz=z-f.z,c=Math.cos(f.angle),s=Math.sin(f.angle);
 return Math.abs(dx*c-dz*s)<f.width*.6+6+margin && dx*s+dz*c>-60-margin && dx*s+dz*c<95+margin;
}
export function mainWorldRamps({halfSize,height,layout,seed=41729}){
 let state=seed>>>0;
 const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
 const placed=[],obstacles=[...layout.trees.map(t=>({...t,r:t.scale*.35+3})),...layout.rocks.map(r=>({...r,r:r.radius+4}))];
 for(const template of playgroundFeatures()){
  let accepted,bestScore=Infinity;
  for(let attempt=0;attempt<4000;attempt++){
   const f={...template,x:(random()*2-1)*(halfSize-35),z:(random()*2-1)*(halfSize-35),angle:random()*Math.PI*2};
   if(placed.some(other=>Math.hypot(other.x-f.x,other.z-f.z)<200))continue;

   let clear=true;
   for(let along=-60;along<=95&&clear;along+=5)for(const side of [-f.width*.6-6,0,f.width*.6+6]){
    const p=rampPoint(f,side,along);
    // Preserve the existing meandering road and spawn meadow. Keep the whole
    // corridor inside the drivable boundary, away from steep base terrain.
    if(Math.max(Math.abs(p.x),Math.abs(p.z))>halfSize-25 || Math.hypot(p.x,p.z)<35 ||
       Math.abs(p.x-18*Math.sin(p.z*.025))<22 ||
       Math.hypot((height(p.x+1,p.z)-height(p.x-1,p.z))/2,(height(p.x,p.z+1)-height(p.x,p.z-1))/2)>.55){clear=false;break;}
   }
   if(clear){
    const score=obstacles.filter(o=>rampClearance(f,o.x,o.z,o.r)).length;
    if(score<bestScore){accepted=f;bestScore=score;}
    if(score===0)break;
   }
  }
  if(!accepted)throw new Error(`No clear main-world ramp location for ${template.id}`);
  placed.push(accepted);
 }
 return placed;
}
