// Main-world speed boosts exceed the isolated lab's 18-unit/s tire tuning.
// Increase the tire force limit smoothly; retain physical steering and suspension.
export function rapierTireGrip(speed,steering=0){
  return 2.5+3.5*Math.max(0,Math.min(1,(Math.abs(speed)-8)/22))*Math.min(1,Math.abs(steering)/.25);
}
export function updateRapierTireGrip(physics,steering=0){
  const grip=rapierTireGrip(physics.state.speed,steering);
  for(let i=0;i<physics.wheels.length;i++)physics.controller.setWheelFrictionSlip(i,grip);
}
