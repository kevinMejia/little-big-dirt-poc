// Approval-only player. Imported solely by audio.js; the driving game never
// imports this module or its candidate manifest. Buffers load on demand.
export class AudioPreview {
 constructor(entries,{onState=()=>{}}={}){
  this.entries=new Map(entries.map(e=>[e.id,e]));this.buffers=new Map();this.voices=new Set();this.onState=onState;this.generation=0;this.master=.6;this.muted=false;this.enginesEnabled=true;this.engineVolumes={dirty:.65,stinky:.65};
 }
 unlock(){
  if(!this.context){
   const Context=window.AudioContext||window.webkitAudioContext;if(!Context)throw new Error('Web Audio is unavailable in this browser.');
   this.context=new Context();this.output=this.context.createGain();this.limiter=this.context.createDynamicsCompressor();
   this.limiter.threshold.value=-4;this.limiter.knee.value=6;this.limiter.ratio.value=8;
   this.output.connect(this.limiter);this.limiter.connect(this.context.destination);this.applyVolume();
  }
  return this.context.resume();
 }
 applyVolume(){if(this.context)this.output.gain.setTargetAtTime(this.muted?0:this.master,this.context.currentTime,.02);}
 setMaster(value){this.master=value;this.applyVolume();}
 setMuted(value){this.muted=value;this.applyVolume();}
 engineFor(id){return id==='dirty-diesel'?'dirty':id==='stinky-diesel'?'stinky':null;}
 async buffer(id){
  if(!this.buffers.has(id)){
   const entry=this.entries.get(id);if(!entry)throw new Error('Unknown audio candidate.');
   this.buffers.set(id,fetch(new URL('../assets/audio-candidates/'+entry.file,import.meta.url)).then(r=>{if(!r.ok)throw new Error('Audio download failed: '+entry.label);return r.arrayBuffer();}).then(bytes=>this.context.decodeAudioData(bytes)).catch(error=>{this.buffers.delete(id);throw error;}));
  }
  return this.buffers.get(id);
 }
 stop(){
  this.generation++;if(this.timer)clearTimeout(this.timer);this.timer=null;this.engineSource=null;this.engineGain=null;this.engineId=null;
  if(this.context)for(const voice of this.voices){voice.gain.gain.cancelScheduledValues(this.context.currentTime);voice.gain.gain.setTargetAtTime(0,this.context.currentTime,.012);try{voice.source.stop(this.context.currentTime+.05);}catch{}}
  this.onState({playing:false});
 }
 startVoice(buffer,{delay=0,gain=.7,rate=1,loop=false,duration=null}={}){
  // Recipes schedule at most five voices; a new audition stops the previous one.
  const source=this.context.createBufferSource(),volume=this.context.createGain(),start=this.context.currentTime+.025+delay;
  source.buffer=buffer;source.playbackRate.value=rate;source.loop=loop;
  volume.gain.setValueAtTime(0,start);volume.gain.linearRampToValueAtTime(gain,start+.015);source.connect(volume);volume.connect(this.output);
  const voice={source,gain:volume};this.voices.add(voice);
  source.onended=()=>{source.disconnect();volume.disconnect();this.voices.delete(voice);};source.start(start);
  if(duration!==null){volume.gain.setValueAtTime(gain,start+Math.max(.02,duration-.06));volume.gain.linearRampToValueAtTime(0,start+duration);source.stop(start+duration+.01);}
  return voice;
 }
 async play(id,{driveDemo=false,speed=0}={}){
  this.stop();const token=this.generation,engine=this.engineFor(id);
  if(engine&&!this.enginesEnabled)throw new Error('Enable engine previews to audition this sample.');
  await this.unlock();const buffer=await this.buffer(id);if(token!==this.generation)return;
  const entry=this.entries.get(id),duration=driveDemo?8:entry.loop?12:buffer.duration;
  const voice=this.startVoice(buffer,{loop:entry.loop,gain:engine?this.engineVolumes[engine]*(.48+speed*.3):.75,duration});
  if(engine){
   this.engineSource=voice.source;this.engineGain=voice.gain;this.engineId=id;this.engineEnd=this.context.currentTime+.025+duration;this.setEngineSpeed(speed);
   if(driveDemo){
    const t=this.context.currentTime+.025,rate=voice.source.playbackRate;rate.cancelScheduledValues(t);rate.setValueAtTime(.85,t);rate.setValueAtTime(.85,t+1.2);rate.linearRampToValueAtTime(1.5,t+3.3);rate.setValueAtTime(1.5,t+5);rate.linearRampToValueAtTime(.85,t+7.3);
    const g=voice.gain.gain,v=this.engineVolumes[engine];g.cancelScheduledValues(t);g.setValueAtTime(v*.48,t);g.setValueAtTime(v*.48,t+1.2);g.linearRampToValueAtTime(v*.78,t+3.3);g.setValueAtTime(v*.78,t+5);g.linearRampToValueAtTime(v*.48,t+7.3);g.linearRampToValueAtTime(0,t+8);
   }
  }
  this.onState({playing:true,label:driveDemo?entry.label+' · idle → accelerate → cruise → decelerate':entry.label,duration});
  this.timer=setTimeout(()=>{if(token===this.generation){this.engineSource=null;this.engineGain=null;this.onState({playing:false});}},(duration+.06)*1000);
 }
 setEngineSpeed(speed){
  this.currentSpeed=speed;
  if(!this.engineSource)return;const t=this.context.currentTime,engine=this.engineFor(this.engineId);
  this.engineSource.playbackRate.cancelScheduledValues(t);this.engineSource.playbackRate.setTargetAtTime(.85+speed*.65,t,.15);
  this.engineGain.gain.cancelScheduledValues(t);this.engineGain.gain.setTargetAtTime(this.engineVolumes[engine]*(.48+speed*.3),t,.12);
  if(this.engineEnd>t+.1){this.engineGain.gain.setValueAtTime(this.engineVolumes[engine]*(.48+speed*.3),this.engineEnd-.06);this.engineGain.gain.linearRampToValueAtTime(0,this.engineEnd);}
 }
 setEngineVolume(engine,value){this.engineVolumes[engine]=value;if(this.engineFor(this.engineId)===engine)this.setEngineSpeed(this.currentSpeed??0);}
 async sequence(name){
  const recipes={
   cannon:[['cannon-boom',0,.8],['air-wind',.08,.3,1,4.1],['cannon-land',4.3,.85]],
   tree:[['wood-crack-a',0,.75],['foliage',.06,.65],['tree-thud',1,.8]],
   turbo:[['turbo-pickup',0,.7],['turbo-active',.2,.55],['turbo-expire',2.4,.65]],
   hunt:[['letter-a',0,.65,1],['letter-a',.5,.65,1.08],['letter-a',1,.65,1.16],['word-complete',1.6,.65],['record-fanfare',3.5,.65]],
  };
  this.stop();const token=this.generation;await this.unlock();
  const recipe=recipes[name];if(!recipe)throw new Error('Unknown audition sequence.');
  const buffers=await Promise.all(recipe.map(([id])=>this.buffer(id)));if(token!==this.generation)return;
  let duration=0;
  recipe.forEach(([id,delay,gain,rate=1,length],i)=>{const loop=!!length;this.startVoice(buffers[i],{delay,gain,rate,loop,duration:length??null});duration=Math.max(duration,delay+(length??buffers[i].duration/rate));});
  this.onState({playing:true,label:name+' · timing sketch, not gameplay synchronization',duration});
  this.timer=setTimeout(()=>{if(token===this.generation)this.onState({playing:false});},(duration+.08)*1000);
 }
 dispose(){this.stop();this.context?.close();this.buffers.clear();}
}
