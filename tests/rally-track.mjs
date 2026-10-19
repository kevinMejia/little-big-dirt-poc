import assert from 'node:assert/strict';
import {RallyTrack,RallyLandscape,extendRallySurface,carveRoadClearance} from '../RallyTrack.js';
import {rallyTrackConfig as config} from '../RallyTrackConfig.js';
import {rallySceneryLayout} from '../RallyScenery.js';
const track=new RallyTrack(config,{x:525,z:0}),access=new RallyTrack({...config,horizontalScale:1,elevationScale:1,controlPoints:[{id:'entry',x:275,y:30,z:85,width:12},{id:'bend',x:360,y:24,z:110,width:12},{...track.points[0],id:'merge'}]},undefined,false);
const terrain=new RallyLandscape(()=>30,track,access,330,config);
assert(track.length>=500&&track.length<=800,`length ${track.length}`);
const first=track.samples[0],last=track.samples.at(-1);assert(Math.hypot(first.x-last.x,first.y-last.y,first.z-last.z)<1e-5);
let grade=0,minRadius=Infinity,clearance=Infinity,jump=0;
for(let i=1;i<track.count;i++){
 const a=track.samples[i-1],b=track.samples[i],c=track.samples[i+1],distance=Math.hypot(b.x-a.x,b.z-a.z);grade=Math.max(grade,Math.abs(b.y-a.y)/distance);
 const angle=Math.abs(Math.atan2(a.tx*b.tz-a.tz*b.tx,a.tx*b.tx+a.tz*b.tz));if(angle>1e-6)minRadius=Math.min(minRadius,distance/angle);
 assert(Math.abs(terrain.height(b.x,b.z)-b.y)<.04);
 for(let j=i+1;j<track.count;j++){const d=track.samples[j],arc=Math.min(j-i,track.count-(j-i))*track.length/track.count;if(arc<40)continue;clearance=Math.min(clearance,Math.hypot(b.x-d.x,b.z-d.z)-(b.width+d.width)/2);}
}
for(let z=-140;z<140;z+=2)for(let x=360;x<660;x+=2){const h=terrain.terrainHeight(x,z),next=terrain.terrainHeight(x+.1,z);jump=Math.max(jump,Math.abs(next-h));assert(Number.isFinite(h));}
const road=track.createRoad(),p=road.vertices,ids=road.indices;let downward=0;for(let i=0;i<ids.length;i+=3){const a=ids[i]*3,b=ids[i+1]*3,c=ids[i+2]*3,normalY=(p[b+2]-p[a+2])*(p[c]-p[a])-(p[b]-p[a])*(p[c+2]-p[a+2]);if(normalY<=0)downward++;}
console.log({length:track.length,grade,minRadius,clearance,jump,downward});assert.equal(downward,0,'upward, non-folded road faces');assert(grade<.5);assert(clearance>2);assert(jump<.25,'continuous landscape field');
const placements=rallySceneryLayout(terrain,{minX:335,maxX:700},config.scenery);assert.deepEqual(placements,rallySceneryLayout(terrain,{minX:335,maxX:700},config.scenery));for(const p of placements){const n=terrain.nearest(p.x,p.z);if(n)assert(n.distance>n.width/2+.8);}
const changed=new RallyTrack({...config,controlPoints:config.controlPoints.map((p,i)=>i===4?{...p,y:p.y+3,width:14}:p)},{x:525,z:0});assert.notEqual(changed.samples[100].y,track.samples[100].y);assert.notEqual(changed.createRoad().vertices.length,0);
console.log('PASS rally: closed configurable spline, road winding, widths/grades/clearance, continuous terrain, deterministic scenery and config regeneration.');

const original={halfSize:330,vertices:new Float32Array([-330,30,-330,330,30,-330,-330,30,330,330,30,330]),indices:new Uint32Array([0,2,1,1,2,3])},before=original.vertices.slice();
const merged=extendRallySurface(original,terrain,[road],config);assert.deepEqual(original.vertices,before,'source sandbox data unchanged');
const offset=merged.terrainVertices.length;assert.deepEqual(merged.vertices.slice(offset),road.vertices,'visible road vertices are exact collision vertices');
const indexOffset=merged.terrainVertices.length/3;assert.deepEqual([...merged.indices.slice(merged.terrainIndices.length)].map(i=>i-indexOffset),[...road.indices]);
const frame=track.frame(.25,2);assert(frame.up.y>.8&&Math.abs(frame.tangent.length()-1)<1e-8);assert.equal(frame.surface.kind,'compacted-dirt');
console.log('PASS rally: exact shared render/collision buffers, untouched source sandbox, banked future-object frames.');

// Road crosses the middle of a coarse sloped triangle. Its corners alone do
// not establish clearance: all overlap points must remain below the road.
const coarse=[0,2,0, 6,2,0, 0,2,6],coarseIds=[0,2,1];
const crossing={vertices:new Float32Array([1,0,1, 4,1,1, 1,0,4]),indices:new Uint32Array([0,2,1])};
carveRoadClearance(coarse,coarseIds,[crossing]);
assert(coarse[1]<=-.059&&coarse[4]<=-.059&&coarse[7]<=-.059,'entire intersecting terrain plane is below lowest road overlap');
const distant=[20,3,20,26,3,20,20,3,26],untouched=distant.slice();carveRoadClearance(distant,coarseIds,[crossing]);assert.deepEqual(distant,untouched,'terrain outside road is unchanged');
console.log('PASS road clearance: intersecting terrain planes carved, unrelated terrain preserved.');
