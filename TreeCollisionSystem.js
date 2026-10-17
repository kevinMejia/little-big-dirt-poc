import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
import {treeConfig} from './VehicleConfig.js';

/** Static trunk colliders; visual spring motion never moves the collider.
 * Vehicle bounds are overlapping circles along the vehicle's longitudinal axis.
 */
export class TreeCollisionSystem {
  constructor(scene,{groundHeight=()=>0,onImpact=()=>{},particleLimit=96,config=treeConfig}={}) {
    this.scene=scene;this.groundHeight=groundHeight;this.onImpact=onImpact;
    this.grid=new Map();this.active=new Set();this.trees=[];this.time=0;this.cellSize=8;
    this.leafGeometry=new THREE.OctahedronGeometry(.13,0);
    this.leafMaterials=[0x4e9f43,0x83bd45,0xb4cd55,0x2c8051].map(color=>new THREE.MeshStandardMaterial({color,roughness:1}));
    this.particles=Array.from({length:particleLimit},(_,i)=>{const mesh=new THREE.Mesh(this.leafGeometry,this.leafMaterials[i%4]);mesh.visible=false;scene.add(mesh);return {mesh,life:0,v:new THREE.Vector3(),phase:i*2.4};});
    this.nextParticle=0;
    this.config=config;this.vehicles=[];
  }
  key(x,z){return `${Math.floor(x/this.cellSize)},${Math.floor(z/this.cellSize)}`;}
  addTree(group,radius,foliageHeight=3){
    const t={group,x:group.position.x,z:group.position.z,radius,foliageHeight,rx:0,rz:0,vx:0,vz:0,lastHit:-Infinity,state:'IDLE',elapsed:0,axis:new THREE.Vector3(),fallStart:new THREE.Quaternion()};
    this.trees.push(t);const key=this.key(t.x,t.z);if(!this.grid.has(key))this.grid.set(key,[]);this.grid.get(key).push(t);return t;
  }
  nearby(x,z,reach){const found=[];for(let ix=Math.floor((x-reach)/8);ix<=Math.floor((x+reach)/8);ix++)for(let iz=Math.floor((z-reach)/8);iz<=Math.floor((z+reach)/8);iz++){const bucket=this.grid.get(`${ix},${iz}`);if(bucket)found.push(...bucket);}return found;}

  move(position,heading,speed,dt,{radius=1.2,rear=-1.6,front=2.6}={},knockdown={}) {
    if(dt<=0)return speed;
    const fx=Math.sin(heading),fz=Math.cos(heading),distance=speed*dt;
    const steps=Math.max(1,Math.ceil(Math.abs(distance)/.18));
    let dx=fx*distance/steps,dz=fz*distance/steps,resultSpeed=speed;
    const offsets=[],count=Math.ceil((front-rear)/.6);
    for(let i=0;i<=count;i++)offsets.push(rear+(front-rear)*i/count);
    const candidates=this.nearby(position.x,position.z,Math.max(Math.abs(rear),Math.abs(front))+radius+Math.abs(distance)+1);
    let bounced=false;
    for(let step=0;step<steps;step++){
      position.x+=dx;position.z+=dz;
      // Several passes resolve contacts at adjacent trunks and circle joins.
      for(let pass=0;pass<8;pass++){
        let overlap=false;
        for(const tree of candidates)for(const offset of offsets){
          if(tree.state!=='IDLE'&&tree.state!=='WOBBLING')continue;
          const cx=position.x+fx*offset,cz=position.z+fz*offset;
          let nx=cx-tree.x,nz=cz-tree.z;const dist=Math.hypot(nx,nz),limit=radius+tree.radius;
          if(dist>=limit)continue;
          if(dist<1e-8){nx=-fx*(Math.sign(speed)||1);nz=-fz*(Math.sign(speed)||1);}else{nx/=dist;nz/=dist;}
          const inward=dx*nx+dz*nz;
          const impact=Math.max(0,-inward/(dt/steps));
          const threshold=(knockdown.baseMaxSpeed??Infinity)*THREE.MathUtils.clamp(knockdown.treeKnockdownSpeedPercent??100,0,100)/100;
          if(impact>.001&&impact+1e-8>=threshold){
            this.knockDown(tree,-nx,-nz,impact);
            dx*=.88;dz*=.88;resultSpeed*=.88;
            continue;
          }
          overlap=true;
          const push=limit-dist+.001;position.x+=nx*push;position.z+=nz*push;
          if(inward<0){
            const approach=Math.max(0,-(fx*nx+fz*nz)*Math.sign(speed));
            if(impact>.25&&this.time-tree.lastHit>.65)this.react(tree,-nx,-nz,impact);
            // Remove only the component into the trunk: glancing hits slide.
            dx-=inward*nx;dz-=inward*nz;
            if(!bounced&&impact>.25){
              if(approach>.72){resultSpeed=-Math.sign(speed)*Math.min(1.6,impact*.13);bounced=true;}
              else resultSpeed=speed*Math.max(.35,Math.sqrt(1-approach*approach));
            }
          }
        }
        if(!overlap)break;
      }
    }
    return resultSpeed;
  }

