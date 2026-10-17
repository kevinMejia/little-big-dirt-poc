import assert from 'node:assert/strict';
import fs from 'node:fs';
import {navigationItems,navigationURL,currentArea} from '../SharedNavigation.js';
import {readGamePreferences,saveGamePreference,preferenceKey} from '../GamePreferences.js';

for(const prefix of ['http://localhost:8000/','https://example.com/little-big-dirt-poc/']){
 const base=prefix+'SharedNavigation.js';
 assert.equal(currentArea(prefix,base),'play');
 for(const item of navigationItems.filter(item=>item.path)){
  const url=navigationURL(item,base);
  assert(url.href.startsWith(prefix),'all destinations stay within deployment base');
  assert.equal(currentArea(url.href,base),item.id,'destination highlights itself');
  // The target page and its shared component must both exist in production.
  const page=url.pathname.slice(new URL(prefix).pathname.length);
  const html=fs.readFileSync(new URL('../dist/'+page,import.meta.url),'utf8');
  assert(html.includes('SharedNavigation.js'),page+' has navigation installed');
 }
 assert.equal(currentArea(prefix+'viewer/dirty.html?asset=candidate',base),'dirty');
 assert.equal(currentArea(prefix+'index.html?handling=1&debug=1',base),'handling');
}
assert(!navigationItems.find(item=>item.id==='showroom').path,'showroom stays disabled');
assert.equal(navigationItems.find(item=>item.id==='settings').path,'index.html#switcher','Settings reuses existing main-game controls');
assert.equal(new Set(navigationItems.map(item=>item.id)).size,navigationItems.length);
const records=new Map(),storage={getItem:key=>records.get(key)??null,setItem:(key,value)=>records.set(key,value)};
const base='https://example.com/game/GamePreferences.js';
saveGamePreference(storage,'physicsMode','original',base);
saveGamePreference(storage,'touchControls',true,base);
saveGamePreference(storage,'diagnostics',true,base);
assert.deepEqual(readGamePreferences(storage,base),{physicsMode:'original',touchControls:true,diagnostics:true});
assert.equal(readGamePreferences(storage,'https://example.com/other/GamePreferences.js').physicsMode,'rapier','deployments do not share preferences');
saveGamePreference(storage,'physicsMode','invalid',base);
assert.equal(readGamePreferences(storage,base).physicsMode,'original');
records.set(preferenceKey(base),'malformed JSON');assert.equal(readGamePreferences(storage,base).physicsMode,'rapier');
assert.equal(readGamePreferences(null,base).physicsMode,'rapier','blocked storage preserves default controls');
console.log('PASS: every navigation destination exists and includes the shared menu; current areas, candidate/query URLs, disabled future pages, and root/project Pages bases.');
