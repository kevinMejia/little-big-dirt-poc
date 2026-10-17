"""Build the review asset in installed Blender; never edits the playable game.
Coordinates in helpers use game convention: X right, Y up, Z forward.
Blender storage is X right, Y backward, Z up, exported glTF is game Y-up.
Run: blender --background --factory-startup --python tools/blender/build_dirty.py
"""
import bpy, bmesh, math, os, json
from mathutils import Vector
from math import sin, cos, pi

ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../..'))
OUT=os.path.join(ROOT,'assets','dirty')
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)

def xyz(p):return (p[0],-p[2],p[1])
def material(name,color,rough=.42,metal=.05):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
    return m
paint=material('Construction yellow • enamel',(1,.61,.035))
edge=material('Ochre edges and bucket interior',(.68,.34,.018),.55)
bright=material('Sunlit yellow rims',(1,.74,.09),.36)
rubber=material('Charcoal tire rubber',(.025,.031,.027),.88,0)
groove=material('Rubber shoulder bands',(.045,.052,.045),.86,0)
trim=material('Dark graphite fittings',(.07,.085,.078),.55,.25)
glass=material('Single dark blue tinted windshield',(.025,.095,.12),.18,.32)
chrome=material('Hydraulic polished rods',(.55,.65,.67),.22,.85)
light=material('Warm work lamps',(1,.87,.52),.24)
red=material('Rear marker lenses',(.65,.065,.018),.3)

def pivot(name,parent=None,at=(0,0,0)):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.empty_display_type='PLAIN_AXES';o.empty_display_size=.18
    o.parent=parent;o.location=xyz(at);return o

root=pivot('Dirty');root['forwardAxis']='+Z';root['upAxis']='+Y';root['units']='meters';root['reviewOnly']=True

def mesh(name,verts,faces,mat,parent=root,bevel=0,smooth=True):
    data=bpy.data.meshes.new(name+'_mesh');data.from_pydata([xyz(p) for p in verts],[],faces);data.update()
    bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(data);bm.free()
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.parent=parent;o.data.materials.append(mat)
    data.use_auto_smooth=True
    for p in data.polygons:p.use_smooth=smooth
    if bevel:
        mod=o.modifiers.new('Soft manufactured edges','BEVEL');mod.width=bevel;mod.segments=3
        mod=o.modifiers.new('Weighted panel normals','WEIGHTED_NORMAL');mod.keep_sharp=True
    return o

def loft(name,sections,mat,parent=root,segments=24,exponent=4):
    # sections: height, half-width, front, rear. Superellipse plan gives rounded corners.
    verts=[]
    for y,w,front,rear in sections:
        center=(front+rear)/2;length=(front-rear)/2
        for i in range(segments):
            a=2*pi*i/segments;c=cos(a);s=sin(a)
            verts.append((w*math.copysign(abs(c)**(2/exponent),c),y,center+length*math.copysign(abs(s)**(2/exponent),s)))
    faces=[]
    for j in range(len(sections)-1):
        for i in range(segments):n=(i+1)%segments;faces.append((j*segments+i,j*segments+n,(j+1)*segments+n,(j+1)*segments+i))
    faces.extend([tuple(reversed(range(segments))),tuple((len(sections)-1)*segments+i for i in range(segments))])
    return mesh(name,verts,faces,mat,parent)

def plate(name,profile,width,mat,parent=root,x=0,bevel=.025):
    # A shaped side silhouette in the height/forward plane, extruded sideways.
    verts=[(x+side*width/2,y,z) for side in [-1,1] for y,z in profile];n=len(profile)
    faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]
    for i in range(n):j=(i+1)%n;faces.append((i,j,j+n,i+n))
    return mesh(name,verts,faces,mat,parent,bevel)

def rod(name,a,b,r,mat,parent=root,segments=12):
    av=Vector(xyz(a));bv=Vector(xyz(b));direction=bv-av
    bpy.ops.mesh.primitive_cylinder_add(vertices=segments,radius=r,depth=direction.length,location=(0,0,0))
    o=bpy.context.object;o.name=name;o.parent=parent;o.location=(av+bv)/2;o.rotation_mode='QUATERNION';o.rotation_quaternion=direction.to_track_quat('Z','Y');o.data.materials.append(mat)
    o.data.use_auto_smooth=True
    for p in o.data.polygons:p.use_smooth=True
    bevel=o.modifiers.new('Machined rim bevel','BEVEL');bevel.width=min(.025,r*.2);bevel.segments=2
    o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');return o

