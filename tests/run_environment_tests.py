from pathlib import Path
import shutil, subprocess, tempfile, urllib.request
root=Path(__file__).resolve().parents[1]
cdn='https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js'
with tempfile.TemporaryDirectory(prefix='dirt-environment-tests-') as folder:
    work=Path(folder);(work/'tests').mkdir();cached=Path(tempfile.gettempdir())/'three-backhoe.mjs'
    if cached.exists():shutil.copyfile(cached,work/'three-test.mjs')
    else:urllib.request.urlretrieve(cdn,work/'three-test.mjs')
    for name in ['PineTreeConfig.js','EnvironmentWorld.js','EnvironmentAssets.js','TreeCollisionSystem.js','RockInteractionSystem.js','VehicleConfig.js']:
        text=(root/name).read_text(encoding='utf-8').replace(cdn,'./three-test.mjs').replace("from 'three'","from './three-test.mjs'")
        text=text.replace("import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';",'class GLTFLoader {loadAsync(){throw new Error("Tests must use actual decoded GLB templates");}}')
        (work/name).write_text(text,encoding='utf-8')
    (work/'package.json').write_text('{"type":"module"}')
    shutil.copyfile(root/'tests/environment-world.mjs',work/'tests/environment-world.mjs')
    subprocess.run(['node',str(work/'tests/environment-world.mjs'),str(root/'assets/models')],check=True)
