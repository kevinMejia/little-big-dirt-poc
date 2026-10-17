import './TuningStore.js';
import {vehicleConfig,originalDriveConfig,jumpConfig,jumpVehicleConfig} from './VehicleConfig.js';
import {stinkyCollision} from './StinkyEquipment.js';

// Shared main-game/lab configuration assembly. Numbers below describe the
// existing collision envelope, not another set of handling parameters.
export function playableVehicleConfig(index,collision){
 const drive=originalDriveConfig[index===0?'dirty':'stinky'];
 return {...drive,hill:vehicleConfig[index===0?'backhoe':'garbageTruck'],
  accel:drive.acceleration,max:drive.topSpeed,reverse:drive.reverseSpeed,
  collision:collision??(index===0?{radius:1.2,rear:-2.4,front:2.75}:stinkyCollision)};
}

export function smoothDrivingSteering(previous,input,config,dt){
 const target=Math.max(-1,Math.min(1,Number(input.steerRight)-Number(input.steerLeft)+(input.axis??0)));
 const alpha=1-Math.exp(-config.steeringInputRate*dt);
 return (1-alpha)*previous+alpha*target;
}

export function hybridDrivingInput(input,steering,airborne){
 return {throttle:input.accelerate?1:input.reverse?-1:0,steering,
  brake:input.brake||input.emergencyBrake,emergencyBrake:input.emergencyBrake,
  pitch:airborne?Number(input.reverse)-Number(input.accelerate):0};
}

// Keep the existing main-game landing behavior, including per-vehicle scaling,
// cannon-specific bounce, body feedback, dust and optional main-game audio.
export function hybridLandingFeedback(event,index,config,feedback,effects,height,sound=()=>{}){
 feedback.landingImpact(config.hill,event.impact,event.bounce??jumpConfig.landingBouncePercent*jumpVehicleConfig[index===0?'dirty':'stinky'].landingBounceScalePercent/100);
 if(jumpConfig.landingDustPercent>0)effects.puff(event.x,height(event.x,event.z)+.2,event.z,event.impact*jumpConfig.landingDustPercent/100);
 sound(event.impact);
}
