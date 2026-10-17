"""Build the reference-sheet asset in installed Blender. Use -- --candidate to stage before promotion.
Coordinates in helpers use game convention: X right, Y up, Z forward.
Blender storage is X right, Y backward, Z up, exported glTF is game Y-up.
Run: blender --background --factory-startup --python tools/blender/build_dirty.py
"""
import bpy, bmesh, math, os, json, sys, random
from mathutils import Vector
from math import sin, cos, pi

ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../..'))
OUT=os.path.join(ROOT,'assets','dirty','candidate') if '--candidate' in sys.argv else os.path.join(ROOT,'assets','dirty')
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)

def xyz(p):return (p[0],-p[2],p[1])
def material(name,color,rough=.42,metal=.05):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
    return m
paint=material('Worn construction yellow enamel',(.95,.56,.018),.48)
edge=material('Ochre edges and bucket interior',(.68,.34,.018),.55)
bright=material('Sunlit yellow rims',(1,.74,.09),.36)
rubber=material('Charcoal tire rubber',(.025,.031,.027),.88,0)
groove=material('Rubber shoulder bands',(.045,.052,.045),.86,0)
trim=material('Dark graphite fittings',(.07,.085,.078),.55,.25)
glass=material('Single dark blue tinted windshield',(.035,.065,.105),.17,.38)
chrome=material('Hydraulic polished rods',(.55,.65,.67),.22,.85)
light=material('Warm work lamps',(1,.87,.52),.24)
red=material('Rear marker lenses',(.65,.065,.018),.3)

rng=random.Random(913)
image=bpy.data.images.new('Shared yellow paint patina',width=512,height=512,alpha=True)
pixels=[]
for iy in range(512):
    v=iy/511
    for ix in range(512):
        def noise2(x,y):
            a=int(math.floor(x));b=int(math.floor(y));u=x-a;v=y-b;u=u*u*(3-2*u);v=v*v*(3-2*v)
            def h(i,j):return (sin(i*127.1+j*311.7)*43758.5453)%1
            return (h(a,b)*(1-u)+h(a+1,b)*u)*(1-v)+(h(a,b+1)*(1-u)+h(a+1,b+1)*u)*v
        noise=.55*noise2(ix/38,iy/38)+.3*noise2(ix/11,iy/11)+.15*noise2(ix/3,iy/3)
        lower=(1-v)**3;speck=rng.random()
        dirt=.015+.055*noise+lower*.11
        if speck<.035:dirt+=.19*rng.random()
        if speck>.996:dirt=-.045
        dirt=max(-.045,min(.3,dirt))
        pixels.extend((.98*(1-dirt)+.24*dirt,.63*(1-dirt)+.19*dirt,.018*(1-dirt)+.07*dirt,1))
image.pixels=pixels;image.filepath_raw=os.path.join(OUT,'paint-patina.png');image.file_format='PNG';image.save();image.pack()
tex=paint.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image
paint.node_tree.links.new(tex.outputs['Color'],paint.node_tree.nodes['Principled BSDF'].inputs['Base Color'])


def pivot(name,parent=None,at=(0,0,0)):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.empty_display_type='PLAIN_AXES';o.empty_display_size=.18
    o.parent=parent;o.location=xyz(at);return o

# A low-resolution stylized reflection band follows the actual 3D window UVs.
glass_image=bpy.data.images.new('Blue gray glazing reflections',width=128,height=128,alpha=True)
glass_pixels=[]
for iy in range(128):
    for ix in range(128):
        u=ix/127;v=iy/127;reflection=.075*math.exp(-((u-(.42+.28*v))/.125)**8)
        glass_pixels.extend((.035+reflection*.65,.065+reflection*.75,.105+reflection*.85,1))
glass_image.pixels=glass_pixels;glass_image.filepath_raw=os.path.join(OUT,'glass-reflection.png');glass_image.file_format='PNG';glass_image.save();glass_image.pack()
node=glass.node_tree.nodes.new('ShaderNodeTexImage');node.image=glass_image;glass.node_tree.links.new(node.outputs['Color'],glass.node_tree.nodes['Principled BSDF'].inputs['Base Color'])

