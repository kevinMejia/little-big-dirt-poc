import assert from 'node:assert/strict';
import fs from 'node:fs';
import {readGamePreferences,saveGamePreference,resetGamePreference,preferenceKey} from '../GamePreferences.js';
const entries=new Map(),storage={getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,value)};
const base='https://example.com/little-big-dirt/GamePreferences.js';
const visible=()=>{const p=readGamePreferences(storage,base);return [p.showDrivingHud,p.showControlsGuide];};
assert.deepEqual(visible(),[false,false],'both information elements default off');
saveGamePreference(storage,'physicsMode','rapier',base);
assert(!('showDrivingHud' in JSON.parse(storage.getItem(preferenceKey(base)))),'startup physics save does not manufacture an explicit display preference');
for(const key of ['showDrivingHud','showControlsGuide'])saveGamePreference(storage,key,false,base);
for(const stage of ['reset','vehicle switch','lab','return','refresh']){
 saveGamePreference(storage,'physicsMode','rapier',base);assert.deepEqual(visible(),[false,false],stage+' preserves disabled preferences');
}
saveGamePreference(storage,'showDrivingHud',true,base);assert.deepEqual(visible(),[true,false]);
saveGamePreference(storage,'showControlsGuide',true,base);assert.deepEqual(visible(),[true,true]);
saveGamePreference(storage,'touchControls',true,base);assert.deepEqual(visible(),[true,true],'input preference does not overwrite explicit display choices');
saveGamePreference(storage,'showDrivingHud',false,base);assert.deepEqual(visible(),[false,true],'toggles are independent');
resetGamePreference(storage,'showControlsGuide',base);assert.deepEqual(visible(),[false,false]);
assert.equal(readGamePreferences(null,base).showDrivingHud,false);
assert.equal(readGamePreferences(null,base).showControlsGuide,false);
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert(html.indexOf('#hud,#help{display:none!important}')<html.indexOf('<div id="hud">'),'initial hiding is in the head before either element exists');
for(const [attribute,id] of [['driving-hud','hud'],['controls-guide','help']])assert(html.includes(`body[data-lbd-${attribute}="true"] #${id}{display:block!important`),'only an applied explicit preference reveals '+id);
console.log('PASS: independent off-by-default HUD/guide, explicit enabled persistence, unrelated saves, reset/switch/navigation reads, blocked storage and first-paint CSS guard.');
