"""Blender 4.5: --background --python this.py -- <MegaKit directory>.

Imports only the three requested OBJs, retains UVs and the original diffuse PNG,
corrects base pivots, and packs the geometry into GLBs sharing one external map.
"""
from pathlib import Path
import bpy, json, struct, sys, shutil
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
SOURCE=Path(sys.argv[sys.argv.index('--')+1])
OUT=ROOT/'assets/models/rocks/quaternius'
ORIGINAL=ROOT/'assets/source/rocks/quaternius'
OUT.mkdir(parents=True,exist_ok=True);ORIGINAL.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
texture=SOURCE/'Textures/Rocks_Diffuse.png'
shutil.copyfile(texture,ORIGINAL/texture.name);shutil.copyfile(texture,OUT/texture.name)
shutil.copyfile(SOURCE/'License_Standard.txt',ORIGINAL/'License_Standard.txt')
image=bpy.data.images.load(str(texture),check_existing=True)
material=bpy.data.materials.new('Rocks');material.use_nodes=True
shader=material.node_tree.nodes.get('Principled BSDF')
shader.inputs['Roughness'].default_value=1;shader.inputs['Metallic'].default_value=0
node=material.node_tree.nodes.new('ShaderNodeTexImage');node.image=image
material.node_tree.links.new(node.outputs['Color'],shader.inputs['Base Color'])
report=[];objects=[];samples=[]
pixels=list(image.pixels);tw,th=image.size
for i in range(1,4):
    name=f'Rock_Medium_{i}'
    for ext in ['obj','mtl']:shutil.copyfile(SOURCE/'OBJ'/f'{name}.{ext}',ORIGINAL/f'{name}.{ext}')
    vertices=[list(map(float,l.split()[1:4])) for l in (SOURCE/'OBJ'/f'{name}.obj').read_text().splitlines() if l.startswith('v ')]
    low=[min(v[k] for v in vertices) for k in range(3)]
    high=[max(v[k] for v in vertices) for k in range(3)]
    bpy.ops.object.select_all(action='DESELECT')
    bpy.ops.wm.obj_import(filepath=str(SOURCE/'OBJ'/f'{name}.obj'),forward_axis='NEGATIVE_Z',up_axis='Y')
    imported=list(bpy.context.selected_objects)
    bpy.context.view_layer.objects.active=imported[0];bpy.ops.object.join()
    obj=bpy.context.object;obj.name=name
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    coords=[v.co.copy() for v in obj.data.vertices]
    lower=Vector([min(v[k] for v in coords) for k in range(3)])
    upper=Vector([max(v[k] for v in coords) for k in range(3)])
    offset=Vector(((lower.x+upper.x)/2,(lower.y+upper.y)/2,lower.z))
    for v in obj.data.vertices:v.co-=offset
    obj.data.materials.clear();obj.data.materials.append(material)
    for polygon in obj.data.polygons:polygon.material_index=0
    obj.data.calc_loop_triangles()
    uv=obj.data.uv_layers.active.data
    # Sample UV triangle centers, avoiding unused regions of the texture atlas.
    for tri in obj.data.loop_triangles:
        point=sum((uv[index].uv for index in tri.loops),Vector((0,0)))/3
        x=min(tw-1,int((point.x%1)*tw));y=min(th-1,int((point.y%1)*th))
        index=(y*tw+x)*4;samples.append(pixels[index:index+3])
    obj.select_set(True)
    # Separate glTF export permits a shared original PNG rather than three copies.
    path=OUT/f'{name}.gltf'
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLTF_SEPARATE',use_selection=True,export_image_format='AUTO',export_materials='EXPORT',export_normals=True,export_texcoords=True,export_yup=True)
    g=json.loads(path.read_text());binary=(OUT/g['buffers'][0].pop('uri')).read_bytes()
    for img in g['images']:img['uri']='Rocks_Diffuse.png'
    payload=json.dumps(g,separators=(',',':')).encode();payload+=b' '*((-len(payload))%4)
    binary+=b'\0'*((-len(binary))%4)
    raw=struct.pack('<4sII',b'glTF',2,28+len(payload)+len(binary))+struct.pack('<II',len(payload),0x4e4f534a)+payload+struct.pack('<II',len(binary),0x004e4942)+binary
    (OUT/f'{name}.glb').write_bytes(raw)
    path.unlink();(OUT/f'{name}.bin').unlink(missing_ok=True)
    positions=[g['accessors'][p['attributes']['POSITION']] for m in g['meshes'] for p in m['primitives']]
    report.append(dict(name=name,sourceMin=low,sourceMax=high,width=high[0]-low[0],height=high[1]-low[1],depth=high[2]-low[2],baseOffset=-low[1],centerXZ=[(low[0]+high[0])/2,(low[2]+high[2])/2],exportMin=[min(a['min'][k] for a in positions) for k in range(3)],exportMax=[max(a['max'][k] for a in positions) for k in range(3)],triangles=len(obj.data.loop_triangles),unit='OBJ has no unit metadata; imported at scale 1; GLB meters'))
    objects.append(obj);obj.select_set(False)
palette=[sum(c[k] for c in samples)/len(samples) for k in range(3)]
manifest=dict(blender=bpy.app.version_string,models=report,texture='Rocks_Diffuse.png',textureSize=list(image.size),fragmentColorSRGB=palette)
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
image.pack()
for obj in objects:obj.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/rocks/quaternius_rocks.blend'))
print(json.dumps(manifest,indent=2))
