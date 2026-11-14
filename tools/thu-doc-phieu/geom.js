// in ra hình học phiếu (mm) cho bộ vẽ phiếu giả
const m = require(require('path').resolve(process.argv[2] || './omr_orig.js'));
const spec = JSON.parse(process.argv[3]);   // {id, v, tn:[keys], ds:[[...]], tln:[keys]}
const rows = [];
(spec.tn||[]).forEach((k,i)=> rows.push({lab:String(i+1), n:4, key:k, pt:0.25}));
(spec.ds||[]).forEach((q,i)=> q.forEach((k,j)=> rows.push({lab:(spec.tn.length+i+1)+'abcd'[j], n:2, key:k, pt:0.25})));
let g0 = (spec.tn||[]).length + (spec.ds||[]).length;
(spec.tln||[]).forEach((k,i)=> m.wakTlnRows(String(g0+i+1), k, 0.5).forEach(r=> rows.push(r)));
const G = m.wakGeom(rows, spec.v);
const bubbles = rows.map((r,k)=> m.wakOpts(r).map((o,j)=> ({k, j, o, ...G.pos(k,j)})));
console.log(JSON.stringify({W:m.WAK.W, H:G.H, v:G.v, draw:G.draw||null, rows, bubbles, test:{id:spec.id, v:spec.v, name:'thu', rows}}));
