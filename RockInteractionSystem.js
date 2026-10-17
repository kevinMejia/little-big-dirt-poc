import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
import {rockConfig} from './VehicleConfig.js';

const clamp=THREE.MathUtils.clamp;
const solid=r=>r.state==='INTACT'||r.state==='CRACKED';

/** Lightweight rocks: static spatial grid, active animation set and pooled debris.
 * resolveMovement corrects a movement step already performed by the driving code.
 * Use steps <= .18 world units for continuous collisions with both trees and rocks.
 */
export class RockInteractionSystem {
  constructor(scene,{groundHeight=()=>0,onImpact=()=>{},config=rockConfig}={}){
    this.scene=scene;this.height=groundHeight;this.onImpact=onImpact;this.config=config;
    this.rocks=[];this.grid=new Map();this.active=new Set();this.vehicles=[];this.time=0;this.nextDust=0;this.nextFragment=0;
    this.geometry=new THREE.DodecahedronGeometry(1,0);
    const p=this.geometry.attributes.position;
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i),f=1+.1*Math.sin(x*17+y*11+z*9);
      p.setXYZ(i,x*f,y*f*.82,z*f*.94);
    }
    this.geometry.computeVertexNormals();
    this.materials=[0x8a938e,0x9ba39a,0x767f7b].map(color=>new THREE.MeshStandardMaterial({color,roughness:1,flatShading:true}));
    this.crackMaterial=new THREE.MeshBasicMaterial({color:0x303c38});
    this.crackGeometries=new Set();
    this.dustGeometry=new THREE.IcosahedronGeometry(1,0);
    this.dustMaterial=new THREE.MeshBasicMaterial({color:0xc5bea0,transparent:true,opacity:.4,depthWrite:false});
    this.fragments=Array.from({length:Math.max(6,Math.floor(config.maxFragments))},(_,i)=>{
      const mesh=new THREE.Mesh(this.geometry,this.materials[i%3]);mesh.visible=false;mesh.castShadow=true;scene.add(mesh);
      return {mesh,active:false,v:new THREE.Vector3(),spin:new THREE.Vector3(),r:.2,age:0,owner:null,scale:1};
    });
    this.dust=Array.from({length:64},(_,i)=>{const mesh=new THREE.Mesh(i%3?this.dustGeometry:this.geometry,i%3?this.dustMaterial:this.materials[i%3]);mesh.visible=false;scene.add(mesh);return {mesh,life:0,total:1,v:new THREE.Vector3(),size:.1};});
  }
  key(x,z){return `${Math.floor(x/8)},${Math.floor(z/8)}`;}
  index(r){const key=this.key(r.x,r.z);if(r.key===key)return;if(r.key)this.grid.get(r.key)?.delete(r);if(!this.grid.has(key))this.grid.set(key,new Set());this.grid.get(key).add(r);r.key=key;}
  nearby(x,z,reach){const found=[];for(let i=Math.floor((x-reach)/8);i<=Math.floor((x+reach)/8);i++)for(let j=Math.floor((z-reach)/8);j<=Math.floor((z+reach)/8);j++){const bucket=this.grid.get(`${i},${j}`);if(bucket)found.push(...bucket);}return found;}
  addRock(x,z,radius){
    const group=new THREE.Group();group.position.set(x,this.height(x,z)+radius*.52,z);this.scene.add(group);
    const mesh=new THREE.Mesh(this.geometry,this.materials[this.rocks.length%3]);mesh.scale.setScalar(radius);mesh.rotation.set(.12,.7*this.rocks.length,.08);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
    const cracks=new THREE.Group();mesh.add(cracks);cracks.visible=false;
    // Share two surface-following crack meshes across all rock instances.
    if(this.crackTemplate){for(const seam of this.crackTemplate.children)cracks.add(seam.clone());}
    else {
    const ray=new THREE.Raycaster(),surface=new THREE.Mesh(this.geometry,this.materials[0]),directions=[[-.6,.8,.5],[0,.45,1],[.15,-.05,1],[.6,-.6,.6],[.95,-.7,0]];
    for(const mirror of [-1,1]){
      const points=[];
      for(let segment=1;segment<directions.length;segment++)for(let sample=0;sample<=6;sample++){
        const a=new THREE.Vector3(...directions[segment-1]),b=new THREE.Vector3(...directions[segment]);
        const dir=a.lerp(b,sample/6);dir.x*=mirror;dir.normalize();ray.set(dir.clone().multiplyScalar(3),dir.clone().negate());
        const hit=ray.intersectObject(surface)[0];points.push(hit?hit.point.multiplyScalar(1.025):dir);
      }
      const curve=new THREE.Curve();curve.getPoint=(t,target=new THREE.Vector3())=>{const scaled=t*(points.length-1),i=Math.min(points.length-2,Math.floor(scaled));return target.copy(points[i]).lerp(points[i+1],scaled-i);};
      const geometry=new THREE.TubeGeometry(curve,72,.021,5,false);this.crackGeometries.add(geometry);cracks.add(new THREE.Mesh(geometry,this.crackMaterial));
    }
    this.crackTemplate=cracks;
    }
    const r={group,mesh,cracks,x,z,spawnX:x,spawnZ:z,r:radius,state:'INTACT',elapsed:0,lastHit:-Infinity,wobble:0,v:new THREE.Vector3(),key:null};
    this.rocks.push(r);this.index(r);return r;
  }
  setVehicles(vehicles){this.vehicles=vehicles;}
  occupied(x,z,radius){return this.vehicles.some(v=>!v.airborne&&this.contact(x,z,radius+.2,v.position,v.heading,v.bounds));}
  contact(x,z,radius,position,heading,bounds){
    const fx=Math.sin(heading),fz=Math.cos(heading);
    const offset=clamp((x-position.x)*fx+(z-position.z)*fz,bounds.rear,bounds.front);
    const dx=position.x+fx*offset-x,dz=position.z+fz*offset-z,d=Math.hypot(dx,dz);
    return d<bounds.radius+radius?{nx:d>1e-8?dx/d:-fx,nz:d>1e-8?dz/d:-fz,depth:bounds.radius+radius-d}:null;
  }
  resolveMovement(position,previousX,previousZ,heading,speed,dt,bounds,{baseMaxSpeed,rockCrackSpeedPercent=25,rockBreakSpeedPercent=55}){
    if(dt<=0)return speed;
    let vx=(position.x-previousX)/dt,vz=(position.z-previousZ)/dt,result=speed;
    const reach=Math.max(Math.abs(bounds.rear),Math.abs(bounds.front))+bounds.radius+3;
    const nearby=this.nearby(position.x,position.z,reach);
    for(let pass=0;pass<4;pass++)for(const rock of nearby){
      if(!solid(rock))continue;
      const c=this.contact(rock.x,rock.z,rock.r*.85,position,heading,bounds);if(!c)continue;
      const normalSpeed=Math.max(0,-vx*c.nx-vz*c.nz);
      if(rock.r<=this.config.smallRockRadius){
        if(normalSpeed>.01){rock.v.x-=c.nx*Math.min(5,normalSpeed*.6);rock.v.z-=c.nz*Math.min(5,normalSpeed*.6);this.active.add(rock);}
        // Small rocks yield to the vehicle even when moving slowly.
        rock.x-=c.nx*(c.depth+.01);rock.z-=c.nz*(c.depth+.01);this.place(rock);this.index(rock);
        if(normalSpeed>.2&&this.time-rock.lastHit>this.config.hitCooldownSeconds)this.hit(rock,c,normalSpeed,'bump');
        continue;
      }
      const resistance=this.config.resistanceMultiplier*(rock.r>=this.config.largeRockRadius?this.config.largeRockResistance:1);
      const crack=baseMaxSpeed*clamp(rockCrackSpeedPercent,0,100)/100*resistance;
      const breaking=Math.max(crack,baseMaxSpeed*clamp(rockBreakSpeedPercent,0,100)/100*resistance);
      const ready=this.time-rock.lastHit>this.config.hitCooldownSeconds;
      if(normalSpeed>.001&&ready&&(normalSpeed+1e-8>=breaking||(rock.state==='CRACKED'&&normalSpeed+1e-8>=crack))){
        this.shatter(rock,-c.nx,-c.nz,normalSpeed);result*=.85;vx*=.85;vz*=.85;continue;
      }
      if(normalSpeed>.2&&ready){const kind=normalSpeed+1e-8>=crack?'crack':'bump';if(kind==='crack'){rock.state='CRACKED';rock.cracks.visible=true;}this.hit(rock,c,normalSpeed,kind);}
      position.x+=c.nx*(c.depth+.001);position.z+=c.nz*(c.depth+.001);
      const inward=vx*c.nx+vz*c.nz;if(inward<0){vx-=inward*c.nx;vz-=inward*c.nz;
        const approach=normalSpeed/Math.max(.001,Math.abs(speed));
        if(approach>.72)result=-Math.sign(speed)*Math.min(1.3,normalSpeed*.1);else result=speed*Math.max(.4,Math.sqrt(Math.max(0,1-approach*approach)));
      }
    }
    for(const f of this.fragments){if(!f.active||f.age>this.config.respawnSeconds)continue;const c=this.contact(f.mesh.position.x,f.mesh.position.z,f.r,position,heading,bounds);if(!c)continue;
      f.mesh.position.x-=c.nx*(c.depth+.01);f.mesh.position.z-=c.nz*(c.depth+.01);f.v.x-=c.nx*Math.min(3,Math.abs(speed)*.3);f.v.z-=c.nz*Math.min(3,Math.abs(speed)*.3);
    }
    return result;
  }
  hit(r,c,strength,kind){r.lastHit=this.time;r.wobble=.16;r.wobbleX=-c.nz;r.wobbleZ=c.nx;this.active.add(r);this.puff(r.x,r.group.position.y,r.z,kind==='crack'?14:5);this.onImpact(strength,kind);}
  puff(x,y,z,count){for(let i=0;i<count;i++){const p=this.dust[this.nextDust++%this.dust.length];p.life=p.total=.5+Math.random()*.6;p.size=.06+Math.random()*.14;p.mesh.visible=true;p.mesh.position.set(x,y,z);p.v.set((Math.random()-.5)*2,1+Math.random(),(Math.random()-.5)*2);}}
  shatter(r,dx,dz,strength){
    if(!solid(r))return;r.state='BROKEN';r.elapsed=0;r.group.visible=false;r.lastHit=this.time;this.active.add(r);this.puff(r.x,r.group.position.y,r.z,24);this.onImpact(strength,'break');
    const count=clamp(Math.round(this.config.fragmentCount),3,6);
    for(let i=0;i<count;i++){
      const f=this.fragments.find(f=>!f.active)||this.fragments[this.nextFragment++%this.fragments.length];
      f.active=true;f.owner=r;f.age=0;f.r=r.r*(.26+Math.random()*.12);f.mesh.visible=true;f.mesh.scale.setScalar(f.r);
      const a=i*Math.PI*2/count;f.mesh.position.set(r.x+Math.cos(a)*r.r*.3,r.group.position.y+(i%2)*r.r*.2,r.z+Math.sin(a)*r.r*.3);
      f.v.set(dx*Math.min(4,strength*.18)+Math.cos(a)*1.8,2+Math.random()*2,dz*Math.min(4,strength*.18)+Math.sin(a)*1.8);f.spin.set(Math.random()*3,Math.random()*2,Math.random()*3);
    }
  }
  place(r){r.group.position.set(r.x,this.height(r.x,r.z)+r.r*.52,r.z);}
  integrateBody(position,v,r,dt,bounce){
    v.clampLength(0,8);
    position.addScaledVector(v,dt);v.y-=9*dt;
    const floor=this.height(position.x,position.z)+r*.65;
    if(position.y<=floor){position.y=floor;v.y=Math.abs(v.y)>.7?-v.y*bounce:0;
      const e=.35,gx=(this.height(position.x+e,position.z)-this.height(position.x-e,position.z))/(2*e),gz=(this.height(position.x,position.z+e)-this.height(position.x,position.z-e))/(2*e);
      v.x-=gx*3*dt;v.z-=gz*3*dt;v.x*=Math.exp(-2.4*dt);v.z*=Math.exp(-2.4*dt);
      if(Math.hypot(v.x,v.z)<.05&&Math.hypot(gx,gz)<.12)v.x=v.z=0;
    }
    v.clampLength(0,8);
  }
  update(dt){
    this.time+=dt;const steps=Math.max(1,Math.ceil(dt/.025)),h=dt/steps;
    for(const r of this.active){
      if(r.state==='BROKEN'){
        r.elapsed+=dt;if(r.elapsed>=this.config.respawnSeconds&&!this.occupied(r.spawnX,r.spawnZ,r.r*.85)){r.state='REFORMING';r.elapsed=0;r.x=r.spawnX;r.z=r.spawnZ;r.v.set(0,0,0);this.place(r);this.index(r);r.group.visible=true;r.group.scale.setScalar(.01);r.cracks.visible=false;this.puff(r.x,r.group.position.y,r.z,9);}
      }else if(r.state==='REFORMING'){
        if(this.occupied(r.x,r.z,r.r*.85)){r.state='BROKEN';r.elapsed=this.config.respawnSeconds;r.group.visible=false;continue;}
        r.elapsed+=dt;const t=clamp(r.elapsed/Math.max(.01,this.config.reformSeconds),0,1);r.group.scale.setScalar(Math.max(.01,1-Math.pow(1-t,3)+Math.sin(t*Math.PI)*.12));
        if(t===1){r.state='INTACT';r.group.scale.setScalar(1);r.group.rotation.set(0,0,0);this.active.delete(r);}
      }else{
        if(r.r<=this.config.smallRockRadius&&r.v.lengthSq()>.001){
          for(let i=0;i<steps;i++)this.integrateBody(r.group.position,r.v,r.r,h,.15);
          r.x=r.group.position.x;r.z=r.group.position.z;r.mesh.rotation.x+=r.v.z*dt/r.r;r.mesh.rotation.z-=r.v.x*dt/r.r;this.index(r);
        }
        if(r.wobble>0){r.wobble=Math.max(0,r.wobble-dt);const angle=Math.sin((.16-r.wobble)*45)*r.wobble;r.group.rotation.x=angle*(r.wobbleX||0);r.group.rotation.z=angle*(r.wobbleZ||0);}
        if(r.wobble===0){r.group.rotation.set(0,0,0);if(r.v.lengthSq()<.001)this.active.delete(r);}
      }
    }
    for(const f of this.fragments){if(!f.active)continue;f.age+=dt;
      for(let i=0;i<steps;i++)this.integrateBody(f.mesh.position,f.v,f.r,h,clamp(this.config.bounceStrength,0,.7));
      f.mesh.rotation.x+=(f.spin.x+f.v.z)*dt;f.mesh.rotation.z+=(f.spin.z-f.v.x)*dt;f.spin.multiplyScalar(Math.exp(-dt*1.6));
      const fade=clamp((this.config.respawnSeconds-f.age)/1.2,0,1);f.mesh.scale.setScalar(f.r*fade);
      if(fade===0){f.active=false;f.mesh.visible=false;f.owner=null;}
    }
    for(const p of this.dust){if(p.life<=0)continue;p.life-=dt;p.mesh.visible=p.life>0;if(!p.mesh.visible)continue;p.mesh.position.addScaledVector(p.v,dt);p.v.y-=1.5*dt;p.mesh.scale.setScalar(p.size*Math.sin(Math.PI*p.life/p.total));}
  }
  dispose(){if(this.disposed)return;this.disposed=true;for(const r of this.rocks)r.group.removeFromParent();for(const f of this.fragments)f.mesh.removeFromParent();for(const p of this.dust)p.mesh.removeFromParent();this.geometry.dispose();this.dustGeometry.dispose();for(const g of this.crackGeometries)g.dispose();for(const m of [...this.materials,this.crackMaterial,this.dustMaterial])m.dispose();this.active.clear();this.grid.clear();this.vehicles=[];this.rocks.length=0;}
}
