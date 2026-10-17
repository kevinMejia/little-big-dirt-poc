"""Blender 2.83+: reproducible review assets. Run with --background --python.
Blender uses Z up; glTF export converts to Y up. No game files are modified.
"""
import bpy, bmesh, math, random, os, json, tempfile
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
random.seed(734)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, color, roughness=.8):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=roughness
    return m

bark=[material('Bark warm umber',(.32,.15,.055)),material('Bark sunlit amber',(.43,.23,.09)),material('Bark soft shadow',(.25,.115,.04))]
greens=[material('Foliage jade',(.075,.32,.13)),material('Foliage leaf green',(.15,.43,.16)),material('Foliage sunlit lime',(.28,.53,.19))]
stones=[material('Stone slate',(.34,.40,.43)),material('Stone mist',(.43,.49,.51)),material('Stone warm face',(.39,.43,.43)),material('Stone shadow',(.28,.33,.36))]

def empty(name, location=(0,0,0), parent=None):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=location;o.parent=parent;return o

def mesh(name, vertices, faces, materials, parent):
    data=bpy.data.meshes.new(name+'Geometry');data.from_pydata(vertices,[],faces);data.update()
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.parent=parent
    for m in materials:data.materials.append(m)
    return o

def bevel(o, width, segments=2):
    o.data.use_auto_smooth=True
    mod=o.modifiers.new('Soft sculpted edges','BEVEL');mod.width=width;mod.segments=segments
    mod=o.modifiers.new('Weighted face normals','WEIGHTED_NORMAL');mod.keep_sharp=True

tree=empty('CartoonTree');tree['pivot']='Trunk base at ground';tree['colliderRadius']=.25;tree['foliageHeight']=4.4
verts=[];rings=8;sides=12
for j in range(rings):
    t=j/(rings-1);z=t*3.25;r=(.30*(1-t)+.115*t)*(1+.28*math.exp(-t*12))
    for i in range(sides):
        a=i*math.tau/sides;rr=r*(1+.07*math.sin(i*3+j*.7))
        verts.append((math.cos(a)*rr+.12*math.sin(t*3),math.sin(a)*rr+.07*t*t,z))
faces=[]
for j in range(rings-1):
    for i in range(sides):faces.append((j*sides+i,j*sides+(i+1)%sides,(j+1)*sides+(i+1)%sides,(j+1)*sides+i))
faces += [tuple(reversed(range(sides))),tuple((rings-1)*sides+i for i in range(sides))]
trunk=mesh('Trunk_curved_taper',verts,faces,bark,tree);bevel(trunk,.035)
for p in trunk.data.polygons:p.use_smooth=True;p.material_index=1 if p.index%7==1 else (2 if p.index%7==4 else 0)

def branch(name,a,b,r):
    d=Vector(b)-Vector(a);bpy.ops.mesh.primitive_cone_add(vertices=10,radius1=r,radius2=r*.45,depth=d.length,location=(Vector(a)+Vector(b))/2)
    o=bpy.context.object;o.name=name;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();o.parent=tree;o.data.materials.append(bark[0]);bevel(o,.025)
    for p in o.data.polygons:p.use_smooth=True
for i,(a,b) in enumerate([((.1,0,1.7),(-.85,.05,2.8)),((.15,.02,2),(.85,.1,3.1)),((.15,.03,2.4),(.1,.65,3.4))]):branch('Branch_%02d'%i,a,b,.12)
# Overlapping, irregular rounded lobes make a full layered crown, not cone stacks.
lobes=[(-.65,.03,2.85,1.05,.88,.79),( .65,.12,3.05,1.04,.9,.83),(.02,-.62,3.18,1.02,.82,.9),(.08,.63,3.35,.95,.85,.85),(-.3,.02,3.85,1.04,.95,.95),(.46,.03,3.86,.8,.82,.85),(.03,.05,4.38,.72,.73,.66)]
for i,(x,y,z,sx,sy,sz) in enumerate(lobes):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=(x,y,z));o=bpy.context.object;o.name='Foliage_layer_%02d'%i;o.parent=tree
    for v in o.data.vertices:
        p=v.co;f=1+.055*math.sin(p.x*8+p.y*5+i)+.035*math.cos(p.z*9+i);p.x*=sx*f;p.y*=sy*f;p.z*=sz*f
    for m in greens:o.data.materials.append(m)
    for p in o.data.polygons:p.use_smooth=True;p.material_index=min(2,int(i/3))
    mod=o.modifiers.new('Gentle crown rounding','SUBSURF');mod.levels=1;mod.render_levels=1

