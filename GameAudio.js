import {audioConfig as config,audioDefinitions} from './AudioConfig.js';

const definitions=new Map(audioDefinitions.map(d=>[d.id,d]));
const clamp=value=>Math.max(0,Math.min(1,value));
/** One shared, gesture-unlocked context. No simulation or vehicle tuning here. */
export class GameAudio {
 constructor(){
  this.buffers=new Map();this.pending=new Map();this.voices=new Set();this.loops=new Map();this.wanted=new Map();this.last=new Map();this.variation=0;this.disposed=false;
  // Capture touch completion too: iPhone audio activation can differ from pointerdown.
  // Capture runs even when the driving controls stop event propagation.
  this.gestureEvents=['pointerdown','pointerup','touchend','keydown'];
  this.unlockGesture=()=>{this.unlock().catch(()=>{});};
  this.changed=()=>this.refresh();this.visibility=()=>{if(document.hidden){this.stopAll(true);this.context?.suspend().catch(()=>{});}else if(this.context)this.resume();};
  this.pageshow=()=>{if(this.context&&!document.hidden)this.resume();};
  for(const event of this.gestureEvents)window.addEventListener(event,this.unlockGesture,{capture:true,passive:true});
  window.addEventListener('pageshow',this.pageshow);
  window.addEventListener('lbd:tuning-change',this.changed);document.addEventListener('visibilitychange',this.visibility);
 }
 async unlock(){
  if(this.disposed)return;
  if(!this.context){
   const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;
   this.context=new Context();this.master=this.context.createGain();this.limiter=this.context.createDynamicsCompressor();this.limiter.threshold.value=-6;this.limiter.ratio.value=8;this.limiter.knee.value=8;
   this.master.connect(this.limiter);this.limiter.connect(this.context.destination);this.buses={};
   for(const name of ['engine','effects','music']){const bus=this.context.createGain();bus.connect(this.master);this.buses[name]=bus;}
   this.refresh();
   // Start one silent frame synchronously inside the gesture, before fetching/awaiting.
   const prime=this.context.createBufferSource();prime.buffer=this.context.createBuffer(1,1,this.context.sampleRate);prime.connect(this.master);prime.onended=()=>prime.disconnect();prime.start();
  }
  // A pending Safari resume must not block downloading/decoding the sounds.
  this.resume();
  if(!this.preloaded){
   const missing=audioDefinitions.filter(d=>d.file&&!this.buffers.has(d.id));let next=0;
   // Bound fetch/decode work on phones; retry failed clips on the next gesture.
   this.preloaded=Promise.all(Array.from({length:Math.min(4,missing.length)},async()=>{
    while(next<missing.length){const d=missing[next++];try{await this.load(d.id);}catch{/* Retry after another gesture; successful buffers stay cached. */}}
   })).finally(()=>{this.preloaded=null;});
  }
  return this.preloaded;
 }
 resume(){
  // Call synchronously from each gesture; do not await a previous blocked resume.
  if(this.context&&this.context.state!=='running'&&this.context.state!=='closed'&&!document.hidden)this.context.resume().catch(()=>{});
 }
 load(id){
  if(this.buffers.has(id))return Promise.resolve(this.buffers.get(id));
  if(!this.pending.has(id))this.pending.set(id,fetch(new URL('./assets/audio-candidates/'+definitions.get(id).file,import.meta.url)).then(r=>{if(!r.ok)throw new Error('Audio '+id+' unavailable');return r.arrayBuffer();}).then(data=>this.context.decodeAudioData(data)).then(buffer=>{this.buffers.set(id,buffer);this.pending.delete(id);return buffer;}).catch(error=>{this.pending.delete(id);throw error;}));
  return this.pending.get(id);
 }
 allowed(id){const d=definitions.get(id);return !this.disposed&&d&&config.master.enabled&&config[d.bus].enabled&&config.sounds[id].enabled&&config.master.volume>0&&config[d.bus].volume>0&&config.sounds[id].volume>0;}
 refresh(){
  if(!this.context)return;const t=this.context.currentTime;
  this.master.gain.setTargetAtTime(config.master.enabled?config.master.volume/100:0,t,.025);
  for(const [name,bus] of Object.entries(this.buses))bus.gain.setTargetAtTime(config[name].enabled?config[name].volume/100:0,t,.025);
  for(const voice of this.voices){if(!this.allowed(voice.id)){this.end(voice);if(this.loops.get(voice.id)===voice)this.loops.delete(voice.id);}else voice.gain.gain.setTargetAtTime(config.sounds[voice.id].volume/100*voice.intensity,t,.025);}
 }
 end(voice){if(voice.ending)return;voice.ending=true;const t=this.context.currentTime;voice.gain.gain.cancelScheduledValues(t);voice.gain.gain.setTargetAtTime(0,t,.015);try{voice.source.stop(t+.08);}catch{}}
 create(id,{loop=false,rate=1,intensity=1,seconds=null}={}){
  if(!this.allowed(id)||this.context?.state!=='running'||!this.buffers.has(id)||this.voices.size>=12)return null;
  const source=this.context.createBufferSource(),gain=this.context.createGain(),d=definitions.get(id),t=this.context.currentTime;
  source.buffer=this.buffers.get(id);source.loop=loop;source.playbackRate.value=rate;
  gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(config.sounds[id].volume/100*intensity,t+.012);source.connect(gain);gain.connect(this.buses[d.bus]);
  const voice={id,source,gain,intensity,ending:false};this.voices.add(voice);
  source.onended=()=>{source.disconnect();gain.disconnect();this.voices.delete(voice);if(this.loops.get(id)===voice)this.loops.delete(id);};
  source.start();if(!loop){const duration=Math.min(source.buffer.duration/rate,seconds??Infinity);gain.gain.setValueAtTime(config.sounds[id].volume/100*intensity,t+Math.max(.015,duration-.07));gain.gain.linearRampToValueAtTime(0,t+duration);source.stop(t+duration+.01);}
  return voice;
 }
 play(id,{cooldown=.12,intensity=1,rate=null,seconds=null}={}){
  if(id==='horn')return this.horn();
  if(id==='rally-car-electric'||id==='rally-car-tires'){
   this.rallyVoice(id,true,id==='rally-car-electric'?360:200,.15);
   const voice=this.loops.get(id);if(!voice)return false;
   voice.source.stop(this.context.currentTime+1);return true;
  }
  if(!this.allowed(id)||this.context?.state!=='running')return false;
  const now=this.context.currentTime;if(now-(this.last.get(id)??-Infinity)<cooldown)return false;
  if([...this.voices].filter(v=>v.id===id&&!v.ending).length>=2)return false;
  const variation=[.97,1.02,1,.99,1.03][this.variation++%5];
  const voice=this.create(id,{rate:rate??variation,intensity:clamp(intensity),seconds:id==='foliage'?.45:seconds});if(!voice)return false;this.last.set(id,now);return true;
 }
 loop(id,on,{rate=1,intensity=1}={}){
  this.wanted.set(id,on);const voice=this.loops.get(id);
  if(!on||!this.allowed(id)){if(voice){this.end(voice);this.loops.delete(id);}return;}
  if(voice){if(Math.abs((voice.rate??1)-rate)>.005){voice.source.playbackRate.setTargetAtTime(rate,this.context.currentTime,.16);voice.rate=rate;}if(Math.abs(voice.intensity-intensity)>.005){voice.intensity=intensity;voice.gain.gain.setTargetAtTime(config.sounds[id].volume/100*intensity,this.context.currentTime,.12);}return;}
  const next=this.create(id,{loop:true,rate,intensity});if(next)this.loops.set(id,next);
 }
 // Two bounded synthesized voices share existing mute, volume and lifecycle controls.
 rallyVoice(id,on,frequency,intensity){
  let voice=this.loops.get(id);
  if(!on||!this.allowed(id)||this.context?.state!=='running'){if(voice){this.end(voice);this.loops.delete(id);}return;}
  const t=this.context.currentTime;
  if(!voice){
   if(this.voices.size>=12)return;
   const gain=this.context.createGain();let source;
   if(id==='rally-car-electric'){source=this.context.createOscillator();source.type='triangle';}
   else{source=this.context.createBufferSource();if(!this.tireNoise){this.tireNoise=this.context.createBuffer(1,this.context.sampleRate,this.context.sampleRate);const data=this.tireNoise.getChannelData(0);let previous=0;for(let i=0;i<data.length;i++){previous=(previous+Math.random()*.08-.04)/1.04;data[i]=previous;}}source.buffer=this.tireNoise;source.loop=true;}
   gain.gain.value=0;source.connect(gain);gain.connect(this.buses[definitions.get(id).bus]);voice={id,source,gain,intensity,ending:false};this.voices.add(voice);this.loops.set(id,voice);
   source.onended=()=>{source.disconnect();gain.disconnect();this.voices.delete(voice);if(this.loops.get(id)===voice)this.loops.delete(id);};source.start();
  }
  voice.intensity=intensity;voice.gain.gain.setTargetAtTime(config.sounds[id].volume/100*intensity,t,.12);
  if(voice.source.frequency)voice.source.frequency.setTargetAtTime(frequency,t,.15);
  else voice.source.playbackRate.setTargetAtTime(frequency/200,t,.15);
 }
 engine(index,speed,maxSpeed,throttle,paused=false,airborne=false){
  this.vehicle=index;
  const load=clamp(Math.abs(speed)/Math.max(1,maxSpeed)),rate=.85+load*.6+(throttle?.08:0),intensity=.42+load*.3+(throttle?.08:0);
  this.rallyVoice('rally-car-electric',index===2&&!paused,110+load*650+(throttle?55:0),.035+load*.08);
  this.rallyVoice('rally-car-tires',index===2&&!paused&&!airborne&&Math.abs(speed)>2,150+load*100,load*.6);
  this.loop('dirty-diesel',!paused&&index===0,{rate,intensity});this.loop('stinky-diesel',!paused&&index===1,{rate:rate*.92,intensity});
 }
 tree(strength,kind){if(kind==='fall'){this.treeVariant=(this.treeVariant??0)+1;this.play(this.treeVariant%2?'wood-crack-a':'wood-crack-b',{cooldown:.2});this.play('foliage',{cooldown:.25});}else{this.play(strength<4?'wood-bump':'wood-creak',{cooldown:.25,intensity:clamp(strength/8+.3)});}}
 rock(strength,kind){this.play(kind==='break'?'rock-break':'rock-crack',{cooldown:.2,intensity:clamp(strength/12+.3)});if(kind==='break')this.play('rock-scatter',{cooldown:.3,intensity:.5});}
 hunt(progress,complete,record,huntConfig){if(huntConfig.muted||!huntConfig.soundVolume)return;const intensity=clamp(huntConfig.soundVolume);this.play(progress%4?'letter-a':'letter-b',{intensity,rate:1+Math.min(.2,progress*.015)});if(complete)this.play('word-complete',{intensity,cooldown:.5});if(record)this.play('record-fanfare',{intensity,cooldown:.5});}
 horn(){
  if(!this.allowed('horn')||this.context?.state!=='running'||this.voices.size>=12)return false;
  const t=this.context.currentTime;if(t-(this.last.get('horn')??-Infinity)<.2)return false;this.last.set('horn',t);
  const source=this.context.createOscillator(),gain=this.context.createGain();source.type='sawtooth';source.frequency.value=this.vehicle?195:310;source.connect(gain);gain.connect(this.buses.effects);
  gain.gain.setValueAtTime(config.sounds.horn.volume/100*.15,t);gain.gain.exponentialRampToValueAtTime(.0001,t+.24);
  const voice={id:'horn',source,gain,intensity:.15,ending:false};this.voices.add(voice);source.onended=()=>{source.disconnect();gain.disconnect();this.voices.delete(voice);};source.start();source.stop(t+.25);return true;
 }
 stopAll(immediate=false){this.wanted.clear();this.loops.clear();for(const voice of this.voices){
  if(immediate){try{voice.source.stop();}catch{}voice.source.disconnect();voice.gain.disconnect();this.voices.delete(voice);}else this.end(voice);
 }}
 dispose(){this.stopAll();this.disposed=true;for(const event of this.gestureEvents)window.removeEventListener(event,this.unlockGesture,true);window.removeEventListener('pageshow',this.pageshow);window.removeEventListener('lbd:tuning-change',this.changed);document.removeEventListener('visibilitychange',this.visibility);this.context?.close();}
}
let shared;
export function getGameAudio(){if(!shared||shared.disposed)shared=new GameAudio();return shared;}
