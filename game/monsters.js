// monsters.js — 5 loại quái thường có khung xương và bộ động tác (cùng cách làm với hero.js)
// slime (nhảy bật), golem (người đá), bat (dơi), spirit (hồn ma), spider (nhện 8 chân, đi kiểu 3 chân)
// Mỗi loại: đứng, di chuyển, tấn công (lấy đà → đòn đánh), bị đánh, choáng, chết; biến hình (mọc gai, mắt đỏ).

const CACHE = {};   // hình khối + clip theo từng loại (dùng chung cho mọi con cùng loại)

export function createMonster(THREE, type, color, opts = {}){
  const merge = opts.merge, toon = opts.toon, addOutline = opts.outline || (()=> null);
  const D = Math.PI/180;
  const M4 = (x = 0, y = 0, z = 0, sx = 1, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0)=> new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
  const Sp = (r, a = 14, b = 10)=> new THREE.SphereGeometry(r, a, b), Cy = (a, b, h, s = 8)=> new THREE.CylinderGeometry(a, b, h, s), Co = (r, h, s = 8)=> new THREE.ConeGeometry(r, h, s), Bx = (x, y, z)=> new THREE.BoxGeometry(x, y, z), Do = r=> new THREE.DodecahedronGeometry(r, 0), Ca = (r, l, s = 8)=> new THREE.CapsuleGeometry(r, l, 3, s);
  const W = 0xffffff, DK = 0x15151c, SH = 0xc8c8c8;
  // mắt to dễ thương (dùng chung): lòng trắng, con ngươi, điểm sáng
  const eyes = (y, z, s = 0.14, gap = 0.26, sq = 1.25)=> [-1, 1].flatMap(d=> [{g:Sp(s, 12, 10), m:M4(d*gap, y, z, 1, sq, 0.7), c:W}, {g:Sp(s*0.6, 10, 8), m:M4(d*gap, y - s*0.08, z + s*0.42, 1, sq, 0.6), c:DK}, {g:Sp(s*0.2, 6, 4), m:M4(d*gap + s*0.18, y + s*0.25, z + s*0.66), c:W}]);
  const GUARD = type === 'golem' && !!opts.guard, KEY = type + (GUARD ? ':guard' : ''), T = CACHE[KEY] || (CACHE[KEY] = build());

  /* ---------- dựng một con ---------- */
  const object = new THREE.Group(), B = {}, mat = toon({color, vertexColors:true, flatShading:type === 'golem'}), outs = [];
  const detMat = opts.detMat || toon({vertexColors:true});
  T.bones.forEach(([n, p, x, y, z])=>{ const b = new THREE.Group(); b.name = 'mo_' + n; b.position.set(x, y, z); (p ? B[p] : object).add(b); B[n] = b; });
  const meshes = [];
  T.parts.forEach(([bn, geo, tinted, ol])=>{
    if(tinted === 'fixed'){ const m = new THREE.Mesh(geo, T.fixed); B[bn].add(m); meshes.push(m); const o = addOutline(m, ol || 0.03); if(o) outs.push(o); return; }
    if(tinted === 'decal' || tinted === 'gloss' || tinted === 'crack' || tinted === 'glow'){ const m = new THREE.Mesh(geo, tinted === 'decal' ? T.dm[0] : tinted === 'gloss' ? T.gloss : tinted === 'glow' ? T.glow : T.crack[0]); m.renderOrder = tinted === 'decal' ? 3 : 2; m.userData.kind = tinted; B[bn].add(m); meshes.push(m); return; }
    const m = new THREE.Mesh(geo, tinted ? mat : detMat); B[bn].add(m); meshes.push(m); if(ol){ const o = addOutline(m, ol); if(o) outs.push(o); } if(!tinted) m.userData.det = true; });
  if(type === 'spirit'){ mat.transparent = true; mat.opacity = 0.9; }
  const mixer = new THREE.AnimationMixer(object), A = {};
  Object.keys(T.clips).forEach(k=>{ const a = A[k] = mixer.clipAction(T.clips[k]); if(['attack', 'hurt', 'die'].includes(k)){ a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; } a.setEffectiveWeight(0); a.play(); });
  let speed = 0, speedS = 0, cur = null, curW = 0, prev = null, prevW = 0, stunW = 0, stunned = false, dead = false, acc = 0;
  function play(n){ if(cur && cur !== n){ prev = cur; prevW = curW; } cur = n; curW = 0; const a = A[n]; a.reset(); a.play(); }
  const api = {
    object, mat, height:T.height, bones:B, mixer,
    setMove(s){ speed = Math.max(0, Math.min(1, s)); },
    attack(){ if(dead) return 0; play('attack'); return T.hitAt; },
    hurt(){ if(dead || cur === 'attack') return; play('hurt'); },
    stun(on){ stunned = !!on; },
    die(){ if(dead) return; dead = true; play('die'); },
    // biến hình: mọc gai, mắt đỏ (màu thân do game đổi qua mat)
    morph(redMat){ meshes.forEach(m=>{ if(m.userData.det && redMat) m.material = redMat; if(m.userData.kind === 'decal') m.material = T.dm[1]; if(m.userData.kind === 'crack') m.material = T.crack[1]; }); const sp = new THREE.Mesh(T.spikes, opts.spikeMat || mat); B[T.spikeBone].add(sp); const o = addOutline(sp, 0.05); if(o) outs.push(o); },
    setDetail(on){ outs.forEach(o=> o.visible = on); },
    update(dt){
      speedS += (speed - speedS)*Math.min(1, dt*8);
      if(cur){ const a = A[cur], dur = T.clips[cur].duration; curW = Math.min(1, curW + dt/0.07); if(a.time >= dur - 1e-4 && cur !== 'die'){ prev = cur; prevW = curW; cur = null; curW = 0; } }
      if(prev){ prevW = Math.max(0, prevW - dt/0.15); if(prevW <= 0){ A[prev].setEffectiveWeight(0); prev = null; } }
      stunW += ((stunned && !dead ? 1 : 0) - stunW)*Math.min(1, dt*6);
      const act = (cur ? curW : 0) + (prev ? prevW : 0), base = Math.max(0, 1 - act);
      A.idle.setEffectiveWeight(base*(1 - speedS)*(1 - stunW)); A.move.setEffectiveWeight(base*speedS*(1 - stunW)); A.stun.setEffectiveWeight(base*stunW);
      A.move.timeScale = 0.6 + speedS*0.6;
      ['attack', 'hurt', 'die'].forEach(k=>{ if(k !== cur && k !== prev) A[k].setEffectiveWeight(0); });
      if(cur) A[cur].setEffectiveWeight(curW); if(prev) A[prev].setEffectiveWeight(prevW);
      mixer.update(dt);
    },
    dispose(){ mixer.stopAllAction(); mat.dispose(); }
  };
  api.update(Math.random()*2);
  return api;

  /* ---------- hình khối + động tác của từng loại (tạo một lần) ---------- */
  function build(){
    const EASE = {lin:t=> t, io:t=> t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2)/2, in:t=> t*t*t, out:t=> 1 - Math.pow(1 - t, 3), sm:t=> t*t*(3 - 2*t),
      back:t=>{ const c1 = 1.9, c3 = c1 + 1; return 1 + c3*Math.pow(t - 1, 3) + c1*Math.pow(t - 1, 2); }, snap:t=> 1 - Math.pow(1 - t, 5)};
    const _q = new THREE.Quaternion(), _e = new THREE.Euler();
    let REST = null;
    function bake(name, dur, keys, loop){
      const full = []; let prev = Object.assign({}, REST);
      keys.forEach(([t, pose, ease])=>{ prev = Object.assign({}, prev, pose); full.push({t, pose:prev, ease:ease || 'io'}); });
      if(loop) full.push({t:dur, pose:full[0].pose, ease:'io'});
      const N = Math.max(2, Math.round(dur*30) + 1), times = Array.from({length:N}, (_, i)=> i/(N - 1)*dur), tracks = [];
      Object.keys(REST).forEach(k=>{ const kind = k.endsWith('.p') ? 'p' : k.endsWith('.s') ? 's' : 'r', bn = 'mo_' + k.replace(/\.[ps]$/, ''), vals = [];
        times.forEach(t=>{ let v; if(t <= full[0].t) v = full[0].pose[k]; else if(t >= full[full.length - 1].t) v = full[full.length - 1].pose[k];
          else { let i = 0; while(full[i + 1].t < t) i++; const a = full[i], b = full[i + 1], u = EASE[b.ease]((t - a.t)/(b.t - a.t)); v = a.pose[k].map((x, j)=> x + (b.pose[k][j] - x)*u); }
          if(kind === 'r'){ _q.setFromEuler(_e.set(v[0]*D, v[1]*D, v[2]*D)); vals.push(_q.x, _q.y, _q.z, _q.w); } else vals.push(...v); });
        tracks.push(kind === 'r' ? new THREE.QuaternionKeyframeTrack(bn + '.quaternion', times, vals) : new THREE.VectorKeyframeTrack(bn + (kind === 'p' ? '.position' : '.scale'), times, vals)); });
      return new THREE.AnimationClip(name, dur, tracks);
    }
    const part = (bone, arr, tinted = true, ol = 0.045)=> [bone, merge(arr), tinted, ol];
    const keep = m=>{ m.userData.keep = true; return m; };
    const canvasT = (w, h, f)=>{ const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.lineCap = 'round'; x.lineJoin = 'round'; f(x, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
    const decalMat = t=> keep(new THREE.MeshBasicMaterial({map:t, transparent:true, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-4, polygonOffsetUnits:-4, toneMapped:false}));
    // mảnh cong bám mặt elip (tâm c, bán kính r), có UV phẳng theo kinh/vĩ độ — trừ off để gắn vào xương
    function patch(c, r, lon, lat0, lat1, off = [0, 0, 0], nx = 22, ny = 14, lift = 1.012){
      const P = [], U = [], I = [];
      for(let j = 0; j <= ny; j++) for(let i = 0; i <= nx; i++){ const a = (-lon + 2*lon*i/nx)*D, b = (lat0 + (lat1 - lat0)*j/ny)*D;
        P.push(c[0] + r[0]*lift*Math.sin(a)*Math.cos(b) - off[0], c[1] + r[1]*lift*Math.sin(b) - off[1], c[2] + r[2]*lift*Math.cos(a)*Math.cos(b) - off[2]); U.push(i/nx, j/ny); }
      for(let j = 0; j < ny; j++) for(let i = 0; i < nx; i++){ const a = j*(nx + 1) + i, b = a + 1, cc = a + nx + 1, d = cc + 1; I.push(a, b, cc, b, d, cc); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); g.computeVertexNormals(); g.userData.keep = true; return g; }
    // mặt cau có kiểu hoạt hình: mắt xếch có lông mày dày, con ngươi đen, miệng nhếch có răng nanh
    function angryFace(o){ return red=> canvasT(512, o.h, (x, w, h)=>{
      const ey = o.ey, ex = o.ex, rx = o.er || 52, ry = (o.er || 52)*0.86;
      [-1, 1].forEach(d=>{ const cx = 256 + d*ex;
        x.save(); x.beginPath(); x.moveTo(cx - d*(rx + 20), ey - ry*0.15); x.lineTo(cx + d*(rx + 20), ey - ry*0.95); x.lineTo(cx + d*(rx + 20), ey + ry + 20); x.lineTo(cx - d*(rx + 20), ey + ry + 20); x.closePath(); x.clip();
        x.fillStyle = red ? '#fff2a8' : '#ffffff'; x.beginPath(); x.ellipse(cx, ey, rx, ry, 0, 0, 7); x.fill();
        const px = cx - d*rx*0.22, py = ey + ry*0.18, pr = rx*0.5;
        if(red){ const g = x.createRadialGradient(px, py, 2, px, py, pr); g.addColorStop(0, '#fff'); g.addColorStop(0.35, '#ff3030'); g.addColorStop(1, '#7a0008'); x.fillStyle = g; } else x.fillStyle = '#16121c';
        x.beginPath(); x.arc(px, py, pr, 0, 7); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(px + d*pr*0.35, py - pr*0.4, pr*0.28, 0, 7); x.fill();
        x.strokeStyle = '#16121c'; x.lineWidth = 7; x.beginPath(); x.ellipse(cx, ey, rx, ry, 0, 0, 7); x.stroke(); x.restore();
        // lông mày xếch
        x.strokeStyle = '#16121c'; x.lineWidth = o.bw || 15; x.beginPath(); x.moveTo(cx - d*(rx + 8), ey - ry*0.05); x.lineTo(cx + d*(rx + 6), ey - ry*1.0); x.stroke(); });
      // miệng nhếch + 2 răng nanh
      const my = o.my, mw = o.mw || 70; if(!o.noMouth){ x.strokeStyle = '#16121c'; x.lineWidth = 8; x.beginPath(); x.moveTo(256 - mw, my - 10); x.quadraticCurveTo(256, my + 22, 256 + mw, my - 16); x.stroke();
      [-1, 1].forEach(d=>{ const fx = 256 + d*mw*0.42, fy = my + 6 - d*2; x.fillStyle = '#fff'; x.beginPath(); x.moveTo(fx - 10, fy - 4); x.lineTo(fx + 10, fy - 6); x.lineTo(fx + d*2, fy + 20); x.closePath(); x.fill(); x.lineWidth = 3; x.stroke(); }); }
      if(o.blush){ [-1, 1].forEach(d=>{ const g = x.createRadialGradient(256 + d*o.blush, my - 10, 2, 256 + d*o.blush, my - 10, 40); g.addColorStop(0, 'rgba(255,90,120,.45)'); g.addColorStop(1, 'rgba(255,90,120,0)'); x.fillStyle = g; x.fillRect(256 + d*o.blush - 45, my - 50, 90, 80); }); }
      if(o.extra) o.extra(x, red); }); }
    const faceMats = f=> [decalMat(f(false)), decalMat(f(true))];
    const _c = new THREE.Color(), _v = new THREE.Vector3();
    function mergeU(parts){ const P = [], N = [], C = [], O = [], U = [];
      for(const p of parts){ const g = p.g.index ? p.g.toNonIndexed() : p.g.clone(); p.g.dispose(); if(p.m) g.applyMatrix4(p.m); g.computeBoundingBox(); const ctr = g.boundingBox.getCenter(new THREE.Vector3());
        _c.set(p.c == null ? 0xffffff : p.c); const pa = g.attributes.position, na = g.attributes.normal, ua = g.attributes.uv;
        for(let i = 0; i < pa.count; i++){ P.push(pa.getX(i), pa.getY(i), pa.getZ(i)); N.push(na.getX(i), na.getY(i), na.getZ(i)); C.push(_c.r, _c.g, _c.b); U.push(ua ? ua.getX(i) : 0, ua ? ua.getY(i) : 0);
          _v.set(pa.getX(i) - ctr.x, pa.getY(i) - ctr.y, pa.getZ(i) - ctr.z); if(_v.lengthSq() < 1e-8) _v.set(0, 1, 0); _v.normalize(); O.push(_v.x, _v.y, _v.z); } g.dispose(); }
      const o = new THREE.BufferGeometry(); o.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); o.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); o.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
      o.setAttribute('odir', new THREE.Float32BufferAttribute(O, 3)); o.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); o.computeBoundingSphere(); o.userData.keep = true; return o; }
    const crackTex = ()=> canvasT(256, 256, (x)=>{ let sd = 7; const rnd = ()=> (sd = (sd*16807) % 2147483647)/2147483647; x.fillStyle = '#000'; x.fillRect(0, 0, 256, 256);
      const crack = (px, py, a, L, w)=>{ for(let k = 0; k < L; k++){ const nx = px + Math.cos(a)*14, ny = py + Math.sin(a)*14; x.lineWidth = w; x.strokeStyle = '#7fe9ff'; x.shadowColor = '#bff6ff'; x.shadowBlur = 8; x.beginPath(); x.moveTo(px, py); x.lineTo(nx, ny); x.stroke(); px = nx; py = ny; a += (rnd() - 0.5)*1.1; if(rnd() < 0.12 && w > 2.5) crack(px, py, a + (rnd() < 0.5 ? 1 : -1)*0.9, Math.floor(L*0.4), w*0.6); } };
      crack(0, 90, 0.35, 13, 4); crack(150, 0, 1.6, 10, 3.5); crack(256, 200, Math.PI + 0.3, 9, 3); });
    const crackMats = ()=>{ const t = crackTex(); t.wrapS = t.wrapT = THREE.RepeatWrapping; return [0x9ff2ff, 0xff4040].map(c=> keep(new THREE.MeshBasicMaterial({color:c, map:t, transparent:true, opacity:0.85, blending:THREE.AdditiveBlending, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-2}))); };
    const GLOSS = keep(new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, opacity:0.85, depthWrite:false}));
    const sparkle = (pts)=> merge(pts.map(([x, y, z, s])=> ({g:new THREE.OctahedronGeometry(s, 0), m:M4(x, y, z, 1, 1.8, 0.4)})));
    const spikeRing = (y, r, n = 8, h = 0.7, tilt = 0.9)=> merge(Array.from({length:n}, (_, i)=>{ const a = i/n*Math.PI*2; return {g:Co(0.14, h, 5), m:M4(Math.cos(a)*r, y + (i % 2)*0.25, Math.sin(a)*r, 1, 1, 1, Math.sin(a)*tilt, 0, -Math.cos(a)*tilt), c:0x2a0a10}; }));

    if(type === 'slime'){
      // thạch bóng loáng: thân dẹt tròn, vệt sáng lớn, lấp lánh, mầm lá trên đỉnh, mặt cau có răng nanh
      REST = {'body.p':[0, 0, 0], 'body.s':[1, 1, 1], body:[0, 0, 0], face:[0, 0, 0], 'face.s':[1, 1, 1], sprout:[0, 0, 0]};
      const BC = [0, 0.74, 0], BR = [1.08, 0.76, 1.08], FO = [0, 0.66, 1.0];
      const fm = faceMats(angryFace({h:320, ex:112, ey:150, er:54, my:248, mw:62, blush:190}));
      return {height:1.9, hitAt:0.4, spikeBone:'body', spikes:spikeRing(1.2, 0.8, 8, 0.6, 0.7), dm:fm, gloss:GLOSS,
        bones:[['body', null, 0, 0, 0], ['face', 'body', ...FO], ['sprout', 'body', 0, 1.48, 0]],
        parts:[part('body', [{g:Sp(1, 30, 22), m:M4(...BC, ...BR)}, {g:new THREE.SphereGeometry(0.99, 26, 8, 0, Math.PI*2, Math.PI*0.6, Math.PI*0.4), m:M4(...BC, ...BR), c:SH}], true, 0.05),
          ['body', merge([{g:Sp(0.3, 14, 10), m:M4(-0.46, 1.2, 0.56, 1.25, 0.5, 0.45, 0.5, -0.5, 0.45)}, {g:Sp(0.09, 8, 6), m:M4(0.52, 1.14, 0.62, 1, 0.8, 0.5)}, {g:Sp(0.05, 6, 4), m:M4(-0.15, 1.36, 0.42)}]), 'gloss'],
          ['body', sparkle([[0.72, 0.95, 0.58, 0.06], [-0.78, 0.6, 0.55, 0.05], [0.3, 1.32, 0.5, 0.045]]), 'gloss'],
          ['face', patch(BC, BR, 46, -32, 26, FO), 'decal'],
          part('sprout', [{g:Cy(0.045, 0.06, 0.4, 6), m:M4(0, 0.2, 0, 1, 1, 1, 0, 0, 0.1), c:0x3f8f3a}, {g:Sp(0.2, 10, 8), m:M4(0.2, 0.44, 0, 1.5, 0.35, 0.8, 0, 0, -0.45), c:0x5fc04a}, {g:Sp(0.17, 10, 8), m:M4(-0.17, 0.4, 0.02, 1.5, 0.35, 0.8, 0, 0, 0.45), c:0x7ad85a}], false, 0.03)],
        clips:{
          idle:bake('idle', 1.6, [[0, {}], [0.4, {'body.s':[1.06, 0.92, 1.06], sprout:[8, 0, 8]}, 'sm'], [0.8, {'body.s':[0.96, 1.06, 0.96], sprout:[-6, 0, -8]}, 'sm'], [1.2, {'body.s':[1.04, 0.95, 1.04], 'face.s':[1, 0.15, 1]}, 'sm'], [1.3, {'face.s':[1, 1, 1]}, 'lin']], true),
          move:bake('move', 0.7, [[0, {'body.s':[1.18, 0.8, 1.18]}], [0.12, {'body.s':[0.86, 1.2, 0.86], 'body.p':[0, 0.18, 0], sprout:[20, 0, 0]}, 'out'], [0.35, {'body.p':[0, 0.75, 0], 'body.s':[0.96, 1.06, 0.96], sprout:[-25, 0, 0]}, 'out'], [0.58, {'body.p':[0, 0.1, 0], 'body.s':[0.9, 1.14, 0.9], sprout:[10, 0, 0]}, 'in']], true),
          attack:bake('attack', 0.75, [[0, {}], [0.3, {'body.s':[1.28, 0.68, 1.28], 'body.p':[0, 0, -0.15], face:[18, 0, 0], sprout:[-20, 0, 0]}, 'out'], [0.4, {'body.p':[0, 0.55, 0.95], 'body.s':[0.8, 1.3, 0.8], face:[-10, 0, 0], sprout:[35, 0, 0]}, 'snap'], [0.56, {'body.p':[0, 0.05, 0.85], 'body.s':[1.22, 0.84, 1.22]}, 'in'], [0.75, {}, 'sm']]),
          hurt:bake('hurt', 0.36, [[0, {}], [0.08, {'body.s':[1.3, 0.7, 1.3], 'face.s':[1, 0.3, 1], 'body.p':[0, 0, -0.25]}, 'snap'], [0.36, {}, 'back']]),
          stun:bake('stun', 1.0, [[0, {body:[0, 0, 10], face:[0, 20, 0], 'face.s':[1, 0.4, 1]}], [0.5, {body:[0, 0, -10], face:[0, -20, 0], 'body.s':[1.05, 0.92, 1.05]}, 'sm']], true),
          die:bake('die', 0.8, [[0, {}], [0.2, {'body.s':[1.2, 0.85, 1.2], 'face.s':[1, 0.1, 1]}, 'out'], [0.8, {'body.s':[1.9, 0.08, 1.9], sprout:[80, 0, 0]}, 'in']])}};
    }
    if(type === 'golem'){
      // người đá pha lê: khối vát cạnh, vết nứt phát sáng, gai pha lê trên vai; Hộ vệ chương có thêm giáp đá, nắm đấm khớp, vương miện gắn trên đầu
      REST = {'hips.p':[0, 1.0, 0], hips:[0, 0, 0], torso:[0, 0, 0], head:[0, 0, 0], armL:[0, 0, 18], foreL:[-15, 0, 0], fistL:[0, 0, 0], armR:[0, 0, -18], foreR:[-15, 0, 0], fistR:[0, 0, 0], legL:[0, 0, 0], footL:[0, 0, 0], legR:[0, 0, 0], footR:[0, 0, 0]};
      const CR = 0xd8f8ff, GL = 0x8ff0ff, cm = crackMats(), DARK = 0xb8c4d0;
      const CB = (w, h, d, b = Math.min(w, h, d)*0.14)=>{ const sh = new THREE.Shape(), x = w/2 - b, y = h/2 - b, c = Math.min(x, y)*0.35;
        sh.moveTo(-x + c, -y); sh.lineTo(x - c, -y); sh.lineTo(x, -y + c); sh.lineTo(x, y - c); sh.lineTo(x - c, y); sh.lineTo(-x + c, y); sh.lineTo(-x, y - c); sh.lineTo(-x, -y + c); sh.closePath();
        const g = new THREE.ExtrudeGeometry(sh, {depth:Math.max(0.01, d - 2*b), bevelEnabled:true, bevelThickness:b, bevelSize:b, bevelSegments:1, curveSegments:1}); g.translate(0, 0, -Math.max(0.01, d - 2*b)/2); return g; };
      const K = (x, y, z, w, h, d, rx = 0, ry = 0, rz = 0, c)=> ({g:CB(w, h, d), m:M4(x, y, z, 1, 1, 1, rx, ry, rz), c});
      const blk = (bone, arr, ol = 0.05)=>{ const g = mergeU(arr); return [[bone, g, true, ol], [bone, g, 'crack']]; };
      const shard = (x, y, z, h, rx, rz, r = 0.13, ry = 0.6)=> ({g:new THREE.ConeGeometry(r, h, 5), m:M4(x, y + h/2*Math.cos(rz)*Math.cos(rx), z, 1, 1, 1, rx, ry, rz), c:CR});
      const cluster = (x, y, z, d, k = 1)=> [shard(x, y, z, 0.75*k, 0.15, -d*0.3, 0.15*k), shard(x + d*0.2*k, y - 0.05, z - 0.18*k, 0.55*k, -0.25, -d*0.75, 0.12*k), shard(x - d*0.15*k, y, z - 0.22*k, 0.5*k, -0.4, d*0.05, 0.11*k), shard(x + d*0.05, y - 0.05, z + 0.2*k, 0.42*k, 0.5, -d*0.4, 0.1*k)];
      const G = GUARD;
      const torso = [K(0, 0.5, 0, 1.6, 1.2, 1.05), K(0, 1.02, 0, 1.92, 0.58, 1.18, 0.05, 0, 0), K(0, -0.02, 0.06, 1.2, 0.5, 0.9), K(0.98, 1.0, 0, 0.74, 0.64, 0.74, 0.1, 0.2, 0.15), K(-0.98, 1.0, 0, 0.74, 0.64, 0.74, 0.1, -0.2, -0.15)];
      if(G) torso.push(K(0.42, 0.62, 0.5, 0.6, 0.55, 0.22, 0.05, 0.25, 0.1, DARK), K(-0.42, 0.62, 0.5, 0.6, 0.55, 0.22, 0.05, -0.25, -0.1, DARK), K(0.36, 0.14, 0.46, 0.5, 0.3, 0.18, 0, 0.2, 0, DARK), K(-0.36, 0.14, 0.46, 0.5, 0.3, 0.18, 0, -0.2, 0, DARK),
        K(0, 0.85, -0.55, 1.2, 0.8, 0.4, -0.2, 0, 0), K(1.0, 1.3, 0.0, 0.8, 0.36, 0.84, 0, 0.2, 0.22, DARK), K(-1.0, 1.3, 0.0, 0.8, 0.36, 0.84, 0, -0.2, -0.22, DARK), K(0, -0.3, 0.02, 1.36, 0.2, 1.0, 0, 0, 0, DARK));
      const head = [K(0, 0.3, 0.02, 0.86, 0.74, 0.8), K(0, 0.53, 0.38, 0.98, 0.18, 0.28, 0.3, 0, 0), K(0, 0.03, 0.34, 0.64, 0.22, 0.28)];
      if(G) head.push(K(0.24, 0.0, 0.36, 0.22, 0.2, 0.2, 0.2, 0, 0.3, DARK), K(-0.24, 0.0, 0.36, 0.22, 0.2, 0.2, 0.2, 0, -0.3, DARK), K(0, -0.08, 0.38, 0.3, 0.22, 0.2, 0.25, 0, 0, DARK), K(0.47, 0.3, 0, 0.14, 0.4, 0.5), K(-0.47, 0.3, 0, 0.14, 0.4, 0.5));
      const crys = [...cluster(0.95, 1.32, 0.0, 1, G ? 1.25 : 1), ...cluster(-0.95, 1.32, 0.0, -1, G ? 1.25 : 1), {g:new THREE.OctahedronGeometry(0.22, 0), m:M4(0, 0.62, 0.56, 1, 1.45, 0.55), c:GL}];
      if(G) crys.push(...cluster(0, 1.1, -0.72, 1, 0.9), shard(0.35, 1.2, -0.62, 0.5, -0.7, -0.2, 0.1), shard(-0.35, 1.2, -0.62, 0.5, -0.7, 0.2, 0.1));
      const parts = [...blk('hips', [K(0, 0, 0, 1.25, 0.56, 0.86, 0, 0.05, 0), ...(G ? [K(0, -0.05, 0.42, 0.5, 0.4, 0.16, -0.1, 0, 0, DARK)] : [])]), ...blk('torso', torso),
        part('torso', crys, false, 0.03),
        ['torso', merge([{g:new THREE.SphereGeometry(0.42, 16, 12), m:M4(0, 0.62, 0.52, 1, 1.3, 0.35)}]), 'glow'],
        ...blk('head', head),
        ['head', merge([K(0.2, 0.36, 0.43, 0.22, 0.09, 0.05, 0, 0, 0.32), K(-0.2, 0.36, 0.43, 0.22, 0.09, 0.05, 0, 0, -0.32)]), 'gloss'], part('head', [K(0, 0.13, 0.48, 0.3, 0.05, 0.04, 0, 0, 0, 0x0a2030)], false, 0),
        ...['L', 'R'].flatMap(sd=>{ const d = sd === 'L' ? 1 : -1;
          const arm = [K(0, -0.05, 0, 0.64, 0.64, 0.64, 0, 0, d*0.1), K(0, -0.46, 0, 0.5, 0.56, 0.5)], fore = [K(0, -0.3, 0, 0.56, 0.66, 0.56, 0, 0.2, 0)], fist = [K(0, -0.22, 0.05, 0.86, 0.74, 0.84, 0, 0.15, 0)], leg = [K(0, -0.25, 0, 0.64, 0.74, 0.64)], foot = [K(0, -0.27, 0.1, 0.74, 0.36, 0.9)];
          if(G){ arm.push(K(d*0.12, -0.72, 0.1, 0.42, 0.26, 0.42, 0.3, 0, 0, DARK)); fore.push(K(d*0.3, -0.3, 0, 0.16, 0.5, 0.44, 0, 0, 0, DARK)); for(let k = 0; k < 4; k++) fist.push(K(-0.29 + k*0.19, -0.5, 0.3, 0.17, 0.18, 0.2, 0.2, 0, 0, DARK));
            leg.push(K(0, -0.42, 0.3, 0.44, 0.34, 0.16, -0.15, 0, 0, DARK)); for(let k = 0; k < 3; k++) foot.push(K(-0.22 + k*0.22, -0.36, 0.58, 0.18, 0.18, 0.2, 0, 0, 0, DARK)); }
          const out = [...blk('arm' + sd, arm), ...blk('fore' + sd, fore), ...blk('fist' + sd, fist), ...blk('leg' + sd, leg), ...blk('foot' + sd, foot)];
          if(G) out.push(part('fore' + sd, [shard(d*0.38, -0.5, -0.05, 0.42, 0.2, -d*1.2, 0.09), shard(d*0.38, -0.25, 0.05, 0.36, -0.2, -d*1.3, 0.08), shard(d*0.36, -0.05, -0.02, 0.3, 0.1, -d*1.25, 0.07)], false, 0.03));
          return out; })];
      // vương miện vàng gắn vào xương đầu: đai, 5 chóp nhọn có ngọc, đỉnh cầu
      if(G){ const cp = [{g:new THREE.CylinderGeometry(0.5, 0.46, 0.18, 10), m:M4(0, 0.76, 0.02), c:0xf2c14e}, {g:new THREE.TorusGeometry(0.49, 0.035, 6, 20), m:M4(0, 0.68, 0.02, 1, 1, 1, Math.PI/2, 0, 0), c:0xd99a1e}];
        for(let i = 0; i < 5; i++){ const a = i/5*Math.PI*2 + Math.PI/2, x = Math.cos(a)*0.44, z = Math.sin(a)*0.44 + 0.02; cp.push({g:new THREE.ConeGeometry(0.11, 0.38, 4), m:M4(x, 1.03, z, 1, 1, 1, 0, -a, 0), c:0xf2c14e}, {g:new THREE.SphereGeometry(0.045, 8, 6), m:M4(x, 1.24, z), c:0xfff0a0}, {g:new THREE.OctahedronGeometry(0.06, 0), m:M4(Math.cos(a)*0.5, 0.76, Math.sin(a)*0.5 + 0.02, 1, 1.3, 0.6, 0, -a + Math.PI/2, 0), c:i % 2 ? 0x4ad8ff : 0xff4f7a}); }
        parts.push(['head', merge(cp), 'fixed', 0.035]); }
      return {height:3.2, hitAt:0.45, spikeBone:'torso', spikes:spikeRing(1.0, 0.7, 7, 0.9, 1.0), crack:cm, gloss:GLOSS, fixed:keep(toon({vertexColors:true, emissive:0x3a2200})), glow:keep(new THREE.MeshBasicMaterial({color:0x7fe9ff, transparent:true, opacity:0.35, blending:THREE.AdditiveBlending, depthWrite:false})),
        bones:[['hips', null, 0, 1.0, 0], ['torso', 'hips', 0, 0.3, 0], ['head', 'torso', 0, 1.15, 0], ['armL', 'torso', 0.98, 0.85, 0], ['foreL', 'armL', 0, -0.72, 0], ['fistL', 'foreL', 0, -0.6, 0], ['armR', 'torso', -0.98, 0.85, 0], ['foreR', 'armR', 0, -0.72, 0], ['fistR', 'foreR', 0, -0.6, 0],
          ['legL', 'hips', 0.4, -0.1, 0], ['footL', 'legL', 0, -0.55, 0], ['legR', 'hips', -0.4, -0.1, 0], ['footR', 'legR', 0, -0.55, 0]],
        parts,
        clips:{
          idle:bake('idle', 2.4, [[0, {}], [1.2, {'hips.p':[0, 0.96, 0], torso:[5, 0, 0], head:[-4, 0, 3], armL:[3, 0, 22], armR:[3, 0, -22]}, 'sm']], true),
          move:bake('move', 1.2, [[0, {'hips.p':[0, 0.95, 0], hips:[0, 8, 4], torso:[10, -6, 0], legL:[-28, 0, 0], footL:[15, 0, 0], legR:[22, 0, 0], footR:[-5, 0, 0], armL:[25, 0, 18], armR:[-25, 0, -18]}],
            [0.3, {'hips.p':[0, 1.08, 0]}, 'out'], [0.6, {'hips.p':[0, 0.95, 0], hips:[0, -8, -4], torso:[10, 6, 0], legL:[22, 0, 0], footL:[-5, 0, 0], legR:[-28, 0, 0], footR:[15, 0, 0], armL:[-25, 0, 18], armR:[25, 0, -18]}, 'in'], [0.9, {'hips.p':[0, 1.08, 0]}, 'out']], true),
          attack:bake('attack', 1.0, [[0, {}], [0.35, {'hips.p':[0, 1.06, -0.1], torso:[-18, 0, 0], head:[-15, 0, 0], armL:[-170, 0, 18], foreL:[-30, 0, 0], armR:[-170, 0, -18], foreR:[-30, 0, 0]}, 'out'],
            [0.45, {'hips.p':[0, 0.85, 0.35], torso:[32, 0, 0], head:[10, 0, 0], armL:[-62, 0, 8], foreL:[0, 0, 0], armR:[-62, 0, -8], foreR:[0, 0, 0], legL:[-25, 0, 0], legR:[15, 0, 0]}, 'snap'], [0.68, {'hips.p':[0, 0.87, 0.35]}, 'out'], [1.0, {}, 'sm']]),
          hurt:bake('hurt', 0.4, [[0, {}], [0.1, {torso:[-16, 0, 8], head:[-22, 0, 0], 'hips.p':[0, 1.0, -0.2]}, 'snap'], [0.4, {}, 'sm']]),
          stun:bake('stun', 1.4, [[0, {head:[0, 0, 15], torso:[0, 0, 6], armL:[0, 0, 30], armR:[0, 0, -10]}], [0.7, {head:[0, 0, -15], torso:[0, 0, -6], armL:[0, 0, 10], armR:[0, 0, -30]}, 'sm']], true),
          die:bake('die', 1.0, [[0, {}], [0.3, {'hips.p':[0, 0.6, 0], legL:[-80, 0, 0], footL:[60, 0, 0], legR:[-80, 0, 0], footR:[60, 0, 0], torso:[10, 0, 0], head:[20, 0, 0]}, 'out'],
            [0.9, {'hips.p':[0, 0.45, 0.6], hips:[30, 0, 0], torso:[60, 0, 0], head:[20, 0, 0], armL:[-150, 0, 30], armR:[-150, 0, -30]}, 'in'], [1.0, {}, 'lin']])}};
    }
    if(type === 'bat'){
      REST = {'body.p':[0, 1.85, 0], body:[0, 0, 0], wingL:[0, 0, 10], tipL:[0, 0, 10], wingR:[0, 0, -10], tipR:[0, 0, -10], feet:[0, 0, 0]};
      const wing = (sg, inner)=>{ const s = new THREE.Shape(), pts = inner ? [[0, 0.25], [0.55, 0.5], [1.05, 0.42], [1.05, -0.35], [0.7, -0.2], [0.35, -0.42], [0, -0.2]] : [[0, 0.42], [0.55, 0.62], [1.2, 0.5], [1.05, 0.0], [0.85, -0.3], [0.55, -0.08], [0.3, -0.38], [0, -0.35]];
        pts.forEach(([x, y], i)=> i ? s.lineTo(sg*x, y) : s.moveTo(sg*x, y)); s.closePath(); const g = new THREE.ExtrudeGeometry(s, {depth:0.06, bevelEnabled:false}); g.translate(0, 0, -0.03); g.rotateX(Math.PI/2 - 0.25); return g; };
      return {height:2.6, hitAt:0.42, spikeBone:'body', spikes:spikeRing(0.15, 0.55, 6, 0.55, 1.2), dm:faceMats(angryFace({h:336, ex:104, ey:150, er:50, my:258, mw:58})), gloss:GLOSS,
        bones:[['body', null, 0, 1.85, 0], ['wingL', 'body', 0.45, 0.1, -0.05], ['tipL', 'wingL', 1.0, 0.02, 0], ['wingR', 'body', -0.45, 0.1, -0.05], ['tipR', 'wingR', -1.0, 0.02, 0], ['feet', 'body', 0, -0.55, 0]],
        parts:[part('body', [{g:Sp(0.62, 16, 12), m:M4(0, 0, 0, 1, 0.95, 0.95)}, {g:Co(0.2, 0.5, 5), m:M4(0.32, 0.6, -0.05, 1, 1, 0.6, 0, 0, -0.3)}, {g:Co(0.2, 0.5, 5), m:M4(-0.32, 0.6, -0.05, 1, 1, 0.6, 0, 0, 0.3)}, {g:Sp(0.4, 12, 10), m:M4(0, -0.24, 0.3, 1, 0.7, 0.5), c:0xffe6c8}], true, 0.05),
          ['body', patch([0, 0, 0], [0.62, 0.589, 0.589], 52, -40, 30), 'decal'], ['body', merge([{g:Sp(0.12, 10, 8), m:M4(-0.26, 0.3, 0.42, 1.2, 0.6, 0.4, 0, -0.4, 0.5)}]), 'gloss'],
          part('body', [{g:Co(0.12, 0.34, 4), m:M4(0.32, 0.6, 0.0, 1, 1, 0.4, 0, 0, -0.3), c:0xffa0b8}, {g:Co(0.12, 0.34, 4), m:M4(-0.32, 0.6, 0.0, 1, 1, 0.4, 0, 0, 0.3), c:0xffa0b8}], false, 0),
          part('wingL', [{g:wing(1, true), c:SH}], true, 0.035), part('tipL', [{g:wing(1, false)}], true, 0.035), part('wingR', [{g:wing(-1, true), c:SH}], true, 0.035), part('tipR', [{g:wing(-1, false)}], true, 0.035),
          part('feet', [{g:Co(0.06, 0.22, 4), m:M4(0.15, 0, 0, 1, 1, 1, Math.PI, 0, 0), c:0x3a2a2a}, {g:Co(0.06, 0.22, 4), m:M4(-0.15, 0, 0, 1, 1, 1, Math.PI, 0, 0), c:0x3a2a2a}], false, 0)],
        clips:{
          idle:bake('idle', 0.5, [[0, {'body.p':[0, 1.95, 0], wingL:[0, 0, 45], tipL:[0, 0, -10], wingR:[0, 0, -45], tipR:[0, 0, 10]}], [0.2, {'body.p':[0, 1.75, 0], wingL:[0, 0, -40], tipL:[0, 0, 25], wingR:[0, 0, 40], tipR:[0, 0, -25]}, 'io'], [0.35, {tipL:[0, 0, -20], tipR:[0, 0, 20]}, 'sm']], true),
          move:bake('move', 0.34, [[0, {'body.p':[0, 1.9, 0], body:[18, 0, 0], wingL:[0, 20, 50], tipL:[0, 0, -15], wingR:[0, -20, -50], tipR:[0, 0, 15], feet:[40, 0, 0]}], [0.14, {'body.p':[0, 1.78, 0], wingL:[0, -10, -40], tipL:[0, 0, 30], wingR:[0, 10, 40], tipR:[0, 0, -30]}, 'io']], true),
          attack:bake('attack', 0.8, [[0, {}], [0.3, {'body.p':[0, 2.5, -0.6], body:[-30, 0, 0], wingL:[0, 30, 70], tipL:[0, 0, 30], wingR:[0, -30, -70], tipR:[0, 0, -30]}, 'out'],
            [0.42, {'body.p':[0, 1.25, 1.0], body:[40, 0, 0], wingL:[0, 50, 10], tipL:[0, 0, 40], wingR:[0, -50, -10], tipR:[0, 0, -40], feet:[60, 0, 0]}, 'snap'], [0.6, {'body.p':[0, 1.5, 0.6], body:[10, 0, 0]}, 'out'], [0.8, {}, 'sm']]),
          hurt:bake('hurt', 0.36, [[0, {}], [0.08, {'body.p':[0, 2.0, -0.4], body:[-25, 0, 15], wingL:[0, 0, 60], wingR:[0, 0, -20]}, 'snap'], [0.36, {}, 'sm']]),
          stun:bake('stun', 1.0, [[0, {'body.p':[0, 1.55, 0], body:[0, 0, 25], wingL:[0, 0, -10], wingR:[0, 0, -40], tipL:[0, 0, 20]}], [0.5, {body:[0, 0, -25], wingL:[0, 0, 40], wingR:[0, 0, 10], tipR:[0, 0, -20]}, 'sm']], true),
          die:bake('die', 0.9, [[0, {}], [0.25, {'body.p':[0, 2.2, 0], body:[0, 0, 60], wingL:[0, 0, 60], wingR:[0, 0, -60]}, 'out'], [0.8, {'body.p':[0, 0.45, 0], body:[0, 0, 170], wingL:[0, 0, -20], tipL:[0, 0, -30], wingR:[0, 0, 20], tipR:[0, 0, 30]}, 'in'], [0.9, {}, 'lin']])}};
    }
    if(type === 'spirit'){
      REST = {'body.p':[0, 1.65, 0], body:[0, 0, 0], 'jaw.s':[1, 1, 1], armL:[0, 0, 25], armR:[0, 0, -25], tail1:[0, 0, 0], tail2:[0, 0, 0], tail3:[0, 0, 0], 'root.s':[1, 1, 1]};
      return {height:3.3, hitAt:0.42, spikeBone:'body', spikes:spikeRing(0.95, 0.55, 7, 0.6, 0.6), dm:faceMats(angryFace({h:304, ex:100, ey:132, er:48, my:232, mw:54, blush:170})), gloss:GLOSS,
        bones:[['root', null, 0, 0, 0], ['body', 'root', 0, 1.65, 0], ['jaw', 'body', 0, 0.62, 0.6], ['armL', 'body', 0.72, 0.15, 0.05], ['armR', 'body', -0.72, 0.15, 0.05], ['tail1', 'body', 0, -0.35, 0], ['tail2', 'tail1', 0, -0.5, 0], ['tail3', 'tail2', 0, -0.45, 0]],
        parts:[part('body', [{g:Sp(0.8, 18, 14), m:M4(0, 0.75, 0)}, {g:Cy(0.78, 0.72, 0.6, 16), m:M4(0, 0.15, 0)}, {g:Sp(0.18, 8, 6), m:M4(0.32, 1.32, 0.35, 1, 0.6, 0.6), c:0xffffff}], true, 0.05),
          ['body', patch([0, 0.75, 0], [0.8, 0.8, 0.8], 44, -24, 30), 'decal'], ['body', merge([{g:Sp(0.16, 10, 8), m:M4(-0.36, 1.25, 0.48, 1.2, 0.55, 0.45, 0, -0.5, 0.5)}]), 'gloss'],
          part('body', [{g:Co(0.15, 0.5, 6), m:M4(0.36, 1.48, 0.05, 1, 1, 1, 0, 0, -0.45)}, {g:Co(0.15, 0.5, 6), m:M4(-0.36, 1.48, 0.05, 1, 1, 1, 0, 0, 0.45)}, {g:Co(0.12, 0.38, 5), m:M4(0, 1.2, -0.68, 1, 1, 1, -1.0, 0, 0)}, {g:Co(0.1, 0.32, 5), m:M4(0, 0.7, -0.82, 1, 1, 1, -1.3, 0, 0)}], true, 0.035),
          part('jaw', [{g:Sp(0.1, 10, 8), m:M4(0, -0.12, 0.1, 1.2, 0.8, 0.4), c:0x2a1030}], false, 0),
          part('armL', [{g:Ca(0.13, 0.35), m:M4(0.12, -0.2, 0, 1, 1, 1, 0, 0, 0.5)}], true, 0.035), part('armR', [{g:Ca(0.13, 0.35), m:M4(-0.12, -0.2, 0, 1, 1, 1, 0, 0, -0.5)}], true, 0.035),
          part('tail1', [{g:Cy(0.76, 0.5, 0.75, 16), m:M4(0, -0.15, 0)}], true, 0.04), part('tail2', [{g:Cy(0.5, 0.3, 0.5, 12), m:M4(0, -0.25, 0), c:0xeeeeee}], true, 0.035), part('tail3', [{g:Co(0.3, 0.6, 10), m:M4(0, -0.25, 0, 1, 1, 1, Math.PI, 0, 0), c:0xdddddd}], true, 0.03)],
        clips:{
          idle:bake('idle', 2.0, [[0, {tail1:[8, 0, 8], tail2:[12, 0, -10], tail3:[16, 0, 14], armL:[-10, 0, 30], armR:[10, 0, -20]}], [0.5, {tail1:[-6, 0, -6], tail2:[10, 0, 12], tail3:[-12, 0, -14]}, 'sm'],
            [1.0, {'body.p':[0, 1.85, 0], tail1:[6, 0, -8], tail2:[-10, 0, 10], tail3:[14, 0, -12], armL:[10, 0, 20], armR:[-10, 0, -30]}, 'sm'], [1.5, {tail1:[-8, 0, 6], tail2:[-12, 0, -10], tail3:[-16, 0, 12]}, 'sm']], true),
          move:bake('move', 1.0, [[0, {body:[22, 0, 0], tail1:[35, 0, 10], tail2:[25, 0, -12], tail3:[25, 0, 15], armL:[40, 0, 30], armR:[40, 0, -30]}], [0.5, {'body.p':[0, 1.8, 0], tail1:[40, 0, -10], tail2:[30, 0, 12], tail3:[30, 0, -15]}, 'sm']], true),
          attack:bake('attack', 0.8, [[0, {}], [0.3, {'body.p':[0, 1.95, -0.3], body:[-25, 0, 0], 'jaw.s':[1.5, 2.6, 1], armL:[-150, 0, 35], armR:[-150, 0, -35], tail1:[-15, 0, 0]}, 'out'],
            [0.42, {'body.p':[0, 1.45, 1.0], body:[30, 0, 0], 'jaw.s':[1.8, 3.2, 1], armL:[-85, 0, 10], armR:[-85, 0, -10], tail1:[45, 0, 0], tail2:[30, 0, 0], tail3:[30, 0, 0]}, 'snap'], [0.6, {'body.p':[0, 1.55, 0.8], 'jaw.s':[1, 1, 1]}, 'out'], [0.8, {}, 'sm']]),
          hurt:bake('hurt', 0.36, [[0, {}], [0.08, {'body.p':[0, 1.7, -0.35], body:[-20, 0, 10], 'jaw.s':[1.2, 1.8, 1], armL:[-40, 0, 60]}, 'snap'], [0.36, {}, 'sm']]),
          stun:bake('stun', 1.2, [[0, {body:[0, 0, 15], 'jaw.s':[1, 0.4, 1], tail1:[0, 0, 20], tail2:[0, 0, -20]}], [0.6, {body:[0, 0, -15], tail1:[0, 0, -20], tail2:[0, 0, 20]}, 'sm']], true),
          die:bake('die', 1.0, [[0, {}], [0.25, {'jaw.s':[1.5, 2.5, 1], armL:[-160, 0, 40], armR:[-160, 0, -40]}, 'out'], [1.0, {'body.p':[0, 3.6, 0], 'root.s':[0.15, 0.15, 0.15], body:[0, 360, 0]}, 'in']])}};
    }
    // nhện: 8 chân, mỗi chân 2 đốt, đi kiểu 3 chân (tripod)
    REST = {'body.p':[0, 0.95, 0], body:[0, 0, 0], abdomen:[0, 0, 0], 'fangs.s':[1, 1, 1]};
    const legs = []; for(let i = 0; i < 4; i++) ['L', 'R'].forEach((s, si)=>{ const d = si ? -1 : 1, y0 = (i - 1.5)*24*d; legs.push({n:s + i, d, i, y0}); REST['hip' + s + i] = [0, y0, 0]; REST['knee' + s + i] = [0, 0, 0]; });
    const grp = l=> (l.i + (l.d > 0 ? 0 : 1)) % 2;   // 2 nhóm 3 chân + 1 xen kẽ
    const legPose = (fn)=>{ const o = {}; legs.forEach(l=>{ const [ry, rz, kz] = fn(l); o['hip' + l.n] = [0, l.y0 + ry*l.d, rz*l.d]; o['knee' + l.n] = [0, 0, kz*l.d]; }); return o; };
    return {height:1.9, hitAt:0.42, spikeBone:'abdomen', spikes:spikeRing(0.55, 0.5, 7, 0.55, 0.9), dm:faceMats(angryFace({h:310, ex:92, ey:170, er:46, my:280, noMouth:1, bw:12,
        extra:(x, red)=>{ [[-44, 66, 22], [44, 66, 22], [-124, 92, 16], [124, 92, 16]].forEach(([dx, y, r])=>{ x.fillStyle = red ? '#ff3030' : '#16121c'; x.beginPath(); x.arc(256 + dx, y, r, 0, 7); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(256 + dx + r*0.3, y - r*0.35, r*0.3, 0, 7); x.fill(); }); }})),
      bones:[['body', null, 0, 0.95, 0], ['abdomen', 'body', 0, 0.1, -0.45], ['fangs', 'body', 0, -0.12, 0.62], ...legs.flatMap(l=> [['hip' + l.n, 'body', l.d*0.36, 0, 0.32 - l.i*0.22], ['knee' + l.n, 'hip' + l.n, l.d*0.75, 0.42, 0]])],
      parts:[part('body', [{g:Sp(0.48, 14, 10), m:M4(0, 0, 0.18, 1.1, 0.8, 1.15)}, {g:Sp(0.36, 12, 10), m:M4(0, 0.06, 0.62, 1, 0.85, 0.9), c:SH}], true, 0.045),
        ['body', patch([0, 0.06, 0.62], [0.36, 0.306, 0.324], 60, -30, 42), 'decal'],
        part('abdomen', [{g:Sp(0.62, 16, 12), m:M4(0, 0.12, -0.45, 1.05, 0.9, 1.25)}, {g:Sp(0.25, 8, 6), m:M4(0, 0.56, -0.4, 1.4, 0.3, 1.6), c:0xffd23a}, {g:Sp(0.16, 8, 6), m:M4(0, 0.5, -0.85, 1.2, 0.3, 1.2), c:0xffd23a}], true, 0.05),
        part('fangs', [{g:Co(0.05, 0.22, 4), m:M4(0.08, -0.08, 0, 1, 1, 1, Math.PI + 0.3, 0, 0), c:0xfff4e0}, {g:Co(0.05, 0.22, 4), m:M4(-0.08, -0.08, 0, 1, 1, 1, Math.PI + 0.3, 0, 0), c:0xfff4e0}], false, 0),
        ...legs.flatMap(l=>{ const a = Math.atan2(0.42, 0.75); return [part('hip' + l.n, [{g:Cy(0.07, 0.06, 0.86, 6), m:M4(l.d*0.375, 0.21, 0, 1, 1, 1, 0, 0, -l.d*(Math.PI/2 - a)), c:SH}, {g:Sp(0.09, 6, 4), m:M4(l.d*0.75, 0.42, 0), c:SH}], true, 0.03),
          part('knee' + l.n, [{g:Cy(0.06, 0.03, 1.5, 6), m:M4(l.d*0.3, -0.7, 0, 1, 1, 1, 0, 0, l.d*0.42)}], true, 0)]; })],
      clips:{
        idle:bake('idle', 1.6, [[0, legPose(()=> [0, 0, 0])], [0.8, Object.assign({'body.p':[0, 0.9, 0], abdomen:[6, 0, 0]}, legPose(l=> [0, -4, 4]))]], true),
        move:bake('move', 0.5, [[0, Object.assign({'body.p':[0, 0.95, 0], body:[0, 4, 0]}, legPose(l=> grp(l) ? [-14, 0, 0] : [16, 18, -10]))],
          [0.125, Object.assign({'body.p':[0, 1.0, 0]}, legPose(l=> grp(l) ? [-2, 0, 0] : [2, 22, -14]))], [0.25, Object.assign({'body.p':[0, 0.95, 0], body:[0, -4, 0]}, legPose(l=> grp(l) ? [16, 18, -10] : [-14, 0, 0]))],
          [0.375, Object.assign({'body.p':[0, 1.0, 0]}, legPose(l=> grp(l) ? [2, 22, -14] : [-2, 0, 0]))]], true),
        attack:bake('attack', 0.8, [[0, {}], [0.3, Object.assign({'body.p':[0, 1.35, -0.2], body:[-35, 0, 0], 'fangs.s':[1.6, 1.6, 1.6]}, legPose(l=> l.i === 0 ? [-30, 60, -40] : l.i === 1 ? [-10, 25, -10] : [0, -10, 10])), 'out'],
          [0.42, Object.assign({'body.p':[0, 0.8, 0.5], body:[22, 0, 0], 'fangs.s':[0.7, 1.3, 0.7]}, legPose(l=> l.i === 0 ? [-25, -15, 20] : [0, 0, 0])), 'snap'], [0.62, {'body.p':[0, 0.85, 0.45]}, 'out'], [0.8, {}, 'sm']]),
        hurt:bake('hurt', 0.36, [[0, {}], [0.08, Object.assign({'body.p':[0, 1.1, -0.25], body:[-18, 0, 10]}, legPose(()=> [0, 20, -15])), 'snap'], [0.36, {}, 'sm']]),
        stun:bake('stun', 1.0, [[0, Object.assign({body:[0, 0, 12], 'body.p':[0, 0.8, 0]}, legPose(l=> [0, l.d > 0 ? 10 : -10, 0]))], [0.5, Object.assign({body:[0, 0, -12]}, legPose(l=> [0, l.d > 0 ? -10 : 10, 0])), 'sm']], true),
        die:bake('die', 0.9, [[0, {}], [0.25, Object.assign({'body.p':[0, 1.3, 0]}, legPose(()=> [0, 30, -30])), 'out'], [0.8, Object.assign({'body.p':[0, 0.6, 0], body:[0, 0, 180]}, legPose(()=> [0, 50, -90])), 'in'], [0.9, {}, 'lin']])}};
  }
}
