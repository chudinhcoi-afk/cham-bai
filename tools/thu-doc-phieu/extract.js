// trích các hàm/const cần cho đọc khung trả lời từ index.html
const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8');
const names = ['fmtVN','sameShortAnswer','omrGrayFromImageData','omrRedInk','omrGrayAuto','omrOtsu','omrInkGray','omrFindMarkerCandidates','omrSolveHomography','omrMeanGray','WAK','WAK_TO','wakOpts','wakTlnKey','wakTlnRows','wakGrade','WAK3','wakGeom3','WAK5','wakGeom45','wakGeom','wakLocate','wakRefine','wakScores','wakThreshold','wakPick2','wakRead','wakComment'];
let out = '';
for(const n of names){
  const re = new RegExp('^(function '+n+'\\(|const '+n+' = )', 'm'); const m = re.exec(src); if(!m){ console.error('missing', n); continue; }
  let i = m.index;
  if(m[1].startsWith('function')){ let j = src.indexOf('{', i), d = 0, k = j; for(; k < src.length; k++){ const c = src[k]; if(c==='{') d++; else if(c==='}'){ d--; if(!d) break; } } out += src.slice(i, k+1) + '\n'; }
  else { const e = src.indexOf('\n', i); let line = src.slice(i, e);
    if(/=\s*\{/.test(line) && !/\};\s*(\/\/.*)?$/.test(line)){ let j = src.indexOf('{', i), d = 0, k = j; for(; k < src.length; k++){ const c = src[k]; if(c==='{') d++; else if(c==='}'){ d--; if(!d) break; } } line = src.slice(i, k+2); }
    else if(/=>/.test(line) && !/;\s*(\/\/.*)?$/.test(line)){ /* arrow multi-line */ }
    out += line + '\n'; }
}
out = out.replace('return {ok:true, id:loc.id, test, G,', 'return {ok:true, sc, cInk:sc.cInk, T, id:loc.id, test, G,');   // để bộ thử xem điểm từng ô
out += '\nmodule.exports = {wakRead, wakGeom, wakOpts, wakTlnRows, WAK};\n';
fs.writeFileSync(process.argv[3], '"use strict";\n' + out);
