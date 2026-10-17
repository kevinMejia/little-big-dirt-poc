"""Review-only Stinky. Blender 2.83+, +Z forward in exported GLB. No game edits."""
import os, math, json, random
import bpy, bmesh
from mathutils import Vector
from math import sin, cos, pi
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../..'))
OUT=os.path.join(ROOT,'assets/stinky');os.makedirs(OUT,exist_ok=True)
# Reuse the established authoring primitives, with a separate output and palette.
source=open(os.path.join(ROOT,'tools/blender/build_dirty.py')).read()
helpers=source[source.index('def xyz'):source.index("loft('Low rounded chassis'")]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
exec(helpers.replace("pivot('Dirty')","pivot('Stinky')").replace("(.95,.56,.018)","(.53,.265,.085)").replace("(.68,.34,.018)","(.34,.16,.055)").replace("(1,.74,.09)","(.57,.32,.12)").replace(".98*(1-dirt)+.24*dirt,.63*(1-dirt)+.19*dirt,.018*(1-dirt)+.07*dirt",".56*(1-dirt)+.20*dirt,.29*(1-dirt)+.10*dirt,.105*(1-dirt)+.035*dirt"))
root['reviewOnly']=True
white=material('Ivory reflective tape',(.87,.84,.72),.26,.25)
red=material('Red reflective tape',(.65,.065,.025),.25,.25)
rust=material('Oxidized seams',(.22,.095,.035),.9)
def box(name,loc,size,mat=paint,parent=root,bevel=.05):
    x,y,z=loc;w,h,d=size
    return mesh(name,[(x+a*w/2,y+b*h/2,z+c*d/2) for a,b,c in [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]],[(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)],mat,parent,bevel)
chassis=pivot('Chassis',root)
box('Ladder frame',(0,.95,0),(2.25,.35,6.35),trim,chassis)
for z in [2.25,-.8,-2.15]:
    rod('Axle',(-1.4,.72,z),(1.4,.72,z),.13,trim,chassis)
    for side in [-1,1]:box('Leaf spring',(side*.85,.9,z),(.15,.13,.95),trim,chassis)
cab=pivot('Cabin',chassis)
loft('Rounded cab shell',[(1.05,1.12,1.9,.45),(1.4,1.22,1.95,.4),(2.2,1.2,1.9,.4),(3.35,1.06,1.62,.43),(3.52,.96,1.52,.5)],paint,cab)
loft('Sculpted long hood',[(1.15,1.03,3.36,1.55),(1.55,1.14,3.4,1.5),(2.1,1.05,3.28,1.5),(2.27,.87,3.03,1.53)],paint,cab)
# Single uninterrupted windshield laid on the sloping cab front.
mesh('Windshield gasket',[(-1.02,2.25,1.96),(1.02,2.25,1.96),(.93,3.28,1.69),(-.93,3.28,1.69)],[(0,1,2,3)],trim,cab,.035)
mesh('Single dark windshield',[(-.94,2.31,1.976),(.94,2.31,1.976),(.86,3.19,1.725),(-.86,3.19,1.725)],[(0,1,2,3)],glass,cab)
loft('Roof visor',[(3.22,1.12,1.77,.43),(3.48,1.14,1.77,.43),(3.58,1.02,1.61,.48)],paint,cab)
for x in [-.48,0,.48]:rod('Amber roof marker',(x,3.37,1.78),(x,3.37,1.84),.065,light,cab)
for s in [-1,1]:
    mesh('Door glass',[(s*1.211,2.23,.62),(s*1.211,2.23,1.65),(s*1.087,3.17,1.48),(s*1.087,3.17,.62)],[(0,1,2,3)],glass,cab)
    box('Door handle',(s*1.23,1.99,.77),(.065,.07,.26),trim,cab,.025)
    box('Cab step',(s*1.24,1.02,.8),(.4,.13,.85),edge,cab)
    rod('Mirror bracket',(s*1.15,2.35,1.55),(s*1.47,2.37,1.63),.035,trim,cab)
    box('Mirror',(s*1.48,2.55,1.67),(.17,.43,.19),trim,cab,.065)
    # Open wheel arch: curved ribbon, not a solid box covering the tire.
    verts=[]
    for i in range(25):
        a=pi*i/24
        for x,r in [(s*1.02,.84),(s*1.72,.84),(s*1.02,.96),(s*1.72,.96)]:verts.append((x,.72+r*sin(a),2.25+r*cos(a)))
    faces=[]
    for i in range(24):
        a=i*4;b=a+4
        for j,k in [(0,1),(1,3),(3,2),(2,0)]:faces.append((a+j,b+j,b+k,a+k))
    mesh('Swept front fender',verts,faces,paint,cab,.025)
