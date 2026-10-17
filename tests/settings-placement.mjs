import assert from 'node:assert/strict';
import {settingsPlacement} from '../SettingsPlacement.js';
const intersects=(a,b)=>a.left<b.right&&a.left+a.width>b.left&&a.top<b.bottom&&a.top+a.maxHeight>b.top;
for(const scenario of [
 {width:1440,height:900,menuBottom:60,controls:[]},
 {width:390,height:844,menuBottom:60,controls:[{left:16,right:152,top:764,bottom:828},{left:220,right:374,top:755,bottom:828}]},
 {width:844,height:390,menuBottom:60,safe:{left:47,right:47,bottom:21,top:0},controls:[{left:47,right:203,top:297,bottom:369},{left:623,right:797,top:287,bottom:369}]},
 {width:667,height:375,menuBottom:60,controls:[{left:16,right:172,top:291,bottom:363},{left:452,right:651,top:187,bottom:363}]},
 {width:390,height:260,menuBottom:60,controls:[{left:16,right:160,top:170,bottom:250}]},
]){
 const panel=settingsPlacement(scenario);
 assert(panel.maxHeight<=scenario.height*.66);
 assert(panel.left>=8+(scenario.safe?.left??0));
 assert(panel.left+panel.width<=scenario.width-(scenario.safe?.right??0));
 for(const control of scenario.controls)assert(!intersects(panel,control),'panel never covers measured driving controls');
}
console.log('PASS: compact left placement, 66% height cap, measured touch/equipment avoidance, portrait/landscape/notch and reduced viewport.');
