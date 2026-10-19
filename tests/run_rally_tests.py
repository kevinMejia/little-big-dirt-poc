from pathlib import Path
import shutil, subprocess, tempfile
root=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='rally-test-') as folder:
 work=Path(folder);(work/'tests').mkdir()
 cached=Path(tempfile.gettempdir())/'three-backhoe.mjs'
 if not cached.exists():raise RuntimeError('Run existing Rapier tests to populate the Three.js cache')
 shutil.copyfile(cached,work/'three-test.mjs')
 for name in ['RallyTrack.js','RallyTrackConfig.js','RallyScenery.js']:
  (work/name).write_text((root/name).read_text(encoding='utf-8').replace("'three'","'./three-test.mjs'"),encoding='utf-8')
 (work/'package.json').write_text('{"type":"module"}')
 shutil.copyfile(root/'tests/rally-track.mjs',work/'tests/rally-track.mjs')
 subprocess.run(['node',str(work/'tests/rally-track.mjs')],check=True)
