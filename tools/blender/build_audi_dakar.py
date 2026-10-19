"""Rebuild the Audi's painted UV atlases in Blender; preserve source topology/rig.
Run: blender -b --python tools/blender/build_audi_dakar.py
"""
import bpy, numpy as np, json, math
from pathlib import Path
from mathutils import Quaternion
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/audi-dakar';OUT.mkdir(parents=True,exist_ok=True)
TEX=OUT/'textures';TEX.mkdir(exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.import_scene.gltf(filepath=str(ROOT/'assets/audi_rs_q_e-tron.glb'))
# Paint in the closed pose, then restore the exact source hinge for game animation.
hinge=bpy.data.objects['PuertaCopi001'];original_rotation=hinge.rotation_quaternion.copy();hinge.rotation_quaternion=original_rotation@Quaternion((1,0,0),math.pi/2)
bpy.context.view_layer.update()
BODY={'Chasis','TapaMotor','Puertas','Chimenea','Parachoques_trasero'}
SIZE=1024
# Deliberate longitudinal/vertical masks: shared world coordinates align panels.
SIDE_GRAY=[(.03,.49),(.20,.64),(.31,.58),(.39,.43),(.52,.40),(.64,.27),(.47,.27),(.34,.36),(.25,.49),(.10,.41)]
SIDE_LIGHT=[(.57,.69),(.74,.68),(.89,.51),(.95,.44),(.80,.46),(.70,.58),(.62,.55)]
SIDE_REAR=[(.75,.33),(.88,.40),(.99,.36),(.99,.60),(.88,.63),(.92,.51),(.78,.47)]
HOOD_GRAY=[(.015,.20),(.23,.35),(.36,.19),(.47,.24),(.54,.43),(.33,.41),(.22,.57),(.09,.47)]
HOOD_LIGHT=[(.08,.63),(.24,.77),(.34,.69),(.42,.79),(.53,.72),(.41,.57),(.24,.62),(.17,.51)]

def polygon(a,b,points):
 inside=np.zeros(a.shape,dtype=bool)
 for (x1,y1),(x2,y2) in zip(points,points[1:]+points[:1]):
  inside^=((y1>b)!=(y2>b))&(a<(x2-x1)*(b-y1)/(y2-y1+1e-12)+x1)
 return inside

def paint(pos,normal):
 # Blender import converts glTF +Z forward into -Y; symmetry handles mirrored UVs.
 f=(pos[:,1]+1.0014)/1.8823;h=(pos[:,2]+.452)/.84;lat=np.abs((pos[:,0]-.18135)/.54)
 rgb=np.tile(np.array([.065,.078,.09],dtype=np.float32),(len(pos),1));rough=np.full(len(pos),.72,dtype=np.float32)
 side=np.abs(normal[:,0])>.38;top=normal[:,2]>.45
 gray=side&polygon(f,h,SIDE_GRAY);light=side&polygon(f,h,SIDE_LIGHT);rear=side&polygon(f,h,SIDE_REAR)
 rgb[gray]=[.24,.27,.29];rgb[light]=[.43,.46,.48];rgb[rear]=[.28,.32,.35]
 # Large connected hood/roof graphics, no remnants of the old red emblem/number.
 hg=top&polygon(f,lat,HOOD_GRAY);hl=top&polygon(f,lat,HOOD_LIGHT)
 rgb[hg]=[.27,.30,.32];rgb[hl]=[.40,.43,.45]
 roof=top&(f>.38)&(f<.64)&(lat<.62);rgb[roof&((lat+.5*f)>.34)&((lat+.5*f)<.58)]=[.40,.43,.45]
 lower=side&(h<.32);rgb[lower]=[.035,.043,.05];rough[lower]=.82
 # Continuous red sill band and crisp angled hatching, placed above the chassis floor.
 band=side&(h>.285)&(h<.338)&(f>.10)&(f<.92)
 stripe=band&((np.mod(f*52+h*9,1))<.43);rgb[stripe]=[.89,.045,.055];rough[stripe]=.34
 pin=side&(np.abs(h-(.36+.015*f))<.006)&(f>.11)&(f<.97);rgb[pin]=[.96,.065,.065];rough[pin]=.32
 # Front air inlet surrounds and upper intake/roof red accents follow real surfaces.
 intake=(f<.045)&(h>.38)&(h<.57)&(lat>.25)&(lat<.83)
 roof_red=(f>.57)&(f<.82)&(h>.88)
 rear_red=(f>.94)&(h>.41)&(h<.49)
 red=intake|roof_red|rear_red;rgb[red]=[.93,.055,.065];rough[red]=.33
 # Keep glazed cabin areas dark rather than applying camouflage over windows.
 glass=(h>.69)&(f>.19)&(f<.61)&(((np.abs(normal[:,0])>.48)&(lat>.60))|((normal[:,1]<-.30)&(f<.61)))
 rgb[glass]=[.004,.008,.012];rough[glass]=.36
 # Four outlined Audi rings in the side's center; symmetric on either side.
 for center in [.23,.265,.30,.335]:
  ring=np.abs(((f-center)/.022)**2+((h-.58)/.050)**2-1)<.18
  rgb[side&ring]=[.83,.85,.85];rough[side&ring]=.40
 # Audi identity badge on the hood's original surface, not floating decal geometry.
 g=(pos[:,0]-.18135)/.54
 for center in [-.07,-.023,.023,.07]:
  badge=top&(np.abs(((g-center)/.029)**2+((f-.08)/.008)**2-1)<.25)
  rgb[badge]=[.72,.75,.76];rough[badge]=.38
 # Small rally plate and race number 204: dark plate, sharp high-contrast stencil digits.
 plate=side&(f>.66)&(f<.79)&(h>.45)&(h<.585);rgb[plate]=[.045,.06,.07]
 digits={'2':[(0,0,1,.13),(.87,0,1,.5),(0,.44,1,.57),(0,.5,.13,1),(0,.87,1,1)],'0':[(0,0,1,.13),(0,.87,1,1),(0,0,.13,1),(.87,0,1,1)],'4':[(0,0,.13,.57),(.87,0,1,1),(0,.44,1,.57)]}
 text_f=np.where(pos[:,0]<.18135,1.45-f,f) # readable numbers on the opposite side
 for k,char in enumerate('204'):
  dx=(text_f-(.672+k*.035))/.026;dy=(.568-h)/.098
  for x1,y1,x2,y2 in digits[char]:rgb[side&(dx>x1)&(dx<x2)&(dy>y1)&(dy<y2)]=[.88,.90,.87]
 return rgb,rough

def image(name,array,path,linear=False):
 im=bpy.data.images.new(name,width=SIZE,height=SIZE,alpha=True);im.colorspace_settings.name='Non-Color' if linear else 'sRGB';im.pixels.foreach_set(array.ravel());im.filepath_raw=str(path);im.file_format='PNG';im.save();return im

report=[]
for mat in list(bpy.data.materials):
 if mat.name not in BODY:continue
 color=np.zeros((SIZE,SIZE,4),dtype=np.float32);color[:,:,:3]=[.065,.078,.09];color[:,:,3]=1
 rough=np.ones((SIZE,SIZE,4),dtype=np.float32);rough[:,:,:3]=.72
 covered=np.zeros((SIZE,SIZE),dtype=np.uint8);overlap=0;triangles=0
 for obj in [o for o in bpy.data.objects if o.type=='MESH' and mat in list(o.data.materials)]:
  mesh=obj.data;mesh.calc_loop_triangles();uv=mesh.uv_layers.active.data;world=obj.matrix_world;normal_matrix=world.to_3x3().inverted().transposed()
  for tri in mesh.loop_triangles:
   if mesh.materials[tri.material_index]!=mat:continue
   points=np.array([list(world@mesh.vertices[v].co) for v in tri.vertices]);norm=np.array(list((normal_matrix@tri.normal).normalized()))
   coords=np.array([list(uv[l].uv) for l in tri.loops])*(SIZE-1)
   lo=np.maximum(np.floor(coords.min(axis=0)).astype(int),0);hi=np.minimum(np.ceil(coords.max(axis=0)).astype(int),SIZE-1)
   if np.any(hi<lo):continue
   xx,yy=np.meshgrid(np.arange(lo[0],hi[0]+1),np.arange(lo[1],hi[1]+1));a,b,c=coords;den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
   if abs(den)<1e-9:continue
   u=((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1]))/den;v=((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/den;w=1-u-v;mask=(u>=-.0001)&(v>=-.0001)&(w>=-.0001)
   if not mask.any():continue
   px=xx[mask];py=yy[mask];pos=u[mask,None]*points[0]+v[mask,None]*points[1]+w[mask,None]*points[2]
   rgb,r=paint(pos,np.tile(norm,(len(pos),1)));color[py,px,:3]=rgb;rough[py,px,0]=1;rough[py,px,1]=r;rough[py,px,2]=np.where(r<.40,0,.18);overlap+=int((covered[py,px]>0).sum());covered[py,px]=1;triangles+=1
 # Four-pixel UV gutter dilation prevents dark mip seams, without changing UVs.
 for step in range(4):
  new=covered.copy()
  for dy,dx in [(1,0),(-1,0),(0,1),(0,-1)]:
   shifted=np.roll(covered,(dy,dx),(0,1));fill=(covered==0)&(shifted>0);color[fill]=np.roll(color,(dy,dx),(0,1))[fill];rough[fill]=np.roll(rough,(dy,dx),(0,1))[fill];new[fill]=1
  covered=new
 base=image(mat.name+' Dakar base color',color,TEX/(mat.name+'-base.png'))
 rm=image(mat.name+' Dakar roughness',rough,TEX/(mat.name+'-roughness.png'),True)
 nodes=mat.node_tree.nodes;links=mat.node_tree.links;bsdf=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
 for key in ['Base Color','Metallic','Roughness']:
  for link in list(bsdf.inputs[key].links):links.remove(link)
 tex=nodes.new('ShaderNodeTexImage');tex.image=base;links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
 tex=nodes.new('ShaderNodeTexImage');tex.image=rm;separate=nodes.new('ShaderNodeSeparateColor');links.new(tex.outputs['Color'],separate.inputs['Color']);links.new(separate.outputs['Green'],bsdf.inputs['Roughness']);links.new(separate.outputs['Blue'],bsdf.inputs['Metallic'])
 for node in nodes:
  if node.type=='NORMAL_MAP':node.inputs['Strength'].default_value=.12
 report.append({'material':mat.name,'paintedTriangles':triangles,'coveredPixels':int(covered.sum()),'overlappingPixelWrites':overlap,'resolution':SIZE})
 print('Painted',mat.name,flush=True)
# Recolor only the rim ink in the existing wheel UV atlas; rubber tread remains intact.
for name in ['Ruedas','RuedasRepuesto']:
 mat=bpy.data.materials.get(name)
 if not mat:continue
 bsdf=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED');node=bsdf.inputs['Base Color'].links[0].from_node;source=node.image
 data=np.array(source.pixels[:],dtype=np.float32).reshape(source.size[1],source.size[0],4);rim=(data[:,:,0]>.18)&(data[:,:,0]>data[:,:,1]*1.8)&(data[:,:,0]>data[:,:,2]*2)
 if name=='RuedasRepuesto':
  ink=(data[:,:,:3].max(axis=2)>.08);data[ink,:3]=[.065,.078,.09]
 else:data[rim,:3]=[.89,.065,.025]
 im=bpy.data.images.new(name+' Dakar orange rims',width=source.size[0],height=source.size[1],alpha=True);im.pixels.foreach_set(data.ravel());im.filepath_raw=str(TEX/(name+'-base.png'));im.file_format='PNG';im.save();node.image=im
 # The rim keeps a metallic sheen; the tire stays rough, without the old mirror finish.
 for link in list(bsdf.inputs['Roughness'].links):mat.node_tree.links.remove(link)
 roughdata=np.ones_like(data);roughdata[:,:,:3]=.88;roughdata[rim,:3]=.4
 ri=bpy.data.images.new(name+' Dakar wheel roughness',width=source.size[0],height=source.size[1],alpha=True);ri.colorspace_settings.name='Non-Color';ri.pixels.foreach_set(roughdata.ravel());ri.filepath_raw=str(TEX/(name+'-roughness.png'));ri.file_format='PNG';ri.save();rn=mat.node_tree.nodes.new('ShaderNodeTexImage');rn.image=ri;mat.node_tree.links.new(rn.outputs['Color'],bsdf.inputs['Roughness'])
hinge.rotation_quaternion=original_rotation;bpy.context.view_layer.update()
# Export only the source hierarchy. No studio geometry/cameras enter the game asset.
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'audi_rs_q_e-tron_dakar.blend'))
bpy.ops.export_scene.gltf(filepath=str(ROOT/'assets/audi_rs_q_e-tron_dakar.glb'),export_format='GLB',export_yup=True,export_cameras=False,export_lights=False,export_extras=True,export_texcoords=True,export_normals=True)
(OUT/'uv-inspection.json').write_text(json.dumps(report,indent=2))
# Save an editable source with its textures packed and a closed door for inspection.
hinge.rotation_quaternion=original_rotation@Quaternion((1,0,0),math.pi/2);bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'audi_rs_q_e-tron_dakar.blend'))
print('DAKAR EXPORT COMPLETE',flush=True)
