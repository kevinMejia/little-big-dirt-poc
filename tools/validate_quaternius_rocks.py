"""Validate Blender output against the preserved OBJ/MTL/texture sources."""
from pathlib import Path
import hashlib, json, struct

root=Path(__file__).resolve().parents[1]
source=root/'assets/source/rocks/quaternius'
target=root/'assets/models/rocks/quaternius'
manifest=json.loads((target/'manifest.json').read_text())
assert manifest['blender'].startswith('4.5')
assert (root/'assets/blender/rocks/quaternius_rocks.blend').read_bytes().startswith(b'BLENDER')
assert hashlib.sha256((source/'Rocks_Diffuse.png').read_bytes()).digest()==hashlib.sha256((target/'Rocks_Diffuse.png').read_bytes()).digest()
for model in manifest['models']:
    name=model['name'];obj=(source/f'{name}.obj').read_text()
    assert 'Rocks_Diffuse.png' in (source/f'{name}.mtl').read_text()
    source_uvs={(float(l.split()[1]),1-float(l.split()[2])) for l in obj.splitlines() if l.startswith('vt ')}
    raw=(target/f'{name}.glb').read_bytes()
    assert struct.unpack_from('<4sII',raw)==(b'glTF',2,len(raw))
    length=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+length]);binary=28+length
    assert len(g['materials'])==1 and len(g['images'])==1
    assert g['images'][0]['uri']=='Rocks_Diffuse.png'
    assert not g.get('extensionsRequired') and not g.get('cameras')
    exported_uvs=set();triangles=0
    for mesh in g['meshes']:
        for p in mesh['primitives']:
            assert 'NORMAL' in p['attributes'] and 'TEXCOORD_0' in p['attributes']
            a=g['accessors'][p['attributes']['TEXCOORD_0']];view=g['bufferViews'][a['bufferView']]
            for i in range(a['count']):
                uv=struct.unpack_from('<2f',raw,binary+view.get('byteOffset',0)+a.get('byteOffset',0)+i*view.get('byteStride',8))
                exported_uvs.add(uv)
            position=g['accessors'][p['attributes']['POSITION']]
            assert abs(position['min'][1])<1e-6
            triangles+=g['accessors'][p['indices']]['count']//3
    # glTF's UV origin flips V relative to OBJ; all source coordinates survive.
    for first,second in [(source_uvs,exported_uvs),(exported_uvs,source_uvs)]:
        assert all(any(abs(u-x)+abs(v-y)<1e-6 for x,y in second) for u,v in first),(name,'UV coordinates changed')
    assert triangles==sum(len(l.split())-3 for l in obj.splitlines() if l.startswith('f '))==model['triangles']
    assert triangles<600
print('PASS: three Blender GLBs, original UVs/triangle counts, base pivots, one material and byte-identical shared Rocks_Diffuse texture; editable Blender and OBJ/MTL sources retained.')
