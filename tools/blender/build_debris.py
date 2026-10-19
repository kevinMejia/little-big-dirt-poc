"""Reproducible original debris. Blender --background --python tools/blender/build_debris.py.
Metres; ground origin, +Z up in Blender / +Y up in glTF. No external inputs.
"""
import bpy, random, math, os, json
from mathutils import Vector
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../..'))
OUT=os.path.join(ROOT,'assets/models/debris');os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
rng=random.Random(48271)
def material(name,color):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=1
    return m
stone=material('Debris stone',(.34,.32,.27));wood=material('Weathered wood',(.25,.14,.065))
def rock(location,size):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=location);o=bpy.context.object
    for v in o.data.vertices:
        v.co.x*=size[0]*rng.uniform(.8,1.15);v.co.y*=size[1]*rng.uniform(.8,1.15);v.co.z=(v.co.z+1)*size[2]*.5
    o.data.materials.append(stone);return o
def stick(a,b,radius):
    d=Vector(b)-Vector(a);bpy.ops.mesh.primitive_cone_add(vertices=5,radius1=radius,radius2=radius*.6,depth=d.length,location=(Vector(a)+Vector(b))*.5)
    o=bpy.context.object;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();o.data.materials.append(wood);return o
for kind in ['smallRock','mediumRock','gravel','twig','branch','log','fragment','splinter']:
    for variant in range(3):
        parts=[]
        if kind in ['smallRock','mediumRock']:parts=[rock((0,0,0),(.22,.16,.16) if kind=='smallRock' else (.52,.4,.48))]
        elif kind=='gravel':
            for i in range(7):parts.append(rock((rng.uniform(-.36,.36),rng.uniform(-.32,.32),0),(.08,.06,.07)))
        else:
            length,radius={'twig':(.8,.025),'branch':(1.6,.07),'log':(2,.2),'fragment':(.5,.09),'splinter':(.4,.018)}[kind]
            parts=[stick((-length/2,0,radius),(length/2,rng.uniform(-.1,.1),radius),radius)]
            if kind in ['branch','twig']:parts.append(stick((0,0,radius),(.3,length*.25,radius*1.3),radius*.55))
        bpy.ops.object.select_all(action='DESELECT')
        for o in parts:o.select_set(True)
        bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();o=bpy.context.object;o.name=f'{kind}_{variant}'
        bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
        # Ground tangent underside; origin centered horizontally, on bottom plane.
        low=min((o.matrix_world@v.co).z for v in o.data.vertices)
        for v in o.data.vertices:v.co.z-=low
        bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
        o['collision']='none';o['category']=kind;o['variant']=variant
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'debris.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'debris.glb'),export_format='GLB',export_extras=True)
with open(os.path.join(OUT,'manifest.json'),'w') as f:json.dump({'generator':'tools/blender/build_debris.py','seed':48271,'units':'metres','variantsPerType':3,'collision':'none','license':'CC0-1.0','blender':bpy.app.version_string},f,indent=2)