box('Front bumper',(0,.93,3.47),(3.12,.45,.34),trim,cab,.09)
box('Grille surround',(0,1.64,3.39),(1.45,.94,.18),edge,cab,.12)
box('Grille recess',(0,1.64,3.495),(1.23,.74,.05),trim,cab,.07)
for x in [-.5,-.3,-.1,.1,.3,.5]:box('Grille vertical bar',(x,1.64,3.54),(.065,.72,.065),paint,cab,.025)
for s in [-1,1]:
    box('Headlamp housing',(s*1.19,1.55,3.33),(.44,.45,.25),trim,cab,.075)
    box('Headlight lens',(s*1.19,1.55,3.471),(.3,.3,.045),light,cab,.065)
    rod('Bumper lamp',(s*1.08,.92,3.64),(s*1.08,.92,3.67),.075,light,cab)
    tube('Windshield wiper',[(s*.73,2.34,2),(s*.4,2.4,1.99),(s*.09,2.4,1.99)],.018,trim,cab)
body=pivot('GarbageCompartment',chassis)
loft('Enclosed rounded refuse body',[(1.35,1.23,.37,-2.5),(1.55,1.4,.36,-2.6),(3.35,1.38,.32,-2.57),(3.78,1.18,.22,-2.4),(3.87,1.02,.08,-2.28)],paint,body,32)
for z in [.25,-.65,-1.55,-2.42]:
    for s in [-1,1]:
        plate('Body reinforcing rib',[(1.3,z+.08),(3.43,z+.08),(3.83,z-.07),(3.83,z-.17),(1.3,z-.09)],.13,edge,body,x=s*1.4)
        rod('Rib foot bolt',(s*1.46,1.49,z),(s*1.51,1.49,z),.055,trim,body)
for s in [-1,1]:
    box('Safety rail',(s*1.43,1.57,-1.08),(.1,.24,3.07),edge,body)
    for i in range(16):box('Reflective safety segment',(s*1.491,1.59,.32-i*.19),(.018,.135,.17),red if i%2 else white,body,.005)
    box('Fuel tank',(s*1.04,.91,.03),(.5,.47,.69),trim,chassis,.12)
hopper=pivot('RearHopperPivot',chassis,(0,3.55,-2.45))
for s in [-1,1]:
    plate('Hopper cast cheek',[(0,.04),(-.18,-.31),(-1.45,-1.03),(-2.25,-.95),(-2.35,-.59),(-1.45,-.47)],.22,paint,hopper,x=s*1.32,bevel=.07)
box('Rear crown',(0,-.13,-.23),(2.6,.4,.3),paint,hopper,.08)
box('Hopper lower lip',(0,-2.24,-.84),(2.7,.3,.38),paint,hopper,.07)
box('Hopper dark cavity',(0,-1.13,-.22),(2.4,1.9,.12),trim,hopper)
plate('Loading trough',[(-2.16,-.95),(-2.18,-.32),(-1.87,-.28),(-2,-.93)],2.42,edge,hopper,bevel=.035)
packer=pivot('CompactorPivot',hopper,(0,-.72,-.36))
plate('Curved compactor blade',[(.34,0),(.18,-.12),(-.29,-.2),(-.68,-.41),(-.86,-.47),(-.99,-.31),(-.75,-.15),(-.3,.04)],2.28,trim,packer,bevel=.08)
rod('Compactor roller',(-1.13,-.83,-.4),(1.13,-.83,-.4),.17,edge,packer,24)
for s in [-1,1]:
    plate('Compactor linkage',[(-.05,0),(-.9,-.39),(-1.01,-.3),(-.15,.12)],.14,edge,packer,x=s*1.2)
    for y,z in [(-.1,-.2),(-1.1,-.72),(-2.15,-.85)]:rod('Hopper pin',(s*1.43,y,z),(s*1.52,y,z),.095,edge,hopper,16)
    for y in [-.12,-2.24]:
        for i in range(2):rod('Rear safety lens',(s*(1.07-i*.22),y,-1.052 if y<-1 else -.4),(s*(1.07-i*.22),y,-1.08 if y<-1 else -.43),.08,red if i==0 else light,hopper,16)
    a=anchor('RamFixed'+str(s),hopper,(s*1.48,-.22,-.28))
    b=anchor('RamMoving'+str(s),packer,(s*1.48,-.85,-.36))
    hydraulic('CompactorRam'+str(s),a,b,.085)
    tube('Hydraulic hose',[(s*1.5,-.15,-.22),(s*1.59,-.5,-.36),(s*1.57,-1,-.55)],.025,trim,hopper)
