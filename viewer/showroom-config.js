// Visual prototype controls only. Nothing here is imported by the driving game.
export const showroomDefaults=Object.freeze({
 scale:1,rotationSpeed:14,floatHeight:2.15,floatSpeed:.65,floatAmount:.14,
 glowIntensity:1.1,mainColor:'#ffb52e',accentColor:'#27d9f2',
 particleIntensity:65,bloom:false,lightingIntensity:1,
});
export const visualControls=[
 {key:'scale',label:'Asset scale',group:'Motion',min:.5,max:1.6,step:.05,unit:'×'},
 {key:'rotationSpeed',label:'Rotation speed',group:'Motion',min:0,max:90,step:1,unit:'°/s'},
 {key:'floatHeight',label:'Floating height',group:'Motion',min:1.3,max:3.5,step:.05,unit:'m'},
 {key:'floatSpeed',label:'Floating speed',group:'Motion',min:0,max:2,step:.05,unit:'Hz'},
 {key:'floatAmount',label:'Floating amount',group:'Motion',min:0,max:.4,step:.01,unit:'m'},
 {key:'glowIntensity',label:'Glow intensity',group:'Energy',min:0,max:2.5,step:.05,unit:'×'},
 {key:'mainColor',label:'Main color',group:'Energy',type:'color'},
 {key:'accentColor',label:'Accent color',group:'Energy',type:'color'},
 {key:'particleIntensity',label:'Particle intensity',group:'Energy',min:0,max:100,step:1,unit:'%'},
 {key:'bloom',label:'Full bloom',group:'Studio',type:'checkbox'},
 {key:'lightingIntensity',label:'Lighting intensity',group:'Studio',min:.2,max:2,step:.05,unit:'×'},
];
export function normalizeVisualSettings(values={}){
 const settings={...showroomDefaults};
 for(const control of visualControls){
  const value=values[control.key];
  if(control.type==='color'){if(typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value))settings[control.key]=value;}
  else if(control.type==='checkbox'){if(typeof value==='boolean')settings[control.key]=value;}
  else if(typeof value==='number'&&Number.isFinite(value))settings[control.key]=Math.max(control.min,Math.min(control.max,value));
 }
 return settings;
}
export function visualSettingsDocument(assetId,settings){
 return {format:'little-big-dirt-visual-preview',version:1,assetId,approved:false,settings:normalizeVisualSettings(settings)};
}
export function readVisualSettingsDocument(document,assetId){
 if(!document||document.format!=='little-big-dirt-visual-preview'||document.version!==1||document.assetId!==assetId)throw new Error('Choose a visual preview JSON exported for this asset.');
 return normalizeVisualSettings(document.settings);
}
