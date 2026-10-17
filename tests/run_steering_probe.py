from pathlib import Path
import tempfile,shutil,subprocess
root=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='stinky-steering-') as folder:
    work=Path(folder);(work/'tests').mkdir();(work/'viewer/vendor/rapier').mkdir(parents=True)
    for name in ['JumpVehiclePrototype.js','VehicleConfig.js','RapierHandling.js']:
        shutil.copyfile(root/name,work/name)
    shutil.copyfile(root/'viewer/vendor/rapier/rapier.mjs',work/'viewer/vendor/rapier/rapier.mjs')
    shutil.copyfile(root/'tests/rapier-steering.mjs',work/'tests/rapier-steering.mjs')
    (work/'package.json').write_text('{"type":"module"}')
    subprocess.run(['node',str(work/'tests/rapier-steering.mjs')],check=True)
