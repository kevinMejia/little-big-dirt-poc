import {turboBoostConfig} from './VehicleConfig.js';
// A separate press/release pair is required; each input source owns its hold.
export class TurboInput {
 constructor(config=turboBoostConfig){this.config=config;this.sources=new Map();}
 press(source,now=performance.now()){
  const s=this.sources.get(source)??{down:false,last:-Infinity,boost:false};
  if(s.down)return;
  s.boost=now-s.last<=this.config.doubleTapWindowMs;s.last=now;s.down=true;this.sources.set(source,s);
 }
 release(source){const s=this.sources.get(source);if(s){s.down=false;s.boost=false;}}
 get held(){return [...this.sources.values()].some(s=>s.down&&s.boost);}
 clear(){this.sources.clear();}
}
