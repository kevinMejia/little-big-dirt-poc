import bpy,json
from pathlib import Path
root=Path.cwd();bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(root/'assets/audi_rs_q_e-tron.glb'))
report=[]
for o in bpy.data.objects:
 if o.type!='MESH':continue
 coords=[o.matrix_world@v.co for v in o.data.vertices];bounds=[[min(v[i] for v in coords),max(v[i] for v in coords)] for i in range(3)]
 report.append({'name':o.name,'bounds':bounds,'materials':[m.name for m in o.data.materials],'uv':[(u.name,len(u.data)) for u in o.data.uv_layers],'vertices':len(o.data.vertices),'triangles':len(o.data.polygons)})
print(json.dumps(report,indent=2));(root/'docs/audi-material-inspection.json').write_text(json.dumps(report,indent=2))
