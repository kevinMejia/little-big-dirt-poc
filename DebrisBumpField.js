// Compact smooth footprints, reused from the legacy debris sampling approach.
// Visual suspension feedback only: never supplied to Rapier or terrain raycasts.
export class DebrisBumpField {
  constructor(objects=[],config={}){this.config=config;this.grid=new Map();for(const o of objects){const radius=Math.max(o.rx,o.rz);for(let x=Math.floor((o.x-radius)/4);x<=Math.floor((o.x+radius)/4);x++)for(let z=Math.floor((o.z-radius)/4);z<=Math.floor((o.z+radius)/4);z++){const key=x+','+z;if(!this.grid.has(key))this.grid.set(key,[]);this.grid.get(key).push(o);}}}
  getHeightAt(x,z){if(!this.config.enabled)return 0;let height=0;for(const o of this.grid.get(Math.floor(x/4)+','+Math.floor(z/4))??[]){const dx=x-o.x,dz=z-o.z,c=Math.cos(o.angle),s=Math.sin(o.angle),u=(dx*c+dz*s)/o.rx,v=(-dx*s+dz*c)/o.rz,q=u*u+v*v;if(q<1)height=Math.max(height,o.height*(1-q)**2);}return Math.min(.12,Math.max(0,this.config.maxHeight??.07),height)*Math.max(0,Math.min(1,this.config.strength??.7));}
  getWheelHeightAt(x,z,r=.7){const d=Math.min(.18,r*.2);return this.getHeightAt(x,z)*.5+(this.getHeightAt(x-d,z)+this.getHeightAt(x+d,z)+this.getHeightAt(x,z-d)+this.getHeightAt(x,z+d))*.125;}
  dispose(){this.grid.clear();}
}
