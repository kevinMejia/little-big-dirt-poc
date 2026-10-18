// Visual settings only. TreeCollisionSystem and treeConfig still own physics.
export const pineTreeConfig={
  // World-unit heights, independent of source dimensions. Raising these makes
  // every pine taller AND wider uniformly; placement, density and colliders stay fixed.
  minHeight:5.2,
  maxHeight:7.2,
  // Relative weights in Pine_1 ... Pine_5 order. Equal weights give equal odds.
  // Set a weight to zero to exclude it; larger weights make that pine more common.
  weights:[1,1,1,1,1],
};
export const pineKinds=['Pine_1','Pine_2','Pine_3','Pine_4','Pine_5'];
export function pineHeight(variant,variation=0){
  const fraction=Math.min(1,Math.max(0,[.45,.15,.8,.9,.3][variant]+variation));
  return pineTreeConfig.minHeight+(pineTreeConfig.maxHeight-pineTreeConfig.minHeight)*fraction;
}
// Separate coordinate hash: never consume the world layout's random sequence.
const sample=(x,z,salt)=>{const v=Math.sin(x*127.1+z*311.7+salt*74.7)*43758.5453;return v-Math.floor(v);};
export function pineAppearance(x,z){
  const weights=pineTreeConfig.weights.map(w=>Math.max(0,Number(w)||0));
  const total=weights.reduce((a,b)=>a+b,0);
  let pick=sample(x,z,1)*(total||5),variant=4;
  for(let i=0;i<5;i++){pick-=total?weights[i]:1;if(pick<0){variant=i;break;}}
  // Bushier variants occupy the shorter part of the range; narrow ones the taller
  // part, with small deterministic variation and no nonuniform stretching.
  return {variant,height:pineHeight(variant,(sample(x,z,2)-.5)*.2),yaw:sample(x,z,3)*Math.PI*2};
}
export function preparePine(THREE,source,height,yaw=0){
  const root=new THREE.Group(),copy=source.clone(true);
  const bounds=new THREE.Box3().setFromObject(copy),factor=height/bounds.getSize(new THREE.Vector3()).y;
  copy.scale.multiplyScalar(factor);copy.position.y-=bounds.min.y*factor;
  root.rotation.y=yaw;root.add(copy);return root;
}