wheel_info=[]
for s in [-1,1]:
    for axle,z in enumerate([2.25,-.8,-2.15]):
        name=('L' if s<0 else 'R')+str(axle)
        steering=pivot('Steering_'+name,chassis,(s*1.43,.72,z))
        roll=pivot('Wheel_'+name,steering)
        # Rounded tire profile with true sidewalls and recessed brown hubs.
        verts=[];profile=[(-.29,.43),(-.29,.57),(-.24,.68),(-.15,.715),(.15,.715),(.24,.68),(.29,.57),(.29,.43)]
        for x,r in profile:
            for i in range(40):a=2*pi*i/40;verts.append((x,r*cos(a),r*sin(a)))
        faces=[]
        for j in range(len(profile)):
            for i in range(40):faces.append((j*40+i,j*40+(i+1)%40,((j+1)%len(profile))*40+(i+1)%40,((j+1)%len(profile))*40+i))
        mesh('Chunky tire',verts,faces,rubber,roll)
        for i in range(28):
            a=2*pi*i/28
            o=box('Tread block',(0,.702*cos(a),.702*sin(a)),(.49,.043,.105),groove,roll,.012);o.rotation_euler.x=a
        rod('Brown wheel rim',(-.294,0,0),(.294,0,0),.405,edge,roll,32)
        rod('Recessed wheel dish',(-.309,0,0),(.309,0,0),.315,bright,roll,24)
        rod('Hub',(-.34,0,0),(.34,0,0),.17,edge,roll,20)
        for i in range(8):
            a=2*pi*i/8;rod('Wheel lug',(s*.31,.245*cos(a),.245*sin(a)),(s*.335,.245*cos(a),.245*sin(a)),.031,trim,roll,6)
        wheel_info.append(dict(steering=steering.name,roll=roll.name,x=s*1.43,z=z,radius=.72,front=axle==0))
# Small shared-mesh paint chips sit on exposed panels, biased toward lower edges.
rng=random.Random(41)
for s in [-1,1]:
    verts=[];faces=[]
    for i in range(190):
        y=rng.uniform(1.57,3.32);z=rng.uniform(-2.32,.16);r=rng.uniform(.008,.025)
        x=s*(1.4-(y-1.55)*.012+.003)
        k=len(verts);verts.extend([(x,y-r,z-r*.5),(x,y+r,z),(x,y+r*.4,z+r)])
        faces.append((k,k+1,k+2))
    mesh('Scattered body patina',verts,faces,rust,body,smooth=False)
    verts=[];faces=[]
    for i in range(65):
        x=rng.uniform(-1.35,1.35);y=rng.uniform(.77,1.09);r=rng.uniform(.008,.027);k=len(verts)
        verts.extend([(x-r,y-r,3.645),(x+r,y,3.645),(x,y+r,3.645)]);faces.append((k,k+1,k+2))
    mesh('Bumper weathering',verts,faces,rust,cab,smooth=False)
# Rounded primary forms retain three segments; tiny tread edges need only one.
for o in bpy.data.objects:
    for modifier in o.modifiers:
        if modifier.type=='BEVEL':modifier.segments=1 if o.name.startswith(('Tread block','Wheel lug')) else 2
def place_hydraulics():
    bpy.context.view_layer.update()
    for h in hydraulics:
        a=bpy.data.objects[h['a']].matrix_world.translation;b=bpy.data.objects[h['b']].matrix_world.translation;d=b-a
        for key,t,f in [('barrel',.3,.6),('rod',.79,.42)]:
            o=bpy.data.objects[h[key]];o.location=a+d*t;o.rotation_quaternion=d.to_track_quat('Z','Y');o.scale.z=d.length*f
place_hydraulics()
root['wheels']=json.dumps(wheel_info);root['hydraulics']=json.dumps(hydraulics)
# Use the established studio/export pipeline, retaining independent motion parents.
tail=source[source.index('# Apply the bevel/normal modifiers'):]
tail=tail.replace('dirty.blend','stinky.blend').replace('dirty.glb','stinky.glb').replace('reviewOnly=False','reviewOnly=True').replace("camera.data.ortho_scale=9","camera.data.ortho_scale=10")
tail=tail.replace("scene.render.resolution_x=900;scene.render.resolution_y=760","scene.render.resolution_x=800;scene.render.resolution_y=680;scene.eevee.taa_render_samples=32")
tail=tail.replace("6.6)","7.2)").replace("8.9)","10.0)")
joint_limits={'RearHopperPivot':[0,.7],'CompactorPivot':[-.65,.3]}
exec(tail)
