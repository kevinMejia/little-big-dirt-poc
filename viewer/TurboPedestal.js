import * as THREE from 'three';

// The approved showroom pedestal, shared unchanged with main-world pickups.
export const turboPedestalTop=.46;
export function createTurboPedestal(materials=[]){
 const group=new THREE.Group();
 const pedestalTop=turboPedestalTop;
 const material=(color,metalness,roughness)=>{const m=new THREE.MeshStandardMaterial({color,metalness,roughness});materials.push(m);return m;};
 const base=new THREE.Mesh(new THREE.CylinderGeometry(1.95,2.08,.32,80),material('#344f49',.5,.38));base.position.y=.16;base.castShadow=base.receiveShadow=true;group.add(base);
 const top=new THREE.Mesh(new THREE.CylinderGeometry(1.88,1.95,.14,80),material('#5c7569',.38,.35));top.position.y=.39;top.receiveShadow=true;group.add(top);
 const lightMaterial=new THREE.MeshBasicMaterial({color:'#85d7ca'});materials.push(lightMaterial);const edge=new THREE.Mesh(new THREE.TorusGeometry(1.92,.018,8,100),lightMaterial);edge.rotation.x=Math.PI/2;edge.position.y=.32;group.add(edge);
 const detail=new THREE.Mesh(new THREE.RingGeometry(1.3,1.31,80),material('#a3b19c',.5,.4));detail.rotation.x=-Math.PI/2;detail.position.y=pedestalTop+.003;group.add(detail);
 return group;
}
