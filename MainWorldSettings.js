import {worldAppearance} from './WorldEnvironmentConfig.js';
// The rally module extends the eastern boundary independently of this sandbox footprint.
// Main Play only. The Jump Lab keeps its independent, fixed testing dimensions.
export function mainWorldSettings(config=worldAppearance){
 const requested=Number(config.worldSize);
 const worldSize=Math.max(220,Math.min(880,Number.isFinite(requested)?requested:660));
 return {worldSize,halfSize:worldSize/2,boundaryInset:15,areaScale:(worldSize/440)**2};
}
