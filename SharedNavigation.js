import {openSettingsPanel} from './SettingsPanel.js';
import {readGamePreferences,gamePreferenceStorage} from './GamePreferences.js?v=central-settings-3';
// Paths are relative to this module, so local hosting and GitHub project Pages work.
// Add a destination here, then include this module on its page. No router/scenes.
export const navigationItems = [
 {id:'play',label:'Play',path:'index.html'},
 {id:'jumps',label:'Dirt Jump Lab',path:'viewer/jumps.html'},
 {id:'assets',label:'Asset Showroom',children:[
  {id:'showroom',label:'Turbo & Collectibles',path:'viewer/showroom.html'},
  {id:'environment',label:'Environment Workshop',path:'viewer/environment.html'},
  {id:'dirty',label:'Dirty Garage',path:'viewer/dirty.html'},
  {id:'stinky',label:'Stinky Garage',path:'viewer/stinky.html'},
 ]},
 {id:'settings',label:'Settings',action:'settings',note:'Live tuning & controls'},
];
export const navigationDestinations=navigationItems.flatMap(item=>item.children??[item]);
// These existing review/handling URLs retain their pages and local entry links.
const relatedPages=[{id:'dirty-comparison',path:'viewer/comparison.html'}, {id:'stinky-comparison',path:'viewer/stinky-comparison.html'},{id:'environment-review',path:'viewer/storybook-review.html'}];
export function navigationItemActive(item,active){return item.id===active||item.id==='play'&&active==='handling'||item.id==='dirty'&&active==='dirty-comparison'||item.id==='stinky'&&active==='stinky-comparison'||item.id==='environment'&&active==='environment-review';}
export function navigationGroupActive(item,active){return item.children?.some(child=>navigationItemActive(child,active))??false;}

export function navigationURL(item,base=import.meta.url){return new URL(item.path,base);}
export function currentArea(location,base=import.meta.url){
 const url=new URL(location),root=new URL('.',base);
 if(url.pathname===root.pathname||url.pathname===new URL('index.html',root).pathname)return url.searchParams.has('handling')?'handling':'play';
 return [...navigationDestinations,...relatedPages].find(item=>item.path&&navigationURL(item,base).pathname===url.pathname)?.id;
}

const styles=`
:host{font:16px system-ui,sans-serif;color:#243b32;position:fixed;z-index:40;top:max(12px,env(safe-area-inset-top));left:max(12px,env(safe-area-inset-left))}
*{box-sizing:border-box}button,a{font:inherit}button{cursor:pointer}
.toggle{width:48px;height:48px;display:grid;place-content:center;gap:5px;padding:12px;background:#203e35;color:#fff5d6;border:1px solid #ffffff60;border-radius:13px;box-shadow:0 3px 12px #14291e30;touch-action:manipulation}
.toggle span{display:block;width:22px;height:2px;background:currentColor;border-radius:2px}
dialog{position:fixed;inset:0;margin:auto;padding:0;border:1px solid #d2dbc9;border-radius:20px;background:#fbfcf5;color:#243b32;width:min(420px,calc(100vw - 24px));max-width:none;max-height:calc(100dvh - max(24px,env(safe-area-inset-top)) - env(safe-area-inset-bottom));box-shadow:0 18px 80px #102b2955;overflow:auto;overscroll-behavior:contain}
dialog::backdrop{background:#102b2970;backdrop-filter:blur(3px)}
.heading{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;position:sticky;top:0;background:#fbfcf5;border-bottom:1px solid #e1e6d8;z-index:1}
h2{font-size:20px;margin:0}.eyebrow{font-size:10px;font-weight:750;letter-spacing:1.6px;color:#63765d;margin-bottom:4px}
.close{min-width:48px;min-height:48px;border:1px solid #d2dbc9;border-radius:12px;background:white;color:#243b32;font-size:15px;touch-action:manipulation}
nav{display:grid;gap:8px;padding:14px}a,.settings,.unavailable{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-height:52px;padding:13px 14px;border:1px solid #d9e1d1;border-radius:12px;text-decoration:none;background:white;color:#243b32;text-align:left;font-weight:650;touch-action:manipulation}
a:hover{background:#f7efcf}a[aria-current=page]{background:#f8d66c;border-color:#d0aa38}.note{font-size:11px;font-weight:500;color:#596953;white-space:nowrap}.unavailable{background:#edf0e8;color:#62705b;cursor:default}button:focus-visible,a:focus-visible{outline:3px solid #b47b00;outline-offset:2px}
.group{border:1px solid #d9e1d1;border-radius:12px;overflow:hidden;background:white}.group[data-current]{border-color:#d0aa38}.group summary{display:flex;align-items:center;gap:10px;min-height:52px;padding:13px 14px;font-weight:650;cursor:pointer;list-style:none;touch-action:manipulation}.group summary::-webkit-details-marker{display:none}.group summary::after{content:'›';font-size:23px;margin-left:auto;transition:transform .12s}.group[open] summary::after{transform:rotate(90deg)}.group summary:focus-visible{outline:3px solid #b47b00;outline-offset:-3px}.group[data-current] summary{background:#fff5d5}.submenu{padding:0 8px 8px 18px;display:grid;gap:6px}.submenu a{font-size:14px;min-height:48px}.submenu a[aria-current]{background:#f8d66c;border-color:#d0aa38}a[aria-current=location]{background:#f8d66c;border-color:#d0aa38}
@media(prefers-reduced-motion:no-preference){dialog[open]{animation:appear .12s ease-out}@keyframes appear{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}}
`;

