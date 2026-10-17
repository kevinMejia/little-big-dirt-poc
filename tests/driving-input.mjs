import assert from 'node:assert/strict';
import {PointerInputState,mergeDrivingInput,DrivingInput} from '../DrivingInput.js';
const keys=new Set(),p=new PointerInputState();
p.set(1,'forward');p.set(2,'left');let s=mergeDrivingInput(keys,p,null,5);assert.ok(s.accelerate&&s.steerLeft);
p.release(1);assert.ok(p.held('left')&&!p.held('forward'));
p.set(3,'left');p.release(2);assert.ok(p.held('left'),'second finger on same key remains held');
keys.add('KeyW');p.clear();assert.ok(mergeDrivingInput(keys,p,null,0).accelerate,'releasing touch preserves keyboard');keys.clear();
p.set(4,'back');s=mergeDrivingInput(keys,p,null,4);assert.ok(s.brake&&!s.reverse);s=mergeDrivingInput(keys,p,null,0);assert.ok(s.reverse&&!s.brake);s=mergeDrivingInput(keys,p,null,-3);assert.ok(s.reverse);
p.set(4,'right');assert.ok(!p.held('back')&&p.held('right'),'sliding reassigns same pointer');
assert.ok(mergeDrivingInput(keys,p,{buttons:Array.from({length:8},(_,i)=>({value:i===7?1:0})),axes:[0]},0).accelerate,'gamepad remains additive');
class Node extends EventTarget{constructor(control){super();this.dataset={drive:control};this.classList={toggle(){}};this.hidden=false;this.attributes={};this.capture=new Set();}closest(){return this;}setAttribute(k,v){this.attributes[k]=v;}setPointerCapture(id){this.capture.add(id);}hasPointerCapture(id){return this.capture.has(id);}releasePointerCapture(id){this.capture.delete(id);}querySelectorAll(){return buttons;}contains(node){return buttons.includes(node);}replaceChildren(){}}
const buttons=['left','right','forward','back'].map(x=>new Node(x));const root=new Node(),toggle=new Node(),actionsRoot=new Node(),actionsToggle=new Node();
globalThis.window=new EventTarget();globalThis.document=new EventTarget();document.body={classList:{toggle(){}}};let hit=buttons[0];document.elementFromPoint=()=>hit;
Object.defineProperty(globalThis,'navigator',{value:{maxTouchPoints:2},configurable:true});globalThis.matchMedia=()=>({matches:false});
const input=new DrivingInput({root,toggle,keys,actionsRoot,actionsToggle});assert.ok(input.enabled&&!root.hidden);
const send=(target,type,id,button)=>{const e=new Event(type,{cancelable:true});Object.defineProperty(e,'target',{value:button});Object.assign(e,{pointerId:id,pointerType:'touch',button:0,clientX:10,clientY:10});target.dispatchEvent(e);};
send(root,'pointerdown',1,buttons[2]);send(root,'pointerdown',2,buttons[0]);assert.ok(input.read(0).accelerate&&input.read(0).steerLeft);
send(window,'pointerup',1,buttons[2]);assert.ok(!input.read(0).accelerate&&input.read(0).steerLeft);
hit=buttons[1];send(window,'pointermove',2,buttons[0]);assert.ok(input.read(0).steerRight&&!input.read(0).steerLeft);
hit=null;send(window,'pointermove',2,buttons[0]);assert.ok(!input.read(0).steerRight);
hit=buttons[2];send(window,'pointermove',2,buttons[0]);assert.ok(input.read(0).accelerate);
send(window,'lostpointercapture',2,buttons[0]);assert.ok(!input.read(0).accelerate);
for(const interrupted of ['pointercancel','blur','resize','orientationchange','visibilitychange']){send(root,'pointerdown',10,buttons[2]);if(interrupted==='visibilitychange'){document.hidden=true;document.dispatchEvent(new Event(interrupted));}else send(window,interrupted,10,buttons[2]);assert.ok(!input.read(0).accelerate,interrupted+' clears input');}
send(root,'pointerdown',1,buttons[2]);input.setEnabled(false);assert.ok(root.hidden&&!input.read(0).accelerate);input.dispose();
console.log('PASS: multitouch ownership, sliding, duplicate fingers, keyboard/gamepad merging, brake-before-reverse, capture loss/cancel/blur/visibility/rotation/resize and manual toggle.');
