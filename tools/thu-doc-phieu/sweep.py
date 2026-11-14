import os
import json, sys, random, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from render import render_sheet, photo; from bench import run
from concurrent.futures import ThreadPoolExecutor
def cases(gpath, n, kind, seed0=0):
    g = json.load(open(gpath)); out = []
    for s in range(n):
        R = random.Random(seed0*1000 + s)
        sp = {'id':g['test']['id'], 'seed':seed0*1000+s, 'digit_gray':R.choice([50,70,90,110,130,155]), 'ppm_out':R.uniform(4.2,7.5),
              'blur':R.uniform(.7,2.2), 'noise':R.uniform(2,8), 'jpeg':R.randint(55,90), 'paper':R.uniform(165,225), 'grad':R.uniform(0,30),
              'shadow':R.choice([0,0,0,25]), 'persp':R.uniform(0,.06), 'rot':R.uniform(0,5), 'smudges':R.choice([0,0,2,5]), 'fills':[]}
        if kind.startswith('bold'): sp['digit_gray']=R.choice([20,40,60]); sp['digit_bold']=True; sp['digit_size']=R.uniform(2.2,2.6)
        truth = {}
        rows = g['rows']
        if kind not in ('blank','boldblank'):
            groups = {}
            for k, r in enumerate(rows):
                gk = r.get('g') if r.get('t') else 'q%d' % k
                groups.setdefault(gk, []).append(k)
            keep = None
            if kind == 'sparse': keep = set(R.sample(list(groups), R.randint(1, 3)))
            for gk, ks in groups.items():
                if R.random() < (0.15 if kind=='mixed' else 0.0): continue      # bỏ trống câu
                if keep is not None and gk not in keep: continue
                if kind == 'tlnblank' and rows[ks[0]].get('t'): continue
                if rows[ks[0]].get('t'):
                    key = ''.join(rows[k]['key'] for k in ks)
                    # học sinh tô đáp số ngẫu nhiên đúng/sai, ghi từ cột trái
                    ans = key if R.random() < .5 else R.choice(['12','-3','0,5','7','250','-1,5','9','48'])
                    if kind == 'comma': ans = key if R.random() < .7 else R.choice(['16,5','2,25','-1,5','0,75','12,5','-0,5'])
                    for i, k in enumerate(ks):
                        if i < len(ans):
                            o = rows[k]['o']; j = o.index(ans[i]) if ans[i] in o else None
                            if j is None: ans = ''; break
                            truth[k] = ans[i]
                        else: truth[k] = ''
                    for k in ks: truth.setdefault(k, '')
                else:
                    opts = ['A','B','C','D'] if rows[ks[0]]['n']==4 else ['Đ','S']
                    for k in ks: truth[k] = R.choice(opts)
            for k, v in truth.items():
                if not v: continue
                o = rows[k].get('o') or (['A','B','C','D'] if rows[k]['n']==4 else ['Đ','S']); j = o.index(v)
                lvl = kind if kind in ('dark','faint') else R.choice(['dark','pencil','faint']) if kind=='sparse' else R.choice(['dark','dark','pencil','faint'])
                gray = {'dark':R.uniform(20,70),'pencil':R.uniform(70,120),'faint':R.uniform(120,165)}[lvl]
                if kind == 'veryfaint': gray = R.uniform(160, 195)
                if kind == 'comma': gray = R.uniform(20, 110)
                if kind == 'comma' and v in ',-':   # ô dấu phẩy / dấu trừ học sinh hay tô nhẹ tay, chỉ chấm một chấm nhỏ
                    sp['fills'].append([k, j, R.uniform(90, 175), R.uniform(.15, .55)]); continue
                sp['fills'].append([k, j, gray, R.uniform(.35,.6) if kind=='partial' else R.uniform(.6,1.0)])
        out.append((sp, truth))
    return out
def evaluate(mod, gpath, items, workers=8):
    g = json.load(open(gpath))
    def one(it):
        sp, truth = it; arr, MS = render_sheet(g, sp); img = photo(arr, MS, sp); r = run(mod, gpath, img); return sp, truth, r
    res = list(ThreadPoolExecutor(workers).map(one, items))
    st = {'sheets':len(res), 'notfound':0, 'wrong':0, 'blank_as_mark':0, 'mark_missed':0, 'review':0, 'rows':0, 'tln':0, 'tln_review':0, 'tln_wrong':0}
    for sp, truth, r in res:
        if not r['ok']: st['notfound'] += 1; continue
        for p in r['picks']:
            t = truth.get(p['k'], ''); st['rows'] += 1
            if p['st'] in ('weak','multi'): st['review'] += 1; continue
            if p['st']=='ok' and t=='': st['blank_as_mark'] += 1
            elif p['st']=='blank' and t!='': st['mark_missed'] += 1
            elif p['st']=='ok' and p['v']!=t: st['wrong'] += 1
        # theo CÂU trả lời ngắn: đọc ra cả đáp số (ghép các cột) có đúng bài học sinh không
        grp = {}
        for p in r['picks']:
            row = g['rows'][p['k']]
            if row.get('t'): grp.setdefault(row['g'], []).append(p)
        for gk, ps in grp.items():
            st['tln'] += 1; t = ''.join(truth.get(p['k'], '') for p in ps)
            if any(p['st'] in ('weak','multi') for p in ps): st['tln_review'] += 1
            elif ''.join(p['v'] for p in ps if p['st']=='ok') != t: st['tln_wrong'] += 1
    return st, res
if __name__ == '__main__':
    mod, gpath, kind, n = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
    st, _ = evaluate(mod, gpath, cases(gpath, n, kind, int(sys.argv[5]) if len(sys.argv)>5 else 0)); print(kind, st)
