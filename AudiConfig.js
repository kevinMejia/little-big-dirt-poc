import {vehicleConfig,originalDriveConfig,arcadeHandlingConfig} from './VehicleConfig.js';
export function audiConfig(){
 const drive={...originalDriveConfig.dirty,acceleration:25,topSpeed:72,reverseSpeed:13,turn:1.8,drag:1.2,steeringInputRate:7,brakeDeceleration:32,emergencyBrakeDeceleration:24};
 return {...drive,accel:drive.acceleration,max:drive.topSpeed,reverse:drive.reverseSpeed,
  handling:{...arcadeHandlingConfig.dirty,...drive,steeringFullSpeed:6,steeringResponse:1.4,speedSteeringReduction:.035,suspensionStiffness:22,suspensionDamping:16,landingSpeedRetention:.92,landingCompressionScale:.016,airborneAngularDamping:5,airborneRollControlPercent:5},
  hill:{...vehicleConfig.backhoe,speedAdjustmentPercent:0,downhillBoostPercent:12,uphillPenaltyPercent:15,releaseDeceleration:3,bodyRollPercent:18,bodyPitchPercent:22,landingDamping:15,boundaryCannon:{...vehicleConfig.backhoe.boundaryCannon,launchSpinPercent:0}},
  physics:{mass:1800,restLength:.35,suspensionStiffness:35,suspensionCompression:5,suspensionRelaxation:6},landingBouncePercent:12,
  collision:{radius:1.5,rear:-2.5,front:2.5},chassisHalfExtents:{x:1.05,y:.4,z:2},rally:true};
}
