from pathlib import Path
import shutil,subprocess,tempfile,urllib.request
root=Path(__file__).resolve().parents[1]
cdn='https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js'
with tempfile.TemporaryDirectory(prefix='dirt-appearance-tests-') as folder:
    work=Path(folder);(work/'tests').mkdir();cached=Path(tempfile.gettempdir())/'three-backhoe.mjs'
    if cached.exists():shutil.copyfile(cached,work/'three-test.mjs')
    else:urllib.request.urlretrieve(cdn,work/'three-test.mjs')
    text=(root/'WorldAppearance.js').read_text(encoding='utf-8').replace("from 'three'","from './three-test.mjs'")
    (work/'WorldAppearance.js').write_text(text,encoding='utf-8');(work/'package.json').write_text('{"type":"module"}')
    shutil.copyfile(root/'WorldEnvironmentConfig.js',work/'WorldEnvironmentConfig.js')
    for name in ['MainWorldRamps.js','DirtJumpSystem.js','VehicleConfig.js']:
        shutil.copyfile(root/name,work/name)
    shutil.copyfile(root/'tests/world-appearance.mjs',work/'tests/world-appearance.mjs')
    subprocess.run(['node',str(work/'tests/world-appearance.mjs'),str(root/'index.html')],check=True)
