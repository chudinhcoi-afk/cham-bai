// node run.js omr.js geom.json img.raw W H  → in kết quả đọc
const fs = require('fs'), [,, modP, gP, rawP, W, H] = process.argv;
const m = require(require('path').resolve(modP)), g = JSON.parse(fs.readFileSync(gP)), raw = fs.readFileSync(rawP);
const w = +W, h = +H, data = new Uint8ClampedArray(w*h*4); for(let i=0;i<w*h;i++){ data[4*i]=data[4*i+1]=data[4*i+2]=raw[i]; data[4*i+3]=255; }
const test = g.test; const r = m.wakRead({width:w, height:h, data}, id=> id===test.id ? test : null);
if(!r.ok){ console.log(JSON.stringify({ok:false, err:r.error})); process.exit(0); }
console.log(JSON.stringify({ok:true, thr:r.thr, sc:r.sc, raw:r.raw, cInk:r.cInk, T:r.T, picks:r.picks.map(p=> ({k:p.k, st:p.pk.state, v:p.pk.v, faint:!!p.pk.faint}))}));
