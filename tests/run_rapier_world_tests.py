from pathlib import Path
import shutil, subprocess, tempfile, urllib.request
root=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='dirt-rapier-world-') as folder:
    work=Path(folder);(work/'tests').mkdir();(work/'viewer/vendor/rapier').mkdir(parents=True)
    cached=Path(tempfile.gettempdir())/'three-backhoe.mjs'
    if cached.exists():shutil.copyfile(cached,work/'three-test.mjs')
    else:urllib.request.urlretrieve('https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js',work/'three-test.mjs')
    for name in ['ArcadeGroundDrive.js','RapierHandling.js','RapierWorldVehicle.js','JumpVehiclePrototype.js','DirtJumpSystem.js','HillSpeedPhysics.js','VehicleMotion.js','VehicleConfig.js','TreeCollisionSystem.js','RockInteractionSystem.js','GroundDebrisSystem.js']:
        source=(root/name).read_text(encoding='utf-8').replace("'three'","'./three-test.mjs'").replace("'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js'","'./three-test.mjs'")
        (work/name).write_text(source,encoding='utf-8')
    shutil.copyfile(root/'viewer/vendor/rapier/rapier.mjs',work/'viewer/vendor/rapier/rapier.mjs')
    shutil.copyfile(root/'tests/rapier-world.mjs',work/'tests/rapier-world.mjs')
    (work/'package.json').write_text('{"type":"module"}')
    subprocess.run(['node',str(work/'tests/rapier-world.mjs')],check=True)