boulder=empty('CartoonBoulder');boulder['groundOrigin']=True;boulder['nominalRadius']=1.3
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1)
rock=bpy.context.object;rock.name='Boulder_intact';rock.parent=boulder
for v in rock.data.vertices:
    p=v.co;f=1+.13*math.sin(p.x*3.5+p.y*2.2)+.075*math.cos(p.y*5-p.z*3)
    p.x*=1.32*f;p.y*=1.06*f;p.z=max(.045,.99+p.z*.99*f)
for m in stones:rock.data.materials.append(m)
for p in rock.data.polygons:p.material_index=random.choices(range(4),[6,2,2,1])[0]
bevel(rock,.055,2)

# Voronoi half-spaces cut one shared shell; capped pieces reconstruct its shape.
fracture=empty('CartoonBoulderFractured');fracture['pieceCount']=5
seeds=[Vector(p) for p in [(-.63,-.43,.55),(.63,-.38,.63),(-.56,.44,1.12),(.52,.43,1.08),(.02,-.05,1.65)]]
pieces=[]
for i,seed in enumerate(seeds):
    polygons=[[v.co.copy() for v in [rock.data.vertices[k] for k in face.vertices]] for face in rock.data.polygons]
    for j,other in enumerate(seeds):
        if i==j:continue
        normal=(other-seed).normalized();mid=(seed+other)/2;clipped=[];crossings=[]
        for poly in polygons:
            result=[]
            for k,a in enumerate(poly):
                b=poly[(k+1)%len(poly)];da=(a-mid).dot(normal);db=(b-mid).dot(normal)
                if da<=1e-7:result.append(a)
                if (da<0 and db>0) or (da>0 and db<0):
                    hit=a+(b-a)*(da/(da-db));result.append(hit);crossings.append(hit)
            if len(result)>=3:clipped.append(result)
        unique=[]
        for v in crossings:
            if not any((v-w).length<1e-5 for w in unique):unique.append(v)
        if len(unique)>=3:
            center=sum(unique,Vector())/len(unique);u=normal.cross(Vector((0,0,1)))
            if u.length<.1:u=normal.cross(Vector((0,1,0)))
            u.normalize();v=normal.cross(u)
            unique.sort(key=lambda p:math.atan2((p-center).dot(v),(p-center).dot(u)))
            clipped.append(unique)
        polygons=clipped
    vertices=[];faces=[]
    for poly in polygons:
        face=[]
        for v in poly:
            match=next((k for k,w in enumerate(vertices) if (v-w).length<1e-5),None)
            if match is None:match=len(vertices);vertices.append(v)
            face.append(match)
        if len(set(face))>=3:faces.append(face)
    data=bpy.data.meshes.new('Fracture_%02dGeometry'%i);data.from_pydata(vertices,[],faces);data.update()
    bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(data);bm.free()
    o=bpy.data.objects.new('Boulder_piece_%02d'%(i+1),data);bpy.context.collection.objects.link(o);o.parent=fracture
    for m in stones:data.materials.append(m)
    center=sum((v.co for v in data.vertices),Vector())/len(data.vertices)
    for v in data.vertices:v.co-=center
    o.location=center;o['pieceIndex']=i;o['restCenter']=list(center);bevel(o,.024,2);pieces.append(o)

def descendants(root):
    yield root
    for c in root.children:
        for o in descendants(c):yield o

