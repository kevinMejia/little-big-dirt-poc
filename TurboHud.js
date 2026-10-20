import {dirtSplatterSvg} from './DirtSplatter.js';
import {turboBoostConfig} from './VehicleConfig.js';
export class TurboHud {
 constructor(){
  this.element=document.createElement('div');this.element.id='turboHud';this.element.setAttribute('role','meter');this.element.setAttribute('aria-label','Turbo charge; double tap and hold acceleration to boost');this.element.setAttribute('aria-valuemin','0');this.element.setAttribute('aria-valuemax','100');
  this.element.innerHTML=`<svg viewBox="0 0 120 120" aria-hidden="true">
   <defs><radialGradient id="turboBack"><stop stop-color="#183f52"/><stop offset="1" stop-color="#081018"/></radialGradient><linearGradient id="turboFlame" x2="0.6" y2="1"><stop stop-color="#079fff"/><stop offset="1" stop-color="#60edff"/></linearGradient></defs>
   ${dirtSplatterSvg()}
   <circle cx="60" cy="60" r="45" fill="url(#turboBack)" stroke="#050b10" stroke-width="5"/>
   <circle cx="60" cy="60" r="38" fill="none" stroke="#35404a" stroke-width="7"/>
   <circle class="turbo-ring" cx="60" cy="60" r="38" pathLength="100" fill="none" stroke="currentColor" stroke-width="7" transform="rotate(-90 60 60)"/>
   <g class="turbo-flame"><path fill="url(#turboFlame)" d="M59 30c7 17-11 18-4 31 2-10 12-9 13-20 5 11 16 20 11 34-5 17-30 22-39 5-8-15 6-23 6-34 6 5 3 12 5 15-3-15 14-17 8-31z"/><path fill="#b9fbff" d="M62 59c4 8-3 12 1 17 4-1 6-5 7-8 4 13-10 22-17 12-5-8 4-13 9-21z"/></g>
  </svg>`;
  document.body.append(this.element);this.ring=this.element.querySelector('.turbo-ring');this.wasFull=false;this.layoutKey='';
 }
 update(turbo){
  const charge=turbo.charge,e=this.element;
  e.dataset.state=charge===0?'empty':charge<=20?'low':'ready';e.classList.toggle('boosting',turbo.active);
  e.classList.toggle('full',charge>=100);this.ring.style.strokeDasharray=`${charge} 100`;e.setAttribute('aria-valuenow',charge.toFixed(1));
  // Reserve actual SVG dimensions (including dirt/glow padding), and move above touch controls.
  const layoutKey=[innerWidth,innerHeight,turboBoostConfig.turboHudScale,document.body.classList.contains('touch-enabled')].join(':');
  if(layoutKey===this.layoutKey)return;
  const mobile=document.querySelector('#mobile'),rect=mobile&&!mobile.hidden&&getComputedStyle(mobile).display!=='none'?mobile.getBoundingClientRect():null;
  const bottom=rect?Math.max(16,innerHeight-rect.top+12):16;
  const requested=Math.max(.1,turboBoostConfig.turboHudScale);
  const size=Math.max(24,Math.min(120*requested,innerWidth-32,innerHeight-bottom-90));
  const key=`${size}:${bottom}`;
  if(key!==this.layoutKey){e.style.setProperty('--turbo-hud-size',size+'px');e.style.setProperty('--turbo-hud-bottom',bottom+'px');mobile?.style.setProperty('--drive-hud-size',size+'px');this.layoutKey=layoutKey;}
 }
}
