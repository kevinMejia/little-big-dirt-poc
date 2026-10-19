// Index actual rendered triangles once, then barycentrically interpolate locally.
export function terrainSampler(positions,indices,cellSize=8){
  const grid=new Map();
  for(let i=0;i<indices.length;i+=3){const ids=[indices[i]*3,indices[i+1]*3,indices[i+2]*3],v=ids.map(j=>[positions[j],positions[j+1],positions[j+2]]);
    for(let x=Math.floor(Math.min(...v.map(p=>p[0]))/cellSize);x<=Math.floor(Math.max(...v.map(p=>p[0]))/cellSize);x++)for(let z=Math.floor(Math.min(...v.map(p=>p[2]))/cellSize);z<=Math.floor(Math.max(...v.map(p=>p[2]))/cellSize);z++){const key=x+','+z;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(v);}}
  return (x,z)=>{for(const [a,b,c] of grid.get(Math.floor(x/cellSize)+','+Math.floor(z/cellSize))??[]){const denominator=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);if(Math.abs(denominator)<1e-10)continue;const u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/denominator,v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/denominator;if(u< -1e-7||v< -1e-7||u+v>1+1e-7)continue;const ab=b.map((n,i)=>n-a[i]),ac=c.map((n,i)=>n-a[i]);let normal=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];const length=Math.hypot(...normal)*(normal[1]<0?-1:1);normal=normal.map(n=>n/length);return {y:u*a[1]+v*b[1]+(1-u-v)*c[1],normal};}return null;};
}
