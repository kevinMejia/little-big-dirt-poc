// Register future GLBs here. The showroom loader, fitting, lighting, orbit camera
// and controls are shared; optional energy effects are enabled per asset.
export const showroomAssets=[{
 id:'turbo-boost',label:'Turbo Boost',category:'Energy pickup',version:'01',
 url:new URL('../assets/pickups/turbo-boost/turbo-boost.glb',import.meta.url).href,
 manifest:new URL('../assets/pickups/turbo-boost/manifest.json',import.meta.url).href,
 source:new URL('../assets/blender/pickups/turbo_boost.blend',import.meta.url).href,
 energyEffects:true,
}];
export const futureAssetCategories=['3D alphabet letters','Golden stars','Vehicle models','Trees & rocks'];
