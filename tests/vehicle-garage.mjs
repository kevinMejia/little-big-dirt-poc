import assert from 'node:assert/strict';
import {bindVehicleGarage} from '../VehicleGarage.js';
class Button extends EventTarget{constructor(){super();this.classList={add(){},remove(){}};}setPointerCapture(){}}
globalThis.window=new EventTarget();globalThis.document=new EventTarget();const buttons=[new Button(),new Button()];let selected=[],opened=[];
const binding=bindVehicleGarage({buttons,onSelect:i=>selected.push(i),onOpen:i=>opened.push(i),holdMilliseconds:20});
const event=(target,type,fields={})=>{const e=new Event(type,{cancelable:true});Object.assign(e,{button:0,pointerId:1,repeat:false,...fields});target.dispatchEvent(e);};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
event(buttons[0],'pointerdown');event(buttons[0],'pointerup');assert.deepEqual(selected,[0]);assert.equal(opened.length,0);
event(buttons[1],'pointerdown');await wait(35);event(buttons[1],'pointerup');assert.deepEqual(opened,[1]);assert.deepEqual(selected,[0],'long press does not select on release');
for(const type of ['pointercancel','lostpointercapture']){event(buttons[0],'pointerdown');event(buttons[0],type);await wait(25);}assert.equal(opened.length,1);
event(window,'keydown',{code:'Digit1'});event(window,'keyup',{code:'Digit1'});assert.deepEqual(selected,[0,0]);
event(window,'keydown',{code:'Digit2'});event(window,'keydown',{code:'Digit2',repeat:true});await wait(35);event(window,'keyup',{code:'Digit2'});assert.deepEqual(opened,[1,1]);
event(window,'keydown',{code:'Digit1'});event(window,'blur');await wait(25);assert.equal(opened.length,2);
binding.dispose();console.log('PASS: pointer and keyboard short press/hold, no selection after hold, repeat suppression, capture/cancel/blur cleanup.');
