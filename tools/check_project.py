"""Check production bytes/links/GLB resources at a Pages base, then regressions."""
from pathlib import Path
from http.server import ThreadingHTTPServer
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
from urllib.request import urlopen
import hashlib, json, re, struct, subprocess, sys, threading
from serve_site import handler

ROOT=Path(__file__).resolve().parents[1];DIST=ROOT/'dist'
class Links(HTMLParser):
    def __init__(self):super().__init__();self.urls=[]
    def handle_starttag(self,tag,attrs):
        self.urls.extend(v for k,v in attrs if k in ('href','src') and v)

def local(reference,source):
    parsed=urlsplit(reference)
    if parsed.scheme or parsed.netloc or reference.startswith('#'):return
    path=unquote(parsed.path)
    if not path:return
    assert not path.startswith('/'),f'Root-absolute URL breaks project Pages: {source}: {reference}'
    target=(source.parent/path).resolve()
    assert target.is_relative_to(DIST.resolve()),f'URL escapes deployed site: {reference}'
    if target.is_dir():target=target/'index.html'
    assert target.is_file(),f'Missing local resource: {source.relative_to(DIST)} -> {reference}'

def verify():
    manifest=json.loads((DIST/'build-manifest.json').read_text())
    for relative,expected in manifest['files'].items():
        source=ROOT/relative;built=DIST/relative
        assert hashlib.sha256(source.read_bytes()).hexdigest()==expected,relative+' source/build mismatch'
        assert hashlib.sha256(built.read_bytes()).hexdigest()==expected,relative+' output mismatch'
        if built.suffix in ('.html','.js'):
            text=built.read_text(encoding='utf-8');parser=Links()
            if built.suffix=='.html':parser.feed(text)
            for url in parser.urls:local(url,built)
            for url in re.findall(r'''(?:from\s*|import\s*)['"]([^'"]+)['"]''',text):
                if url.startswith('.'):local(url,built)
            scripts=[text] if built.suffix=='.js' else re.findall(r'<script\s+type="module"[^>]*>([\s\S]*?)</script>',text)
            for script in scripts:
                subprocess.run(['node','--input-type=module','--check'],input=script,text=True,check=True,capture_output=True)
        if built.suffix=='.glb':
            raw=built.read_bytes();magic,version,total=struct.unpack_from('<4sII',raw)
            assert magic==b'glTF' and version==2 and total==len(raw),relative
            length,kind=struct.unpack_from('<II',raw,12);assert kind==0x4e4f534a
            gltf=json.loads(raw[20:20+length])
            for item in gltf.get('images',[])+gltf.get('buffers',[]):
                if item.get('uri'):local(item['uri'],built)
    required=['assets/dirty/dirty.glb','assets/dirty/manifest.json','assets/dirty/backups/pre-reference-sheet/dirty.glb','assets/dirty/backups/pre-reference-sheet/manifest.json','viewer/dirty.html','viewer/dirty-viewer.js','viewer/environment.html','assets/models/trees/cartoon_tree.glb','assets/models/rocks/cartoon_boulder.glb','assets/models/rocks/cartoon_boulder_fractured.glb']
    for prefix in ['assets/dirty/','assets/dirty/candidate/']:
        required += [prefix+'comparison/'+view+'.png' for view in ['front','side','rear','top','front-three-quarter','rear-three-quarter']]
        required += [prefix+'dirty.glb',prefix+'manifest.json']
    assert all((DIST/p).is_file() for p in required)
    class Quiet(handler(DIST,'/dirty-sandbox-game/')):
        def log_message(self,*args):pass
    server=ThreadingHTTPServer(('127.0.0.1',0),Quiet);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    try:
        base=f'http://127.0.0.1:{server.server_port}/dirty-sandbox-game/'
        for relative,expected in manifest['files'].items():
            with urlopen(base+relative) as response:
                assert response.status==200
                assert hashlib.sha256(response.read()).hexdigest()==expected,relative+' HTTP mismatch'
                if relative.endswith('.js'):assert 'javascript' in response.headers['Content-Type']
        print(f'PASS: {len(manifest["files"])} production files served unchanged under /dirty-sandbox-game/; local links and GLB resources verified',flush=True)
    finally:server.shutdown();server.server_close();thread.join()
    for test in ['hill-speed.mjs','release-deceleration.mjs','speed-adjustment.mjs','driving-input.mjs','vehicle-garage.mjs','gameplay-feedback.mjs']:
        subprocess.run(['node',str(ROOT/'tests'/test)],cwd=ROOT,check=True)
    for test in ['run_tree_tests.py','run_environment_tests.py','run_world_appearance_tests.py','run_ground_debris_tests.py','dirty-asset.py','run_dirty_tests.py']:
        subprocess.run([sys.executable,str(ROOT/'tests'/test)],cwd=ROOT,check=True)

if __name__=='__main__':verify()
