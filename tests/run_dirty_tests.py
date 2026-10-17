from pathlib import Path
import shutil,subprocess,tempfile,urllib.request,sys
root=Path(__file__).resolve().parents[1]
asset=root/'assets/dirty'/('candidate' if '--candidate' in sys.argv else 'backups/pre-reference-sheet' if '--fallback' in sys.argv else '')
with tempfile.TemporaryDirectory(prefix='dirty-control-tests-') as folder:
    work=Path(folder);(work/'tests').mkdir();cached=Path(tempfile.gettempdir())/'three-backhoe.mjs'
    if cached.exists():shutil.copyfile(cached,work/'three-test.mjs')
    else:urllib.request.urlretrieve('https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js',work/'three-test.mjs')
    source=(root/'assets/dirty/DirtyGLB.js').read_text(encoding='utf-8').replace("from 'three'","from './three-test.mjs'").replace("import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';",'')
    (work/'DirtyGLB-test.mjs').write_text(source,encoding='utf-8');shutil.copyfile(root/'tests/dirty-controls.mjs',work/'tests/dirty-controls.mjs')
    shutil.copyfile(root/'VehicleFeedback.js',work/'VehicleFeedback.js')
    subprocess.run(['node',str(work/'tests/dirty-controls.mjs'),str(asset/'dirty.glb'),str(asset/'manifest.json')],check=True)