root=pivot('Dirty');root['forwardAxis']='+Z';root['upAxis']='+Y';root['units']='meters';root['reviewOnly']=False;root['revision']='reference-sheet-v2'

def mesh(name,verts,faces,mat,parent=root,bevel=0,smooth=True):
    data=bpy.data.meshes.new(name+'_mesh');data.from_pydata([xyz(p) for p in verts],[],faces);data.update()
    bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(data);bm.free()
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.parent=parent;o.data.materials.append(mat)
    data.use_auto_smooth=True
    uv=data.uv_layers.new(name='SurfaceUV')
    heights=[v[1] for v in verts];lo=min(heights);span=max(.01,max(heights)-lo)
    for loop in data.loops:
        x,y,z=verts[loop.vertex_index];uv.data[loop.index].uv=(.5+math.atan2(z,x)/(2*pi),(y-lo)/span)
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
    if r>.04:
        bevel=o.modifiers.new('Machined rim bevel','BEVEL');bevel.width=min(.025,r*.2);bevel.segments=2
        o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return o

def tube(name,points,r,mat,parent=root,closed=False):
    verts=[];faces=[];segments=8;count=len(points)
    for i,p in enumerate(points):
        prev=Vector(points[(i-1)%count] if closed or i>0 else points[i]);nxt=Vector(points[(i+1)%count] if closed or i<count-1 else points[i]);tangent=(nxt-prev).normalized()
        up=Vector((0,1,0)) if abs(tangent.y)<.9 else Vector((1,0,0));u=tangent.cross(up).normalized();v=tangent.cross(u).normalized()
        for j in range(segments):a=j*2*pi/segments;verts.append(tuple(Vector(p)+r*(u*cos(a)+v*sin(a))))
    for i in range(count if closed else count-1):
        n=(i+1)%count
        for j in range(segments):k=(j+1)%segments;faces.append((i*segments+j,i*segments+k,n*segments+k,n*segments+j))
    return mesh(name,verts,faces,mat,parent)

def anchor(name,parent,at):return pivot(name,parent,at)
hydraulics=[]
def hydraulic(name,a,b,r=.07):
    barrel=rod(name+'_Barrel',(0,0,0),(0,1,0),r,edge)
    piston=rod(name+'_Rod',(0,0,0),(0,1,0),r*.48,chrome)
    # Unit cylinder length; viewer places the segments in world space each frame.
    barrel['hydraulic']=name;piston['hydraulic']=name
    hydraulics.append(dict(name=name,a=a.name,b=b.name,barrel=barrel.name,rod=piston.name))

loft('Low rounded chassis',[(.67,1.02,1.87,-1.8),(.8,1.12,1.96,-1.9),(1.13,1.12,1.91,-1.9),(1.24,1.03,1.8,-1.78)],trim)
loft('Yellow body saddle',[(1.1,1.06,1.86,-1.7),(1.22,1.14,1.9,-1.78),(1.5,1.12,1.8,-1.73),(1.57,.98,1.71,-1.65)],paint)
loft('Rounded engine cowl',[(1.37,.72,1.82,.32),(1.5,.82,1.84,.28),(1.86,.77,1.7,.27),(1.99,.64,1.54,.25)],paint)
# Tall cab with forward leaning front and rounded side/rear shoulders.
loft('Cab sculpted shell',[(1.35,.86,.43,-1.46),(1.58,.96,.47,-1.49),(3.5,1.01,.64,-1.42),(3.69,.94,.61,-1.36)],paint,segments=32,exponent=6)

