from pathlib import Path
import shutil,subprocess,tempfile,urllib.request
root=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='dirt-polish-tests-') as folder:
    work=Path(folder);(work/'tests').mkdir();cached=Path(tempfile.gettempdir())/'three-backhoe.mjs'
    if cached.exists():shutil.copyfile(cached,work/'three-test.mjs')
    else:urllib.request.urlretrieve('https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js',work/'three-test.mjs')
    for name in ['VisualPolish.js','GroundTextures.js','VehicleConfig.js','WorldEnvironmentConfig.js']:
        (work/name).write_text((root/name).read_text(encoding='utf-8').replace("from 'three'","from './three-test.mjs'"),encoding='utf-8')
    (work/'package.json').write_text('{"type":"module"}')
    shutil.copyfile(root/'tests/visual-polish.mjs',work/'tests/visual-polish.mjs')
    subprocess.run(['node',str(work/'tests/visual-polish.mjs')],check=True)
