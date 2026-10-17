from pathlib import Path
import shutil,subprocess,tempfile,urllib.request,sys
root=Path(__file__).resolve().parents[1]
asset=root/'assets/stinky'
with tempfile.TemporaryDirectory(prefix='dirty-control-tests-') as folder:
    work=Path(folder);(work/'tests').mkdir();cached=Path(tempfile.gettempdir())/'three-backhoe.mjs'
    if cached.exists():shutil.copyfile(cached,work/'three-test.mjs')
    else:urllib.request.urlretrieve('https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js',work/'three-test.mjs')
    source=(root/'assets/stinky/StinkyGLB.js').read_text(encoding='utf-8').replace("from 'three'","from './three-test.mjs'").replace("import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';",'')
    (work/'StinkyGLB-test.mjs').write_text(source,encoding='utf-8');shutil.copyfile(root/'tests/stinky-controls.mjs',work/'tests/stinky-controls.mjs')
    shutil.copyfile(root/'VehicleFeedback.js',work/'VehicleFeedback.js')
    subprocess.run(['node',str(work/'tests/stinky-controls.mjs'),str(asset/'stinky.glb'),str(asset/'manifest.json')],check=True)
