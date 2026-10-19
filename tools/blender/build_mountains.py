"""Original full-circle alpine ranges and fused cumulus clouds. Blender 4.2+."""
import bpy, math, random, os, json
from mathutils import noise, Vector
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../..'))
OUT=os.path.join(ROOT,'assets/models/mountains');os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
N=320;RINGS=13
for layer,(name,radius,base,amplitude) in enumerate([('far',1.85,.19,.35),('middle',1.48,.11,.30),('foothills',1.08,.025,.14)]):
    rng=random.Random(730+layer)
    peaks=[(i*math.tau/29+rng.uniform(-.06,.06),rng.uniform(.06,.20),rng.uniform(.20,1)) for i in range(29)]
    vertices=[];faces=[]
    for ring in range(RINGS):
        t=ring/(RINGS-1)
        for i in range(N):
            a=i*math.tau/N
            # Wide, eroded mountain massifs: branching ridges across a real terrain
            # surface, rather than a vertical extruded silhouette.
            r=radius-.32+t*.84
            x,y=math.cos(a)*r,math.sin(a)*r
            n=noise.noise_vector(Vector((x*11+layer*13,y*11,3)))[0]
            ridge=0
            for pa,width,h in peaks:
                delta=math.atan2(math.sin(a-pa),math.cos(a-pa))
                offset=.018*math.sin(t*8+pa*9)
                ridge=max(ridge,h*math.exp(-((delta+offset)/width)**2))
            envelope=max(0,math.sin(math.pi*t))**1.15
            height=(base+amplitude*ridge)*envelope
            detail=(.042 if layer<2 else .011)*n*envelope
            z=-.065+height+detail
            vertices.append((x,y,z))
            if ring<RINGS-1:
                b=ring*N+i;c=ring*N+(i+1)%N
                if (ring+i)%2:faces.extend([(b,c,c+N),(b,c+N,b+N)])
                else:faces.extend([(b,c,b+N),(c,c+N,b+N)])
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o)
    o['collision']='none';o['layer']=layer
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'mountain-ranges.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'mountain-ranges.glb'),export_format='GLB',export_extras=True)
# Metaballs fuse into continuous sculpted cloud surfaces, removing sphere seams.
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for variant in range(3):
    data=bpy.data.metaballs.new('Cumulus');data.resolution=.13;data.render_resolution=.10;data.threshold=.65
    o=bpy.data.objects.new('cloud_'+str(variant),data);bpy.context.collection.objects.link(o)
    rng=random.Random(118+variant)
    for x,y,z,r in [(-1.4,0,0,1),(-.5,0,.1,1.2),(.5,0,.1,1.2),(1.5,0,0,.9),(-.5,0,.9,1.1),(.45,0,1.15,1.1)]:
        e=data.elements.new();e.co=(x,y+rng.uniform(-.3,.3),z+rng.uniform(-.15,.15));e.radius=r*rng.uniform(.85,1.15)
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');o=bpy.context.object
    dec=o.modifiers.new('Mobile surface budget','DECIMATE');dec.ratio=.35;bpy.ops.object.modifier_apply(modifier=dec.name)
    for p in o.data.polygons:p.use_smooth=True
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'clouds.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'clouds.glb'),export_format='GLB')
with open(os.path.join(OUT,'manifest.json'),'w') as f:json.dump({'generator':'tools/blender/build_mountains.py','license':'CC0-1.0','layers':3,'triangles':N*(RINGS-1)*2*3,'textures':0,'collision':'none','blender':bpy.app.version_string},f,indent=2)