def export(root,relative):
    path=os.path.join(ROOT,relative);os.makedirs(os.path.dirname(path),exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT')
    for o in descendants(root):o.select_set(True)
    bpy.context.view_layer.objects.active=root
    bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_extras=True,export_animations=False,export_cameras=False,export_lights=False)
    return os.path.getsize(path)

sizes={}
sizes['tree']=export(tree,'assets/models/trees/cartoon_tree.glb')
sizes['boulder']=export(boulder,'assets/models/rocks/cartoon_boulder.glb')
sizes['fractured']=export(fracture,'assets/models/rocks/cartoon_boulder_fractured.glb')

# Save two clean editable projects containing just the corresponding asset(s).
for root in [tree,boulder,fracture]:
    for o in descendants(root):o.hide_render=False
with tempfile.TemporaryDirectory(prefix='little-big-dirt-environment-') as work:
    staging=os.path.join(work,'master.blend')
    bpy.ops.wm.save_as_mainfile(filepath=staging,check_existing=False)
    for names,relative in [(['CartoonTree'],'assets/blender/trees/cartoon_tree.blend'),(['CartoonBoulder','CartoonBoulderFractured'],'assets/blender/rocks/cartoon_boulder.blend')]:
        bpy.ops.wm.open_mainfile(filepath=staging)
        keep=set(o for name in names for o in descendants(bpy.data.objects[name]))
        for o in list(bpy.data.objects):
            if o not in keep:bpy.data.objects.remove(o,do_unlink=True)
        bpy.ops.object.select_all(action='DESELECT')
        for name in names:bpy.data.objects[name].select_set(True)
        bpy.context.view_layer.objects.active=bpy.data.objects[names[0]]
        for screen in bpy.data.screens:
            for area in screen.areas:
                if area.type=='VIEW_3D':
                    area.spaces.active.region_3d.view_distance=9
                    area.spaces.active.region_3d.view_location=Vector((0,0,2))
        path=os.path.join(ROOT,relative);os.makedirs(os.path.dirname(path),exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=path,check_existing=False,copy=True)
    bpy.ops.wm.open_mainfile(filepath=staging)
    tree=bpy.data.objects['CartoonTree'];boulder=bpy.data.objects['CartoonBoulder'];fracture=bpy.data.objects['CartoonBoulderFractured'];pieces=[bpy.data.objects['Boulder_piece_%02d'%(i+1)] for i in range(5)]

scene=bpy.context.scene
tree.location=(-2.5,0,0);boulder.location=(1.1,0,0);fracture.location=(4.5,0,0)
for i,o in enumerate(pieces):o.location+=Vector(((i%2-.5)*.18,((i//2)%2-.5)*.18,.08*(i%3)))
groundmat=material('Preview grass',(.31,.46,.22))
bpy.ops.mesh.primitive_plane_add(size=200);bpy.context.object.data.materials.append(groundmat)
scene.world.color=(.35,.40,.45);scene.render.engine='BLENDER_EEVEE';scene.eevee.use_gtao=True;scene.eevee.gtao_distance=3;scene.eevee.use_soft_shadows=True
scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast';scene.view_settings.exposure=0;scene.view_settings.gamma=1
for name,loc,power,size in [('Key',(-3,-4,10),1600,7),('Fill',(4,1,8),1000,6)]:
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.size=size;o.rotation_euler=(Vector((0,0,2))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(10,-16,10));cam=bpy.context.object;cam.rotation_euler=(Vector((.5,0,2))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=13;scene.camera=cam
scene.render.resolution_x=1200;scene.render.resolution_y=760;scene.render.resolution_percentage=100
out=os.path.join(ROOT,'assets/models/environment-preview.png');scene.render.filepath=out;bpy.ops.render.render(write_still=True)
report={'blender':bpy.app.version_string,'glbBytes':sizes,'fracturePieces':len(pieces),'axes':'GLB +Y up, ground origin at 0; Blender +Z up','reviewOnly':True}
with open(os.path.join(ROOT,'assets/models/environment-manifest.json'),'w') as f:json.dump(report,f,indent=2)
print('ENVIRONMENT_BUILD_OK',json.dumps(report))
