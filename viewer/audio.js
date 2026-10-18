import {AudioPreview} from './AudioPreview.js';

const $=selector=>document.querySelector(selector);
const response=await fetch(new URL('../assets/audio-candidates/manifest.json',import.meta.url));
if(!response.ok)throw new Error('Audio candidate manifest could not load.');
const manifest=await response.json(),entries=manifest.candidates,selected=new Set();let current=entries[0];
const status=(text,error=false)=>{$('#playbackStatus').textContent=text;$('#playbackStatus').dataset.error=String(error);};
const player=new AudioPreview(entries,{onState:state=>{status(state.playing?'Playing '+state.label+' · '+state.duration.toFixed(1)+' s':'Stopped · game volumes are in Settings → Audio.');}});
const safely=promise=>promise.catch(error=>status(error.message,true));
const sourceLink=(label,url)=>{const a=document.createElement('a');a.textContent=label;a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
function choose(entry){
 player.stop();current=entry;$('#candidateTitle').textContent=entry.label;$('#candidateDescription').textContent=entry.description;
 $('#candidateMeta').textContent=`${entry.author} · CC0 1.0 · ${entry.duration.toFixed(2)} s · ${(entry.bytes/1024).toFixed(0)} KB · ${entry.loop?'loop audition':'one-shot'}`;
 const links=$('#candidateLinks');links.replaceChildren(sourceLink('Source & original download',entry.sourceUrl),sourceLink('CC0 license',entry.licenseUrl));
 const download=sourceLink('Download audition',new URL('../assets/audio-candidates/'+entry.file,import.meta.url).href);download.removeAttribute('target');download.download=entry.file;links.append(download);
 $('#engineTools').hidden=entry.group!=='Engines';$('#driveDemo').hidden=entry.group!=='Engines';
 for(const card of document.querySelectorAll('.candidate'))card.dataset.current=String(card.dataset.id===entry.id);
}
function drawLibrary(){
 const group=$('#group').value,query=$('#search').value.trim().toLowerCase(),shown=entries.filter(e=>(!group||e.group===group)&&[e.label,e.description,e.author,e.id].join(' ').toLowerCase().includes(query));
 $('#library').replaceChildren();$('#count').textContent=`${shown.length} of ${entries.length} candidates · ${selected.size} kept for review`;
 for(const entry of shown){
  const card=document.createElement('article');card.className='candidate';card.dataset.id=entry.id;card.dataset.current=String(entry.id===current.id);
  const category=document.createElement('div');category.className='category';category.textContent=entry.group+' / '+entry.duration.toFixed(2)+' s';
  const title=document.createElement('h3');title.textContent=entry.label;
  const description=document.createElement('p');description.textContent=entry.description;
  const original=document.createElement('p'),code=document.createElement('code');code.textContent=entry.sourceFile;original.append(code);
  const actions=document.createElement('div');actions.className='card-actions';const listen=document.createElement('button');listen.textContent='Listen';listen.dataset.listen=entry.id;listen.onclick=()=>{choose(entry);safely(player.play(entry.id,{speed:Number($('#engineSpeed').value)/100}));};
  const keep=document.createElement('label'),checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=selected.has(entry.id);checkbox.setAttribute('aria-label','Keep '+entry.label+' for review');checkbox.onchange=()=>{if(checkbox.checked)selected.add(entry.id);else selected.delete(entry.id);$('#exportReview').disabled=!selected.size;$('#count').textContent=`${shown.length} of ${entries.length} candidates · ${selected.size} kept for review`;};keep.append(checkbox,'Keep for review');actions.append(listen,keep);
  const links=document.createElement('div');links.className='card-links';links.append(sourceLink(entry.author+' · source',entry.sourceUrl),sourceLink('CC0 1.0',entry.licenseUrl));
  const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Audition edits & provenance';summary.style.fontSize='11px';
  const edits=document.createElement('p');edits.textContent=entry.processing.join(' ')+(entry.downloadKind?' '+entry.downloadKind:'');details.append(summary,edits);
  card.append(category,title,description,original,actions,links,details);$('#library').append(card);
 }
}
for(const group of [...new Set(entries.map(e=>e.group))]){const option=document.createElement('option');option.value=group;option.textContent=group;$('#group').append(option);}
$('#group').onchange=drawLibrary;$('#search').oninput=drawLibrary;
$('#play').onclick=()=>safely(player.play(current.id,{speed:Number($('#engineSpeed').value)/100}));
$('#driveDemo').onclick=()=>safely(player.play(current.id,{driveDemo:true}));
$('#stop').onclick=()=>player.stop();
$('#master').oninput=event=>{player.setMaster(Number(event.target.value)/100);$('#masterValue').value=event.target.value+'%';};
$('#mute').onchange=event=>player.setMuted(event.target.checked);
$('#engineSpeed').oninput=event=>{const speed=Number(event.target.value)/100;player.currentSpeed=speed;player.setEngineSpeed(speed);$('#speedValue').value=event.target.value+'%';};
for(const engine of ['dirty','stinky'])$('#'+engine+'Volume').oninput=event=>player.setEngineVolume(engine,Number(event.target.value)/100);
$('#enginesEnabled').onchange=event=>{player.enginesEnabled=event.target.checked;if(!event.target.checked&&player.engineSource)player.stop();};
for(const button of document.querySelectorAll('[data-sequence]'))button.onclick=()=>safely(player.sequence(button.dataset.sequence));
$('#exportReview').onclick=()=>{
 const review={format:'little-big-dirt-audio-review',approved:false,integrated:false,selectedCandidates:entries.filter(e=>selected.has(e.id)).map(({id,label,sourceUrl,license,licenseUrl})=>({id,label,sourceUrl,license,licenseUrl}))};
 const url=URL.createObjectURL(new Blob([JSON.stringify(review,null,2)+'\n'],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='little-big-dirt-audio-shortlist.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Shortlist exported for review. Game settings are unchanged.');
};
document.addEventListener('visibilitychange',()=>{if(document.hidden)player.stop();});
addEventListener('pagehide',()=>player.dispose(),{once:true});
drawLibrary();choose(current);