# Windshield is one curved, framed panel; no facial features.
def windshield(name,parent=root,rear=False):
    verts=[];faces=[];cols=20;rows=8
    for j in range(rows+1):
        t=j/rows;y=2.03+t*1.43;width=.805+.035*t
        for i in range(cols+1):
            u=2*i/cols-1;z=(.51+.15*t+.055*(1-u*u)) if not rear else (-1.53+.055*t-.025*(1-u*u))
            # Rounded corners pinch only the extreme upper/lower rows.
            x=u*width*(.97 if j in (0,rows) else 1)
            verts.append((x,y,z))
    for j in range(rows):
        for i in range(cols):k=j*(cols+1)+i;faces.append((k,k+1,k+cols+2,k+cols+1))
    o=mesh(name,verts,faces,glass,parent)
    solid=o.modifiers.new('Window thickness','SOLIDIFY');solid.thickness=.018
    for j in range(rows):
        for i in range(cols):
            polygon=o.data.polygons[j*cols+i]
            for loop_index in polygon.loop_indices:
                vi=o.data.loops[loop_index].vertex_index;o.data.uv_layers.active.data[loop_index].uv=(vi%(cols+1)/cols,vi//(cols+1)/rows)
    return o
windshield('Windshield_single_curved');windshield('Rear_window',rear=True)
for name in ['Windshield_single_curved','Rear_window']:
    window=bpy.data.objects[name];verts=[(v.co.x,v.co.z,-v.co.y) for v in window.data.vertices]
    cols=20;rows=8
    edges=[[i for i in range(cols+1)], [rows*(cols+1)+i for i in range(cols+1)], [j*(cols+1) for j in range(rows+1)], [j*(cols+1)+cols for j in range(rows+1)]]
    perimeter=list(range(cols+1))+[j*(cols+1)+cols for j in range(1,rows+1)]+[rows*(cols+1)+i for i in reversed(range(cols))]+[j*(cols+1) for j in reversed(range(1,rows))]
    tube(name+'_rubber_seal',[verts[i] for i in perimeter],.026,trim,closed=True)
for side in [-1,1]:
    # Side glass follows the cab taper, giving a real cabin from every angle.
    verts=[]
    for cy,cz,start in [(2.09,-1.15,pi),(3.4,-1.15,pi*1.5),(3.4,-.26,0),(2.09,-.26,pi*.5)]:
        for i in range(6):
            a=start+i*pi/10;y=cy+.08*cos(a);z=cz+.08*sin(a)
            x=side*(.989+(y-2.01)/(3.48-2.01)*.046);verts.append((x,y,z))
    window=mesh(('Left' if side<0 else 'Right')+'_side_window',verts,[tuple(range(len(verts)))],glass)
    tube('Side glazing rubber frame',verts,.024,trim,closed=True)
    rod('Door handle',(side*1.025,1.87,.04),(side*1.025,1.87,-.2),.035,trim)
    plate('Lower access step',[(.93,.32),(.93,-.28),(.81,-.28),(.81,.32)],.35,trim,x=side*1.18)
    plate('Upper access step',[(1.21,.18),(1.21,-.42),(1.09,-.42),(1.09,.18)],.32,edge,x=side*1.15)
loft('Curved overhanging roof',[(3.63,1.07,.86,-1.63),(3.72,1.15,.96,-1.69),(3.84,1.12,.94,-1.66),(3.92,.9,.8,-1.49),(3.95,.59,.59,-1.3)],paint,segments=40,exponent=3.4)
loft('Roof lower ochre trim',[(3.615,1.065,.86,-1.63),(3.66,1.11,.9,-1.66)],edge,segments=40,exponent=3.4)

for side in [-1,1]:
    rod('Headlight bezel',(side*1.06,1.51,.55),(side*1.06,1.51,.63),.09,trim)
    rod('Warm front work light',(side*1.06,1.51,.63),(side*1.06,1.51,.65),.067,light)
    rod('Rear marker bezel',(side*.99,1.43,-2.04),(side*.99,1.43,-2.075),.12,trim)
    rod('Rear marker',(side*.99,1.43,-2.075),(side*.99,1.43,-2.1),.095,red)
plate('Raised hood access panel',[(1.49,1.83),(1.87,1.72),(1.91,1.66),(1.51,1.77)],.75,paint,bevel=.035)
# Hood seam and small side louvers, avoiding any face-like horizontal grille.
rod('Hood center seam',(0,1.57,1.856),(0,1.89,1.69),.012,edge)
rod('Exhaust stack',(.75,1.9,1.1),(.75,2.65,1.1),.075,trim)
rod('Exhaust bent cap',(.75,2.65,1.1),(.75,2.76,1.23),.075,trim)

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
    for axle,z,r in [('Rear',-1.12,.92),('Front',1.36,.66)]:
        axle_x=side*(1.31 if axle=='Rear' else 1.24)
        steer=pivot('Steering_'+axle+'_'+label,root,(axle_x,r,z));spin=pivot('Wheel_'+axle+'_'+label,steer)
        steer['wheelRadius']=r;steer['axle']=axle;steer['steerable']=axle=='Front'
        wheel_info.append(dict(steer=steer.name,spin=spin.name,radius=r,x=axle_x,z=z,front=axle=='Front'))
        width=.39 if axle=='Rear' else .32
        profile=[(-width,.42*r),(-width,.73*r),(-width*.9,.87*r),(-width*.55,.94*r),(width*.55,.94*r),(width*.9,.87*r),(width,.73*r),(width,.42*r)]
        lathe_x('Rounded tire carcass_'+axle+'_'+label,profile,rubber,spin)
        tread_vertices=[];tread_faces=[]
        outline=[(0,-.075),(.12,-.11),(.88,-.11),(1,-.075),(1,.075),(.88,.11),(.12,.11),(0,.075)]
        for lug in range(18):
            for half in [-1,1]:
                base=len(tread_vertices)
                for layer in [0,1]:
                    for across,angular in outline:
                        x=half*width*(.03+.94*across);a=lug*2*pi/18+angular+across*.16
                        rr=r*((.995-.025*across) if layer else .91)
                        tread_vertices.append((x,cos(a)*rr,sin(a)*rr))
                tread_faces.extend([tuple(base+i for i in reversed(range(8))),tuple(base+8+i for i in range(8))])
                for i in range(8):j=(i+1)%8;tread_faces.append((base+i,base+j,base+8+j,base+8+i))
        mesh('Integrated chevron tread_'+axle+'_'+label,tread_vertices,tread_faces,rubber,spin,smooth=False)
        # Continuous shoulder rings replace protruding tread blocks.
        for s in [-1,1]:lathe_x('Tire sidewall ring',[(s*width*.96,.8*r),(s*width*.99,.82*r),(s*width*.96,.84*r)],groove,spin)
        lathe_x('Yellow wheel rim', [(-width-.025,0),(-width-.025,.35*r),(-width+.035,.4*r),(-width+.035,.49*r),(-width-.018,.52*r),(width+.018,.52*r),(width-.035,.49*r),(width-.035,.4*r),(width+.025,.35*r),(width+.025,0)],bright,spin)
        for s in [-1,1]:
            rod('Wheel center hub',(s*(width+.01),0,0),(s*(width+.065),0,0),r*.19,edge,spin,20)
            for i in range(6):a=i*pi/3;rod('Hub bolt',(s*(width+.015),cos(a)*r*.31,sin(a)*r*.31),(s*(width+.04),cos(a)*r*.31,sin(a)*r*.31),.025,trim,spin,6)
        if axle=='Rear':
            # Shallow fenders just over the tire crown; sides remain exposed.
            profile=[]
            for i in range(17):a=pi*(.18+.64*i/16);profile.append((r+sin(a)*(r+.16),z+cos(a)*(r+.1)))
            for i in reversed(range(17)):a=pi*(.18+.64*i/16);profile.append((r+sin(a)*(r+.075),z+cos(a)*(r+.05)))
            plate('Rear curved mudguard_'+label,profile,.76,paint,x=axle_x,bevel=.016)
rod('Rear axle',(-1.28,.92,-1.12),(1.28,.92,-1.12),.12,trim)
rod('Front axle',(-1.23,.66,1.36),(1.23,.66,1.36),.09,trim)

loader=pivot('FrontLoaderPivot',root,(0,1.62,.08))
for side in [-1,1]:
    # Custom bent arm plate, not a cylinder or box substitute.
    profile=[(.09,-.08),(.23,.11),(-.51,1.62),(-.78,2.08),(-.98,2.05),(-.72,1.55)]
    plate('Front sculpted lift arm',profile,.18,paint,loader,x=side*1.01,bevel=.045)
    rod('Loader base pin',(side*.91,0,0),(side*1.13,0,0),.13,edge,loader)
    hydraulic('FrontLift_'+('L' if side<0 else 'R'),anchor('FrontLiftBase_'+str(side),root,(side*1.07,1.94,.28)),anchor('FrontLiftTop_'+str(side),loader,(side*1.07,-.52,1.53)),.08)
rod('Loader crossbrace',(-1.01,-.72,1.84),(1.01,-.72,1.84),.12,edge,loader)
front_bucket=pivot('FrontBucketPivot',loader,(0,-.92,2.12))
front_shell=pivot('FrontBucketShell',front_bucket,(0,-.51,.38))

def bezier2(a,b,c,d,count=12):
    return [tuple((1-t)**3*a[j]+3*(1-t)**2*t*b[j]+3*(1-t)*t*t*c[j]+t**3*d[j] for j in range(2)) for t in [i/count for i in range(count+1)]]

def bucket(name,parent,width=3.12,height=1.36,depth=1.25):
    # Deep J-section: upright curved back, rounded heel, flatter cutting floor.
    # Profile coordinates are height / forward, with the scoop opening toward +Z.
    profile=bezier2((height,-.38),(height*.64,-.48),(.1,-.5),(.025,.12))
    profile+=bezier2((.025,.12),(-.025,.38),(-.02,depth*.62),(.015,depth-.28))[1:]
    verts=[];cols=8;n=len(profile);stride=cols+1;skin=n*stride
    for layer in [0,1]:
        for y,z in profile:
            for i in range(cols+1):
                x=width*(i/cols-.5);verts.append((x,y-layer*.085,z-layer*.07+.025*(1-(2*x/width)**2)))
    faces=[]
    for layer in [0,1]:
        for j in range(n-1):
            for i in range(cols):k=layer*skin+j*stride+i;faces.append((k,k+1,k+stride+1,k+stride))
    for j in [0,n-1]:
        for i in range(cols):k=j*stride+i;faces.append((k,k+skin,k+skin+1,k+1))
    shell=mesh(name+'_curved_scoop',verts,faces,paint,parent)
    # Solid rounded end plates, with curved sloping front edges and thickness.
    top_edge=bezier2((.015,depth-.28),(.1,depth*.27),(height*.73,-.13),(height,-.38),18)
    cheek=profile+top_edge[1:-1]
    for side in [-1,1]:
        plate(name+'_shaped_end_cheek',cheek,.09,paint,parent,x=side*width/2,bevel=.035)
        # Beaded upper rim follows the shaped side; visible thickness at all angles.
        tube(name+'_rolled_side_rim',[(side*width/2,y+.015,z) for y,z in top_edge],.026,bright,parent)
    lip=[(.02,depth-.34),(-.085,depth-.34),(-.06,depth-.19),(.005,depth-.13)]
    plate(name+'_hardened_cutting_blade',lip,width+.15,edge,parent,bevel=.012)
    # Flush bolt heads on the cutting edge; only the rear digging bucket has teeth.
    for i in range(7):rod(name+'_edge_rivet',((i-3)*width/7,.025,depth-.26),((i-3)*width/7,.043,depth-.26),.022,trim,parent,6)
    if name.startswith('Rear'):
        for i in range(4):plate(name+'_digging_tooth',[(.035,depth-.22),(-.055,depth-.22),(-.08,depth+.03),(-.01,depth+.1)],.15,edge,parent,x=(i-1.5)*width/4,bevel=.013)
    return shell

bucket('FrontBucket',front_shell)
hydraulic('FrontCurl',anchor('FrontCurlBase',loader,(0,-.15,.9)),anchor('FrontCurlEnd',front_bucket,(0,.55,-.12)),.07)
rod('Bucket tilt bellcrank',(0,-.5,1.58),(0,-.85,2.07),.08,edge,loader)

rear_swing=pivot('RearSwingPivot',root,(0,1.29,-1.88))
loft('Rear swing casting',[(-.16,.37,.32,-.3),(.17,.37,.32,-.3),(.3,.26,.23,-.23)],edge,rear_swing)
boom=pivot('RearBoomPivot',rear_swing,(0,.18,-.12))
plate('Rear tapered main boom',[(0,.12),(.38,.22),(2.62,-.4),(2.99,-.65),(3.09,-.83),(2.88,-1.02),(.22,-.3)],.31,paint,boom,bevel=.055)
stick=pivot('RearStickPivot',boom,(0,2.98,-.77))
plate('Rear curved descending stick',[(.12,.12),(.14,-.17),(-.3,-.36),(-3.27,-1.23),(-3.48,-1.13),(-3.28,-.87),(-.34,-.02)],.23,paint,stick,bevel=.04)
rear_bucket=pivot('RearBucketPivot',stick,(0,-3.34,-1.06))
rear_shell=pivot('RearBucketShell',rear_bucket);rear_shell.rotation_euler[2]=0
bucket('RearDiggingBucket',rear_shell,1.18,.79,.85)
for parent,name in [(boom,'Boom'),(stick,'Stick'),(rear_bucket,'RearBucket')]:rod(name+'_joint_pin',(-.25,0,0),(.25,0,0),.13,edge,parent)
hydraulic('RearBoom',anchor('RearBoomBase',rear_swing,(.26,.05,.24)),anchor('RearBoomEnd',boom,(.26,2.35,-.39)),.085)
hydraulic('RearStick',anchor('RearStickBase',boom,(-.25,2.8,-.72)),anchor('RearStickEnd',stick,(-.25,-1.8,-.7)),.07)
hydraulic('RearCurl',anchor('RearCurlBase',stick,(.22,-2.18,-.83)),anchor('RearCurlEnd',rear_bucket,(.22,.46,-.14)),.06)
# Hinged stabilizers are tucked close to the rear chassis in the driving pose.
# Cast clevis cheeks and black washers give each articulated joint a mechanical seat.
for joint,joint_name in [(boom,'Boom'),(stick,'Stick'),(rear_bucket,'Digging bucket'),(loader,'Loader')]:
    for side in [-1,1]:
        rod(joint_name+' pivot washer',(side*.185,0,0),(side*.235,0,0),.17,trim,joint,16)
        rod(joint_name+' yellow pin cap',(side*.235,0,0),(side*.275,0,0),.11,bright,joint,16)
for side in [-1,1]:
    loft('Rear bumper end casting',[(1.02,.22,.15,-.15),(1.12,.28,.2,-.19),(1.55,.27,.2,-.19),(1.6,.22,.15,-.15)],paint,root,segments=16)
    o=bpy.context.scene.objects.get('Rear bumper end casting'+('' if side<0 else '.001'))
    if o:o.location=xyz((side*.99,0,-1.84))
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
root['sourceReference']='reference.png; supplied multi-view sheet; no facial features'
joint_limits={
 'FrontLoaderPivot':[-.85,.12],'FrontBucketPivot':[-.7,.9],
 'RearSwingPivot':[-1.15,1.15],'RearBoomPivot':[-.3,.35],
 'RearStickPivot':[-.65,.75],'RearBucketPivot':[-.85,1.15],
}
for name,limits in joint_limits.items():bpy.data.objects[name]['limitsRadians']=limits

# Apply the bevel/normal modifiers to export geometry, keep editable originals in .blend.
scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.world.color=(.35,.35,.35)
scene.render.engine='BLENDER_EEVEE';scene.eevee.use_gtao=True;scene.eevee.gtao_distance=3;scene.eevee.gtao_factor=1.25
scene.view_settings.view_transform='Filmic';scene.view_settings.look='Medium High Contrast';scene.view_settings.exposure=0;scene.view_settings.gamma=1
# Studio objects stay outside the exported Dirty hierarchy.
studio=bpy.data.collections.new('Studio - not exported');scene.collection.children.link(studio)
def studio_link(o):
    for collection in list(o.users_collection):collection.objects.unlink(o)
    studio.objects.link(o)
for name,loc,energy,size in [('Key',(-6,-7,10),1100,6),('Fill',(7,-4,6),850,7),('Rim',(1,7,9),1400,5)]:
    data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.size=size;o=bpy.data.objects.new(name,data);studio.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,2))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(9,-12,7));camera=bpy.context.object;camera.name='Review camera';studio_link(camera);camera.rotation_euler=(Vector((0,-.3,2))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=9;scene.camera=camera
scene.render.resolution_x=1200;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.55,.57,.59,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.6
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.04));floor=bpy.context.object;floor.name='Studio floor';studio_link(floor);floor.data.materials.append(material('Studio gray',(.65,.67,.68),.85,0))

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'dirty.blend'))
# Keep editable modifiers in the .blend, but merge stationary render parts per material
# and moving parent for a much smaller number of runtime draw calls.
protected={entry[key] for entry in hydraulics for key in ['barrel','rod']}
protected.update(['Windshield_single_curved','Rear_window','Left_side_window','Right_side_window'])
def descendants_for_export(o):
    for child in o.children:
        yield child
        for nested in descendants_for_export(child):yield nested
