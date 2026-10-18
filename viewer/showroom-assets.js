// Register future GLBs here. The showroom loader, fitting, lighting, orbit camera
// and controls are shared; optional energy effects are enabled per asset.
export const showroomAssets=[{
 id:'turbo-boost',label:'Turbo Boost',category:'Energy pickup',version:'01',
 url:new URL('../assets/pickups/turbo-boost/turbo-boost.glb',import.meta.url).href,
 manifest:new URL('../assets/pickups/turbo-boost/manifest.json',import.meta.url).href,
 source:new URL('../assets/blender/pickups/turbo_boost.blend',import.meta.url).href,
 energyEffects:true,
},{id:'floating-letter',label:'Word Hunt Floating letters',category:'Alphabet',version:'01',source:new URL('../FloatingLetters.js',import.meta.url).href,url:new URL('../assets/fonts/helvetiker_bold.typeface.json',import.meta.url).href}];
export const futureAssetCategories=['Golden stars','Vehicle models','Trees & rocks'];
