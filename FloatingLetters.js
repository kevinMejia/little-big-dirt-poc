import * as THREE from 'three';
import {FontLoader} from 'three/addons/loaders/FontLoader.js';
import {TextGeometry} from 'three/addons/geometries/TextGeometry.js';
let fontPromise;
export class FloatingLetters {
 static async load(){fontPromise??=new FontLoader().loadAsync(new URL('./assets/fonts/helvetiker_bold.typeface.json',import.meta.url).href);return new FloatingLetters(await fontPromise);}
 constructor(font){this.font=font;this.geometries=new Map();this.materials=['#ffb92e','#37d8dd','#ff6c99','#a393ff','#91df52'].map(color=>new THREE.MeshStandardMaterial({color,roughness:.25,metalness:.2,emissive:color,emissiveIntensity:.13}));}
 create(letter,index=0){
  this.edgeMaterial??=new THREE.MeshStandardMaterial({color:'#167e9e',roughness:.28,metalness:.25,emissive:'#167e9e',emissiveIntensity:.1});
  if(!this.geometries.has(letter)){const g=new TextGeometry(letter,{font:this.font,size:1,depth:.3,curveSegments:6,bevelEnabled:true,bevelThickness:.07,bevelSize:.055,bevelSegments:3});g.computeBoundingBox();const box=g.boundingBox;g.translate(-(box.min.x+box.max.x)/2,-(box.min.y+box.max.y)/2,-.15);this.geometries.set(letter,g);}
  const root=new THREE.Group(),mesh=new THREE.Mesh(this.geometries.get(letter),[this.materials[index%this.materials.length],this.edgeMaterial]);root.add(mesh);return root;
 }
 animate(root,time,size,height,speed=14,phase=0){root.scale.setScalar(size);root.position.y=height+Math.sin(time*2+phase)*.18;root.rotation.set(Math.sin(time+phase)*.06,Math.sin(time*speed*Math.PI/180+phase)*.55,Math.sin(time*1.3+phase)*.06);}
 dispose(){for(const g of this.geometries.values())g.dispose();for(const m of this.materials)m.dispose();this.edgeMaterial?.dispose();}
}
export class LetterShowroomPreview {
 static async load(){return new LetterShowroomPreview(await FloatingLetters.load());}
 constructor(letters){this.letters=letters;this.object=new THREE.Group();this.time=0;this.manifest={triangles:0,glbBytes:JSON.stringify(letters.font.data).length};this.setLetter('A');}
 setLetter(letter){this.object.clear();this.model=this.letters.create(letter);this.object.add(this.model);this.manifest.triangles=this.model.children[0].geometry.attributes.position.count/3;}
 setSettings(s){this.settings=s;this.letters.edgeMaterial?.color.set(s.accentColor);for(const m of this.letters.materials){m.color.set(s.mainColor);m.emissive.set(s.accentColor);m.emissiveIntensity=s.glowIntensity*.18;}}
 update(dt,base=0){this.time+=dt;const s=this.settings;if(s)this.letters.animate(this.model,this.time,s.scale*2,base+s.floatHeight,s.rotationSpeed);if(s)this.model.position.y=base+s.floatHeight+Math.sin(this.time*s.floatSpeed*2*Math.PI)*s.floatAmount;}
 dispose(){this.object.removeFromParent();this.letters.dispose();}
}