objects=list(descendants_for_export(root));deps=bpy.context.evaluated_depsgraph_get()
for o in objects:
    if o.type=='MESH' and o.modifiers:
        data=bpy.data.meshes.new_from_object(o.evaluated_get(deps));o.modifiers.clear();o.data=data
buckets={}
for o in objects:
    if o.type!='MESH' or o.name in protected:continue
    key=(o.parent.name,tuple(m.name for m in o.data.materials));buckets.setdefault(key,[]).append(o)
for key,parts in buckets.items():
    if len(parts)<2:continue
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts:o.select_set(True)
    bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();parts[0].name=key[0]+'_'+key[1][0].split(' ')[0]+'_surface';bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
bpy.ops.object.select_all(action='DESELECT')
def select_tree(o):
    o.select_set(True)
    for child in o.children:select_tree(child)
select_tree(root);bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'dirty.glb'),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_extras=True,export_animations=False,export_cameras=False,export_lights=False,export_texcoords=True,export_tangents=False)
# Report evaluated triangle count, bounds, object names for the viewer/QA.
deps=bpy.context.evaluated_depsgraph_get();triangles=0
def descendants(o):
    for child in o.children:
        yield child
        for nested in descendants(child):yield nested
for o in descendants(root):
    if o.type=='MESH':
        evaluated=o.evaluated_get(deps);data=evaluated.to_mesh();data.calc_loop_triangles();triangles+=len(data.loop_triangles);evaluated.to_mesh_clear()