def anchor(name,parent,at):return pivot(name,parent,at)
hydraulics=[]
def hydraulic(name,a,b,r=.07):
    barrel=rod(name+'_Barrel',(0,0,0),(0,1,0),r,edge)
    piston=rod(name+'_Rod',(0,0,0),(0,1,0),r*.48,chrome)
    # Unit cylinder length; viewer places the segments in world space each frame.
    barrel['hydraulic']=name;piston['hydraulic']=name
    hydraulics.append(dict(name=name,a=a.name,b=b.name,barrel=barrel.name,rod=piston.name))

loft('Low rounded chassis',[(.65,1.02,1.95,-1.85),(.78,1.16,2.03,-1.93),(1.13,1.16,1.97,-1.93),(1.23,1.04,1.85,-1.85)],trim)
loft('Yellow body saddle',[(1.1,1.06,1.86,-1.7),(1.22,1.14,1.9,-1.78),(1.5,1.12,1.8,-1.73),(1.57,.98,1.71,-1.65)],paint)
loft('Rounded engine cowl',[(1.4,.78,1.82,.3),(1.55,.87,1.87,.28),(1.95,.8,1.69,.23),(2.12,.65,1.5,.2)],paint)
# Tall cab with forward leaning front and rounded side/rear shoulders.
loft('Cab sculpted shell',[(1.4,.85,.43,-1.48),(1.65,.98,.51,-1.53),(3.92,1.02,.74,-1.47),(4.18,.93,.7,-1.4)],paint,segments=32,exponent=6)

# Windshield is one curved, framed panel; no facial features.
def windshield(name,parent=root,rear=False):
    verts=[];faces=[];cols=20;rows=8
    for j in range(rows+1):
        t=j/rows;y=2.13+t*1.81;width=.815+.035*t
        for i in range(cols+1):
            u=2*i/cols-1;z=(.565+.18*t+.085*(1-u*u)) if not rear else (-1.568+.055*t-.03*(1-u*u))
            # Rounded corners pinch only the extreme upper/lower rows.
            x=u*width*(.97 if j in (0,rows) else 1)
            verts.append((x,y,z))
    for j in range(rows):
        for i in range(cols):k=j*(cols+1)+i;faces.append((k,k+1,k+cols+2,k+cols+1))
    o=mesh(name,verts,faces,glass,parent)
    solid=o.modifiers.new('Window thickness','SOLIDIFY');solid.thickness=.018
    return o
windshield('Windshield_single_curved');windshield('Rear_window',rear=True)
for side in [-1,1]:
    # Side glass follows the cab taper, giving a real cabin from every angle.
    verts=[(side*1.009,2.17,.37),(side*1.009,2.17,-1.24),(side*1.046,3.91,-1.22),(side*1.046,3.91,.57)]
    mesh(('Left' if side<0 else 'Right')+'_side_window',verts,[(0,1,2,3)],glass,bevel=0)
    rod('Window rear upright', (side*1.035,2.1,-.88),(side*1.06,3.96,-.87),.028,edge)
    rod('Door handle',(side*1.06,1.98,-.12),(side*1.06,1.98,-.39),.035,trim)
    plate('Lower access step',[(.93,.32),(.93,-.28),(.81,-.28),(.81,.32)],.35,trim,x=side*1.18)
    plate('Upper access step',[(1.21,.18),(1.21,-.42),(1.09,-.42),(1.09,.18)],.32,edge,x=side*1.15)
loft('Curved overhanging roof',[(4.12,1.08,.99,-1.67),(4.22,1.17,1.08,-1.72),(4.37,1.15,1.04,-1.7),(4.46,.92,.91,-1.56),(4.51,.6,.7,-1.35)],paint,segments=40,exponent=3.4)
loft('Roof lower ochre trim',[(4.105,1.08,.99,-1.67),(4.15,1.13,1.03,-1.7)],edge,segments=40,exponent=3.4)

for side in [-1,1]:
    rod('Headlight bezel',(side*.63,1.79,1.77),(side*.63,1.79,1.87),.16,trim)
    rod('Warm front work light',(side*.63,1.79,1.87),(side*.63,1.79,1.9),.125,light)
    rod('Rear marker',(side*.88,1.47,-1.83),(side*.88,1.47,-1.91),.09,red)
