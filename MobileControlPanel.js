// Presentation only: the original controls keep their existing DOM and handlers.
export function installMobileControlPanel(){
 const host=document.querySelector('#vehicleControls'),toggle=document.querySelector('#vehicleControlsToggle'),panel=document.querySelector('#switcher');
 let expanded=false,timer;
 function schedule(){clearTimeout(timer);if(expanded)timer=setTimeout(()=>setExpanded(false),5000);}
 function setExpanded(value){
  expanded=value;host.toggleAttribute('data-expanded',expanded);
  toggle.textContent=expanded?'›':'‹';toggle.setAttribute('aria-expanded',String(expanded));toggle.setAttribute('aria-label',expanded?'Collapse vehicle controls':'Expand vehicle controls');
  panel.inert=!expanded;
  if(panel.inert&&panel.contains(document.activeElement))toggle.focus({preventScroll:true});
  schedule();
 }
 toggle.addEventListener('click',()=>setExpanded(!expanded));
 for(const type of ['pointerdown','pointerup','click','input','change','focusin','keydown','wheel'])panel.addEventListener(type,schedule);
 host.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&expanded){event.preventDefault();event.stopPropagation();setExpanded(false);}
  // Driving from a button returns focus to the game, including Space braking.
  else if(event.target.closest('button')&&['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(event.key.toLowerCase()))event.target.blur();
  // Expanded controls isolate game hotkeys; the collapsed toggle permits driving.
  else if(expanded&&panel.contains(event.target)&&event.target.closest('select,button'))event.stopPropagation();
  else if(event.target===toggle&&['Enter',' '].includes(event.key))event.stopPropagation();
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden)setExpanded(false);});
 setExpanded(false);
}
installMobileControlPanel();
