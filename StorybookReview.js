import * as THREE from 'three';

// Camera-only review presets. No controller reset, vehicle movement or physics.
export function installStorybookReview(background,{height,halfSize}){
 const offsets={north:new THREE.Vector3(0,7,-22),east:new THREE.Vector3(-22,7,0),south:new THREE.Vector3(0,7,22),west:new THREE.Vector3(22,7,0)};
 let view='drive';let peak={x:0,z:0,y:-Infinity};
 for(let z=-halfSize+25;z<=halfSize-25;z+=12)for(let x=-halfSize+25;x<=halfSize-25;x+=12){const y=height(x,z);if(y>peak.y)peak={x,z,y};}
 const panel=document.createElement('aside');panel.id='storybook-review';panel.setAttribute('aria-label','Storybook background review');
 panel.innerHTML=`<style>
 #storybook-review{position:fixed;z-index:20;top:max(12px,env(safe-area-inset-top));left:max(76px,calc(env(safe-area-inset-left) + 76px));max-width:calc(100vw - 96px);padding:6px;display:flex;align-items:center;gap:6px;background:#203e35ed;color:#fff5dc;border:1px solid #fff5dc55;border-radius:12px;font:12px system-ui;box-shadow:0 5px 20px #16352830}
 #storybook-review p{margin:0 4px;font-size:10px;letter-spacing:.6px}#storybook-review button,#storybook-review summary{font:inherit;min-height:44px;padding:8px 10px;color:inherit;background:#ffffff18;border:1px solid #ffffff50;border-radius:8px;touch-action:manipulation;cursor:pointer}
 #storybook-review summary{list-style:none;display:flex;align-items:center;justify-content:center;gap:7px}#storybook-review summary::-webkit-details-marker{display:none}#storybook-review summary::after{content:'▾'}
 #storybook-review .buttons{position:absolute;left:0;top:calc(100% + 6px);width:min(300px,calc(100vw - 96px));max-height:calc(100dvh - 180px);overflow:auto;display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:8px;border:1px solid #fff5dc55;border-radius:12px;background:#203e35f5}
 #storybook-review button[aria-pressed=true]{background:#eed278;color:#263c32}#storybook-review button:focus-visible,#storybook-review summary:focus-visible{outline:3px solid #eed278}@media(max-width:800px){#storybook-review p{display:none}}
 </style><p title="Visual preview only. Live adjustments: Settings → Storybook Background">PAINTED PREVIEW</p><button id="storybook-compare">Show original</button><details><summary aria-label="Choose review view">Drive / orbit</summary><div class="buttons"><button data-view="drive" aria-pressed="true">Drive / orbit</button><button data-view="north" aria-pressed="false">North view</button><button data-view="east" aria-pressed="false">East view</button><button data-view="south" aria-pressed="false">South view</button><button data-view="west" aria-pressed="false">West view</button><button data-view="hilltop" aria-pressed="false">Hilltop view</button></div></details>`;
 document.body.append(panel);
 panel.querySelector('#storybook-compare').onclick=event=>{background.setEnabled(!background.enabled);event.target.textContent=background.enabled?'Show original':'Show painted';panel.querySelector('p').textContent=background.enabled?'PAINTED PREVIEW':'ORIGINAL VIEW';};
 for(const button of panel.querySelectorAll('[data-view]'))button.onclick=()=>{view=button.dataset.view;for(const child of panel.querySelectorAll('[data-view]'))child.setAttribute('aria-pressed',String(child===button));panel.querySelector('summary').textContent=button.textContent;panel.querySelector('details').open=false;};
 const look=new THREE.Vector3();
 return {update(camera,anchor){
  if(view==='drive')return;
  if(view==='hilltop'){camera.position.set(peak.x,peak.y+6,peak.z);look.set(peak.x+180,peak.y+4,peak.z+70);}
  else{camera.position.copy(anchor).add(offsets[view]);look.copy(anchor).y+=2.8;}
  camera.lookAt(look);
 },dispose(){panel.remove();},peak};
}
