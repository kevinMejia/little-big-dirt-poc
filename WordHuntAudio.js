// Original, gentle Web Audio chimes. Only unlock inside a trusted user gesture.
export class HuntAudio {
 constructor(){this.unlock=()=>{try{this.context??=new (window.AudioContext||window.webkitAudioContext)();if(this.context.state==='suspended')this.context.resume().catch(()=>{});}catch{}};window.addEventListener('pointerdown',this.unlock);window.addEventListener('keydown',this.unlock);}
 play(progress,complete,record,config){const c=this.context;if(!c||c.state!=='running'||config.muted||!config.soundVolume)return;const notes=complete?(record?[0,4,7,12,16]:[0,4,7,12]):[progress];notes.forEach((n,i)=>{const t=c.currentTime+i*.105,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=440*2**(n/12);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(config.soundVolume*.12,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+.32);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+.34);});}
 dispose(){window.removeEventListener('pointerdown',this.unlock);window.removeEventListener('keydown',this.unlock);this.context?.close();}
}
