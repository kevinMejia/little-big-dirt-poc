"""Dependency-free static production build; runtime files are copied unchanged."""
from pathlib import Path
import hashlib, json, shutil

ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist'
ASSET_TYPES={'.js','.json','.glb','.gltf','.bin','.blend','.png','.jpg','.jpeg','.webp','.svg','.wav','.ogg','.mp3','.m4a','.md'}

def build():
    # Clean only our fixed generated directory; never follow a linked output path.
    if DIST.is_symlink() or DIST.resolve().parent!=ROOT.resolve():
        raise RuntimeError('Unsafe build output path')
    files=[ROOT/'index.html',*sorted(ROOT.glob('*.js'))]
    for folder in ['viewer','assets']:
        for p in sorted((ROOT/folder).rglob('*')):
            if p.is_symlink():raise RuntimeError('Symlinks are not deployment assets: '+str(p))
            if p.name=='environment-browser-preview.png' or p.name.startswith(('credentials','service-account','.')):continue
            if p.is_file() and (p.suffix.lower() in ASSET_TYPES or (folder=='viewer' and p.suffix=='.html')):
                files.append(p)
    if DIST.exists():shutil.rmtree(DIST)
    DIST.mkdir()
    hashes={}
    for source in files:
        relative=source.relative_to(ROOT);target=DIST/relative
        if source.stat().st_size>=100*1024*1024:raise RuntimeError('Asset exceeds GitHub normal file limit: '+str(relative))
        target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,target)
        hashes[relative.as_posix()]=hashlib.sha256(target.read_bytes()).hexdigest()
    (DIST/'.nojekyll').write_text('',encoding='utf-8')
    (DIST/'build-manifest.json').write_text(json.dumps({'base':'/dirty-sandbox-game/','files':hashes},indent=2)+'\n',encoding='utf-8')
    print(f'Built {len(files)} unchanged files, {sum(p.stat().st_size for p in DIST.rglob("*") if p.is_file())/1024/1024:.1f} MiB -> {DIST}')

if __name__=='__main__':build()