for i in range(4):rod('Engine vent',(-.48,1.53+i*.1,1.84),(.48,1.53+i*.1,1.84),.021,trim)
rod('Exhaust stack',(.75,1.9,1.1),(.75,3.07,1.1),.075,trim)
rod('Exhaust bent cap',(.75,3.07,1.1),(.75,3.18,1.23),.075,trim)

def lathe_x(name,profile,mat,parent,segments=40):
    verts=[]
    for x,r in profile:
        for i in range(segments):a=i*2*pi/segments;verts.append((x,cos(a)*r,sin(a)*r))
    faces=[]
    for j in range(len(profile)-1):
        for i in range(segments):n=(i+1)%segments;faces.append((j*segments+i,(j+1)*segments+i,(j+1)*segments+n,j*segments+n))
    return mesh(name,verts,faces,mat,parent)

wheel_info=[]
for side,label in [(-1,'L'),(1,'R')]:
    for axle,z,r in [('Rear',-1.2,.8),('Front',1.32,.59)]:
        steer=pivot('Steering_'+axle+'_'+label,root,(side*1.27,r,z));spin=pivot('Wheel_'+axle+'_'+label,steer)
        steer['wheelRadius']=r;steer['axle']=axle;steer['steerable']=axle=='Front'
        wheel_info.append(dict(steer=steer.name,spin=spin.name,radius=r,x=side*1.27,z=z,front=axle=='Front'))
        width=.33 if axle=='Rear' else .28
        profile=[(-width,.42*r),(-width,.73*r),(-width*.9,.9*r),(-width*.55,.985*r),(width*.55,.985*r),(width*.9,.9*r),(width,.73*r),(width,.42*r)]
        lathe_x('Smooth chunky tire_'+axle+'_'+label,profile,rubber,spin)
        # Continuous shoulder rings replace protruding tread blocks.
        for s in [-1,1]:lathe_x('Tire sidewall ring',[(s*width*.96,.8*r),(s*width*.99,.82*r),(s*width*.96,.84*r)],groove,spin)
        lathe_x('Yellow wheel rim', [(-width-.012,0),(-width-.012,.46*r),(-width+.04,.54*r),(width-.04,.54*r),(width+.012,.46*r),(width+.012,0)],bright,spin)
        for s in [-1,1]:
            rod('Wheel center hub',(s*(width+.01),0,0),(s*(width+.065),0,0),r*.19,edge,spin,20)
            for i in range(6):a=i*pi/3;rod('Hub bolt',(s*(width+.015),cos(a)*r*.31,sin(a)*r*.31),(s*(width+.04),cos(a)*r*.31,sin(a)*r*.31),.025,trim,spin,6)
        if axle=='Rear':
            # Shallow fenders just over the tire crown; sides remain exposed.
            profile=[]
            for i in range(17):a=pi*(.23+.54*i/16);profile.append((r+sin(a)*(r+.1),z+cos(a)*(r+.1)))
            for i in reversed(range(17)):a=pi*(.23+.54*i/16);profile.append((r+sin(a)*(r+.05),z+cos(a)*(r+.05)))
            plate('Rear curved mudguard_'+label,profile,.63,paint,x=side*1.27,bevel=.016)
rod('Rear axle',(-1.25,.8,-1.2),(1.25,.8,-1.2),.12,trim)
rod('Front axle',(-1.2,.59,1.32),(1.2,.59,1.32),.09,trim)

loader=pivot('FrontLoaderPivot',root,(0,1.57,.15))
for side in [-1,1]:
    # Custom bent arm plate, not a cylinder or box substitute.
    profile=[(.08,-.08),(.22,.12),(-.18,1.68),(-.39,2.27),(-.58,2.28),(-.48,1.6)]
    plate('Front sculpted lift arm',profile,.18,paint,loader,x=side*1.01,bevel=.045)
    rod('Loader base pin',(side*.91,0,0),(side*1.13,0,0),.13,edge,loader)
    hydraulic('FrontLift_'+('L' if side<0 else 'R'),anchor('FrontLiftBase_'+str(side),root,(side*1.01,1.03,.4)),anchor('FrontLiftTop_'+str(side),loader,(side*1.01,-.29,1.61)),.08)