manifest=dict(blender=bpy.app.version_string,triangles=triangles,wheels=wheel_info,hydraulics=hydraulics,jointLimits=joint_limits,orientation='+Z forward, +Y up after glTF export',reviewOnly=False,revision='reference-sheet-v2')
with open(os.path.join(OUT,'manifest.json'),'w') as f:json.dump(manifest,f,indent=2)
print('DIRTY_BUILD_OK',triangles,'triangles',os.path.getsize(os.path.join(OUT,'dirty.glb')),'GLB bytes')
# Eevee studio render is useful even if browser graphics is unavailable.
scene.render.resolution_x=900;scene.render.resolution_y=760
comparison=os.path.join(OUT,'comparison');os.makedirs(comparison,exist_ok=True)
views=[('front',(0,2.3,14),6.6),('side',(14,2.4,0),9.6),('rear',(0,2.3,-14),6.6),('top',(0,15,.01),11.3),('front-three-quarter',(8,5.3,11),8.9),('rear-three-quarter',(8,5.3,-11),8.9)]
for name,position,scale in views:
    camera.location=xyz(position);camera.rotation_euler=(Vector(xyz((0,2,0)))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=scale
    scene.render.filepath=os.path.join(comparison,name+'.png');bpy.ops.render.render(write_still=True)
    if name=='front-three-quarter':bpy.data.images['Render Result'].save_render(os.path.join(OUT,'blender-preview.png'),scene=scene)
print('DIRTY_COMPARISONS_OK',comparison)

