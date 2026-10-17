"""Run with python tests/run_tree_tests.py (requires Node and internet on first run)."""
from pathlib import Path
import shutil, subprocess, tempfile, urllib.request
root = Path(__file__).resolve().parents[1]
cdn = 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js'
with tempfile.TemporaryDirectory(prefix='dirt-tree-tests-') as folder:
    work = Path(folder)
    cached = Path(tempfile.gettempdir()) / 'three-backhoe.mjs'
    if cached.exists():
        shutil.copyfile(cached, work / 'three-test.mjs')
    else:
        urllib.request.urlretrieve(cdn, work / 'three-test.mjs')
    (work / 'TreeCollisionSystem.js').write_text((root / 'TreeCollisionSystem.js').read_text().replace(cdn, './three-test.mjs'))
    shutil.copyfile(root / 'VehicleConfig.js', work / 'VehicleConfig.js')
    (work / 'package.json').write_text('{"type":"module"}')
    (work / 'tests').mkdir()
    shutil.copyfile(root / 'tests/tree-collisions.mjs', work / 'tests/tree-collisions.mjs')
    subprocess.run(['node', str(work / 'tests/tree-collisions.mjs')], check=True)
    shutil.copyfile(root / 'tests/tree-knockdowns.mjs', work / 'tests/tree-knockdowns.mjs')
    subprocess.run(['node', str(work / 'tests/tree-knockdowns.mjs')], check=True)

    (work / 'RockInteractionSystem.js').write_text((root / 'RockInteractionSystem.js').read_text().replace(cdn, './three-test.mjs'))
    shutil.copyfile(root / 'tests/rock-interactions.mjs', work / 'tests/rock-interactions.mjs')
    subprocess.run(['node', str(work / 'tests/rock-interactions.mjs')], check=True)
