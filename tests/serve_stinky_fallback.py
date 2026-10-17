"""Serve the real game with an intentional Stinky GLB 404 to verify fallback."""
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit
ROOT=Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
    def do_GET(self):
        if urlsplit(self.path).path=='/assets/stinky/stinky.glb':self.send_error(404,'Intentional fallback test');return
        super().do_GET()
if __name__=='__main__':ThreadingHTTPServer(('127.0.0.1',8002),Handler).serve_forever()
