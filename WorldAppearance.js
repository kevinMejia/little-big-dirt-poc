import * as THREE from 'three';

// Appearance only. Percentages clamp to 0–100; changes apply on page reload.
export const worldAppearance={
  fogEnabled:false,
  distantHillsEnabled:true,
  terrainColorVariation:25,
  dirtPatchPercent:15,
  rockyGroundPercent:8,
  grassDetailDensity:60,
  vegetationClusteringPercent:60,
  hazeStrengthPercent:8,
};
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
const pct=v=>clamp(Number(v)||0,0,100)/100;
function hash(x,z){const v=Math.sin(x*127.1+z*311.7+17.3)*43758.5453;return v-Math.floor(v);}
export function landscapeNoise(x,z){
  const ix=Math.floor(x),iz=Math.floor(z),tx=smooth(x-ix),tz=smooth(z-iz);
  const a=hash(ix,iz)*(1-tx)+hash(ix+1,iz)*tx,b=hash(ix,iz+1)*(1-tx)+hash(ix+1,iz+1)*tx;
  return a*(1-tz)+b*tz;
}

const fbm=(x,z)=>landscapeNoise(x,z)*.72+landscapeNoise(x*2.13+17,z*2.13-31)*.28;
export function landscapeFields(x,z){
  return {grass:fbm(x*.014,z*.014),dirt:fbm(x*.038+54,z*.038-21),rock:fbm(x*.052-12,z*.052+48),woods:fbm(x*.018+103,z*.018-71),meadow:fbm(x*.016-83,z*.016+19)};
}
const pathDistance=(x,z)=>Math.abs(x-18*Math.sin(z*.025));
function quantile(values,percent){values.sort((a,b)=>a-b);return values[Math.min(values.length-1,Math.floor((1-percent)*values.length))];}

export function createTerrainPainter(height,halfSize,config=worldAppearance){
  const dirtSamples=[],rockSamples=[];
  for(let z=-halfSize;z<=halfSize;z+=12)for(let x=-halfSize;x<=halfSize;x+=12){const field=landscapeFields(x,z);dirtSamples.push(field.dirt);rockSamples.push(field.rock);}
  const dirt=pct(config.dirtPatchPercent),rock=pct(config.rockyGroundPercent),variation=pct(config.terrainColorVariation);
  const dirtThreshold=quantile(dirtSamples,dirt),rockThreshold=quantile(rockSamples,rock);
  const base=new THREE.Color(0x79a956),low=new THREE.Color(0x557d39),high=new THREE.Color(0xa2bf6b),earth=new THREE.Color(0xa58b58),soil=new THREE.Color(0xb19b69),stone=new THREE.Color(0x929783),road=new THREE.Color(0xb99563),grass=new THREE.Color();
  const surface=(x,z)=>{
    const field=landscapeFields(x,z),e=.75;
    const slope=Math.hypot((height(x+e,z)-height(x-e,z))/(2*e),(height(x,z+e)-height(x,z-e))/(2*e));
    const path=1-smooth((pathDistance(x,z)-3.8)/2.8);
    const dirtMask=dirt===0?0:dirt===1?1:smooth((field.dirt-dirtThreshold)/.06);
    const rockMask=rock===0?0:rock===1?1:smooth((field.rock-rockThreshold)/.06);
    return {...field,path,slope,dirtMask:Math.max(dirtMask,smooth((slope-.17)/.28)*dirt*1.8),rockMask:rockMask*(.5+.5*smooth(slope/.4))};
  };
  function sampleColor(x,z,target=new THREE.Color()){
    const field=surface(x,z);
    grass.copy(low).lerp(high,smooth((field.grass-.18)/.68));
    target.copy(base).lerp(grass,Math.min(1,variation*2));
    target.lerp(earth,field.dirtMask*.78).lerp(soil,smooth((field.slope-.25)/.3)*dirt*.75);
    target.lerp(stone,field.rockMask*.8).lerp(road,field.path);
    target.multiplyScalar(1+(landscapeNoise(x*.31,z*.31)-.5)*.18*variation);
    return target;
  }
  return {sampleColor,surface,dirtThreshold,rockThreshold};
}

