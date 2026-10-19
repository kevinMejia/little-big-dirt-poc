// Dependency-free deterministic placement. No simulation state or physics imports.
export function seededRandom(seed){let state=seed>>>0;return ()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);}
export function excluded(x,z,r,zones){return zones.some(q=>q.radius!=null?Math.hypot(x-q.x,z-q.z)<q.radius+r:x>q.minX-r&&x<q.maxX+r&&z>q.minZ-r&&z<q.maxZ+r);}
export function placeDebris({config,tier,halfSize,bounds={minX:-halfSize,maxX:halfSize,minZ:-halfSize,maxZ:halfSize},painter,trees=[],rocks=[],sample,blocked=()=>false,edgeDistance=()=>Infinity,biome=()=>true}){
  const records=[],random=seededRandom(config.seed),area=(bounds.maxX-bounds.minX)*(bounds.maxZ-bounds.minZ)/(440*440);
  for(const [kind,type] of Object.entries(config.types)){
    const budget=Math.min(12000,Math.max(0,Math.round(type.count*area*Math.max(0,Math.min(3,config.density))*tier.density)));
    let accepted=0;
    for(let attempt=0;attempt<budget*35&&accepted<budget;attempt++){
      let x=bounds.minX+16+random()*(bounds.maxX-bounds.minX-32),z=bounds.minZ+16+random()*(bounds.maxZ-bounds.minZ-32);
      const anchors=type.habitat==='wood'?trees:rocks;
      if(anchors.length&&random()<config.clustering){const a=anchors[Math.floor(random()*anchors.length)],angle=random()*Math.PI*2,d=2+random()*13;x=a.x+Math.cos(angle)*d;z=a.z+Math.sin(angle)*d;}
      const scale=type.scale[0]+random()*(type.scale[1]-type.scale[0]),radius=type.radius*scale;
      if(x-radius<bounds.minX+12||x+radius>bounds.maxX-12||z-radius<bounds.minZ+12||z+radius>bounds.maxZ-12||excluded(x,z,radius,config.exclusions)||blocked(x,z,radius))continue;
      // Protect the winding sandbox trail, including each object's footprint.
      const edge=Math.abs(x-18*Math.sin(z*.025));if(edge<8+radius)continue;
      if(trees.some(t=>Math.hypot(x-t.x,z-t.z)<t.scale*.35+radius+.3)||rocks.some(r=>Math.hypot(x-r.x,z-r.z)<r.radius+radius+.3))continue;
      const field=painter.surface(x,z);if(field.ramp>.01||field.slope>.65||!biome(kind,x,z,field))continue;
      const chance=type.habitat==='wood'?(trees.some(t=>Math.hypot(x-t.x,z-t.z)<18)?.95:.035):type.habitat==='edge'?(Math.min(edge,edgeDistance(x,z))<15?.95:.06):type.habitat==='hill'?Math.min(.95,.1+field.slope*2):Math.min(.95,.12+field.dirtMask*.65+field.slope);
      if(random()>chance)continue;
      const ground=sample(x,z);if(!ground)continue;
      records.push({kind,x,z,y:ground.y,normal:ground.normal,scale,radius,yaw:config.rotation[0]+random()*(config.rotation[1]-config.rotation[0]),variant:Math.floor(random()*3),collision:'none'});accepted++;
    }
  }
  return records;
}
