import {appendWordHuntSettings} from './WordHuntSettings.js';
import {appendAudioSettings} from './AudioSettings.js';
import {tuningFields,fieldPath,tuningValue,defaultTuningValue,setTuning,resetTuning,exportTuning,exportEnvironmentTuning,exportStorybookTuning} from './TuningStore.js';
import {readGamePreferences,saveGamePreference,resetGamePreference,gamePreferenceStorage} from './GamePreferences.js?v=central-settings-3';
import {settingsPlacement} from './SettingsPlacement.js';

let panel;
export function openSettingsPanel(){
 panel??=createSettingsPanel();panel.open();
}
function createSettingsPanel(){
 const host=document.createElement('lbd-settings');const root=host.attachShadow({mode:'open'});
 root.innerHTML=`<style>
 :host{font:13px system-ui,sans-serif;color:#243b32;position:fixed;inset:0;z-index:45;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}*{box-sizing:border-box}
 dialog{position:fixed;inset:auto;margin:0;max-width:none;height:auto;border:1px solid #ccd6c5;border-radius:14px;padding:0;background:#f9fbf3f5;color:inherit;box-shadow:0 8px 30px #142b2940;overflow:hidden;pointer-events:auto}
 dialog[open]{display:flex;flex-direction:column}header{flex:none;background:#f9fbf3;padding:8px 10px;border-bottom:1px solid #d7dfd0}h2{margin:0;font-size:16px}.top{display:flex;justify-content:space-between;align-items:center;gap:6px}.top button{padding:6px;font-size:12px}.top h2{margin-right:auto}#body{overflow:auto;overscroll-behavior:contain;min-height:0}dialog[data-minimized] #body,dialog[data-cramped] #body,dialog[data-minimized] .vehicle,dialog[data-cramped] .vehicle{display:none}.vehicle{display:flex;align-items:center;gap:8px}.vehicle label{font-size:11px;white-space:nowrap}.vehicle select{margin:4px 0 0;min-height:38px;padding:5px;font-size:12px}
 button,select,input{font:inherit;color:inherit}button,select{min-height:44px;border:1px solid #ccd6c5;border-radius:9px;background:white;padding:9px;touch-action:manipulation;cursor:pointer}button:focus-visible,select:focus-visible,input:focus-visible,summary:focus-visible{outline:3px solid #b47b00;outline-offset:2px}
 select{width:100%;margin-top:8px}.context{font-size:12px;line-height:1.5;color:#63735c;margin:8px 0 0}main{padding:10px}details{border:1px solid #d7dfd0;border-radius:12px;margin-bottom:9px;background:white;overflow:hidden}summary{min-height:48px;padding:14px;cursor:pointer;font-weight:700;touch-action:manipulation}.section{padding:0 12px 12px}.field{padding:12px 0;border-top:1px solid #e6eadf}label{font-weight:650;display:block}p{font-size:12px;line-height:1.5;margin:5px 0;color:#63735c}.value{display:flex;align-items:center;gap:6px;margin:8px 0}.value input{width:100px;min-height:40px;border:1px solid #ccd6c5;border-radius:7px;padding:6px;background:#fbfcf7}input[type=range]{width:100%;height:36px;accent-color:#356754;touch-action:pan-y}.reset{margin-left:auto;font-size:11px;min-height:40px;padding:6px}footer{padding:2px 10px 16px;display:grid;gap:8px}.primary{background:#244b3e;color:white}#status{min-height:20px;margin:0 12px 12px;font-size:12px}.empty{padding:10px}.check{display:flex;align-items:center;gap:10px;min-height:48px}.check input{width:22px;height:22px}
 @media(max-height:500px){.context{display:none}main{padding-top:6px}}
 </style><dialog aria-labelledby="settings-title"><header><div class="top"><h2 id="settings-title">Settings</h2><button id="minimize" aria-label="Minimize settings" aria-expanded="true">Minimize</button><button id="close" aria-label="Close settings">Close</button></div><div class="vehicle"><label for="tuning-vehicle">Tune vehicle</label><select id="tuning-vehicle"><option value="dirty">Dirty · Backhoe</option><option value="stinky">Stinky · Garbage truck</option></select></div></header><div id="body"><p class="context" id="context" style="padding:0 12px"></p><main></main><footer><button id="export" class="primary">Export VehicleConfig.js</button><button id="reset-all">Reset all tuning…</button><div id="confirm" hidden><p>Restore both vehicles and global tuning to the current file defaults?</p><button id="confirm-reset">Yes, reset all tuning</button> <button id="cancel-reset">Cancel</button></div></footer><p role="status" id="status"></p></div></dialog>`;
 document.body.append(host);
 const $=selector=>root.querySelector(selector),dialog=$('dialog'),vehicle=$('#tuning-vehicle');
 const isPlay=()=>!!document.querySelector('#physicsMode');
 const isLab=()=>location.pathname.endsWith('/jumps.html');
 const mode=()=>isPlay()&&document.querySelector('#physicsMode').value==='original'?'original':'hybrid';
 const report=saved=>{$('#status').textContent=saved?'Saved automatically.':'Applied for this page; browser storage is unavailable.';};
 function downloadConfiguration(filename,source){const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'})),link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function render(){
  const expanded=new Set([...root.querySelectorAll('details[open]')].map(element=>element.dataset.group));
  const first=!root.querySelector('details');
  $('#context').textContent=`${mode()==='hybrid'?'Main-game hybrid':'Original controller'} tuning. ${isPlay()||isLab()?'Vehicle selection edits tuning; it does not switch or reset the car.':'Preview area: saved driving changes apply when you enter Play or Dirt Jump Lab.'} Shared values are labeled “Both vehicles”.`;
  const main=$('main');main.replaceChildren();
  for(const group of [...new Set(tuningFields.map(field=>field.group))]){
   if(group==='Audio')continue;
   const fields=tuningFields.filter(field=>field.group===group&&(field.mode==='both'||field.mode===mode()));
   if(!fields.length)continue;
   const details=document.createElement('details');details.dataset.group=group;details.open=expanded.has(group)||(first&&group==='Driving');
   const summary=document.createElement('summary');summary.textContent=group;
   const section=document.createElement('div');section.className='section';details.append(summary,section);main.append(details);
   if(group==='Suspension and Body'){const note=document.createElement('p');note.textContent='Body feedback is visual. Hybrid terrain alignment supplies grounded stability; no adjustable rollover or center-of-mass system is active.';section.append(note);}
   if(group==='World Interactions'&&!isPlay()){const note=document.createElement('p');note.textContent='Saved for Play. This environment has no interactive trees, rocks or ground debris.';section.append(note);}
   if(group==='Camera and Graphics'){const note=document.createElement('p');note.textContent='Live graphics controls. Terrain colors and scenery density are in Environment and require reloading Play. Showroom lighting stays in its local visual controls.';section.append(note);}
   if(group==='Environment'){
    const note=document.createElement('p');note.textContent='Global Play environment settings, shared by both vehicles. Saved immediately; changes apply when Play reloads and rebuilds scenery. Reload resets the vehicle position. Lab and showroom layouts stay independent. Live ground-debris density is in World Interactions.';section.append(note);
    if(isPlay()){const apply=document.createElement('button');apply.textContent='Reload Play to apply environment';apply.onclick=()=>location.reload();section.append(apply);}
    const exportButton=document.createElement('button');exportButton.textContent='Export environment settings';exportButton.onclick=()=>downloadConfiguration('WorldEnvironmentConfig.tuned.js',exportEnvironmentTuning());section.append(exportButton);
   }
   if(group==='Storybook Background'){
    const note=document.createElement('p');note.textContent='Live in painted Play. Other areas save these values for Play. The original comparison route (storybook=0) does not render these changes. Controls affect distant scenery, not vehicles or foreground lighting.';section.append(note);
    const exportButton=document.createElement('button');exportButton.textContent='Export background settings';exportButton.onclick=()=>downloadConfiguration('StorybookBackgroundConfig.tuned.js',exportStorybookTuning());section.append(exportButton);
   }
   const paths=[];
   for(const field of fields){
    const path=fieldPath(field,vehicle.value,mode());paths.push(path);
    if(field.type==='color'){
     const row=document.createElement('div');row.className='field';const label=document.createElement('label');label.textContent=field.label;const input=document.createElement('input');input.type='color';input.style.cssText='width:100%;height:44px';input.setAttribute('aria-label',field.label);input.value=tuningValue(path);label.append(input);
     const note=document.createElement('p');note.textContent=field.description;const reset=document.createElement('button');reset.textContent='Reset';reset.setAttribute('aria-label','Reset '+field.label);input.oninput=()=>report(setTuning(path,input.value));reset.onclick=()=>{report(resetTuning([path]));input.value=tuningValue(path);};row.append(label,note,reset);section.append(row);continue;
    }
    if(field.type==='boolean'){
     const row=document.createElement('div');row.className='field';const label=document.createElement('label');label.className='check';const input=document.createElement('input');input.type='checkbox';input.setAttribute('aria-label',field.label);input.checked=tuningValue(path);label.append(input,document.createTextNode(field.label));
     const description=document.createElement('p');description.textContent=field.description;const reset=document.createElement('button');reset.textContent='Reset';reset.setAttribute('aria-label','Reset '+field.label);
     input.onchange=()=>{const saved=setTuning(path,input.checked);report(saved);if(saved&&field.scope==='environment')$('#status').textContent='Environment saved · reload Play to apply.';};reset.onclick=()=>{report(resetTuning([path]));input.checked=tuningValue(path);};row.append(label,description,reset);section.append(row);continue;
    }
    const row=document.createElement('div');row.className='field';
    const label=document.createElement('label');const id='tune-'+field.id.replaceAll('.','-');label.htmlFor=id;label.textContent=field.label;
    const description=document.createElement('p');description.textContent=field.description+(field.scope==='camera'&&!isPlay()?' Saved for Play; this view uses its own camera.':'');
    const slider=document.createElement('input');slider.type='range';slider.id=id;slider.min=field.min;slider.max=field.max;slider.step=field.step;slider.value=tuningValue(path);slider.setAttribute('aria-label',field.label);
    const controls=document.createElement('div');controls.className='value';
    const number=document.createElement('input');number.type='number';number.step='any';if(field.hardMin!==null)number.min=field.hardMin;if(field.hardMax!==null)number.max=field.hardMax;number.value=tuningValue(path);number.setAttribute('aria-label',field.label+' value');
    const unit=document.createElement('span');unit.textContent=field.unit;
    const reset=document.createElement('button');reset.className='reset';reset.textContent='Reset';reset.setAttribute('aria-label','Reset '+field.label);
    const bounds=document.createElement('p');bounds.textContent=field.hardMax===null?`Slider window ${field.min}–${field.max}; implementation has no upper cap. Enter a finite value ≥ ${field.hardMin}.`:`Supported range ${field.hardMin}–${field.hardMax}.`;
    const effective=document.createElement('p');
    function sync(){const value=tuningValue(path);number.value=value;slider.value=value;effective.textContent=`File default: ${defaultTuningValue(path)} ${field.unit}.${value!==defaultTuningValue(path)?' Saved override active.':''}`;if(value<field.min||value>field.max)effective.textContent+=field.hardMax!==null?` Stored ${value}; effective value is clamped to ${Math.max(field.hardMin,Math.min(field.hardMax,value))}.`:' Stored value is outside the slider window.';if(field.key==='maxBumpHeight')effective.textContent+=' Effective maximum is at least the minimum bump height.';}
    slider.addEventListener('input',()=>{report(setTuning(path,Number(slider.value)));sync();});
    number.addEventListener('input',()=>{const value=number.valueAsNumber;if(number.value!==''&&Number.isFinite(value)&&(field.hardMin===null||value>=field.hardMin)&&(field.hardMax===null||value<=field.hardMax)){report(setTuning(path,value));slider.value=value;effective.textContent=`File default: ${defaultTuningValue(path)} ${field.unit}.${value!==defaultTuningValue(path)?' Saved override active.':''}`;}});
    number.addEventListener('change',()=>{if(number.value!==''&&Number.isFinite(number.valueAsNumber)){report(setTuning(path,number.valueAsNumber));sync();}else sync();});
    reset.addEventListener('click',()=>{report(resetTuning([path]));sync();});
    controls.append(number,unit,reset);row.append(label,description,slider,controls,bounds,effective);section.append(row);sync();
   }
   const reset=document.createElement('button');reset.textContent='Reset '+group;reset.addEventListener('click',()=>{report(resetTuning(paths));render();});section.append(reset);
  }
  appendWordHuntSettings(main,expanded.has('Word Hunt'));
  appendAudioSettings(main,expanded.has('Audio'));
  const display=document.createElement('details');display.dataset.group='Display / HUD';display.open=expanded.has('Display / HUD');display.innerHTML='<summary>Display / HUD</summary><div class="section"></div>';main.append(display);
  for(const [key,label,description] of [
   ['showDrivingHud','Show Driving HUD','Show the existing top-left vehicle, speed, physics and performance panel in Play. Off by default.'],
   ['showControlsGuide','Show Keyboard Controls Guide','Show the existing bottom-center keyboard driving tips in Play. Off by default.'],
  ]){
   const row=document.createElement('label');row.className='check';const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.setAttribute('aria-label',label);checkbox.checked=readGamePreferences(gamePreferenceStorage())[key];row.append(checkbox,document.createTextNode(label));
   const note=document.createElement('p');note.textContent=description;display.querySelector('.section').append(row,note);
   checkbox.addEventListener('change',()=>{saveGamePreference(gamePreferenceStorage(),key,checkbox.checked);window.dispatchEvent(new CustomEvent('lbd:preferences-change'));checkbox.checked=readGamePreferences(gamePreferenceStorage())[key];$('#status').textContent='Display preference applied.';});
  }
  const controls=document.createElement('details');controls.dataset.group='Controls';controls.open=expanded.has('Controls');controls.innerHTML='<summary>Controls</summary><div class="section"><label class="check"><input type="checkbox" aria-label="Touch controls">Touch controls</label><p>Uses the existing driving controls. Saved across Play and labs.</p></div>';main.append(controls);
  const checkbox=controls.querySelector('input'),button=document.querySelector('#touchToggle');
  checkbox.checked=button?button.getAttribute('aria-pressed')==='true':readGamePreferences(gamePreferenceStorage()).touchControls??(navigator.maxTouchPoints>0||matchMedia('(any-pointer: coarse)').matches);
  checkbox.addEventListener('change',()=>{
   if(button&&checkbox.checked!==(button.getAttribute('aria-pressed')==='true'))button.click();
   saveGamePreference(gamePreferenceStorage(),'touchControls',checkbox.checked);
   window.dispatchEvent(new CustomEvent('lbd:preferences-change'));$('#status').textContent='Touch controls saved.';
  });
  const resetControls=document.createElement('button');resetControls.textContent='Reset controls to automatic';controls.querySelector('.section').append(resetControls);
  resetControls.onclick=()=>{resetGamePreference(gamePreferenceStorage(),'touchControls');window.dispatchEvent(new CustomEvent('lbd:preferences-change'));render();$('#status').textContent='Touch controls now follow device capability.';};
 }
 vehicle.addEventListener('change',render);
 $('#close').onclick=()=>dialog.close();
 $('#reset-all').onclick=()=>{$('#confirm').hidden=false;$('#confirm-reset').focus();};
 $('#cancel-reset').onclick=()=>{$('#confirm').hidden=true;};
 $('#confirm-reset').onclick=()=>{report(resetTuning());$('#confirm').hidden=true;render();};
 $('#export').onclick=()=>{downloadConfiguration('VehicleConfig.tuned.js',exportTuning());$('#status').textContent='Exported current vehicle values. Environment has its own export in the Environment section.';};
 function place(){
  if(!dialog.open)return;
  const css=getComputedStyle(host),viewport=window.visualViewport;
  const safe={top:parseFloat(css.paddingTop)||0,right:parseFloat(css.paddingRight)||0,bottom:parseFloat(css.paddingBottom)||0,left:parseFloat(css.paddingLeft)||0};
  const controls=[...document.querySelectorAll('[data-drive],#actionsToggle,#touch .drive')].filter(element=>element.getClientRects().length&&getComputedStyle(element).visibility!=='hidden').map(element=>element.getBoundingClientRect());
  const menu=document.querySelector('lbd-navigation')?.shadowRoot?.querySelector('.toggle')?.getBoundingClientRect();
  const bounds=settingsPlacement({width:viewport?.width??innerWidth,height:viewport?.height??innerHeight,safe,controls,menuBottom:menu?.bottom??0});
  dialog.style.left=(bounds.left+(viewport?.offsetLeft??0))+'px';dialog.style.top=(bounds.top+(viewport?.offsetTop??0))+'px';dialog.style.width=bounds.width+'px';dialog.style.maxHeight=bounds.maxHeight+'px';dialog.toggleAttribute('data-cramped',bounds.cramped);
 }
 let placementFrame;
 const schedulePlace=()=>{cancelAnimationFrame(placementFrame);placementFrame=requestAnimationFrame(place);};
 const resize=new ResizeObserver(schedulePlace);for(const element of document.querySelectorAll('#mobile,#touch,#vehicleActions'))resize.observe(element);
 for(const event of ['resize','orientationchange','lbd:preferences-change'])window.addEventListener(event,schedulePlace);
 window.visualViewport?.addEventListener('resize',schedulePlace);window.visualViewport?.addEventListener('scroll',schedulePlace);
 $('#minimize').onclick=()=>{const minimized=dialog.toggleAttribute('data-minimized');$('#minimize').textContent=minimized?'Expand':'Minimize';$('#minimize').setAttribute('aria-label',minimized?'Expand settings':'Minimize settings');$('#minimize').setAttribute('aria-expanded',String(!minimized));place();};
 // Only panel-owned pointers are consumed. Canvas, touch captures and gamepads
 // outside this window continue reaching the existing input controllers.
 for(const event of ['pointerdown','pointermove','pointerup','pointercancel','wheel'])dialog.addEventListener(event,event=>event.stopPropagation());
 for(const type of ['keydown','keyup'])dialog.addEventListener(type,event=>{
  const target=event.target;
  if(event.key==='Escape'){event.stopPropagation();if(type==='keydown')dialog.close();return;}
  if(type==='keydown'&&(target.matches('input:not([type]),input[type=text],input[type=number],select')||target.matches('input[type=range]')&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(event.key)||target.matches('button,input[type=checkbox]')&&[' ','Enter'].includes(event.key)))event.stopPropagation();
 });
 document.querySelector('#physicsMode')?.addEventListener('change',()=>{if(dialog.open)render();});
 window.addEventListener('storage',()=>{if(dialog.open)render();});
 window.addEventListener('pageshow',()=>{if(dialog.open)render();});
 return {open(){render();if(!dialog.open)dialog.show();place();}};
}
