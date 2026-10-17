"""Validate the review GLB without requiring Blender or third-party packages."""
from pathlib import Path
import json, math, struct, sys
root=Path(__file__).resolve().parents[1]
p=root/('assets/dirty/candidate/dirty.glb' if '--candidate' in sys.argv else 'assets/dirty/dirty.glb');data=p.read_bytes()
magic,version,total=struct.unpack_from('<4sII',data)
assert magic==b'glTF' and version==2 and total==len(data)
length,kind=struct.unpack_from('<II',data,12);assert kind==0x4E4F534A
gltf=json.loads(data[20:20+length]);manifest=json.loads((p.parent/'manifest.json').read_text())
nodes={n['name']:n for n in gltf['nodes']};indices={n['name']:i for i,n in enumerate(gltf['nodes'])}
assert 'Dirty' in nodes and not gltf.get('cameras')
for wheel in manifest['wheels']:
 assert wheel['steer'] in nodes and wheel['spin'] in nodes
 assert indices[wheel['spin']] in nodes[wheel['steer']].get('children',[])
for name in manifest['jointLimits']:assert name in nodes
for hydraulic in manifest['hydraulics']:
 for key in ['a','b','barrel','rod']:assert hydraulic[key] in nodes
chain=['RearSwingPivot','RearBoomPivot','RearStickPivot','RearBucketPivot']
for parent,child in zip(chain,chain[1:]):assert indices[child] in nodes[parent]['children']
assert indices['FrontBucketPivot'] in nodes['FrontLoaderPivot']['children']
assert 'Windshield_single_curved' in nodes and 'Rear_window' in nodes
assert any('side_window' in n for n in nodes)
binary_start=20+length+8
for accessor in gltf['accessors']:
 if accessor['componentType']!=5126:continue
 components={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[accessor['type']]
 view=gltf['bufferViews'][accessor['bufferView']];stride=view.get('byteStride',components*4)
 for i in range(accessor['count']):
  offset=binary_start+view.get('byteOffset',0)+accessor.get('byteOffset',0)+stride*i
  assert all(math.isfinite(v) for v in struct.unpack_from('<'+'f'*components,data,offset))
assert manifest['triangles']<75000 and len(data)<3_000_000
assert (p.parent/'dirty.blend').read_bytes().startswith(b'BLENDER')
print('PASS: valid Blender/GLB files, complete wheel/joint/hydraulic hierarchy, all windows, finite exported geometry, no studio export, <75k triangles and <3 MB.')
