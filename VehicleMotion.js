/** Release braking in world units/second squared, symmetric in both directions.
 * Call only when neither accelerate nor reverse is active, after drag/limits.
 * Slope propulsion is separately gated to active driving to prevent hill creep.
 */
export function applyReleaseDeceleration(speed,dt,config){
  const threshold=Math.max(0,config.stopThreshold??.1);
  const deceleration=config.autoBrakeOnRelease===false?0:Math.max(0,config.releaseDeceleration??5);
  const magnitude=Math.max(0,Math.abs(speed)-deceleration*Math.max(0,dt));
  return magnitude<=threshold?0:Math.sign(speed)*magnitude;
}
