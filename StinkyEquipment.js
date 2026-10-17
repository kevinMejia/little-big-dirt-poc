// Shared garage/touch pose contract. Values are degrees; GLB joints use radians.
export const stinkyCollision={radius:1.77,rear:-1.76,front:1.90};
export function sanitizeStinkyPose(pose){
  if(!pose||!Number.isFinite(pose.hopper)||!Number.isFinite(pose.compactor))return null;
  return {hopper:Math.max(0,Math.min(40,pose.hopper)),compactor:Math.max(-37,Math.min(17,pose.compactor))};
}
export function applyStinkyPose(model,pose){
  const safe=sanitizeStinkyPose(pose);if(!model?.setHopper||!safe)return;
  model.setHopper(safe.hopper*Math.PI/180);model.setCompactor(safe.compactor*Math.PI/180);model.update(0);
}
export function stinkyActions(getPose,setPose){
  return [
    {id:'hopper',label:'Hopper',onPress(){const p=getPose();setPose({...p,hopper:p.hopper>20?0:40});}},
    {id:'compactor',label:'Compact',onPress(){const p=getPose();setPose({...p,compactor:p.compactor<-18?0:-37});}},
  ];
}
