import assert from 'node:assert/strict';
import {normalizeWord,WordQueue,HuntTimer,readHunt,saveHunt} from '../WordHuntState.js';
import {letterLayout} from '../WordHuntLayout.js';
assert.equal(normalizeWord(' tree '),'TREE');assert.equal(normalizeWord('A'),null);assert.equal(normalizeWord('two words'),null);
const q=new WordQueue(()=>.3),words=['TREE','BALL','LUCA'];let previous;for(let round=0;round<8;round++){const batch=words.map(()=>q.next(words));assert.equal(new Set(batch).size,3);assert.notEqual(batch[0],previous);previous=batch.at(-1);}assert.equal(q.next([]),null);
const t=new HuntTimer();t.tick(100);assert.equal(t.elapsed,0);t.collect(200);t.tick(700);assert.equal(t.elapsed,500);t.tick(900,true);t.tick(1100,true);t.tick(1200);t.collect(1400,true);assert.equal(t.elapsed,700);t.tick(2000);assert.equal(t.elapsed,700);
const storage={value:null,getItem(){return this.value;},setItem(k,v){this.value=v;}};const data=readHunt(storage);data.words=['BALL','TREE'];data.records.BALL={best:1200,recent:1300,count:2};saveHunt(data,storage);assert.deepEqual(readHunt(storage).records.BALL,data.records.BALL);data.words=[];saveHunt(data,storage);assert.deepEqual(readHunt(storage).words,[]);assert.deepEqual(readHunt(storage).records,{});
let seed=37;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);for(const halfSize of [110,330,440]){const points=letterLayout({halfSize,height:()=>0,count:12,random});assert.equal(points.length,12);for(const p of points){assert.ok(Math.abs(p.x)<halfSize-25);for(const other of points)if(other!==p)assert.ok(Math.hypot(p.x-other.x,p.z-other.z)>=24);}}
assert.deepEqual(letterLayout({halfSize:110,height:()=>NaN,count:4}),[]);
console.log('Word Hunt state, persistence, timing, queue and placement checks passed.');
