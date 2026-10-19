/** Shared UI dirt stamp. SVG user units: 120 x 120, center 60/60.
 * Static seeded paths keep the mark stable, crisp at every scale and cheap on mobile.
 * Embed behind content in its SVG; palette overrides allow reuse on other HUD surfaces.
 */
export function dirtSplatterSvg({seed=17,mud='#38251b',earth='#68442a',dust='#95643a'}={}){
 let state=seed>>>0;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const n=v=>v.toFixed(2);
 // Uneven angular spacing and short hooked contours avoid a scalloped badge edge.
 const blob=(cx,cy,rx,ry,rotation=0,points=9)=>{
  const vertices=[];
  for(let i=0;i<points;i++){
   const a=(i+random()*.48)*Math.PI*2/points,r=.65+random()*.55;
   const x=Math.cos(a)*rx*r,y=Math.sin(a)*ry*r;
   vertices.push([cx+x*Math.cos(rotation)-y*Math.sin(rotation),cy+x*Math.sin(rotation)+y*Math.cos(rotation)]);
  }
  let d=`M${n((vertices[0][0]+vertices.at(-1)[0])/2)} ${n((vertices[0][1]+vertices.at(-1)[1])/2)}`;
  vertices.forEach((v,i)=>{const next=vertices[(i+1)%points];d+=`Q${n(v[0])} ${n(v[1])} ${n((v[0]+next[0])/2)} ${n((v[1]+next[1])/2)}`;});
  return d+'Z';
 };
 let marks='';
 // Uneven pooled mud under the bezel, with torn islands rather than round beads.
 const edge=[];
 for(let i=0;i<94;i++){
  const a=i*Math.PI*2/94,r=48+2.8*Math.sin(a*5+.4)+1.6*Math.sin(a*11)+random()*2;
  edge.push([60+Math.cos(a)*r,60+Math.sin(a)*r]);
 }
 let contour=`M${n((edge[0][0]+edge.at(-1)[0])/2)} ${n((edge[0][1]+edge.at(-1)[1])/2)}`;
 edge.forEach((v,i)=>{const next=edge[(i+1)%edge.length];contour+=`Q${n(v[0])} ${n(v[1])} ${n((v[0]+next[0])/2)} ${n((v[1]+next[1])/2)}`;});
 marks+=`<path fill="${mud}" d="${contour}Z"/>`;
 // Tapered throws connect to the pooled edge; uneven lengths suggest an actual impact.
 marks+=`<path fill="${mud}" d="M23 34C18 32 16 27 13 25C10 23 8 25 12 29L20 41Z M34 20C31 16 33 12 30 9C28 7 27 9 28 12L29 23Z M15 67C10 68 7 64 5 66C3 69 9 71 16 73Z M26 96C22 99 21 106 17 109C15 113 19 114 22 110L32 100Z M85 101C88 106 87 110 90 113C93 115 93 111 91 108L91 99Z"/>`;
 // Directional spatters: long smears to the upper left, finer scatter on the right.
 for(let i=0;i<76;i++){
  const a=random()*Math.PI*2,r=48+random()*10;
  const x=60+Math.cos(a)*r,y=60+Math.sin(a)*r;
  const radius=i<18?1.2+random()*1.8:.35+random()*.85;
  if(x<3||x>117||y<3||y>117)continue;
  const fill=i%7===0?dust:i%3===0?earth:mud;
  marks+=`<path fill="${fill}" opacity="${n(.48+random()*.5)}" d="${blob(x,y,radius,radius*(.5+random()*.8),a,7)}"/>`;
 }
 // Dry, broken scuffs at the exposed outer edge, concentrated on one side.
 for(let i=0;i<23;i++){
  const a=2.6+random()*2.8,r=47+random()*4;
  marks+=`<path fill="${earth}" opacity=".55" d="${blob(60+Math.cos(a)*r,60+Math.sin(a)*r,.4+random()*.7,1+random()*1.8,a)}"/>`;
 }
 return `<g class="ui-dirt-splatter" aria-hidden="true">${marks}</g>`;
}