  react(tree,dx,dz,strength){
    if(tree.state!=='IDLE'&&tree.state!=='WOBBLING')return;
    tree.state='WOBBLING';
    tree.lastHit=this.time;const impulse=THREE.MathUtils.clamp(strength*.17,.18,2.6);
    tree.vx+=dz*impulse;tree.vz-=dx*impulse;this.active.add(tree);
    this.emitLeaves(tree,dx,dz,strength);
    this.onImpact(strength,'wobble');
  }

  emitLeaves(tree,dx,dz,strength){
    const count=strength<3?5:strength<9?13:25;
    tree.group.updateWorldMatrix(true,false);
    const origin=tree.group.localToWorld(new THREE.Vector3(0,tree.foliageHeight,0));
    for(let i=0;i<count;i++){
      const p=this.particles[this.nextParticle++%this.particles.length];
      p.life=1.5+Math.random()*1.2;p.mesh.visible=true;
      p.mesh.position.set(origin.x+(Math.random()-.5),origin.y,origin.z+(Math.random()-.5));
      p.v.set(dx*(.5+strength*.08)+(Math.random()-.5)*2,1+Math.random()*2,dz*(.5+strength*.08)+(Math.random()-.5)*2);
      p.mesh.scale.set(1,.35,1.6);p.mesh.rotation.set(Math.random()*3,Math.random()*3,0);
    }
  }

  knockDown(tree,dx,dz,strength){
    if(tree.state!=='IDLE'&&tree.state!=='WOBBLING')return;
    tree.state='FALLING';tree.elapsed=0;tree.lastHit=this.time;tree.fallLeaves=false;
    tree.fallStart.copy(tree.group.quaternion);tree.axis.set(dz,0,-dx).normalize();
    tree.vx=tree.vz=0;this.active.add(tree);
    this.emitLeaves(tree,dx,dz,Math.max(10,strength));this.onImpact(strength,'fall');
  }

  setVehicles(vehicles){this.vehicles=vehicles;}
  occupied(tree){
    for(const v of this.vehicles){
      if(v.airborne)continue;
      const fx=Math.sin(v.heading),fz=Math.cos(v.heading),b=v.bounds;
      const projection=THREE.MathUtils.clamp((tree.x-v.position.x)*fx+(tree.z-v.position.z)*fz,b.rear,b.front);
      if(Math.hypot(tree.x-v.position.x-fx*projection,tree.z-v.position.z-fz*projection)<tree.radius+b.radius+.2)return true;
    }
    return false;
  }

