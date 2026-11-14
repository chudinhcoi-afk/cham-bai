"""Vẽ phiếu KHUNG TRẢ LỜI giả (giống wakHtml của MathBank) rồi mô phỏng ảnh chụp điện thoại.
python3 render.py geom.json spec.json out.png
spec: {"seed":1, "fills":[[k,j,gray,cover]], "digit_gray":150, "ppm_out":6, ...}
"""
import json, sys, math, random
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont

import os
_LIB = '/usr/share/fonts/truetype/liberation/LiberationSans-%s.ttf'; _MAC = '/System/Library/Fonts/Supplemental/Arial%s.ttf'   # Linux: Liberation; máy Mac: Arial
FONT = _LIB % 'Regular' if os.path.exists(_LIB % 'Regular') else _MAC % ''
FONTB = _LIB % 'Bold' if os.path.exists(_LIB % 'Bold') else _MAC % ' Bold'

def id_bits(i):
    b = [1]; o = 0
    for k in range(10):
        x = (i >> k) & 1; b.append(x); o += x
    b.append(0 if o % 2 else 1); return b

def id_bits_hi(i):
    if i < 1024: return []
    hi = i >> 10; b = [0]; o = 0
    for k in range(10):
        x = (hi >> k) & 1; b.append(x); o += x
    b.append(0 if o % 2 else 1); return b

def render_sheet(g, sp, S=16):
    """S px/mm, lề 40 mm quanh khung (có phần họ tên phía trên)."""
    rnd = random.Random(sp.get('seed', 1))
    M = 30; W, H = g['W'], g['H']
    im = Image.new('L', (int((W + 2*M)*S), int((H + 2*M)*S)), 255)
    d = ImageDraw.Draw(im)
    P = lambda x, y: ((x + M)*S, (y + M)*S)
    ink = sp.get('ink', 0)
    def sq(cx, cy, w, h):
        x0, y0 = P(cx - w/2, cy - h/2); x1, y1 = P(cx + w/2, cy + h/2); d.rectangle([x0, y0, x1, y1], fill=ink)
    sq(2, 2, 4, 4); sq(W-2, 2, 4, 4); sq(W-2, H-2, 4, 4); sq(2, H-2, 4, 4)
    for i, b in enumerate(id_bits(sp['id'])):
        if b: sq(14 + i*5 + 1.6, H-2, 3.2, 3)
    for i, b in enumerate(id_bits_hi(sp['id'])):
        if b: sq(14 + i*5 + 1.6, 2, 3.2, 3)
    ft = lambda mm, b=False: ImageFont.truetype(FONTB if b else FONT, max(6, int(mm*S)))
    d.text(P(8, 5), 'KHUNG TRẢ LỜI  Tô kín một ô cho mỗi câu, bằng bút chì hoặc bút mực đậm.', font=ft(2.7), fill=0)
    # tiêu đề họ tên phía trên khung
    d.text(P(4, -22), 'Họ và tên: ........................................  Lớp: ......', font=ft(3.5), fill=0)
    D = g.get('draw')
    if D:
        def ln(x1, y1, x2, y2, w):
            a = P(min(x1, x2) - w/2, min(y1, y2) - w/2); b = P(max(x1, x2) + w/2, max(y1, y2) + w/2); d.rectangle([a, b], fill=0)
        for x, y, w, h in D['rect']:
            ln(x, y, x+w, y, .3); ln(x, y+h, x+w, y+h, .3); ln(x, y, x, y+h, .3); ln(x+w, y, x+w, y+h, .3)
        for x1, y1, x2, y2 in D['line']: ln(x1, y1, x2, y2, .18)
        for t in D['text']:
            if t.get('t'): d.text(P(t['x'], t['y'] - 1.5), t['s'], font=ft(2.6, True), fill=0)
            else:
                f = ft(2.8 if t.get('b') else 2.5, bool(t.get('b'))); tw = d.textlength(t['s'], font=f)
                x = t['x'] - 0.0 if t.get('r') else t['x']
                xx = P(x, 0)[0] - (tw if t.get('r') else tw/2); d.text((xx, P(0, t['y'] - 1.5)[1]), t['s'], font=f, fill=0)
    dg = sp.get('digit_gray', 154); f22 = ft(sp.get('digit_size', 2.2), sp.get('digit_bold', False))
    for row in g['bubbles']:
        for b in row:
            cx, cy = P(b['x'], b['y']); r = 1.75*S
            d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=0, width=max(1, int(round(.25*S))))
            tw = d.textlength(b['o'], font=f22); bb = d.textbbox((0, 0), b['o'], font=f22)
            d.text((cx - tw/2, cy - (bb[1] + bb[3])/2), b['o'], font=f22, fill=dg)
    arr = np.array(im).astype(np.float32)
    # vết tô của học sinh
    for k, j, gray, cover in sp.get('fills', []):
        b = g['bubbles'][k][j]; cx, cy = P(b['x'], b['y'])
        R0 = int(2.3*S); x0, y0 = int(cx) - R0, int(cy) - R0
        sub = arr[y0:y0+2*R0, x0:x0+2*R0]
        mask = np.zeros(sub.shape, np.uint8)
        rr = 1.75*S*math.sqrt(cover)
        ox, oy = rnd.uniform(-.25, .25)*S, rnd.uniform(-.25, .25)*S
        pts = []
        for t in range(24):
            a = t/24*2*math.pi; q = rr*rnd.uniform(.85, 1.08); pts.append((int(cx - x0 + ox + q*math.cos(a)), int(cy - y0 + oy + q*math.sin(a))))
        cv2.fillPoly(mask, [np.array(pts)], 1)
        tex = gray + np.random.default_rng(rnd.randint(0, 1 << 30)).normal(0, sp.get('pencil_tex', 18), sub.shape)
        yy, xx = np.mgrid[:sub.shape[0], :sub.shape[1]]
        tex = np.clip(tex + (np.sin((xx*.9 + yy*.5)/1.7) > .6)*sp.get('pencil_gap', 25), 0, 255)
        arr[y0:y0+2*R0, x0:x0+2*R0] = np.where(mask > 0, np.minimum(sub, tex), sub)
    # vết bẩn / tẩy chưa sạch nhẹ
    for _ in range(sp.get('smudges', 0)):
        row = rnd.choice(g['bubbles']); b = rnd.choice(row); cx, cy = P(b['x'] + rnd.uniform(-1, 1), b['y'] + rnd.uniform(-1, 1))
        R0 = int(2*S); x0, y0 = int(cx) - R0, int(cy) - R0; sub = arr[y0:y0+2*R0, x0:x0+2*R0]
        yy, xx = np.ogrid[:sub.shape[0], :sub.shape[1]]
        m = ((xx - (cx - x0))**2 + (yy - (cy - y0))**2) < (rnd.uniform(.6, 1.3)*S)**2
        arr[y0:y0+2*R0, x0:x0+2*R0] = np.where(m, sub*rnd.uniform(.82, .92), sub)
    return arr, (M, S)

