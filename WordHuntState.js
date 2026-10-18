import {wordHuntConfig} from './VehicleConfig.js';
import {preferenceKey,gamePreferenceStorage} from './GamePreferences.js';
export function normalizeWord(value){const word=String(value).trim().toUpperCase();return /^[A-Z]{2,12}$/.test(word)?word:null;}
const key=()=>preferenceKey() + ':word-hunt';
export function readHunt(storage=gamePreferenceStorage()){
 let saved={};try{saved=JSON.parse(storage?.getItem(key()))||{};}catch{}
 const result={...wordHuntConfig,words:wordHuntConfig.words.split(','),records:{}};
 for(const k of ['enabled','showHud','visible','muted'])if(typeof saved[k]==='boolean')result[k]=saved[k];
 for(const [k,min,max] of [['letterSize',2,6],['collectionRadius',3,10],['soundVolume',0,1]])if(Number.isFinite(saved[k]))result[k]=Math.max(min,Math.min(max,saved[k]));
 if(Array.isArray(saved.words))result.words=[...new Set(saved.words.map(normalizeWord).filter(Boolean))];
 for(const word of result.words){const r=saved.records?.[word];if(r&&Number.isFinite(r.best)&&r.best>=0&&Number.isFinite(r.recent)&&r.recent>=0&&Number.isInteger(r.count)&&r.count>0)result.records[word]=r;}
 return result;
}
export function saveHunt(data,storage=gamePreferenceStorage()){
 const saved={words:data.words,records:data.records};
 for(const k of ['enabled','showHud','visible','muted','letterSize','collectionRadius','soundVolume'])if(data[k]!==wordHuntConfig[k])saved[k]=data[k];
 try{storage?.setItem(key(),JSON.stringify(saved));return !!storage;}catch{return false;}
}
export function changeHunt(change){const data=readHunt();change(data);const saved=saveHunt(data);window.dispatchEvent(new CustomEvent('lbd:word-hunt-change'));return saved;}
export class WordQueue {
 constructor(random=Math.random){this.random=random;this.queue=[];this.last=null;}
 next(words){if(!words.length)return null;if(!this.queue.length){this.queue=[...words];for(let i=this.queue.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[this.queue[i],this.queue[j]]=[this.queue[j],this.queue[i]];}if(this.queue.length>1&&this.queue.at(-1)===this.last)[this.queue[0],this.queue[this.queue.length-1]]=[this.queue.at(-1),this.queue[0]];}return this.last=this.queue.pop();}
}
export class HuntTimer {
 constructor(){this.elapsed=0;this.started=false;this.last=null;this.paused=false;}
 tick(now,paused=false){if(this.started&&this.last!==null&&!paused&&!this.paused)this.elapsed+=Math.max(0,now-this.last);this.last=now;this.paused=paused;}
 collect(now,final=false){this.tick(now);this.started=!final;return this.elapsed;}
}
export const formatHuntTime=ms=>`${String(Math.floor(ms/60000)).padStart(2,'0')}:${(ms/1000%60).toFixed(1).padStart(4,'0')}`;
