"""Package the kit's Blender glTF exports without losing vertex colors or materials.

OBJ/MTL is inspected for bounds and texture references; glTF retains additional
vertex colors and alpha-mask settings. No Blender install or runtime decoder needed.
"""
from pathlib import Path
import json, struct, sys, shutil
from PIL import Image

source=Path(sys.argv[1])
root=Path(__file__).resolve().parents[1]
out=root/'assets/models/trees/pines'
out.mkdir(parents=True,exist_ok=True)
report=[]
for i in range(1,6):
    name=f'Pine_{i}'
    verts=[list(map(float,line.split()[1:4])) for line in (source/'OBJ'/f'{name}.obj').read_text().splitlines() if line.startswith('v ')]
    lo=[min(v[k] for v in verts) for k in range(3)]
    hi=[max(v[k] for v in verts) for k in range(3)]
    g=json.loads((source/'glTF'/f'{name}.gltf').read_text())
    positions=[g['accessors'][p['attributes']['POSITION']] for p in g['meshes'][0]['primitives']]
    low=[min(a['min'][k] for a in positions) for k in range(3)]
    high=[max(a['max'][k] for a in positions) for k in range(3)]
    # Move only the base vertically. X/Z origin is the authored trunk axis,
    # rather than the asymmetrical foliage bounding-box center.
    g['nodes'][0]['translation']=[0,-low[1],0]
    binary=(source/'glTF'/g['buffers'][0].pop('uri')).read_bytes()
    for image in g['images']:
        target=out/image['uri']
        if not target.exists():
            im=Image.open(source/'glTF'/image['uri'])
            im.thumbnail((512,512),Image.Resampling.LANCZOS)
            im.save(target,optimize=True)
    payload=json.dumps(g,separators=(',',':')).encode()
    payload+=b' '*((-len(payload))%4)
    binary+=b'\0'*((-len(binary))%4)
    raw=struct.pack('<4sII',b'glTF',2,28+len(payload)+len(binary))+struct.pack('<II',len(payload),0x4e4f534a)+payload+struct.pack('<II',len(binary),0x004e4942)+binary
    (out/f'{name}.glb').write_bytes(raw)
    report.append(dict(name=name,width=high[0]-low[0],height=high[1]-low[1],depth=high[2]-low[2],originalMin=low,originalMax=high,objMin=lo,objMax=hi,triangles=sum(g['accessors'][p['indices']]['count']//3 for p in g['meshes'][0]['primitives']),materials=[m['name'] for m in g['materials']],unit='glTF meters; OBJ has no unit metadata',baseCorrection=-low[1]))
shutil.copyfile(source/'License_Standard.txt',out/'License_Standard.txt')
(out/'dimensions.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
