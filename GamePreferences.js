// Persistence for the existing main-game controls, not a second settings UI.
// Scope to this deployment and browser tab. VehicleConfig.js stays authoritative
// for tuning; no physics values or lab-specific test controls are stored here.
const defaults={physicsMode:'rapier'};
export function readGamePreferences(storage,base=import.meta.url){
 try{
  const saved=JSON.parse(storage.getItem(preferenceKey(base)))??{},result={...defaults};
  if(saved.physicsMode==='original'||saved.physicsMode==='rapier')result.physicsMode=saved.physicsMode;
  for(const key of ['touchControls','diagnostics'])if(typeof saved[key]==='boolean')result[key]=saved[key];
  return result;
 }catch{return {...defaults};}
}
export function preferenceKey(base=import.meta.url){return 'little-big-dirt:preferences:'+new URL('.',base).pathname;}
export function saveGamePreference(storage,key,value,base=import.meta.url){
 const valid=key==='physicsMode'?['original','rapier'].includes(value):['touchControls','diagnostics'].includes(key)&&typeof value==='boolean';
 if(!valid)return;
 try{storage.setItem(preferenceKey(base),JSON.stringify({...readGamePreferences(storage,base),[key]:value}));}catch{/* Private/restricted storage must not break controls. */}
}
// Accessing sessionStorage itself can throw in restricted browser contexts.
export function gamePreferenceStorage(){try{return window.sessionStorage;}catch{return null;}}
