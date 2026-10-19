// Coordinates are metres relative to the rally origin east of the sandbox.
// Positive banking raises the +side edge (tangent.z, -tangent.x).
export const rallyTrackConfig={
 enabled:true,extension:370,originOffsetX:195,cornerSmoothing:.18,horizontalScale:.85,elevationScale:.85,sampleSpacing:1.5,
 shoulder:5,terrainBlend:38,terrainSpacing:3,
 surface:{kind:'compacted-dirt',grip:1},
 startFinish:{u:0,label:'PINE RIDGE RALLY'},
 controlPoints:[
  {id:'start',x:-70,z:85,y:6,width:14,feature:'start-finish'},
  {id:'straight',x:20,z:85,y:6,width:14},
  {id:'climb-entry',x:90,z:65,y:9,width:13,bank:-4},
  {id:'uphill',x:98,z:5,y:22,width:12,feature:'uphill'},
  {id:'upper-climb',x:80,z:-65,y:40,width:12},
  {id:'summit',x:55,z:-85,y:44,width:13,bank:-3,feature:'summit'},
  {id:'descent-entry',x:28,z:-78,y:43,width:12,bank:-4},
  {id:'switchback-a',x:20,z:-55,y:36,width:12,bank:-5,feature:'downhill'},
  {id:'switchback-b',x:45,z:-30,y:29,width:12,bank:5},
  {id:'switchback-c',x:20,z:-5,y:22,width:12,bank:-5},
  {id:'valley',x:25,z:20,y:17,width:13},
  {id:'sweep',x:0,z:35,y:16,width:13,bank:3},
  {id:'ridge-entry',x:-55,z:-25,y:20,width:12},
  {id:'ridge',x:-55,z:-65,y:26,width:12},
  {id:'hairpin-entry',x:-85,z:-80,y:28,width:13,bank:-4},
  {id:'hairpin',x:-115,z:-65,y:27,width:13,bank:-5},
  {id:'hairpin-exit',x:-120,z:-30,y:22,width:13,bank:-3},
  {id:'return-s',x:-90,z:-10,y:18,width:12,bank:3},
  {id:'return',x:-75,z:30,y:9,width:13},
 ],
 accessRoad:[
  {id:'sandbox',x:-55,z:85,width:12},
  {id:'gateway',x:-15,z:100,width:12},
  {id:'access-bend',x:30,z:110,y:24,width:12},
  {id:'access-descent',x:75,z:110,y:12,width:12},
 ],
 // Data only: no boost activation, racing UI, timer or checkpoint logic yet.
 boostPads:[], // {id,u,width,length,strength,duration,cooldown,appearance,particles,sound}
 checkpoints:[], // {id,u}; u is normalized arc length, shared with future minimaps/ghosts.
 scenery:{density:1,seed:8451,trees:260,rocks:150,gravel:240,minRoadDistance:5,maxSlope:.65,minElevation:-10,maxElevation:65,exclusions:[]},
};

export function rallyAccessConfig(config,merge,sandboxHalfSize,height){
 const zScale=Math.min(1,(sandboxHalfSize-30)/110);
 return {...config,horizontalScale:1,elevationScale:1,controlPoints:[
  ...config.accessRoad.map(p=>{const x=sandboxHalfSize+p.x,z=p.z*zScale;return {...p,x,z,y:p.y??height(x,z)};}),
  {...merge,bank:0,id:'merge'},
 ]};
}