def photo(arr, MS, sp):
    M, S = MS; rnd = random.Random(sp.get('seed', 1) + 7)
    h, w = arr.shape
    ppm = sp.get('ppm_out', 6.0)
    sc = ppm/S
    ow, oh = int(w*sc*1.3), int(h*sc*1.3)
    src = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
    j = sp.get('persp', .04)
    cxo, cyo = ow/2, oh/2; hw, hh = w*sc/2, h*sc/2
    rot = math.radians(rnd.uniform(-1, 1)*sp.get('rot', 3))
    dst = []
    for (sx, sy) in [(-1, -1), (1, -1), (1, 1), (-1, 1)]:
        x = sx*hw*(1 + rnd.uniform(-j, j)); y = sy*hh*(1 + rnd.uniform(-j, j))
        dst.append([cxo + x*math.cos(rot) - y*math.sin(rot), cyo + x*math.sin(rot) + y*math.cos(rot)])
    Hm = cv2.getPerspectiveTransform(src, np.float32(dst))
    img = cv2.warpPerspective(arr, Hm, (ow, oh), flags=cv2.INTER_AREA, borderValue=255)
    # ánh sáng: giấy không trắng tinh, sáng tối không đều, bóng đổ
    paper = sp.get('paper', 215); grad = sp.get('grad', 30)
    yy, xx = np.mgrid[:oh, :ow].astype(np.float32)
    a = rnd.uniform(0, 2*math.pi)
    L = paper + grad*((xx/ow - .5)*math.cos(a) + (yy/oh - .5)*math.sin(a))
    if sp.get('shadow'):
        L = L - sp['shadow']*(1/(1 + np.exp(-(xx - ow*rnd.uniform(.3, .7))/(ow*.03))))
    img = img/255.0*L
    img = cv2.GaussianBlur(img, (0, 0), sp.get('blur', 1.0))
    img = img + np.random.default_rng(sp.get('seed', 1)).normal(0, sp.get('noise', 4), img.shape)
    img = np.clip(img, 0, 255).astype(np.uint8)
    ok, enc = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, sp.get('jpeg', 80)])
    return cv2.imdecode(enc, 0)

if __name__ == '__main__':
    g = json.load(open(sys.argv[1])); sp = json.load(open(sys.argv[2]))
    arr, MS = render_sheet(g, sp)
    out = photo(arr, MS, sp)
    cv2.imwrite(sys.argv[3], out)
