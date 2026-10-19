// File defaults; reload Play after edits. Metres, radians, density multipliers.
// Independent of legacy GroundDebrisSystem suspension settings and saved overrides.
export const debrisTypes={
  smallRock:{count:750,scale:[.7,1.4],radius:.28,habitat:'stone'},
  mediumRock:{count:90,scale:[.7,1.3],radius:.7,habitat:'hill'},
  gravel:{count:230,scale:[.7,1.4],radius:.65,habitat:'edge'},
  twig:{count:260,scale:[.7,1.5],radius:.55,habitat:'wood'},
  branch:{count:110,scale:[.7,1.3],radius:1.1,habitat:'wood'},
  log:{count:35,scale:[.7,1.2],radius:1.35,habitat:'wood'},
  fragment:{count:140,scale:[.7,1.4],radius:.4,habitat:'wood'},
  splinter:{count:190,scale:[.7,1.5],radius:.3,habitat:'wood'},
};
export const proceduralDebrisConfig={enabled:true,seed:48271,density:1,quality:'auto',
  tiers:{desktop:{density:1,distance:150},mobile:{density:.35,distance:85}},
  distance:null,rotation:[0,Math.PI*2],clustering:.72,chunkSize:96,
  // Visual wheel/body bumps only. Metres, strength 0–1; hard height cap .12 m.
  // Live enable/strength/maxHeight; changing footprints requires reload.
  bumps:{enabled:true,strength:.7,maxHeight:.07},
  types:debrisTypes,
  // Circle {x,z,radius} or axis-aligned box {minX,maxX,minZ,maxZ}.
  exclusions:[{x:0,z:0,radius:26}],
};
