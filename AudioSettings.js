import {audioConfig,audioDefinitions} from './AudioConfig.js';
import {tuningValue,setTuning,resetTuning,exportAudioTuning} from './TuningStore.js';
import {getGameAudio} from './GameAudio.js';

/** One row per sound: named enable switch + volume + audition + reset. */
export function appendAudioSettings(main,expanded=false){
 const details=document.createElement('details');details.dataset.group='Audio';details.open=expanded;
 const summary=document.createElement('summary');summary.textContent='Audio · volumes & sound switches';const section=document.createElement('div');section.className='section';details.append(summary,section);main.prepend(details);
 const note=document.createElement('p');note.textContent='Changes apply live and save automatically. Uncheck a sound to disable it. Category and Master levels multiply each sound’s volume. Music controls completion/record jingles; there is no background soundtrack.';section.append(note);
 const message=document.createElement('p');message.setAttribute('role','status');section.append(message);
 const controls=[];
 function row(key,label,id=null){
  const path='audioConfig.'+key,container=document.createElement('div');container.className='field';container.dataset.audio=id??key;
  const top=document.createElement('label');top.className='check';const enabled=document.createElement('input');enabled.type='checkbox';enabled.setAttribute('aria-label','Enable '+label);enabled.checked=tuningValue(path+'.enabled');top.append(enabled,label);
  const line=document.createElement('div');line.className='value';const slider=document.createElement('input');slider.type='range';slider.min=0;slider.max=100;slider.step=1;slider.value=tuningValue(path+'.volume');slider.setAttribute('aria-label',label+' volume');
  const output=document.createElement('output');output.textContent=slider.value+'%';output.style.minWidth='36px';line.append(slider,output);
  const save=()=>{const saved=setTuning(path+'.volume',Number(slider.value));output.textContent=slider.value+'%';message.textContent=saved?'Audio saved.':'Applied here; browser storage unavailable.';};slider.oninput=save;
  enabled.onchange=()=>{setTuning(path+'.enabled',enabled.checked);message.textContent=enabled.checked?label+' enabled.':label+' disabled.';};
  if(id){const test=document.createElement('button');test.textContent='Test';test.setAttribute('aria-label','Test '+label);test.onclick=async()=>{try{const audio=getGameAudio();await audio.unlock();const played=audio.play(id,{cooldown:0,seconds:2});message.textContent=played?'Playing '+label+'.':'Enable this sound and its category/Master, and raise their volumes to test.';}catch{message.textContent='This sound could not load. Try again after a user gesture.';}};line.append(test);}
  const reset=document.createElement('button');reset.textContent='Reset';reset.className='reset';reset.onclick=()=>{resetTuning([path+'.enabled',path+'.volume']);enabled.checked=tuningValue(path+'.enabled');slider.value=tuningValue(path+'.volume');output.textContent=slider.value+'%';};line.append(reset);container.append(top,line);section.append(container);controls.push({path,enabled,slider,output});
 }
 for(const [key,label] of [['master','Master'],['engine','Engines'],['effects','Effects'],['music','Music / jingles']])row(key,label);
 const search=document.createElement('input');search.type='search';search.placeholder='Find a sound…';search.setAttribute('aria-label','Find audio control');search.style.cssText='width:100%;min-height:44px;margin:12px 0';section.append(search);
 let previousGroup='';for(const definition of audioDefinitions){if(definition.group!==previousGroup){const heading=document.createElement('h3');heading.textContent=definition.group;section.append(heading);previousGroup=definition.group;}row('sounds.'+definition.id,definition.label,definition.id);}
 search.oninput=()=>{for(const element of section.querySelectorAll('[data-audio]'))if(!['master','engine','effects','music'].includes(element.dataset.audio))element.hidden=!element.textContent.toLowerCase().includes(search.value.toLowerCase());};
 const reset=document.createElement('button');reset.textContent='Reset all audio';reset.onclick=()=>{resetTuning(controls.flatMap(c=>[c.path+'.enabled',c.path+'.volume']));for(const c of controls){c.enabled.checked=tuningValue(c.path+'.enabled');c.slider.value=tuningValue(c.path+'.volume');c.output.textContent=c.slider.value+'%';}message.textContent='Audio restored to AudioConfig.js defaults.';};
 const exportButton=document.createElement('button');exportButton.textContent='Export audio settings';exportButton.onclick=()=>{const url=URL.createObjectURL(new Blob([exportAudioTuning()],{type:'text/javascript'})),link=document.createElement('a');link.href=url;link.download='AudioConfig.tuned.js';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};section.append(reset,exportButton);
 return details;
}
