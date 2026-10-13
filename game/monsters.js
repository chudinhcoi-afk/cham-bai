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
  const T = CACHE[type] || (CACHE[type] = build());

  /* ---------- dựng một con ---------- */
  const object = new THREE.Group(), B = {}, mat = toon({color, vertexColors:true}), outs = [];
  const detMat = opts.detMat || toon({vertexColors:true});
  T.bones.forEach(([n, p, x, y, z])=>{ const b = new THREE.Group(); b.name = 'mo_' + n; b.position.set(x, y, z); (p ? B[p] : object).add(b); B[n] = b; });
  const meshes = [];
  T.parts.forEach(([bn, geo, tinted, ol])=>{ const m = new THREE.Mesh(geo, tinted ? mat : detMat); B[bn].add(m); meshes.push(m); if(ol){ const o = addOutline(m, ol); if(o) outs.push(o); } if(!tinted) m.userData.det = true; });
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
    morph(redMat){ meshes.forEach(m=>{ if(m.userData.det && redMat) m.material = redMat; }); const sp = new THREE.Mesh(T.spikes, opts.spikeMat || mat); B[T.spikeBone].add(sp); const o = addOutline(sp, 0.05); if(o) outs.push(o); },
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
    const spikeRing = (y, r, n = 8, h = 0.7, tilt = 0.9)=> merge(Array.from({length:n}, (_, i)=>{ const a = i/n*Math.PI*2; return {g:Co(0.14, h, 5), m:M4(Math.cos(a)*r, y + (i % 2)*0.25, Math.sin(a)*r, 1, 1, 1, Math.sin(a)*tilt, 0, -Math.cos(a)*tilt), c:0x2a0a10}; }));

    if(type === 'slime'){
      REST = {'body.p':[0, 0, 0], 'body.s':[1, 1, 1], body:[0, 0, 0], face:[0, 0, 0], 'face.s':[1, 1, 1], sprout:[0, 0, 0]};
      return {height:2.0, hitAt:0.4, spikeBone:'body', spikes:spikeRing(1.25, 0.75, 8, 0.6, 0.7),
        bones:[['body', null, 0, 0, 0], ['face', 'body', 0, 0.82, 0.86], ['sprout', 'body', 0, 1.5, 0]],
        parts:[part('body', [{g:Sp(1, 22, 16), m:M4(0, 0.8, 0, 1, 0.8, 1)}, {g:Sp(0.25, 10, 8), m:M4(-0.42, 1.25, 0.5, 1, 0.55, 0.6), c:0xffffff}, {g:new THREE.SphereGeometry(0.92, 18, 6, 0, Math.PI*2, Math.PI*0.62, Math.PI*0.38), m:M4(0, 0.82, 0, 1, 0.82, 1), c:SH}], true, 0.05),
          part('face', [...eyes(0.08, 0, 0.16, 0.3, 1.3), {g:Sp(0.1, 8, 6), m:M4(0, -0.22, 0.02, 1.5, 0.7, 0.5), c:0x5a1a2a}, {g:Sp(0.08, 8, 6), m:M4(0.48, -0.1, -0.05, 1.3, 0.7, 0.4), c:0xff9aa8}, {g:Sp(0.08, 8, 6), m:M4(-0.48, -0.1, -0.05, 1.3, 0.7, 0.4), c:0xff9aa8}], false, 0),
          part('sprout', [{g:Cy(0.04, 0.05, 0.4, 5), m:M4(0, 0.2, 0), c:0x3f8f3a}, {g:Sp(0.18, 8, 6), m:M4(0.18, 0.42, 0, 1.4, 0.4, 0.8, 0, 0, -0.4), c:0x6fd05a}, {g:Sp(0.16, 8, 6), m:M4(-0.15, 0.38, 0, 1.4, 0.4, 0.8, 0, 0, 0.4), c:0x8ae06a}], false, 0.03)],
        clips:{
          idle:bake('idle', 1.6, [[0, {}], [0.4, {'body.s':[1.06, 0.92, 1.06], sprout:[8, 0, 8]}, 'sm'], [0.8, {'body.s':[0.96, 1.06, 0.96], sprout:[-6, 0, -8]}, 'sm'], [1.2, {'body.s':[1.04, 0.95, 1.04], 'face.s':[1, 0.15, 1]}, 'sm'], [1.3, {'face.s':[1, 1, 1]}, 'lin']], true),
          move:bake('move', 0.7, [[0, {'body.s':[1.18, 0.8, 1.18]}], [0.12, {'body.s':[0.86, 1.2, 0.86], 'body.p':[0, 0.18, 0], sprout:[20, 0, 0]}, 'out'], [0.35, {'body.p':[0, 0.75, 0], 'body.s':[0.96, 1.06, 0.96], sprout:[-25, 0, 0]}, 'out'], [0.58, {'body.p':[0, 0.1, 0], 'body.s':[0.9, 1.14, 0.9], sprout:[10, 0, 0]}, 'in']], true),
          attack:bake('attack', 0.75, [[0, {}], [0.3, {'body.s':[1.28, 0.68, 1.28], 'body.p':[0, 0, -0.15], face:[18, 0, 0], sprout:[-20, 0, 0]}, 'out'], [0.4, {'body.p':[0, 0.55, 0.95], 'body.s':[0.8, 1.3, 0.8], face:[-10, 0, 0], sprout:[35, 0, 0]}, 'snap'], [0.56, {'body.p':[0, 0.05, 0.85], 'body.s':[1.22, 0.84, 1.22]}, 'in'], [0.75, {}, 'sm']]),
          hurt:bake('hurt', 0.36, [[0, {}], [0.08, {'body.s':[1.3, 0.7, 1.3], 'face.s':[1, 0.3, 1], 'body.p':[0, 0, -0.25]}, 'snap'], [0.36, {}, 'back']]),
          stun:bake('stun', 1.0, [[0, {body:[0, 0, 10], face:[0, 20, 0], 'face.s':[1, 0.4, 1]}], [0.5, {body:[0, 0, -10], face:[0, -20, 0], 'body.s':[1.05, 0.92, 1.05]}, 'sm']], true),
          die:bake('die', 0.8, [[0, {}], [0.2, {'body.s':[1.2, 0.85, 1.2], 'face.s':[1, 0.1, 1]}, 'out'], [0.8, {'body.s':[1.9, 0.08, 1.9], sprout:[80, 0, 0]}, 'in']])}};
    }
    if(type === 'golem'){
      REST = {'hips.p':[0, 1.0, 0], hips:[0, 0, 0], torso:[0, 0, 0], head:[0, 0, 0], armL:[0, 0, 18], foreL:[-15, 0, 0], fistL:[0, 0, 0], armR:[0, 0, -18], foreR:[-15, 0, 0], fistR:[0, 0, 0], legL:[0, 0, 0], footL:[0, 0, 0], legR:[0, 0, 0], footR:[0, 0, 0]};
      const moss = 0x6fbf4a;
      return {height:3.2, hitAt:0.45, spikeBone:'torso', spikes:spikeRing(1.0, 0.7, 7, 0.9, 1.0),
        bones:[['hips', null, 0, 1.0, 0], ['torso', 'hips', 0, 0.3, 0], ['head', 'torso', 0, 1.15, 0], ['armL', 'torso', 0.95, 0.85, 0], ['foreL', 'armL', 0, -0.72, 0], ['fistL', 'foreL', 0, -0.6, 0], ['armR', 'torso', -0.95, 0.85, 0], ['foreR', 'armR', 0, -0.72, 0], ['fistR', 'foreR', 0, -0.6, 0],
          ['legL', 'hips', 0.4, -0.1, 0], ['footL', 'legL', 0, -0.55, 0], ['legR', 'hips', -0.4, -0.1, 0], ['footR', 'legR', 0, -0.55, 0]],
        parts:[part('hips', [{g:Do(0.55), m:M4(0, 0, 0, 1.3, 0.7, 1)}]),
          part('torso', [{g:Do(0.75), m:M4(0, 0.55, 0, 1.35, 1.05, 1.0)}, {g:Sp(0.3, 8, 6), m:M4(0.5, 1.1, 0.2, 1.4, 0.35, 1.2), c:moss}, {g:Sp(0.25, 8, 6), m:M4(-0.6, 0.35, 0.45, 1.2, 0.35, 1), c:moss}], true, 0.05),
          part('torso', [{g:new THREE.OctahedronGeometry(0.2, 0), m:M4(0, 0.6, 0.72, 1, 1.4, 0.6), c:0x7fe7ff}], false, 0),
          part('head', [{g:Do(0.45), m:M4(0, 0.25, 0.05, 1.15, 0.9, 1)}, {g:Sp(0.2, 8, 6), m:M4(0.2, 0.62, -0.05, 1.5, 0.4, 1.2), c:moss}, {g:Bx(0.75, 0.12, 0.2), m:M4(0, 0.42, 0.42, 1, 1, 1, 0.2, 0, 0), c:SH}], true, 0.05),
          part('head', [{g:Bx(0.16, 0.1, 0.06), m:M4(0.17, 0.27, 0.48), c:0x7fe7ff}, {g:Bx(0.16, 0.1, 0.06), m:M4(-0.17, 0.27, 0.48), c:0x7fe7ff}, {g:Bx(0.22, 0.04, 0.05), m:M4(0, 0.08, 0.47), c:DK}], false, 0),
          ...['L', 'R'].flatMap(s=> [part('arm' + s, [{g:Do(0.42), m:M4(0, -0.05, 0)}, {g:Do(0.3), m:M4(0, -0.42, 0, 1, 1.2, 1)}]), part('fore' + s, [{g:Do(0.32), m:M4(0, -0.3, 0, 1, 1.25, 1)}]),
            part('fist' + s, [{g:Do(0.45), m:M4(0, -0.2, 0.05, 1.1, 0.95, 1.05)}]), part('leg' + s, [{g:Do(0.36), m:M4(0, -0.25, 0, 1, 1.2, 1)}]), part('foot' + s, [{g:Bx(0.55, 0.35, 0.75), m:M4(0, -0.27, 0.1)}])])],
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
      return {height:2.6, hitAt:0.42, spikeBone:'body', spikes:spikeRing(0.15, 0.55, 6, 0.55, 1.2),
        bones:[['body', null, 0, 1.85, 0], ['wingL', 'body', 0.45, 0.1, -0.05], ['tipL', 'wingL', 1.0, 0.02, 0], ['wingR', 'body', -0.45, 0.1, -0.05], ['tipR', 'wingR', -1.0, 0.02, 0], ['feet', 'body', 0, -0.55, 0]],
        parts:[part('body', [{g:Sp(0.62, 16, 12), m:M4(0, 0, 0, 1, 0.95, 0.95)}, {g:Co(0.2, 0.5, 5), m:M4(0.32, 0.6, -0.05, 1, 1, 0.6, 0, 0, -0.3)}, {g:Co(0.2, 0.5, 5), m:M4(-0.32, 0.6, -0.05, 1, 1, 0.6, 0, 0, 0.3)}, {g:Sp(0.42, 10, 8), m:M4(0, -0.2, 0.25, 1, 0.8, 0.6), c:0xe8d0c0}], true, 0.05),
          part('body', [...eyes(0.12, 0.5, 0.13, 0.22, 1.2), {g:Co(0.045, 0.14, 3), m:M4(-0.08, -0.1, 0.58, 1, 1, 1, Math.PI, 0, 0), c:W}, {g:Co(0.045, 0.14, 3), m:M4(0.08, -0.1, 0.58, 1, 1, 1, Math.PI, 0, 0), c:W}, {g:Sp(0.06, 6, 4), m:M4(0, 0.0, 0.6, 1.2, 0.7, 0.6), c:0xff8aa0}], false, 0),
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
      return {height:3.3, hitAt:0.42, spikeBone:'body', spikes:spikeRing(0.95, 0.55, 7, 0.6, 0.6),
        bones:[['root', null, 0, 0, 0], ['body', 'root', 0, 1.65, 0], ['jaw', 'body', 0, 0.62, 0.6], ['armL', 'body', 0.72, 0.15, 0.05], ['armR', 'body', -0.72, 0.15, 0.05], ['tail1', 'body', 0, -0.35, 0], ['tail2', 'tail1', 0, -0.5, 0], ['tail3', 'tail2', 0, -0.45, 0]],
        parts:[part('body', [{g:Sp(0.8, 18, 14), m:M4(0, 0.75, 0)}, {g:Cy(0.78, 0.72, 0.6, 16), m:M4(0, 0.15, 0)}, {g:Sp(0.18, 8, 6), m:M4(0.32, 1.32, 0.35, 1, 0.6, 0.6), c:0xffffff}], true, 0.05),
          part('body', [...eyes(0.88, 0.66, 0.15, 0.26, 1.45), {g:Sp(0.08, 8, 6), m:M4(0.5, 0.62, 0.55, 1.4, 0.7, 0.4), c:0xff9ac8}, {g:Sp(0.08, 8, 6), m:M4(-0.5, 0.62, 0.55, 1.4, 0.7, 0.4), c:0xff9ac8}], false, 0),
          part('jaw', [{g:Sp(0.12, 10, 8), m:M4(0, 0, 0.08, 1.2, 1, 0.5), c:0x2a1030}], false, 0),
          part('armL', [{g:Ca(0.13, 0.35), m:M4(0.12, -0.2, 0, 1, 1, 1, 0, 0, 0.5)}], true, 0.035), part('armR', [{g:Ca(0.13, 0.35), m:M4(-0.12, -0.2, 0, 1, 1, 1, 0, 0, -0.5)}], true, 0.035),
          part('tail1', [{g:Cy(0.7, 0.5, 0.55, 14), m:M4(0, -0.25, 0)}], true, 0.04), part('tail2', [{g:Cy(0.5, 0.3, 0.5, 12), m:M4(0, -0.25, 0), c:0xeeeeee}], true, 0.035), part('tail3', [{g:Co(0.3, 0.6, 10), m:M4(0, -0.25, 0, 1, 1, 1, Math.PI, 0, 0), c:0xdddddd}], true, 0.03)],
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
    return {height:1.9, hitAt:0.42, spikeBone:'abdomen', spikes:spikeRing(0.55, 0.5, 7, 0.55, 0.9),
      bones:[['body', null, 0, 0.95, 0], ['abdomen', 'body', 0, 0.1, -0.45], ['fangs', 'body', 0, -0.12, 0.62], ...legs.flatMap(l=> [['hip' + l.n, 'body', l.d*0.36, 0, 0.32 - l.i*0.22], ['knee' + l.n, 'hip' + l.n, l.d*0.75, 0.42, 0]])],
      parts:[part('body', [{g:Sp(0.48, 14, 10), m:M4(0, 0, 0.18, 1.1, 0.8, 1.15)}, {g:Sp(0.36, 12, 10), m:M4(0, 0.06, 0.62, 1, 0.85, 0.9), c:SH}], true, 0.045),
        part('body', [...eyes(0.18, 0.88, 0.1, 0.17, 1.2), ...eyes(0.32, 0.8, 0.065, 0.11, 1.1)], false, 0),
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