function seeded(seed){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
export function createSceneryLayout(painter,halfSize,config=worldAppearance){
  const random=seeded(3184),cluster=pct(config.vegetationClusteringPercent),treeLimit=halfSize-18,rockLimit=halfSize-35;
  const centers=[],rockCenters=[],trees=[],rocks=[];
  for(let i=0;i<12;i++)centers.push({x:(random()-.5)*treeLimit*1.65,z:(random()-.5)*treeLimit*1.65});
  for(let tries=0;tries<1500&&rockCenters.length<8;tries++){
    const x=(random()*2-1)*rockLimit*.85,z=(random()*2-1)*rockLimit*.85;
    if(landscapeFields(x,z).rock>=painter.rockThreshold&&rockCenters.every(p=>Math.hypot(p.x-x,p.z-z)>24))rockCenters.push({x,z});
  }
  if(!rockCenters.length)rockCenters.push(...centers.slice(0,8));
  const point=(limit,centers)=>{
    if(random()<cluster){const center=centers[Math.floor(random()*centers.length)],angle=random()*Math.PI*2,radius=Math.sqrt(random())*(13+random()*15);return {x:clamp(center.x+Math.cos(angle)*radius,-limit,limit),z:clamp(center.z+Math.sin(angle)*radius,-limit,limit)};}
    return {x:(random()*2-1)*limit,z:(random()*2-1)*limit};
  };
  for(let tries=0;tries<20000&&trees.length<175;tries++){
    const p=point(treeLimit,centers),field=landscapeFields(p.x,p.z);
    if(Math.hypot(p.x,p.z)<25||pathDistance(p.x,p.z)<8.5)continue;
    if(random()>1-cluster+cluster*(.12+.88*smooth((field.woods-.25)/.5)))continue;
    if(field.meadow>.65&&random()<cluster*.95)continue;
    const scale=.65+random()*.9;
    if(trees.some(t=>Math.hypot(t.x-p.x,t.z-p.z)<2.1+scale+t.scale))continue;
    trees.push({...p,scale});
  }
  for(let tries=0;tries<16000&&rocks.length<80;tries++){
    const p=point(rockLimit,rockCenters),radius=.45+random()*1.2;
    if(Math.hypot(p.x,p.z)<22||pathDistance(p.x,p.z)<7.5)continue;
    if(rocks.some(r=>Math.hypot(r.x-p.x,r.z-p.z)<r.radius+radius+1))continue;
    if(trees.some(t=>Math.hypot(t.x-p.x,t.z-p.z)<radius+t.scale*.4+1))continue;
    rocks.push({...p,radius});
  }
  return {trees,rocks};
}

export function createWorldAtmosphere(scene,height,halfSize,config=worldAppearance,painter=null){
  scene.background=new THREE.Color(0xb5e1ee);
  // Even at full haze the first 350 units remain completely clear.
  const haze=pct(config.hazeStrengthPercent);
  scene.fog=config.fogEnabled&&haze>0?new THREE.Fog(0xd3dfd8,350,350+1000/haze):null;
  const group=new THREE.Group();group.name='Decorative distant rolling hills';scene.add(group);
  if(config.distantHillsEnabled){
    // Continuous square skirt: the inner ring matches every playable edge vertex.
    // Far rings descend below the landscape behind the ridges, never float above it.
    const segments=880,rings=[0,12,35,65,105,150,205,270,350,450,560],vertices=[],colors=[],indices=[];
    const near=new THREE.Color(0x79a956),far=new THREE.Color(0x829b7b),color=new THREE.Color();
    for(let ring=0;ring<rings.length;ring++)for(let i=0;i<segments;i++){
      const side=Math.floor(i/(segments/4)),t=(i%(segments/4))/(segments/4),r=halfSize+rings[ring];
      const x=side===0?r:side===1?r*(1-2*t):side===2?-r:r*(-1+2*t);
      const z=side===0?r*(-1+2*t):side===1?r:side===2?r*(1-2*t):-r;
      const edgeX=x*halfSize/r,edgeZ=z*halfSize/r,edge=height(edgeX,edgeZ);
      const distance=rings[ring],blend=smooth(distance/95);
      const rolling=edge+10+landscapeNoise(x*.008,z*.008)*52+landscapeNoise(x*.019+19,z*.019-9)*16;
      let y=edge*(1-blend)+rolling*blend;
      y=THREE.MathUtils.lerp(y,-85,smooth((distance-390)/170));
      vertices.push(x,y,z);
      color.copy(near).lerp(far,clamp(distance/400)).multiplyScalar(.94+.1*landscapeNoise(x*.025,z*.025));
      if(painter){painter.sampleColor(edgeX,edgeZ,color);color.lerp(near,smooth(distance/40)).lerp(far,clamp(distance/400));}
      else if(ring===0)color.copy(near);
      colors.push(color.r,color.g,color.b);
      if(ring<rings.length-1){const a=ring*segments+i,b=ring*segments+(i+1)%segments,c=a+segments,d=b+segments;indices.push(a,b,c,b,d,c);}
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1});
    const hills=new THREE.Mesh(geometry,material);hills.receiveShadow=true;group.add(hills);
  }
  return {group,dispose(){group.removeFromParent();group.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});}};
}