  updateKnockdown(t,dt){
    t.elapsed+=dt;
    const angle=Math.PI*87/180;
    if(t.state==='FALLING'){
      const progress=Math.min(1,t.elapsed/Math.max(.01,this.config.fallDurationSeconds));
      const target=new THREE.Quaternion().setFromAxisAngle(t.axis,angle);
      t.group.quaternion.slerpQuaternions(t.fallStart,target,progress*progress);
      if(progress>.5&&!t.fallLeaves){t.fallLeaves=true;this.emitLeaves(t,-t.axis.z,t.axis.x,10);}
      if(progress===1){t.state='FALLEN';t.elapsed=0;}
    }else if(t.state==='FALLEN'){
      const bounce=.09*Math.sin(t.elapsed*17)*Math.exp(-t.elapsed*6);
      t.group.quaternion.setFromAxisAngle(t.axis,angle-Math.abs(bounce));
      if(t.elapsed>=this.config.recoveryDelaySeconds&&!this.occupied(t)){t.state='RECOVERING';t.elapsed=0;}
    }else if(t.state==='RECOVERING'){
      if(this.occupied(t)){t.state='FALLEN';t.elapsed=this.config.recoveryDelaySeconds;t.group.quaternion.setFromAxisAngle(t.axis,angle);return;}
      const progress=Math.min(1,t.elapsed/Math.max(.01,this.config.recoveryDurationSeconds));
      const eased=progress*progress*(3-2*progress);
      const bounce=progress>.75?.055*Math.sin((progress-.75)/.25*Math.PI*2)*Math.sin((progress-.75)/.25*Math.PI):0;
      t.group.quaternion.setFromAxisAngle(t.axis,angle*(1-eased)+bounce);
      if(progress===1){t.group.quaternion.identity();t.rx=t.rz=t.vx=t.vz=0;t.state='IDLE';t.lastHit=this.time;this.active.delete(t);}
    }
  }

  update(dt){
    this.time+=dt;
    const steps=Math.max(1,Math.ceil(dt/(1/120))),h=dt/steps;
    for(const t of this.active){
      if(t.state!=='WOBBLING'){this.updateKnockdown(t,dt);continue;}
      for(let i=0;i<steps;i++){
        t.vx+=(-22*t.rx-3.6*t.vx)*h;t.vz+=(-22*t.rz-3.6*t.vz)*h;
        t.rx+=t.vx*h;t.rz+=t.vz*h;
        const tilt=Math.hypot(t.rx,t.rz);
        if(tilt>.48){t.rx*=.48/tilt;t.rz*=.48/tilt;t.vx*=.8;t.vz*=.8;}
      }
      t.group.rotation.x=t.rx;t.group.rotation.z=t.rz;
      if(Math.abs(t.rx)+Math.abs(t.rz)+Math.abs(t.vx)+Math.abs(t.vz)<.002){t.group.rotation.x=t.group.rotation.z=0;t.rx=t.rz=t.vx=t.vz=0;t.state='IDLE';this.active.delete(t);}
    }
    for(const p of this.particles){if(p.life<=0)continue;p.life-=dt;if(p.life<=0){p.mesh.visible=false;continue;}
      p.v.y-=1.6*dt;p.mesh.position.addScaledVector(p.v,dt);p.mesh.position.x+=Math.sin(this.time*4+p.phase)*dt*.35;
      p.mesh.rotation.x+=dt*2;p.mesh.rotation.z+=dt*1.5;
      const fade=Math.min(1,p.life*2);p.mesh.scale.set(fade,fade*.35,fade*1.6);
      if(p.mesh.position.y<this.groundHeight(p.mesh.position.x,p.mesh.position.z)+.08){p.life=0;p.mesh.visible=false;}
    }
  }
  dispose(){for(const p of this.particles)p.mesh.removeFromParent();this.leafGeometry.dispose();for(const m of this.leafMaterials)m.dispose();for(const t of this.active)t.group.rotation.set(0,0,0);this.active.clear();this.grid.clear();this.trees.length=0;}
}
