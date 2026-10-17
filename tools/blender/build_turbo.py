"""Build the review-only Turbo Boost pickup with Blender 2.83+.
Run blender --background --factory-startup --python tools/blender/build_turbo.py
No gameplay, physics, or vehicle files are read or modified.
"""
import bpy, bmesh, math, os, json, struct
from mathutils import Vector

ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../..'))
OUT=os.path.join(ROOT,'assets/pickups/turbo-boost');os.makedirs(OUT,exist_ok=True)
SOURCE=os.path.join(ROOT,'assets/blender/pickups');os.makedirs(SOURCE,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)

def mat(name,color,metallic=0,roughness=.35,emission=0):
    material=bpy.data.materials.new(name);material.use_nodes=True;material.diffuse_color=(*color,1)
    shader=material.node_tree.nodes.get('Principled BSDF');shader.inputs['Base Color'].default_value=(*color,1)
    shader.inputs['Metallic'].default_value=metallic;shader.inputs['Roughness'].default_value=roughness
    shader.inputs['Emission'].default_value=(*(component*emission for component in color),1)
    if 'Emission Strength' in shader.inputs:shader.inputs['Emission Strength'].default_value=1
    return material

gold=mat('Turbo_Gold',(.95,.48,.075),.68,.26)
coremat=mat('Turbo_Energy', (1,.20,.018),.12,.25,1)
highlight=mat('Turbo_HotCore',(1,.72,.19),.12,.24,1)
cyan=mat('Turbo_Cyan',(.015,.7,.95),.28,.2,1)
dark=mat('Turbo_Armor',(.025,.065,.085),.72,.28)
steel=mat('Turbo_Titanium',(.38,.54,.57),.8,.25)

def empty(name,parent=None):
    obj=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(obj);obj.parent=parent;return obj

root=empty('Turbo_Boost');root['assetId']='turbo-boost';root['visualPrototypeOnly']=True
core=empty('Turbo_Core',root)
outer=empty('Turbo_OuterRing',root);outer['spinAxis']='z';outer['spinMultiplier']=1.4
orbit=empty('Turbo_OrbitRing',root);orbit.rotation_euler=(math.radians(53),math.radians(-18),math.radians(15));orbit['spinAxis']='z';orbit['spinMultiplier']=-.8

def mesh(name,verts,faces,material,parent,smooth=False):
    geometry=bpy.data.meshes.new(name+'_Mesh');geometry.from_pydata(verts,[],faces);geometry.update()
    bm=bmesh.new();bm.from_mesh(geometry);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(geometry);bm.free()
    obj=bpy.data.objects.new(name,geometry);bpy.context.collection.objects.link(obj);obj.parent=parent;geometry.materials.append(material);geometry.use_auto_smooth=True
    for face in geometry.polygons:face.use_smooth=smooth
    return obj

