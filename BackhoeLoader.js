import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';

const clamp = THREE.MathUtils.clamp;
const Y = new THREE.Vector3(0, 1, 0);

/** Self-contained construction vehicle. Units: meters; +Z forward, +Y up.
 * Joint angles are radians. Front loader height is normalized to [0, 1].
 * Resources belong to this instance; call dispose() after removing it.
 */
export class BackhoeLoader {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'BackhoeLoader';
    this.geometries = new Set();
    this.materials = new Set();
    this.hydraulics = [];
    this.wheels = [];
    this.wheelAngle = 0;
    this.disposed = false;
    const material = (color, roughness = .55, metalness = .08) => {
      const m = new THREE.MeshStandardMaterial({color, roughness, metalness});
      this.materials.add(m); return m;
    };
    this.paint = material(0xf5bc24);
    this.edge = material(0xc88b12);
    this.tire = material(0x242725, .95, 0);
    this.trim = material(0x353c39, .7);
    this.chrome = material(0xb8cbd0, .24, .8);
    this.glass = material(0x173b49, .18, .35);
    this.light = material(0xffefbb, .25);
    this.red = material(0xc64128);
    this.buildBody();
    this.buildWheels();
    this.buildLoader();
    this.buildExcavator();
    this.setFrontLoaderHeight(.12);
    this.setFrontBucketTilt(0);
    this.setRearBoomAngle(-.32);
    this.setRearStickAngle(1.12);
    this.setRearBucketCurl(.25);
    this.update(0);
  }

  mesh(parent, geometry, material, x=0, y=0, z=0) {
    this.geometries.add(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x,y,z); mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh); return mesh;
  }

  pivot(parent, name, x,y,z) {
    const g = new THREE.Group(); g.name=name; g.position.set(x,y,z); parent.add(g); return g;
  }

  // Beveled extruded outlines provide rounded silhouettes rather than stacked boxes.
  outline(parent, points, depth, material, x=0,y=0,z=0, bevel=.07) {
    const s = new THREE.Shape(); s.moveTo(...points[0]);
    for(const p of points.slice(1)) s.lineTo(...p);
    s.closePath();
    const geo = new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,steps:1,curveSegments:12});
    geo.translate(0,0,-depth/2);
    return this.mesh(parent,geo,material,x,y,z);
  }

  round(parent,w,h,d,x,y,z,material=this.paint) {
    const r=Math.min(.16,w*.2,h*.2);
    const s=new THREE.Shape();
    s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);
    s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);
    s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);
    s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
    const geo=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelThickness:.04,bevelSize:.04,bevelSegments:2,steps:1,curveSegments:5});
    geo.translate(0,0,-d/2);return this.mesh(parent,geo,material,x,y,z);
  }

  rod(parent,a,b,r,material=this.paint) {
    const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),delta=bv.clone().sub(av);
    const m=this.mesh(parent,new THREE.CylinderGeometry(r,r,delta.length(),10),material);
    m.position.copy(av.add(bv).multiplyScalar(.5));m.quaternion.setFromUnitVectors(Y,delta.normalize());return m;
  }

  buildBody() {
    const g=this.group;
    this.round(g,2.3,.5,3.8,0,1.02,0,this.trim);
    this.round(g,2.25,.58,3.65,0,1.35,0);
    this.round(g,1.7,.73,1.5,0,1.9,1.02);
    // Tall tapering cab, with separate curved windshield and wraparound roof.
    this.outline(g,[[-1,1.65],[1,1.65],[.94,3.65],[.82,3.95],[-.82,3.95],[-.94,3.65]],1.85,this.paint,0,0,-.48);
    const pane=new THREE.PlaneGeometry(1.61,1.55,12,3);
    const p=pane.attributes.position;
    for(let i=0;i<p.count;i++){const x=p.getX(i);p.setZ(i,.12*(1-(x/.81)**2));}
    pane.computeVertexNormals();
    const windshield=this.mesh(g,pane,this.glass,0,2.92,.49);windshield.rotation.x=-.055;
    // Windows inset into both side panels, facing outward.
    for(const side of [-1,1]) {
      const window=this.outline(g,[[-.72,-.64],[.66,-.64],[.58,.68],[-.65,.78]],.025,this.glass,side*1.015,2.94,-.5,.025);
      window.rotation.y=side*Math.PI/2;
      this.round(g,.08,.12,.32,side*1.08,2.13,-.4,this.trim);
      this.round(g,.38,.12,.67,side*1.26,1.27,-.05,this.trim);
      this.round(g,.32,.1,.53,side*1.24,.99,.07,this.edge);
      // Rounded rear fenders arch over the large tires.
      const arch=[];
      for(let i=0;i<=16;i++){const a=Math.PI*(.18+i*.64/16);arch.push([Math.cos(a)*.84,Math.sin(a)*.84]);}
      for(let i=16;i>=0;i--){const a=Math.PI*(.18+i*.64/16);arch.push([Math.cos(a)*.78,Math.sin(a)*.78]);}
      const fender=this.outline(g,arch,.48,this.paint,side*1.24,.728,-1.25,.02);
      fender.rotation.y=Math.PI/2;
      this.round(g,.32,.23,.12,side*.72,1.99,1.83,this.light);
      this.round(g,.26,.18,.12,side*.77,1.53,-1.91,this.red);
    }
    const rear=this.round(g,1.5,1.35,.035,0,2.94,-1.54,this.glass);
    rear.rotation.y=Math.PI;
    const roofShape=new THREE.Shape();roofShape.moveTo(-1.15,-.08);roofShape.quadraticCurveTo(-1.2,.1,-.92,.18);roofShape.quadraticCurveTo(0,.36,1,.18);roofShape.quadraticCurveTo(1.22,.1,1.16,-.08);roofShape.closePath();
    const roofGeo=new THREE.ExtrudeGeometry(roofShape,{depth:2.22,bevelEnabled:true,bevelSize:.07,bevelThickness:.07,bevelSegments:3,curveSegments:12});roofGeo.translate(0,0,-1.11);
    this.mesh(g,roofGeo,this.paint,0,3.9,-.42);
    this.rod(g,[.67,1.9,1.1],[.67,3.15,1.1],.085,this.trim);
    this.rod(g,[.67,3.15,1.1],[.67,3.27,1.24],.085,this.trim);
    // Front grille: dark recessed horizontal vents, no face details.
    for(let i=0;i<4;i++)this.round(g,1.12,.065,.05,0,1.65+i*.12,1.81,this.trim);
  }

  buildWheels() {
    for(const x of [-1.25,1.25])for(const z of [-1.25,1.35]) {
      const r=(z<0?.91:.65)*.8;
      const pivot=this.pivot(this.group,z>0?'frontSteering':'rearAxle',x,r,z);
      const roll=this.pivot(pivot,'wheelSpin',0,0,0);
      const profile=[[.48,-.27],[.76,-.27],[.94,-.21],[1,-.12],[1,.12],[.94,.21],[.76,.27],[.48,.27]].map(([radial,width])=>new THREE.Vector2(radial*r,width));
      const tireGeo=new THREE.LatheGeometry(profile,24);tireGeo.rotateZ(Math.PI/2);
      this.mesh(roll,tireGeo,this.tire);
      const hub=this.mesh(roll,new THREE.CylinderGeometry(r*.52,r*.52,.55,16),this.paint);hub.rotation.z=Math.PI/2;
      for(const side of [-1,1]){const cap=this.mesh(roll,new THREE.CylinderGeometry(r*.19,r*.19,.035,12),this.edge,side*.31,0,0);cap.rotation.z=Math.PI/2;}
      // Compatibility metadata for the game's terrain-following wheel adapter.
      pivot.userData.wheel={x,z,r};pivot.userData.roll=roll;
      this.wheels.push(pivot);
    }
  }

  bucket(parent,width,scale=1) {
    const g=this.pivot(parent,'bucketShell',0,0,0);
    // Curved, open concave scoop, extruded across its full width with solid side cheeks.
    const profile=[];
    for(let i=0;i<=12;i++){const a=i/12*Math.PI/2;profile.push([-.9*Math.cos(a),.85-.85*Math.sin(a)]);}
    for(let i=12;i>=0;i--){const a=i/12*Math.PI/2;profile.push([-1.02*Math.cos(a),.85-.97*Math.sin(a)]);}
    // Outline XY is mapped to vehicle ZY, extrusion axis becomes vehicle X.
    const shell=this.outline(g,profile,width,this.paint,0,0,0,.025);shell.rotation.y=Math.PI/2;
    const cheek=[[-1.02,.85],[-.85,.9],[-.45,.23],[.18,-.09],[-.04,-.13],[-.68,.02],[-1.02,.4]];
    for(const side of [-1,1]){const c=this.outline(g,cheek,.065,this.edge,side*width/2,0,0,.025);c.rotation.y=Math.PI/2;}
    this.round(g,width+.14,.1,.17,0,-.1,.04,this.edge);
    for(let i=0;i<5;i++)this.round(g,.15,.08,.26,(i-2)*width/5,-.12,.2,this.edge);
    g.scale.setScalar(scale);return g;
  }

  anchor(parent,x,y,z){return this.pivot(parent,'hydraulicAnchor',x,y,z);}
  hydraulic(a,b,r=.065) {
    const barrel=this.mesh(this.group,new THREE.CylinderGeometry(r,r,1,10),this.edge);
    const piston=this.mesh(this.group,new THREE.CylinderGeometry(r*.48,r*.48,1,10),this.chrome);
    this.hydraulics.push({a,b,barrel,piston});
  }

  buildLoader() {
    this.frontLoader=this.pivot(this.group,'frontLoaderLift',0,1.65,.22);
    for(const x of [-1.02,1.02]){
      this.rod(this.frontLoader,[x,0,0],[x,-.5,2.12],.115);
      this.rod(this.frontLoader,[x,-.5,2.12],[x,-.42,2.55],.115);
      this.hydraulic(this.anchor(this.group,x,1.18,.42),this.anchor(this.frontLoader,x,-.32,1.6),.085);
    }
    this.rod(this.frontLoader,[-1.02,-.4,2.2],[1.02,-.4,2.2],.12);
    this.frontBucket=this.pivot(this.frontLoader,'frontBucketTilt',0,-.85,2.65);
    const scoop=this.bucket(this.frontBucket,3.05,1.18);
    scoop.scale.y*=1.35;
    this.hydraulic(this.anchor(this.frontLoader,0,-.05,1.3),this.anchor(this.frontBucket,0,.48,-.58));
  }

  buildExcavator() {
    this.rearArm=this.pivot(this.group,'rearArmSwing',0,1.32,-2.15);
    this.round(this.rearArm,.8,.5,.6,0,0,0,this.edge);
    this.rearBoom=this.pivot(this.rearArm,'rearBoom',0,.14,-.16);
    this.outline(this.rearBoom,[[-.2,0],[.2,0],[.15,3.24],[-.07,3.5],[-.27,3.23]],.34,this.paint);
    this.rearStick=this.pivot(this.rearBoom,'rearStick',0,3.3,0);
    this.outline(this.rearStick,[[-.15,.1],[.17,.1],[.22,-2.26],[-.03,-2.52],[-.18,-2.2]],.27,this.paint);
    this.rearBucket=this.pivot(this.rearStick,'rearBucketCurl',0,-2.34,0);
    const scoop=this.bucket(this.rearBucket,1.3,.8);scoop.rotation.y=Math.PI;
    // Visible joint pins and hydraulic rods move with the actual joint hierarchy.
    for(const joint of [this.rearBoom,this.rearStick,this.rearBucket]){const pin=this.mesh(joint,new THREE.CylinderGeometry(.16,.16,.56,12),this.edge);pin.rotation.z=Math.PI/2;}
    this.hydraulic(this.anchor(this.rearArm,.3,.02,.23),this.anchor(this.rearBoom,.3,1.88,.1),.09);
    this.hydraulic(this.anchor(this.rearBoom,-.29,1.35,.12),this.anchor(this.rearStick,-.29,-.74,.16),.075);
    this.hydraulic(this.anchor(this.rearStick,.24,-1.05,.1),this.anchor(this.rearBucket,.24,.45,-.5),.06);
  }

  setSteering(angle){for(const w of this.wheels)if(w.userData.wheel.z>0)w.rotation.y=clamp(angle,-.55,.55);}
  setWheelRotation(angle){this.wheelAngle=angle;for(const w of this.wheels)w.userData.roll.rotation.x=angle*.65/w.userData.wheel.r;}
  setFrontLoaderHeight(value){this.frontLoader.rotation.x=THREE.MathUtils.lerp(.14,-.8,clamp(value,0,1));}
  setFrontBucketTilt(value){this.frontBucket.rotation.x=clamp(value,-.65,.85);}
  setRearBoomAngle(angle){this.rearBoom.rotation.x=clamp(angle,-.65,.45);}
  setRearStickAngle(angle){this.rearStick.rotation.x=clamp(angle,.12,1.9);}
  setRearBucketCurl(angle){this.rearBucket.rotation.x=clamp(angle,-.8,1.25);}
  setRearArmRotation(angle){this.rearArm.rotation.y=clamp(angle,-1.25,1.25);}

  update(deltaTime) {
    if(this.disposed)return;
    this.group.updateWorldMatrix(true,true);
    const a=new THREE.Vector3(),b=new THREE.Vector3();
    for(const h of this.hydraulics){
      this.group.worldToLocal(h.a.getWorldPosition(a));this.group.worldToLocal(h.b.getWorldPosition(b));
      const d=b.clone().sub(a),length=d.length();
      if(length<.0001)continue;
      const direction=d.clone().normalize();
      h.barrel.position.copy(a).addScaledVector(direction,length*.3);
      h.piston.position.copy(a).addScaledVector(direction,length*.79);
      h.barrel.scale.y=length*.6;h.piston.scale.y=length*.42;
      h.barrel.quaternion.setFromUnitVectors(Y,direction);h.piston.quaternion.copy(h.barrel.quaternion);
    }
  }

  dispose(){if(this.disposed)return;this.group.removeFromParent();for(const g of this.geometries)g.dispose();for(const m of this.materials)m.dispose();this.geometries.clear();this.materials.clear();this.disposed=true;}
}
