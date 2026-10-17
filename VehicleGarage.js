/** Short press selects; a deliberate hold opens the garage. */
export function bindVehicleGarage({buttons,onSelect,onOpen,holdMilliseconds=650}){
  const holds=new Map(),listeners=[];
  const on=(target,type,handler,options)=>{target.addEventListener(type,handler,options);listeners.push(()=>target.removeEventListener(type,handler,options));};
  function cancel(id){const h=holds.get(id);if(h){clearTimeout(h.timer);h.button?.classList.remove('holding');holds.delete(id);}return h;}
  function start(id,index,button){if(holds.has(id))return;const h={index,button,opened:false};h.timer=setTimeout(()=>{h.opened=true;button?.classList.remove('holding');onOpen(index);},holdMilliseconds);holds.set(id,h);button?.classList.add('holding');}
  for(const [index,button] of buttons.entries()){
    button.title='Tap to drive · hold to open garage';
    on(button,'pointerdown',e=>{if(e.button!==0)return;e.preventDefault();button.setPointerCapture(e.pointerId);start('pointer:'+e.pointerId,index,button);});
    on(button,'pointerup',e=>{const h=cancel('pointer:'+e.pointerId);if(h&&!h.opened)onSelect(index);});
    for(const type of ['pointercancel','lostpointercapture'])on(button,type,e=>cancel('pointer:'+e.pointerId));
    on(button,'contextmenu',e=>e.preventDefault());
    on(button,'click',e=>{if(e.detail===0)onSelect(index);});
  }
  on(window,'keydown',e=>{const i=['Digit1','Digit2'].indexOf(e.code);if(i<0||e.repeat||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;e.preventDefault();start(e.code,i,buttons[i]);});
  on(window,'keyup',e=>{const h=cancel(e.code);if(h&&!h.opened)onSelect(h.index);});
  const clear=()=>{for(const id of [...holds.keys()])cancel(id);};
  on(window,'blur',clear);on(document,'visibilitychange',()=>{if(document.hidden)clear();});
  return {clear,dispose(){clear();for(const remove of listeners)remove();}};
}