rod('Loader crossbrace',(-1.01,-.36,1.85),(1.01,-.36,1.85),.12,edge,loader)
front_bucket=pivot('FrontBucketPivot',loader,(0,-.87,2.35))

def bucket(name,parent,width=3.2,height=1.42,depth=1.45):
    # Solid concave scoop: curved inner/outer skins, real end cheeks, open top/front.
    profile=[]
    for i in range(25):
        t=i/24;angle=t*pi/2
        y=height*(1-sin(angle));z=-.28+depth*(1-cos(angle))
        profile.append((y,z))
    verts=[];n=len(profile);cols=12
    for layer in [0,1]:
        for y,z in profile:
            for i in range(cols+1):
                x=width*(i/cols-.5);bow=.065*(1-(2*x/width)**2)
                verts.append((x,y-layer*.085,z+bow-layer*.07))
    faces=[];stride=cols+1;skin=n*stride
    for layer in [0,1]:
        for j in range(n-1):
            for i in range(cols):a=layer*skin+j*stride+i;faces.append((a,a+1,a+stride+1,a+stride))
    for j in [0,n-1]:
        for i in range(cols):a=j*stride+i;faces.append((a,a+skin,a+skin+1,a+1))
    shell=mesh(name+'_curved_scoop',verts,faces,paint,parent)
    shell.data.materials.append(edge)
    for p in shell.data.polygons:
        if p.index<(n-1)*cols:p.material_index=1
    for side in [-1,1]:
        cheek=profile+[(profile[-1][0]+.12,profile[-1][1]),(height*.65,depth*.25),(height,-.22)]
        plate(name+'_shaped_end_cheek',cheek,.085,paint,parent,x=side*width/2,bevel=.035)
    rod(name+'_cutting_edge',(-width/2-.06,-.025,depth-.26),(width/2+.06,-.025,depth-.26),.065,edge,parent)
    # Wide bevel-edged teeth integrated into the lower cutting bar.
    for i in range(5):
        x=(i-2)*width/5;plate(name+'_tooth',[(.035,depth-.23),(-.07,depth-.23),(-.09,depth+.02),(-.025,depth+.13)],.18,edge,parent,x=x,bevel=.018)
    return shell

bucket('FrontBucket',front_bucket)
hydraulic('FrontCurl',anchor('FrontCurlBase',loader,(0,-.1,1.1)),anchor('FrontCurlEnd',front_bucket,(0,.78,-.25)),.07)
rod('Bucket tilt bellcrank',(0,-.22,1.8),(0,-.54,2.22),.08,edge,loader)

rear_swing=pivot('RearSwingPivot',root,(0,1.22,-1.94))
loft('Rear swing casting',[(-.16,.37,.32,-.3),(.17,.37,.32,-.3),(.3,.26,.23,-.23)],edge,rear_swing)
boom=pivot('RearBoomPivot',rear_swing,(0,.18,-.12))
plate('Rear tapered main boom',[(0,.12),(.4,.15),(2.98,-.52),(3.5,-.81),(3.61,-.98),(3.39,-1.1),(.2,-.25)],.31,paint,boom,bevel=.055)
stick=pivot('RearStickPivot',boom,(0,3.43,-.88))
plate('Rear curved descending stick',[(.11,.1),(.12,-.15),(-.26,-.37),(-3.9,-1.36),(-4.08,-1.29),(-3.95,-1.09),(-.35,-.05)],.23,paint,stick,bevel=.04)
rear_bucket=pivot('RearBucketPivot',stick,(0,-3.94,-1.24))
rear_shell=pivot('RearBucketShell',rear_bucket);rear_shell.rotation_euler[2]=pi
bucket('RearDiggingBucket',rear_shell,1.18,.79,.85)
for parent,name in [(boom,'Boom'),(stick,'Stick'),(rear_bucket,'RearBucket')]:rod(name+'_joint_pin',(-.25,0,0),(.25,0,0),.13,edge,parent)
hydraulic('RearBoom',anchor('RearBoomBase',rear_swing,(.26,.05,.24)),anchor('RearBoomEnd',boom,(.26,2.37,-.27)),.085)
hydraulic('RearStick',anchor('RearStickBase',boom,(-.25,1.8,-.55)),anchor('RearStickEnd',stick,(-.25,-.85,-.42)),.07)
hydraulic('RearCurl',anchor('RearCurlBase',stick,(.22,-2.6,-.94)),anchor('RearCurlEnd',rear_bucket,(.22,.46,-.14)),.06)
# Hinged stabilizers are tucked close to the rear chassis in the driving pose.
for side in [-1,1]:
    plate('Rear folded stabilizer',[(1.27,-1.7),(.77,-2.01),(.68,-1.92),(1.1,-1.56)],.13,edge,x=side*1.03)
    plate('Stabilizer foot',[(.74,-2.14),(.65,-2.14),(.65,-1.8),(.74,-1.8)],.42,trim,x=side*1.08)

