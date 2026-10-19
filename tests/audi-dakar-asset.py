"""Validate Dakar export against the untouched source GLB (stdlib only)."""
from pathlib import Path
import json,struct,math,hashlib
ROOT=Path(__file__).resolve().parents[1]
def load(name):
 raw=(ROOT/'assets'/name).read_bytes();n,t=struct.unpack_from('<II',raw,12);return json.loads(raw[20:20+n]),raw[28+n:]
def accessor(d,raw,i):
 a=d['accessors'][i];v=d['bufferViews'][a['bufferView']];fmt={5126:'f',5125:'I',5123:'H',5121:'B'}[a['componentType']];width={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];size=struct.calcsize('<'+fmt*width);stride=v.get('byteStride',size);start=v.get('byteOffset',0)+a.get('byteOffset',0);return [struct.unpack_from('<'+fmt*width,raw,start+i*stride) for i in range(a['count'])]
def multiply(a,b):return [sum(a[k*4+r]*b[c*4+k] for k in range(4)) for c in range(4) for r in range(4)]
IDENTITY=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]
def local(n):
 if 'matrix'in n:return n['matrix']
 x,y,z,w=n.get('rotation',[0,0,0,1]);sx,sy,sz=n.get('scale',[1,1,1]);tx,ty,tz=n.get('translation',[0,0,0]);return [(1-2*y*y-2*z*z)*sx,(2*x*y+2*z*w)*sx,(2*x*z-2*y*w)*sx,0,(2*x*y-2*z*w)*sy,(1-2*x*x-2*z*z)*sy,(2*y*z+2*x*w)*sy,0,(2*x*z+2*y*w)*sz,(2*y*z-2*x*w)*sz,(1-2*x*x-2*y*y)*sz,0,tx,ty,tz,1]
def inspect(d,raw):
 parents={c:i for i,n in enumerate(d['nodes']) for c in n.get('children',[])};cache={}
 def world(i):
  if i not in cache:cache[i]=multiply(world(parents[i]) if i in parents else IDENTITY,local(d['nodes'][i]))
  return cache[i]
 result={}
 for i,n in enumerate(d['nodes']):
  if 'mesh'not in n:continue
  matrix=world(i);points=[];triangles=0;uv=[]
  for p in d['meshes'][n['mesh']]['primitives']:
   for v in accessor(d,raw,p['attributes']['POSITION']):points.append(tuple(sum(matrix[c*4+r]*v[c] for c in range(3))+matrix[12+r] for r in range(3)))
   triangles+=d['accessors'][p['indices']]['count']//3;uv+=accessor(d,raw,p['attributes']['TEXCOORD_0'])
  result[n['name']]={'points':points,'triangles':triangles,'uvBounds':[min(v[k] for v in uv) for k in range(2)]+[max(v[k] for v in uv) for k in range(2)]}
 return result
source=ROOT/'assets/audi_rs_q_e-tron.glb';assert hashlib.sha256(source.read_bytes()).hexdigest()=='52aa2eea2f695058b1a576c750eaa318db26cf5d04800b4cee823530b7523e5f'
a,ar=load('audi_rs_q_e-tron.glb');b,br=load('audi_rs_q_e-tron_dakar.glb');old,new=inspect(a,ar),inspect(b,br);assert old.keys()==new.keys()
assert len(a['materials'])==len(b['materials'])==12
for name,src in old.items():
 dst=new[name];assert src['triangles']==dst['triangles'];assert max(abs(x-y) for x,y in zip(src['uvBounds'],dst['uvBounds']))<1e-5
 tolerance=2e-5;cells={}
 for p in src['points']:cells.setdefault(tuple(math.floor(x/tolerance) for x in p),[]).append(p)
 for p in dst['points']:
  k=tuple(math.floor(x/tolerance) for x in p);found=False
  for dx in [-1,0,1]:
   for dy in [-1,0,1]:
    for dz in [-1,0,1]:
     if any(math.dist(p,q)<tolerance for q in cells.get((k[0]+dx,k[1]+dy,k[2]+dz),[])):found=True;break
    if found:break
   if found:break
  assert found,(name,p)
assert sum(x['triangles'] for x in new.values())==66340
assert all('uri'not in im for im in b['images']);assert all('uri'not in bu for bu in b['buffers'])
assert (ROOT/'assets/audi-dakar/audi_rs_q_e-tron_dakar.blend').read_bytes().startswith(b'BLENDER')
print('PASS Dakar: original hash unchanged; all 19 mesh world geometries and UV bounds preserved; 66,340 triangles; 12 materials; self-contained textures; editable Blender project.')