def bolt(name,profile,depth,material,parent,scale=1,y=0,bevel=.05):
    pts=[(x*scale,z*scale) for x,z in profile];n=len(pts)
    verts=[(x,y+side*depth/2,z) for side in [-1,1] for x,z in pts]
    faces=[tuple(reversed(range(n))),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    obj=mesh(name,verts,faces,material,parent)
    modifier=obj.modifiers.new('Rounded machined edges','BEVEL');modifier.width=bevel;modifier.segments=3
    if hasattr(modifier,'affect'):modifier.affect='EDGES'
    modifier=obj.modifiers.new('Face-weighted finish','WEIGHTED_NORMAL');modifier.keep_sharp=True
    return obj

profile=[(-.05,1.12),(-.73,-.04),(-.22,.01),(-.39,-1.08),(.78,.24),(.21,.16),(.39,1.12)]
bolt('Core_Bezel',profile,.49,dark,core,1.09,y=.035,bevel=.065)
bolt('Core_GoldShell',profile,.44,gold,core,bevel=.065)
bolt('Core_EnergyFace',profile,.045,coremat,core,.77,y=-.235,bevel=.024)
bolt('Core_HotFilament',profile,.025,highlight,core,.37,y=-.269,bevel=.015)

def arc(name,rin,rout,depth,start,end,material,parent,front=0,steps=48,bevel=.015):
    # Octagonal radial/depth cross section gives smooth, rounded machinery,
    # while keeping real silhouettes instead of a flat emissive texture.
    b=min(bevel,(rout-rin)/3,depth/3)
    cross=[(rin+b,-depth/2),(rout-b,-depth/2),(rout,-depth/2+b),(rout,depth/2-b),(rout-b,depth/2),(rin+b,depth/2),(rin,depth/2-b),(rin,-depth/2+b)]
    verts=[]
    for i in range(steps+1):
        theta=math.radians(start+(end-start)*i/steps)
        verts.extend([(r*math.cos(theta),y+front,r*math.sin(theta)) for r,y in cross])
    faces=[]
    for i in range(steps):
        for j in range(8):faces.append((i*8+j,i*8+(j+1)%8,(i+1)*8+(j+1)%8,(i+1)*8+j))
    faces.extend([tuple(reversed(range(8))),tuple(range(steps*8,(steps+1)*8))])
    return mesh(name,verts,faces,material,parent,True)

for i in range(3):
    start=i*120+12;end=start+96
    arc('Outer_Armor_%d'%i,1.23,1.42,.25,start,end,dark,outer,steps=40,bevel=.04)
    arc('Outer_GoldTrim_%d'%i,1.405,1.445,.08,start+2,end-2,gold,outer,front=-.105,steps=40,bevel=.012)
    arc('Outer_CyanInlay_%d'%i,1.29,1.355,.025,start+6,end-6,cyan,outer,front=-.137,steps=36,bevel=.006)
    # Sculpted terminal caps with gold front faces and a contrasting cyan strip.
    cap=[(-.15,.12),(.14,.12),(.2,.035),(.14,-.12),(-.15,-.12),(-.2,-.035)]
    for j,angle in enumerate([start,end]):
        obj=bolt('Terminal_%d_%d'%(i,j),cap,.30,gold,outer,bevel=.035)
        theta=math.radians(angle);obj.location=(1.32*math.cos(theta),-.005,1.32*math.sin(theta));obj.rotation_euler.y=-theta
        pip=bolt('Terminal_Light_%d_%d'%(i,j),cap,.025,cyan,outer,.40,y=-.17,bevel=.014)
        pip.location=(1.32*math.cos(theta),0,1.32*math.sin(theta));pip.rotation_euler.y=-theta
    arc('Orbit_Titanium_%d'%i,1.55,1.61,.095,start,end,steel,orbit,steps=42,bevel=.018)
    arc('Orbit_Energy_%d'%i,1.565,1.595,.025,start+5,end-5,cyan,orbit,front=-.055,steps=36,bevel=.006)

# Apply finish modifiers, then count exactly the triangles in the export.
bpy.ops.object.select_all(action='DESELECT')
def descendants(obj):
    return [child for node in obj.children for child in [node]+descendants(node)]
asset_objects=[root]+descendants(root)
for obj in asset_objects:
    if obj.type=='MESH':
        bpy.context.view_layer.objects.active=obj;obj.select_set(True)
        for modifier in list(obj.modifiers):bpy.ops.object.modifier_apply(modifier=modifier.name)
        obj.data.calc_loop_triangles();obj.select_set(False)
triangles=sum(len(obj.data.loop_triangles) for obj in asset_objects if obj.type=='MESH')
for obj in asset_objects:obj.select_set(True)
bpy.context.view_layer.objects.active=root
glb=os.path.join(OUT,'turbo-boost.glb')
bpy.ops.export_scene.gltf(filepath=glb,export_format='GLB',use_selection=True,export_extras=True,export_apply=True)

# Source file includes a separate studio collection for convenient Blender review;
# the exported GLB above contains only the reusable pickup hierarchy.
bpy.ops.object.select_all(action='DESELECT')
studio=bpy.data.collections.new('Studio_SourcePreviewOnly');bpy.context.scene.collection.children.link(studio)
def studio_object(obj):
    for collection in list(obj.users_collection):collection.objects.unlink(obj)
    studio.objects.link(obj)

for name,location,power,size in [('Key',(-4,-5,7),950,5),('Rim',(4,2,5),1200,4),('Fill',(1,-4,1),400,3)]:
    bpy.ops.object.light_add(type='AREA',location=location);obj=bpy.context.object;obj.name=name;obj.data.energy=power;obj.data.size=size;obj.rotation_euler=(-obj.location).to_track_quat('-Z','Y').to_euler();studio_object(obj)
bpy.ops.object.camera_add(location=(4,-8,3));camera=bpy.context.object;camera.name='Source_PreviewCamera';camera.rotation_euler=(-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=4.8;studio_object(camera)
scene=bpy.context.scene;scene.camera=camera;scene.render.engine='BLENDER_EEVEE';scene.eevee.use_gtao=True;scene.eevee.use_soft_shadows=True;scene.world.color=(.14,.18,.20)
scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast';scene.render.resolution_x=900;scene.render.resolution_y=900;scene.render.resolution_percentage=100
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':area.spaces.active.region_3d.view_distance=6;area.spaces.active.region_3d.view_location=Vector((0,0,0))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SOURCE,'turbo_boost.blend'),check_existing=False)
with open(glb,'rb') as stream:raw=stream.read()
gltf=json.loads(raw[20:20+struct.unpack_from('<I',raw,12)[0]].decode('utf-8'))
exported_triangles=sum(gltf['accessors'][primitive['indices']]['count']//3 for exported in gltf['meshes'] for primitive in exported['primitives'])
manifest={'id':'turbo-boost','name':'Turbo Boost','version':1,'prototypeOnly':True,'blenderVersion':bpy.app.version_string,'triangles':exported_triangles,'sourceTriangles':triangles,'meshCount':sum(obj.type=='MESH' for obj in asset_objects),'glbBytes':os.path.getsize(glb),'source':'../../blender/pickups/turbo_boost.blend','axes':'GLB +Y up; origin at energy-core center','materials':{'main':['Turbo_Gold','Turbo_Energy','Turbo_HotCore'],'accent':['Turbo_Cyan']},'spinners':['Turbo_OuterRing','Turbo_OrbitRing'],'effects':'Particles, sprites, pulsing emission, floating motion and optional bloom are generated by Three.js; not baked.'}
with open(os.path.join(OUT,'manifest.json'),'w') as stream:json.dump(manifest,stream,indent=2)
print('TURBO_BUILD_OK',json.dumps(manifest))