def place_hydraulics():
    bpy.context.view_layer.update()
    for h in hydraulics:
        a=bpy.data.objects[h['a']].matrix_world.translation;b=bpy.data.objects[h['b']].matrix_world.translation
        delta=b-a;length=delta.length;direction=delta.normalized()
        for part,center,fraction in [('barrel',.3,.6),('rod',.79,.42)]:
            o=bpy.data.objects[h[part]];o.location=a+direction*length*center;o.rotation_mode='QUATERNION';o.rotation_quaternion=direction.to_track_quat('Z','Y');o.scale.z=length*fraction
place_hydraulics()

root['hydraulics']=json.dumps(hydraulics)
root['wheels']=json.dumps(wheel_info)
root['sourceReference']='reference.png; no eyes or mouth'
joint_limits={
 'FrontLoaderPivot':[-.85,.12],'FrontBucketPivot':[-.7,.9],
 'RearSwingPivot':[-1.15,1.15],'RearBoomPivot':[-.3,.35],
 'RearStickPivot':[-.65,.75],'RearBucketPivot':[-.85,1.15],
}
for name,limits in joint_limits.items():bpy.data.objects[name]['limitsRadians']=limits

# Apply the bevel/normal modifiers to export geometry, keep editable originals in .blend.
scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.world.color=(.35,.35,.35)
scene.render.engine='BLENDER_EEVEE';scene.eevee.use_gtao=True;scene.eevee.gtao_distance=3;scene.eevee.gtao_factor=1.25
scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast';scene.view_settings.exposure=0;scene.view_settings.gamma=1
# Studio objects stay outside the exported Dirty hierarchy.
studio=bpy.data.collections.new('Studio - not exported');scene.collection.children.link(studio)
def studio_link(o):
    for collection in list(o.users_collection):collection.objects.unlink(o)
    studio.objects.link(o)
for name,loc,energy,size in [('Key',(-6,-7,10),1100,6),('Fill',(7,-4,6),850,7),('Rim',(1,7,9),1400,5)]:
    data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.size=size;o=bpy.data.objects.new(name,data);studio.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,2))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(9,-12,7));camera=bpy.context.object;camera.name='Review camera';studio_link(camera);camera.rotation_euler=(Vector((0,-.3,2))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=9;scene.camera=camera
scene.render.resolution_x=1200;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=True

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'dirty.blend'))
bpy.ops.object.select_all(action='DESELECT')
def select_tree(o):
    o.select_set(True)
    for child in o.children:select_tree(child)
select_tree(root);bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'dirty.glb'),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_extras=True,export_animations=False,export_cameras=False,export_lights=False,export_texcoords=False,export_tangents=False)
# Report evaluated triangle count, bounds, object names for the viewer/QA.
deps=bpy.context.evaluated_depsgraph_get();triangles=0
def descendants(o):
    for child in o.children:
        yield child
        for nested in descendants(child):yield nested
for o in descendants(root):
    if o.type=='MESH':
        evaluated=o.evaluated_get(deps);data=evaluated.to_mesh();data.calc_loop_triangles();triangles+=len(data.loop_triangles);evaluated.to_mesh_clear()
manifest=dict(blender=bpy.app.version_string,triangles=triangles,wheels=wheel_info,hydraulics=hydraulics,jointLimits=joint_limits,orientation='+Z forward, +Y up after glTF export',reviewOnly=True)
with open(os.path.join(OUT,'manifest.json'),'w') as f:json.dump(manifest,f,indent=2)
print('DIRTY_BUILD_OK',triangles,'triangles',os.path.getsize(os.path.join(OUT,'dirty.glb')),'GLB bytes')
# Eevee studio render is useful even if browser graphics is unavailable.
scene.render.filepath=os.path.join(OUT,'blender-preview.png')
bpy.ops.render.render(write_still=True)
