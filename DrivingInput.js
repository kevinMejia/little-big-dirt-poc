/** Independent pointer ownership keeps keyboard, gamepad and multitouch additive. */
export class PointerInputState {
  constructor(){this.pointers=new Map();}
  set(id,control){this.pointers.set(id,control);}
  release(id){this.pointers.delete(id);}
  clear(){this.pointers.clear();}
  held(control){return [...this.pointers.values()].includes(control);}
}

export function mergeDrivingInput(keys,touch,pad,speed){
  const touchBack=touch.held('back'),axis=pad?.axes?.[0]||0;
  return {
    accelerate:keys.has('KeyW')||keys.has('ArrowUp')||(touch.held('forward')&&!touchBack)||(pad?.buttons?.[7]?.value||0)>.1,
    reverse:keys.has('KeyS')||keys.has('ArrowDown')||(touchBack&&speed<=.08)||(pad?.buttons?.[6]?.value||0)>.1,
    steerLeft:keys.has('KeyA')||keys.has('ArrowLeft')||touch.held('left'),
    steerRight:keys.has('KeyD')||keys.has('ArrowRight')||touch.held('right'),
    brake:keys.has('Space')||!!pad?.buttons?.[0]?.pressed||(touchBack&&speed>.08),
    emergencyBrake:keys.has('KeyE'),
    axis:Math.abs(axis)>.12?axis:0,
  };
}

export class DrivingInput {
  constructor({root,toggle,keys,actionsRoot,actionsToggle}){
    this.root=root;this.toggle=toggle;this.keys=keys;this.actionsRoot=actionsRoot;this.actionsToggle=actionsToggle;
    this.touch=new PointerInputState();this.state={};this.actions=new Map();this.actionHeld=new Set();this.listeners=[];this.captureOwners=new Map();
    this.enabled=navigator.maxTouchPoints>0||matchMedia('(any-pointer: coarse)').matches;
    const on=(target,event,handler,options)=>{target.addEventListener(event,handler,options);this.listeners.push(()=>target.removeEventListener(event,handler,options));};
    const hit=(event)=>document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-drive]');
    const valid=(button)=>button&&this.root.contains(button);
    on(root,'pointerdown',event=>{
      const button=event.target.closest('[data-drive]');if(!this.enabled||!valid(button)||(event.pointerType==='mouse'&&event.button!==0))return;
      event.preventDefault();this.touch.set(event.pointerId,button.dataset.drive);
      this.captureOwners.set(event.pointerId,button);button.setPointerCapture(event.pointerId);this.sync();
    });
    on(window,'pointermove',event=>{if(!this.touch.pointers.has(event.pointerId))return;event.preventDefault();const button=hit(event);this.touch.set(event.pointerId,valid(button)?button.dataset.drive:null);this.sync();},{passive:false});
    const release=event=>{if(!this.touch.pointers.has(event.pointerId))return;this.touch.release(event.pointerId);this.captureOwners.delete(event.pointerId);this.sync();};
    for(const event of ['pointerup','pointercancel','lostpointercapture'])on(window,event,release);
    on(window,'blur',()=>{this.keys.clear();this.clear();});
    on(document,'visibilitychange',()=>{if(document.hidden){this.keys.clear();this.clear();}});
    on(window,'resize',()=>this.clear());
    on(window,'orientationchange',()=>this.clear());
    on(root,'contextmenu',event=>event.preventDefault());
    on(toggle,'click',()=>this.setEnabled(!this.enabled));
    on(actionsToggle,'click',()=>{const open=actionsRoot.hidden;actionsRoot.hidden=!open;actionsToggle.setAttribute('aria-expanded',String(open));this.clear();});
    this.setEnabled(this.enabled);
  }
  setEnabled(enabled){this.clear();this.enabled=enabled;document.body.classList.toggle('touch-enabled',enabled);this.root.hidden=!enabled;this.toggle.setAttribute('aria-pressed',String(enabled));}
  sync(){
    for(const button of this.root.querySelectorAll('[data-drive]')){const held=this.touch.held(button.dataset.drive);button.classList.toggle('pressed',held);button.setAttribute('aria-pressed',String(held));}
    for(const [id,action] of this.actions){const held=this.touch.held('action:'+id);if(held&&!this.actionHeld.has(id)){this.actionHeld.add(id);action.onPress?.();}else if(!held&&this.actionHeld.has(id)){this.actionHeld.delete(id);action.onRelease?.();}}
  }
  clear(){
    this.touch.clear();
    for(const [id,button] of this.captureOwners){try{if(button.hasPointerCapture(id))button.releasePointerCapture(id);}catch{}}
    this.captureOwners.clear();this.sync();
  }
  read(speed,pad){Object.assign(this.state,mergeDrivingInput(this.keys,this.touch,pad,speed));return this.state;}
  /** Optional future equipment controls; empty by default. Call on vehicle switch. */
  setVehicleActions(actions=[]){
    this.clear();this.actions.clear();this.actionsRoot.replaceChildren();
    for(const action of actions){this.actions.set(action.id,action);const button=document.createElement('button');button.type='button';button.className='touch equipment-action';button.dataset.drive='action:'+action.id;button.textContent=action.label;button.setAttribute('aria-label',action.label);this.actionsRoot.append(button);}
    this.actionsRoot.hidden=true;this.actionsToggle.hidden=actions.length===0;this.actionsToggle.setAttribute('aria-expanded','false');
  }
  dispose(){this.clear();for(const remove of this.listeners)remove();this.listeners=[];}
}
