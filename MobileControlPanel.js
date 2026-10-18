// Presentation only: the original controls keep their existing DOM and handlers.
export function installMobileControlPanel(){
 const host=document.querySelector('#vehicleControls'),toggle=document.querySelector('#vehicleControlsToggle'),panel=document.querySelector('#switcher');
 const mobile=matchMedia('(max-width: 800px), (max-width: 1000px) and (max-height: 500px), (hover: none) and (pointer: coarse)');
 let expanded=false,timer;
 function schedule(){clearTimeout(timer);if(expanded&&mobile.matches)timer=setTimeout(()=>setExpanded(false),5000);}
 function setExpanded(value){
  expanded=mobile.matches&&value;host.toggleAttribute('data-expanded',expanded);
  toggle.textContent=expanded?'>':'<';toggle.setAttribute('aria-expanded',String(expanded));toggle.setAttribute('aria-label',expanded?'Collapse vehicle controls':'Expand vehicle controls');
  panel.inert=mobile.matches&&!expanded;
  if(panel.inert&&panel.contains(document.activeElement))toggle.focus({preventScroll:true});
  schedule();
 }
 toggle.addEventListener('click',()=>setExpanded(!expanded));
 for(const type of ['pointerdown','pointerup','click','input','change','focusin','keydown','wheel'])panel.addEventListener(type,schedule);
 host.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&expanded){event.preventDefault();event.stopPropagation();setExpanded(false);}
  // Focused menu controls must not also steer, reset, or switch via game hotkeys.
  else if(event.target.closest('select,button'))event.stopPropagation();
 });
 mobile.addEventListener('change',()=>setExpanded(false));
 document.addEventListener('visibilitychange',()=>{if(document.hidden)setExpanded(false);});
 setExpanded(false);
}
installMobileControlPanel();
