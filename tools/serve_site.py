"""Preview with the real Pages subdirectory, without a bundler or URL rewriting."""
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit
import argparse

ROOT=Path(__file__).resolve().parents[1]
def handler(directory,base):
    class Handler(SimpleHTTPRequestHandler):
        def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(directory),**kwargs)
        def do_GET(self):
            path=urlsplit(self.path).path
            if path==base.rstrip('/'):
                self.send_response(301);self.send_header('Location',base);self.end_headers();return
            if not path.startswith(base):self.send_error(404,'Outside configured Pages base');return
            self.path='/'+self.path[len(base):];super().do_GET()
        def do_HEAD(self):
            if not urlsplit(self.path).path.startswith(base):self.send_error(404);return
            self.path='/'+self.path[len(base):];super().do_HEAD()
        def guess_type(self,path):
            return {'.js':'text/javascript','.mjs':'text/javascript','.glb':'model/gltf-binary','.gltf':'model/gltf+json'}.get(Path(path).suffix,super().guess_type(path))
    return Handler

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--production',action='store_true');parser.add_argument('--port',type=int,default=8001);parser.add_argument('--base',default='/dirty-sandbox-game/');args=parser.parse_args()
    base='/'+args.base.strip('/')+'/'
    folder=ROOT/'dist' if args.production else ROOT
    if not (folder/'index.html').is_file():parser.error('Run python tools/build_site.py first')
    print(f'Preview: http://127.0.0.1:{args.port}{base}',flush=True)
    ThreadingHTTPServer(('127.0.0.1',args.port),handler(folder,base)).serve_forever()