function plantGeometry(flower=false){
  const positions=[],colors=[];
  function tetra(points,color){
    const c=new THREE.Color(color),center=new THREE.Vector3();for(const p of points)center.add(new THREE.Vector3(...p));center.multiplyScalar(.25);
    for(const face of [[0,2,1],[0,1,3],[1,2,3],[2,0,3]]){
      const a=new THREE.Vector3(...points[face[0]]),b=new THREE.Vector3(...points[face[1]]),d=new THREE.Vector3(...points[face[2]]);
      if(b.clone().sub(a).cross(d.clone().sub(a)).dot(a.clone().add(b).add(d).multiplyScalar(1/3).sub(center))<0)face.reverse();
      for(const i of face){positions.push(...points[i]);colors.push(c.r,c.g,c.b);}
    }
  }
  if(flower){
    tetra([[-.02,0,0],[.02,0,0],[0,0,.025],[0,.36,0]],0x4f833d);
    for(let i=0;i<5;i++){
      const a=i*Math.PI*2/5,dx=Math.cos(a),dz=Math.sin(a),sideX=-dz*.045,sideZ=dx*.045;
      tetra([[0,.34,0],[dx*.08+sideX,.33,dz*.08+sideZ],[dx*.08-sideX,.33,dz*.08-sideZ],[dx*.15,.38,dz*.15]],0xfff3ce);
    }
    tetra([[-.04,.35,-.02],[.04,.35,-.02],[0,.35,.05],[0,.41,0]],0xe9b83b);
  }else for(let i=0;i<3;i++){
    const a=i*Math.PI*2/3,dx=Math.cos(a),dz=Math.sin(a),x=dx*.08,z=dz*.08;
    tetra([[x-dz*.05,0,z+dx*.05],[x+dz*.05,0,z-dx*.05],[x+dx*.025,0,z+dz*.025],[x+dx*.12,.36+i*.08,z+dz*.12]],0xffffff);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();return geometry;
}

export function createGroundDetails(scene,height,halfSize,painter,layout,config=worldAppearance){
  const group=new THREE.Group();group.name='Non-collidable meadow details';scene.add(group);
  const density=pct(config.grassDetailDensity),random=seeded(9071),budgets={grass:Math.round(10000*density),flowers:Math.round(700*density),pebbles:Math.round(450*density)};
  const cells=new Map(),key=(x,z)=>`${Math.floor(x/4)},${Math.floor(z/4)}`;
  for(const o of [...layout.trees.map(t=>({x:t.x,z:t.z,r:t.scale*.35+.35})),...layout.rocks.map(r=>({x:r.x,z:r.z,r:r.radius+.3}))]){const k=key(o.x,o.z);if(!cells.has(k))cells.set(k,[]);cells.get(k).push(o);}
  const occupied=(x,z)=>{const ix=Math.floor(x/4),iz=Math.floor(z/4);for(let i=ix-1;i<=ix+1;i++)for(let j=iz-1;j<=iz+1;j++)for(const o of cells.get(`${i},${j}`)||[])if((o.x-x)**2+(o.z-z)**2<o.r*o.r)return true;return false;};
  const dummy=new THREE.Object3D(),up=new THREE.Vector3(0,1,0),normal=new THREE.Vector3(),color=new THREE.Color(),grassHighlight=new THREE.Color(0x82a94f);
  for(const kind of ['grass','flowers','pebbles']){
    const budget=budgets[kind];if(!budget)continue;
    const geometry=kind==='pebbles'?new THREE.IcosahedronGeometry(.12,0):plantGeometry(kind==='flowers');
    if(kind==='pebbles')geometry.translate(0,.105,0);
    const material=new THREE.MeshStandardMaterial({roughness:1,vertexColors:kind==='flowers',flatShading:true});
    const batch=new THREE.InstancedMesh(geometry,material,budget);batch.name='Instanced '+kind;batch.receiveShadow=true;batch.castShadow=false;
    let count=0;
    for(let tries=0;tries<budget*10&&count<budget;tries++){
      const x=(random()*2-1)*(halfSize-18),z=(random()*2-1)*(halfSize-18);
      if(pathDistance(x,z)<7||occupied(x,z))continue;
      const field=painter.surface(x,z);
      if(kind!=='pebbles'&&random()<Math.max(field.dirtMask*.8,field.rockMask*.9))continue;
      if(kind==='flowers'&&(field.meadow<.4||random()<field.dirtMask))continue;
      if(kind==='pebbles'&&random()>.15+.85*field.rockMask)continue;
      dummy.position.set(x,height(x,z)+.008,z);
      normal.set(height(x-.35,z)-height(x+.35,z),.7,height(x,z-.35)-height(x,z+.35)).normalize();dummy.quaternion.setFromUnitVectors(up,normal);dummy.rotateY(random()*Math.PI*2);
      const scale=.65+random()*.85;dummy.scale.set(scale*(kind==='pebbles'?1.3:1),scale,scale);dummy.updateMatrix();batch.setMatrixAt(count,dummy.matrix);
      if(kind==='grass')color.set(0x547e3b).lerp(grassHighlight,random());
      else if(kind==='flowers')color.set([0xffffff,0xffe7ab,0xf6d8e7][Math.floor(random()*3)]);
      else color.set(0x929582).multiplyScalar(.85+random()*.25);
      batch.setColorAt(count,color);count++;
    }
    batch.count=count;batch.instanceMatrix.needsUpdate=true;if(batch.instanceColor)batch.instanceColor.needsUpdate=true;batch.computeBoundingSphere();group.add(batch);
  }
  group.userData.budgets=budgets;
  return {group,dispose(){group.removeFromParent();group.traverse(o=>{if(o.isInstancedMesh){o.dispose();o.geometry.dispose();o.material.dispose();}});}};
}
