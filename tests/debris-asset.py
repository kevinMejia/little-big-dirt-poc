"""Check actual Blender export contract, origins, budgets and self containment."""
import json, struct
from pathlib import Path
root=Path(__file__).resolve().parents[1]
folder=root/'assets/models/debris'
raw=(folder/'debris.glb').read_bytes()
assert raw[:4]==b'glTF' and struct.unpack_from('<I',raw,8)[0]==len(raw)
length=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+length])
assert 'Blender' in g['asset']['generator']
assert not any('uri' in b for b in g['buffers']) and not g.get('images')
assert len(g['materials'])==2
expected={f'{k}_{v}' for k in ['smallRock','mediumRock','gravel','twig','branch','log','fragment','splinter'] for v in range(3)}
assert {n['name'] for n in g['nodes']}==expected
triangles=0
for n in g['nodes']:
    assert not n.get('translation') and not n.get('rotation') and not n.get('scale'),n
    assert n['extras']['collision']=='none'
    primitives=g['meshes'][n['mesh']]['primitives'];assert len(primitives)==1
    p=primitives[0];a=g['accessors'][p['attributes']['POSITION']]
    assert abs(a['min'][1])<1e-5,(n['name'],a['min'])
    assert max(a['max'])<3 and min(a['min'])> -3
    triangles+=g['accessors'][p['indices']]['count']//3
assert triangles<2500 and len(raw)<150000
assert (folder/'debris.blend').read_bytes().startswith(b'BLENDER')
print(f'PASS Blender GLB: 24 grounded meshes, 2 materials, {triangles} triangles, {len(raw)} bytes, no external resources.')
