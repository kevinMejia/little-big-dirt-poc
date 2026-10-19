"""Exercise the actual lab adapter and game controller against exported GLB hierarchies."""
from pathlib import Path
import shutil, subprocess, tempfile, urllib.request
root=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='dirt-lab-alignment-') as folder:
    work=Path(folder)
    (work/'tests').mkdir();(work/'viewer/vendor/rapier').mkdir(parents=True)
    cached=Path(tempfile.gettempdir())/'three-backhoe.mjs'
    if cached.exists():shutil.copyfile(cached,work/'three-test.mjs')
    else:urllib.request.urlretrieve('https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js',work/'three-test.mjs')
    for name in ['AudiConfig.js','MainWorldSettings.js','StorybookBackgroundConfig.js','WorldEnvironmentConfig.js','AudioConfig.js','TuningStore.js','ArcadeGroundDrive.js','TurboBoost.js','RapierWorldVehicle.js','JumpVehiclePrototype.js','DirtJumpSystem.js','HillSpeedPhysics.js','VehicleMotion.js','VehicleConfig.js','VehicleFeedback.js','PlayableVehicleSetup.js','DrivingInput.js','StinkyEquipment.js','TreeCollisionSystem.js','RockInteractionSystem.js','GroundDebrisSystem.js','viewer/JumpLabVehicle.js']:
        source=(root/name).read_text(encoding='utf-8').replace("'three'", "'../three-test.mjs'" if name.startswith('viewer/') else "'./three-test.mjs'")
        source=source.replace("'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js'", "'./three-test.mjs'")
        (work/name).write_text(source,encoding='utf-8')
    for kind in ['Dirty','Stinky']:
        source=(root/f'assets/{kind.lower()}/{kind}GLB.js').read_text(encoding='utf-8').replace("from 'three'", "from './three-test.mjs'").replace("import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';",'')
        (work/f'{kind}GLB-test.mjs').write_text(source,encoding='utf-8')
    shutil.copyfile(root/'viewer/vendor/rapier/rapier.mjs',work/'viewer/vendor/rapier/rapier.mjs')
    shutil.copyfile(root/'tests/lab-alignment.mjs',work/'tests/lab-alignment.mjs')
    (work/'package.json').write_text('{"type":"module"}')
    subprocess.run(['node',str(work/'tests/lab-alignment.mjs'),str(root)],check=True)
