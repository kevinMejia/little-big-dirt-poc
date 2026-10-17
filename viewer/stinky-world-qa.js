// Optional main-world inspection controls: ?qa=stinky. Uses the live vehicle systems.
export function installStinkyQA({place,read,trees,rocks,ramps}){
 const panel=document.createElement('section');panel.id='stinkyQA';panel.setAttribute('aria-label','Stinky integration checks');
 panel.style.cssText='position:fixed;z-index:8;left:12px;top:200px;max-width:310px;padding:12px;border-radius:12px;background:#173e46ed;color:white;font:12px system-ui';
 const title=document.createElement('strong');title.textContent='Stinky integration checks';panel.append(title);
 const select=document.createElement('select');select.setAttribute('aria-label','Test location');select.style.cssText='display:block;margin:9px 0;padding:7px;max-width:285px';
 const sites=[{name:'Start / road',x:0,z:0,heading:0},{name:'Cross-slope hill',x:65,z:65,heading:1.1},...ramps.map(f=>({name:'Ramp: '+f.id,x:f.x-Math.sin(f.angle)*32,z:f.z-Math.cos(f.angle)*32,heading:f.angle}))];
 // Use existing world obstacles, not separate fixtures or alternate collision systems.
 const t=trees.trees.find(t=>Math.hypot(t.x,t.z)>22&&Math.abs(t.x)<100&&Math.abs(t.z)<100);
 const r=rocks.rocks.find(r=>Math.hypot(r.x,r.z)>22&&Math.abs(r.x)<100&&Math.abs(r.z)<100);
 if(t)sites.push({name:'Existing tree approach',x:t.x,z:t.z-15,heading:0,target:t});
 if(r)sites.push({name:'Existing rock approach',x:r.x,z:r.z-15,heading:0,target:r});
 for(const [i,site] of sites.entries()){const option=document.createElement('option');option.value=i;option.textContent=site.name;select.append(option);}panel.append(select);
 const button=document.createElement('button');button.textContent='Place Stinky';button.onclick=()=>place(sites[Number(select.value)]);panel.append(button);
 const output=document.createElement('pre');output.style.cssText='white-space:pre-wrap;line-height:1.5;margin-bottom:0';output.setAttribute('aria-label','Live truck telemetry');panel.append(output);document.body.append(panel);
 let last=0;
 return {update(now){if(now-last<200)return;last=now;output.textContent=read(sites[Number(select.value)]);}};
}