export function installNavigation(){
 // Embedded garages use their parent's Back to driving control; never navigate
 // inside the iframe or create another running game within the garage.
 if(window.self!==window.top&&new URLSearchParams(location.search).has('embedded'))return;
 if(document.querySelector('lbd-navigation'))return;
 const host=document.createElement('lbd-navigation'),shadow=host.attachShadow({mode:'open'});
 const style=document.createElement('style');style.textContent=styles;
 const toggle=document.createElement('button');toggle.className='toggle';toggle.type='button';toggle.setAttribute('aria-label','Open navigation menu');toggle.setAttribute('aria-haspopup','dialog');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','lbd-menu');
 for(let i=0;i<3;i++)toggle.append(document.createElement('span'));
 const dialog=document.createElement('dialog');dialog.id='lbd-menu';dialog.setAttribute('aria-labelledby','lbd-menu-title');
 const heading=document.createElement('div');heading.className='heading';
 const title=document.createElement('div'),eyebrow=document.createElement('div'),h2=document.createElement('h2');eyebrow.className='eyebrow';eyebrow.textContent='LITTLE BIG DIRT';h2.id='lbd-menu-title';h2.textContent='Explore';title.append(eyebrow,h2);
 const close=document.createElement('button');close.className='close';close.type='button';close.textContent='Close';close.setAttribute('aria-label','Close navigation menu');heading.append(title,close);
 const nav=document.createElement('nav');nav.setAttribute('aria-label','Game and labs');
 const active=currentArea(location.href);
 function destination(item){
  const row=document.createElement(item.action?'button':item.path?'a':'div');row.textContent=item.label;
  if(item.path){row.href=navigationURL(item).href;if(navigationItemActive(item,active))row.setAttribute('aria-current',item.id===active?'page':'location');

  }
  else if(item.action){row.type='button';row.className='settings';row.addEventListener('click',()=>{dialog.addEventListener('close',openSettingsPanel,{once:true});dialog.close();});}
  else{row.className='unavailable';row.setAttribute('aria-disabled','true');}
  if(item.note||navigationItemActive(item,active)){const note=document.createElement('span');note.className='note';note.textContent=item.note??'You are here';row.append(note);}
  return row;
 }
 const groups=[];
 for(const item of navigationItems){
  if(!item.children){nav.append(destination(item));continue;}
  const group=document.createElement('details');group.className='group';group.open=navigationGroupActive(item,active);group.toggleAttribute('data-current',group.open);
  const summary=document.createElement('summary');summary.textContent=item.label;summary.setAttribute('aria-controls','lbd-'+item.id);summary.setAttribute('aria-expanded',String(group.open));
  const children=document.createElement('div');children.className='submenu';children.id='lbd-'+item.id;children.setAttribute('role','group');children.setAttribute('aria-label',item.label+' destinations');
  for(const child of item.children)children.append(destination(child));
  group.append(summary,children);group.addEventListener('toggle',()=>summary.setAttribute('aria-expanded',String(group.open)));groups.push({item,group});nav.append(group);
 }
 dialog.append(heading,nav);shadow.append(style,toggle,dialog);document.body.append(host);
 document.body.dataset.lbdNavigation=active??'other';
 // Keep the existing HUD/control positions otherwise intact. Only reserve the
 // top-left icon's space, and scope layout rules to these existing entry points.
 const layout=document.createElement('style');layout.textContent=`
 body[data-lbd-navigation] #hud,body[data-lbd-navigation] #switcher{top:calc(max(12px,env(safe-area-inset-top)) + 60px)}
 body[data-lbd-navigation=jumps] header{top:calc(max(12px,env(safe-area-inset-top)) + 60px);max-height:calc(100dvh - 180px);overflow:auto}
 body[data-lbd-navigation]:not([data-lbd-navigation=play]):not([data-lbd-navigation=handling]):not([data-lbd-navigation=jumps])>header{padding-left:max(76px,calc(env(safe-area-inset-left) + 76px))}
 `;document.head.append(layout);
 const touchStyle=document.createElement('style');touchStyle.textContent='body[data-lbd-touch-controls="false"] #touch{display:none!important}body[data-lbd-touch-controls="true"] #touch{display:flex!important}';document.head.append(touchStyle);
 const applyTouchPreference=()=>{
  const preferences=readGamePreferences(gamePreferenceStorage());
  document.body.dataset.lbdDrivingHud=String(preferences.showDrivingHud===true);
  document.body.dataset.lbdControlsGuide=String(preferences.showControlsGuide===true);
  if(typeof preferences.touchControls==='boolean')document.body.dataset.lbdTouchControls=String(preferences.touchControls);
  else delete document.body.dataset.lbdTouchControls;
 };
 applyTouchPreference();window.addEventListener('pageshow',applyTouchPreference);window.addEventListener('lbd:preferences-change',applyTouchPreference);window.addEventListener('storage',applyTouchPreference);
 // Cache the page with optional information hidden; pageshow reapplies the saved
 // preferences before it is revealed again, including changes made in a lab.
 window.addEventListener('pagehide',()=>{delete document.body.dataset.lbdDrivingHud;delete document.body.dataset.lbdControlsGuide;});
 // Preserve old Settings bookmarks by opening the shared panel in place.
 if(location.hash==='#switcher')openSettingsPanel();
 toggle.addEventListener('click',()=>{
  // Existing blur handlers release keyboard/touch/camera captures. No game
  // controller changes and no held throttle after closing or changing pages.
  window.dispatchEvent(new Event('blur'));
  for(const {item,group} of groups)if(navigationGroupActive(item,active))group.open=true;
  dialog.showModal();toggle.setAttribute('aria-expanded','true');close.focus();
 });
 close.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{toggle.setAttribute('aria-expanded','false');toggle.focus();});
 let backdropDown=false;
 dialog.addEventListener('pointerdown',event=>{backdropDown=event.target===dialog;});
 dialog.addEventListener('click',event=>{if(backdropDown&&event.target===dialog)dialog.close();backdropDown=false;});
 // Keep keyboard driving handlers from seeing menu shortcuts; native Tab and
 // Escape behavior still works because the browser's default is not prevented.
 for(const type of ['keydown','keyup'])window.addEventListener(type,event=>{if(dialog.open)event.stopImmediatePropagation();},true);
}

if(typeof document!=='undefined')installNavigation();
