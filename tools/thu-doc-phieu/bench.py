import json, sys, subprocess, random, os, numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); from render import render_sheet, photo
def run(mod, gpath, img):
    h, w = img.shape; import threading, uuid; p = '/tmp/b_%s.raw' % uuid.uuid4().hex; img.tofile(p)
    o = subprocess.run(['node', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'run.js'), mod, gpath, p, str(w), str(h)], capture_output=True, text=True)
    os.remove(p); return json.loads(o.stdout)
