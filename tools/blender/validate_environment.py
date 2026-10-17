"""Validate saved editable assets and the corresponding exported GLB structure."""
import bpy, bmesh, json, struct, os
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../..'))
def volume(o):
    bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.triangulate(bm,faces=list(bm.faces));bm.normal_update();v=abs(bm.calc_volume(signed=True));bm.free();return v
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT,'assets/blender/trees/cartoon_tree.blend'))
tree=bpy.data.objects['CartoonTree']
assert tuple(tree.location)==(0,0,0)
assert bpy.data.objects.get('Trunk_curved_taper')
assert len([o for o in tree.children if o.name.startswith('Foliage_layer_')])==7
assert not bpy.data.objects.get('Boulder_intact'), 'Tree source must not contain rock assets'
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT,'assets/blender/rocks/cartoon_boulder.blend'))
pieces=[o for o in bpy.data.objects if o.name.startswith('Boulder_piece_')]
assert len(pieces)==5
assert all(o.parent.name=='CartoonBoulderFractured' for o in pieces)
intact=volume(bpy.data.objects['Boulder_intact']);fractured=sum(volume(o) for o in pieces)
assert abs(intact-fractured)/intact<.0001,(intact,fractured)
assert not bpy.data.objects.get('CartoonTree'), 'Rock source must not contain tree assets'
stats={}
for relative in ['trees/cartoon_tree.glb','rocks/cartoon_boulder.glb','rocks/cartoon_boulder_fractured.glb']:
    raw=open(os.path.join(ROOT,'assets/models',relative),'rb').read()
    magic,version,size=struct.unpack_from('<4sII',raw);assert magic==b'glTF' and version==2 and size==len(raw)
    n,kind=struct.unpack_from('<II',raw,12);assert kind==0x4e4f534a
    doc=json.loads(raw[20:20+n]);triangles=0
    for mesh in doc['meshes']:
        for p in mesh['primitives']:
            assert p.get('mode',4)==4
            triangles+=doc['accessors'][p['indices']]['count']//3
    if 'fractured' in relative:assert len([n for n in doc['nodes'] if n.get('name','').startswith('Boulder_piece_')])==5
    stats[relative]={'bytes':len(raw),'triangles':triangles}
print('ENVIRONMENT_VALIDATION_OK',json.dumps({'fractureVolumeRelativeError':abs(intact-fractured)/intact,'exports':stats}))
