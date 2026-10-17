import * as THREE from 'three';
import {RapierWorldVehicle} from '../RapierWorldVehicle.js';
import {playableVehicleConfig} from '../PlayableVehicleSetup.js';
import {TreeCollisionSystem} from '../TreeCollisionSystem.js';
import {RockInteractionSystem} from '../RockInteractionSystem.js';

// A lab environment adapter, not a controller. Use the exact playable hybrid
// with empty obstacle/debris populations; all handling comes from VehicleConfig.
export function createJumpLabVehicle(RAPIER,{scene,surface,height,vehicle,index,position,heading=0,limit=205}){
 const trees=new TreeCollisionSystem(scene,{groundHeight:height});
 const rocks=new RockInteractionSystem(scene,{groundHeight:height});
 const groundDebris={getWheelHeightAt:()=>0};
 const config=playableVehicleConfig(index);
 const controller=new RapierWorldVehicle(RAPIER,{surface,height,groundDebris,trees,rocks,limit});
 try{controller.setVehicle(vehicle,config,index,position??new THREE.Vector3(),heading);}
 catch(error){controller.dispose();trees.dispose();rocks.dispose();throw error;}
 return {controller,config,dispose(){controller.dispose();trees.dispose();rocks.dispose();}};
}
