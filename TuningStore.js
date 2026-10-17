import * as config from './VehicleConfig.js';

// VehicleConfig.js owns defaults. This module stores only explicit user overrides.
export const tuningConfig=config;
export const tuningDefaults=JSON.parse(JSON.stringify(config));
const clone=value=>JSON.parse(JSON.stringify(value));
const get=(root,path)=>path.split('.').reduce((value,key)=>value[key],root);
const assign=(path,value)=>{const keys=path.split('.'),key=keys.pop();get(config,keys.join('.'))[key]=value;};
export const tuningKey=(base=import.meta.url)=>'little-big-dirt:tuning:'+new URL('.',base).pathname;
export function tuningStorage(){try{return window.localStorage;}catch{return null;}}
export const tuningFields=[];
function add(group,root,keys,{vehicle=false,mode='both',scope='driving'}={}){
 for(const [key,label,min,max,step,unit,description,hardMin=min,hardMax=max] of keys)tuningFields.push({id:root+'.'+key,root,key,label,group,min,max,step,unit,description,hardMin,hardMax,vehicle,mode,scope});
}
add('Driving','drive',[
 ['acceleration','Acceleration',0,40,.5,'m/s²','Forward acceleration; speed adjustment also multiplies this.',0,null],
 ['topSpeed','Forward speed',0,60,.5,'m/s','Base forward limit before speed adjustment and hills.',0,null],
 ['reverseSpeed','Reverse speed',0,30,.5,'m/s','Base reverse limit before speed adjustment.',0,null],
 ['turn','Turning rate',0,4,.01,'rad/s','Higher turns faster once moving; steering response also applies.',0,null],
 ['drag','Rolling drag',0,4,.02,'coefficient','Higher removes more speed every step.',0,null],
],{vehicle:true});
add('Driving','originalDriveConfig',[
 ['steeringInputRate','Steering smoothing',.1,20,.1,'1/s','Higher reaches the requested steering sooner.',0,null],
 ['brakeDeceleration','Brake strength',0,60,1,'m/s²','Space or touch brake slows the vehicle.',0,null],
 ['emergencyBrakeDeceleration','Emergency brake',0,80,1,'m/s²','E applies this stronger stop rate.',0,null],
],{vehicle:true});
add('Driving','vehicleConfig',[
 ['speedAdjustmentPercent','Speed adjustment',-100,300,5,'%','Multiplier = 1 + value / 100, for acceleration and speed.',-100,null],
 ['downhillBoostPercent','Downhill boost',0,200,5,'%','Adds acceleration and speed on descents; depends on hill grade.',0,null],
 ['uphillPenaltyPercent','Uphill penalty',0,95,1,'%','Higher makes climbs slower.'],
 ['releaseDeceleration','Coasting brake',0,20,.5,'m/s²','Constant slowing after releasing throttle, when auto brake is enabled.',0,null],
 ['stopThreshold','Final stop threshold',0,1,.01,'m/s','Snaps the remaining coasting speed to zero.',0,null],
],{vehicle:true});
add('Driving','arcadeHandlingConfig',[
 ['steeringResponse','Steering response',0,3,.05,'multiplier','Multiplies turning rate after input smoothing.',0,null],
 ['steeringFullSpeed','Full steering speed',.1,30,.1,'m/s','Higher makes turning build more gradually at low speed.',.01,null],
 ['speedSteeringReduction','Fast steering reduction',0,.2,.005,'s/m','Higher reduces steering as speed increases.',0,null],
],{vehicle:true,mode:'hybrid'});
add('Driving','originalDriveConfig',[
 ['steeringFullSpeed','Full steering speed',.1,30,.1,'m/s','Original steering reaches full strength at this speed.',.01,null],
],{vehicle:true,mode:'original'});
add('Suspension and Body','vehicleConfig',[
 ['bodyRollPercent','Body roll',0,100,1,'%','Visible turn lean and debris roll; does not tip the collider.'],
 ['bodyPitchPercent','Body pitch',0,100,1,'%','Visible nod under acceleration and braking.'],
 ['bodySpringStiffness','Body return spring',1,120,1,'1/s²','Higher returns the visual body faster; adjust damping together.',.01,null],
 ['bodyDamping','Body damping',0,30,.5,'1/s','Higher reduces visual wobble; excessive damping slows settling.',0,null],
],{vehicle:true});
add('Suspension and Body','vehicleConfig',[
 ['suspensionBouncePercent','Terrain body bounce',0,100,1,'%','Original terrain motion only; inactive in hybrid.'],
],{vehicle:true,mode:'original'});
add('Suspension and Body','arcadeHandlingConfig',[
 ['suspensionStiffness','Wheel compression response',0,60,1,'1/s','Visual wheels compress faster. This is not a physical spring.',0,null],
 ['suspensionDamping','Wheel extension response',0,60,1,'1/s','Visual wheels return faster; does not change chassis forces.',0,null],
],{vehicle:true,mode:'hybrid'});
add('Jumping and Landing','jumpConfig',[
 ['gravityScalePercent','Gravity',25,200,1,'%','Both vehicles: 100% = 12 m/s², 200% = 24 m/s². Existing 250 is effectively 200.'],
 ['airbornePitchControlPercent','Air pitch control',0,100,1,'%','Both vehicles: W/S torque tilts the airborne body.'],
 ['landingBouncePercent','Landing bounce',0,100,1,'%','Both vehicles: visual heave kick, not repeated physical bouncing. Vehicle bounce scale also applies.'],
 ['landingDustPercent','Landing dust',0,100,1,'%','Both vehicles: landing puff strength, multiplied by global dust intensity.',0,null],
],{mode:'hybrid'});
add('Jumping and Landing','arcadeHandlingConfig',[
 ['minimumLaunchSpeed','Minimum upward launch speed',0,8,.1,'m/s','Higher keeps the vehicle grounded over more small crests.',0,null],
 ['takeoffClearance','Takeoff clearance',0,.1,.001,'m','Higher requires more predicted clearance before flight.',0,null],
 ['airborneRollControlPercent','Air roll control',0,100,1,'%','Steering applies roll torque while airborne.'],
 ['airborneAngularDamping','Air rotation damping',0,8,.1,'1/s','Higher slows airborne spins sooner.',0,null],
 ['landingCompressionScale','Landing wheel compression',0,.1,.001,'s','Impact speed times this value sets initial compression, capped at 0.25 m.',0,null],
 ['landingSpeedRetention','Landing speed retention',0,1,.01,'fraction','Fraction of forward speed kept when touching down.'],
],{vehicle:true,mode:'hybrid'});
add('Jumping and Landing','jumpVehicleConfig',[
 ['landingBounceScalePercent','Vehicle bounce scale',0,200,5,'%','Scales the shared landing bounce for this vehicle; final feedback clamps to 100%.',0,null],
],{vehicle:true,mode:'hybrid'});
add('Jumping and Landing','vehicleConfig',[
 ['landingDamping','Landing damping',0,30,.5,'1/s','Damps visual heave for 1.8 seconds after impact.',0,null],
 ['boundaryBodyRockPercent','Landing body movement',0,100,1,'%','Visible pitch kick on landing; Original also uses it at borders.'],
],{vehicle:true});
add('Boundary Cannon','cannon',[
 ['horizontalLaunchSpeed','Horizontal launch speed',8,65,1,'m/s','Inward launch speed; higher travels farther.'],
 ['verticalLaunchSpeed','Vertical launch speed',8,40,1,'m/s','Upward launch speed; higher stays airborne longer.'],
 ['launchSpinPercent','Launch rotation',0,100,1,'%','Initial rotation in hybrid; visual wobble in Original.'],
 ['airControlPercent','Cannon path steering',0,100,1,'%','Steering turns horizontal flight velocity.'],
 ['landingBouncePercent','Cannon landing bounce',0,100,1,'%','Visual landing heave for cannon flights, replacing normal bounce.'],
],{vehicle:true});
add('World Interactions','vehicleConfig',[
 ['treeKnockdownSpeedPercent','Tree knockdown threshold',0,100,1,'% of base speed','Higher requires a stronger normal impact; based on unscaled top speed.'],
 ['rockCrackSpeedPercent','Rock crack threshold',0,100,1,'% of base speed','Higher makes cracking harder; rock resistance also applies.'],
 ['rockBreakSpeedPercent','Rock break threshold',0,100,1,'% of base speed','Intact rock threshold; cannot effectively be below crack threshold.'],
],{vehicle:true,scope:'world'});
add('World Interactions','groundDebrisConfig',[
 ['densityPercent','Debris density',0,100,1,'%','Both vehicles: up to 1,000 pieces. Rebuilds debris immediately in Play.'],
 ['interactivePercent','Interactive debris',0,100,1,'%','Both vehicles: fraction with wheel bumps; existing 450 effectively means 100%.'],
 ['minBumpHeight','Minimum debris bump',0,.5,.01,'m','Both vehicles: minimum interactive height; raises effective maximum if larger.'],
 ['maxBumpHeight','Maximum debris bump',0,.5,.01,'m','Both vehicles: maximum height, never effectively below minimum.'],
 ['suspensionEffectPercent','Debris wheel response',0,100,1,'%','Both vehicles: visible wheel/body response; hybrid chassis remains stable.'],
 ['maxInteractiveDistance','Debris interaction distance',0,80,1,'m','Both vehicles: only bumps within this distance of the vehicle are sampled.',0,null],
],{scope:'world'});
add('Camera and Graphics','cameraSettings',[
 ['cameraReturnSpeedPercent','Camera return speed',0,100,1,'%','Both vehicles: chase camera returns after release; 0 holds orbit. Play only.'],
],{scope:'camera'});
add('Camera and Graphics','visualPolishConfig',[
 ['dustIntensityPercent','Dust intensity',0,100,1,'%','Both vehicles: driving and landing dust opacity and emission.'],
 ['tireTrackOpacityPercent','Tire track opacity',0,100,1,'%','Both vehicles: ground trail visibility.'],
]);
export function fieldPath(field,vehicle='dirty',mode='hybrid'){
 const name=vehicle==='dirty'?'backhoe':'garbageTruck';
 if(field.root==='drive')return `${mode==='original'?'originalDriveConfig':'arcadeHandlingConfig'}.${vehicle}.${field.key}`;
 if(field.root==='cannon')return `vehicleConfig.${name}.boundaryCannon.${field.key}`;
 return `${field.root}${field.vehicle?'.'+(field.root==='vehicleConfig'?name:vehicle):''}.${field.key}`;
}
const allowed=new Map();
for(const field of tuningFields)for(const vehicle of ['dirty','stinky'])for(const mode of ['hybrid','original'])allowed.set(fieldPath(field,vehicle,mode),field);
export const tuningValue=path=>get(config,path);
export const defaultTuningValue=path=>get(tuningDefaults,path);
let overrides={};
function notify(paths){if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('lbd:tuning-change',{detail:{paths}}));}
function persist(storage=tuningStorage()){try{storage.setItem(tuningKey(),JSON.stringify({version:1,overrides}));return true;}catch{return false;}}
export function setTuning(path,value,storage=tuningStorage()){
 const field=allowed.get(path);if(!field||typeof value!=='number'||!Number.isFinite(value))return false;
 if(field.hardMin!==null)value=Math.max(field.hardMin,value);if(field.hardMax!==null)value=Math.min(field.hardMax,value);
 assign(path,value);
 if(value===defaultTuningValue(path))delete overrides[path];else overrides[path]=value;
 const saved=persist(storage);notify([path]);return saved;
}
export function resetTuning(paths=[...allowed.keys()],storage=tuningStorage()){
 for(const path of paths){if(!allowed.has(path))continue;assign(path,defaultTuningValue(path));delete overrides[path];}
 const saved=persist(storage);notify(paths);return saved;
}
export function loadTuning(storage=tuningStorage()){
 const before=new Map([...allowed.keys()].map(path=>[path,tuningValue(path)]));
 // Clear old overrides before accepting a replacement from another page/tab.
 for(const path of Object.keys(overrides))assign(path,defaultTuningValue(path));overrides={};
 try{const saved=JSON.parse(storage.getItem(tuningKey()));if(saved?.version===1)for(const [path,value] of Object.entries(saved.overrides??{})){
  const field=allowed.get(path);if(!field||typeof value!=='number'||!Number.isFinite(value))continue;
  const bounded=Math.max(field.hardMin??-Infinity,Math.min(field.hardMax??Infinity,value));assign(path,bounded);overrides[path]=bounded;
 }}catch{/* Unavailable or corrupt storage leaves file defaults intact. */}
 return [...allowed.keys()].filter(path=>before.get(path)!==tuningValue(path));
}
export function exportTuning(){return '// Exported current configuration. Review before replacing VehicleConfig.js.\n'+Object.entries(config).map(([key,value])=>`export const ${key} = ${JSON.stringify(value,null,2)};`).join('\n\n')+'\n';}
export function snapshotTuning(){return clone(config);}
if(typeof window!=='undefined'){
 loadTuning();
 const refresh=()=>{const changed=loadTuning();if(changed.length)notify(changed);};
 window.addEventListener('storage',event=>{if(event.key===tuningKey()||event.key===null)refresh();});
 window.addEventListener('pageshow',refresh);
}
