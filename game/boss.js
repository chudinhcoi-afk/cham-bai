// boss.js — Trùm cuối "Ma Vương Vô Cực" (Three.js r160)
// Ý tưởng nhân vật theo bản Gemini; dựng lại toàn bộ hình, động tác, màn biến hình, đòn đánh và hiệu ứng.
// Dạng 1: Người Khổng Lồ Hình Học (giáp đá, lõi ∞, compa khổng lồ, vương miện ký hiệu).
// Dạng 2: Vô Cực Thức Tỉnh (vỡ giáp, thân tối nứt đỏ, cánh mảnh tứ diện, hào quang, bay lơ lửng).

export const BOSS_PALETTES = {
  6:{stone:0x8a9a8c, crystal:0x3fd17a, glow:0x7dff9a, cape:0x2e8b57},
  7:{stone:0x8d6e63, crystal:0xe07a2a, glow:0xffb347, cape:0xa8322a},
  8:{stone:0xc9b48a, crystal:0xf1c40f, glow:0xffe066, cape:0xc0612a},
  9:{stone:0x5a6650, crystal:0x9b59b6, glow:0xd28cff, cape:0x2c3e50},
  10:{stone:0xb8c4d0, crystal:0x3aa0e8, glow:0x8fe9ff, cape:0x34495e},
  11:{stone:0x3a2e2c, crystal:0xff4a1a, glow:0xffa040, cape:0x1a1010},
  12:{stone:0x7a72a8, crystal:0xc05cff, glow:0xff8ae0, cape:0x2a2060}};

export function createBoss(THREE, opts = {}){
  const D = Math.PI/180, P = Object.assign({}, BOSS_PALETTES[12], opts.palette || {});
  const merge = opts.merge, toon = opts.toon, addOutline = opts.outline || (()=>{}), fxParent = opts.fxParent, groundAt = opts.groundAt || (()=> 0);
  const M4 = (x = 0, y = 0, z = 0, sx = 1, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0)=> new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
  const Bx = (x, y, z)=> new THREE.BoxGeometry(x, y, z), Cy = (a, b, h, s = 10)=> new THREE.CylinderGeometry(a, b, h, s), Co = (r, h, s = 8)=> new THREE.ConeGeometry(r, h, s), Oc = r=> new THREE.OctahedronGeometry(r, 0), Do = r=> new THREE.DodecahedronGeometry(r, 0), Te = r=> new THREE.TetrahedronGeometry(r, 0), Ic = (r, d = 0)=> new THREE.IcosahedronGeometry(r, d), Sp = (r, a = 12, b = 8)=> new THREE.SphereGeometry(r, a, b);

  /* ---------------- VẬT LIỆU (riêng từng trùm để đổi độ sáng) ---------------- */
  const matStone = toon({vertexColors:true, flatShading:true}), matDark = toon({vertexColors:true, flatShading:true, emissive:0x2a0010}),
    matGlow = toon({vertexColors:true, emissive:P.glow, emissiveIntensity:0.9}), matWing = toon({vertexColors:true, flatShading:true, emissive:0x6a0018}),
    matCrack = new THREE.MeshBasicMaterial({color:0xff2a3a}), matHalo = new THREE.MeshBasicMaterial({color:0xff3040, transparent:true, opacity:0.9, blending:THREE.AdditiveBlending, depthWrite:false});
  const allMats = [matStone, matDark, matGlow, matWing, matCrack, matHalo];

  /* ---------------- KHUNG XƯƠNG ---------------- */
  const B = {}, object = new THREE.Group();
  const bone = (n, par, x, y, z)=>{ const b = new THREE.Group(); b.name = 'boss_' + n; b.position.set(x, y, z); (par ? B[par] : object).add(b); B[n] = b; return b; };
  bone('root', null, 0, 0, 0); bone('hips', 'root', 0, 2.6, 0); bone('spine', 'hips', 0, 0.5, 0); bone('chest', 'spine', 0, 0.9, 0); bone('neck', 'chest', 0, 1.05, 0); bone('head', 'neck', 0, 0.2, 0); bone('crown', 'head', 0, 1.25, 0);
  [['L', 1], ['R', -1]].forEach(([s, d])=>{ bone('arm' + s, 'chest', d*1.55, 0.6, 0); bone('fore' + s, 'arm' + s, 0, -1.3, 0); bone('hand' + s, 'fore' + s, 0, -1.1, 0);
    bone('thigh' + s, 'hips', d*0.72, -0.15, 0); bone('shin' + s, 'thigh' + s, 0, -1.25, 0); bone('foot' + s, 'shin' + s, 0, -1.2, 0); bone('wing' + s, 'chest', d*0.7, 0.75, -0.85); });
  bone('weapon', 'handR', 0, -0.3, 0); bone('cape1', 'chest', 0, 0.55, -0.95); bone('cape2', 'cape1', 0, -1.2, 0); bone('cape3', 'cape2', 0, -1.2, 0);

  /* ---------------- HÌNH KHỐI ---------------- */
  const armor = [], body2 = [], all = [];
  const part = (bn, parts, mat, list, ol = 0.06)=>{ const m = new THREE.Mesh(merge(parts), mat); B[bn].add(m); m.castShadow = true; if(ol) addOutline(m, ol); if(list) list.push(m); all.push(m); return m; };
  const S = P.stone, Cr = P.crystal, G = P.glow, Dk = 0x1c1424, Dk2 = 0x2a1e36;
  // giáp dạng 1 (sẽ vỡ văng ra khi biến hình)
  part('hips', [{g:Bx(1.75, 0.8, 1.15), m:M4(0, -0.05, 0), c:S}, {g:Bx(1.85, 0.22, 1.25), m:M4(0, 0.33, 0), c:Cr}, {g:Bx(0.5, 0.7, 0.3), m:M4(0, -0.45, 0.55, 1, 1, 1, -0.2, 0, 0), c:S}], matStone, armor);
  part('spine', [{g:Bx(1.5, 0.85, 1.05), m:M4(0, 0.35, 0), c:S}, {g:Bx(0.9, 0.3, 0.2), m:M4(0, 0.35, 0.55), c:Cr}], matStone, armor);
  part('chest', [{g:Oc(1.35), m:M4(0, 0.45, 0, 1.3, 1.0, 0.85), c:S}, {g:Bx(0.5, 0.5, 0.5), m:M4(-0.75, 0.9, 0.35, 1, 1, 1, 0.4, 0.7, 0.3), c:Cr}, {g:Bx(0.4, 0.4, 0.4), m:M4(0.8, 0.85, 0.3, 1, 1, 1, 0.6, 0.2, 0.5), c:Cr}], matStone, armor);
  part('head', [{g:Do(0.75), m:M4(0, 0.55, 0), c:S}, {g:Co(0.18, 0.6, 5), m:M4(0.45, 1.05, -0.1, 1, 1, 1, -0.3, 0, -0.4), c:Cr}, {g:Co(0.18, 0.6, 5), m:M4(-0.45, 1.05, -0.1, 1, 1, 1, -0.3, 0, 0.4), c:Cr}], matStone, armor);
  ['L', 'R'].forEach((s, i)=>{ const d = i ? -1 : 1;
    part('arm' + s, [{g:Bx(1.15, 1.15, 1.15), m:M4(0, 0.15, 0, 1, 1, 1, 0.3, 0.6, 0.2), c:S}, {g:Oc(0.3), m:M4(d*0.35, 0.75, 0, 1, 1.8, 1), c:Cr}, {g:Bx(0.75, 1.15, 0.75), m:M4(0, -0.65, 0), c:S}], matStone, armor);
    part('fore' + s, [{g:Bx(0.82, 1.0, 0.82), m:M4(0, -0.5, 0), c:S}, {g:Bx(0.92, 0.18, 0.92), m:M4(0, -0.15, 0), c:Cr}], matStone, armor);
    part('hand' + s, [{g:Bx(s === 'L' ? 1.05 : 0.8, s === 'L' ? 1.0 : 0.8, s === 'L' ? 1.05 : 0.8), m:M4(0, -0.38, 0), c:S}], matStone, armor);
    part('thigh' + s, [{g:Bx(0.95, 1.3, 0.95), m:M4(0, -0.62, 0), c:S}], matStone, armor);
    part('shin' + s, [{g:Bx(0.85, 1.2, 0.85), m:M4(0, -0.62, 0), c:S}, {g:Oc(0.28), m:M4(0, 0, 0.42), c:Cr}], matStone, armor);
    part('foot' + s, [{g:Bx(1.05, 0.45, 1.55), m:M4(0, 0.22, 0.25), c:S}], matStone, armor);
    // thân thật dạng 2 (ẩn dưới giáp)
    part('arm' + s, [{g:Cy(0.3, 0.24, 1.25, 7), m:M4(0, -0.6, 0), c:Dk}, {g:Sp(0.42, 8, 6), m:M4(0, 0, 0), c:Dk2}, {g:Co(0.14, 0.7, 4), m:M4(d*0.25, 0.35, -0.1, 1, 1, 1, -0.3, 0, -d*0.5), c:0x5a1030}], matDark, body2);
    part('fore' + s, [{g:Cy(0.26, 0.2, 1.05, 7), m:M4(0, -0.5, 0), c:Dk}, {g:Bx(0.06, 0.8, 0.3), m:M4(0, -0.5, 0.22), c:0xff2a3a}], matDark, body2);
    part('hand' + s, [{g:Sp(0.3, 8, 6), m:M4(0, -0.2, 0), c:Dk2}, ...[-1, 0, 1].map(k=> ({g:Co(0.08, 0.55, 4), m:M4(k*0.16, -0.62, 0.08, 1, 1, 1, 0.2, 0, k*0.25), c:0x3a1030}))], matDark, body2);
  });
  part('chest', [{g:Oc(1.05), m:M4(0, 0.45, 0, 1.15, 1.05, 0.8), c:Dk}, {g:Ic(0.55), m:M4(0, 0.95, -0.2), c:Dk2}], matDark, body2);
  part('spine', [{g:Cy(0.55, 0.38, 0.95, 8), m:M4(0, 0.4, 0), c:Dk}], matDark, body2);
  part('hips', [{g:Co(0.85, 3.0, 8), m:M4(0, -1.45, 0, 1, 1, 1, Math.PI, 0, 0), c:Dk}, ...[0, 1, 2, 3, 4, 5].map(i=>{ const a = i/6*Math.PI*2; return {g:Co(0.2, 1.4, 4), m:M4(Math.cos(a)*0.55, -0.9, Math.sin(a)*0.55, 1, 1, 1, Math.PI + Math.sin(a)*0.5, 0, -Math.cos(a)*0.5), c:0x3a1030}; })], matDark, body2);
  part('head', [{g:Do(0.62), m:M4(0, 0.55, 0), c:Dk}, {g:Co(0.16, 1.1, 5), m:M4(0.42, 1.25, -0.25, 1, 1, 1, -0.6, 0, -0.45), c:0x8a1030}, {g:Co(0.16, 1.1, 5), m:M4(-0.42, 1.25, -0.25, 1, 1, 1, -0.6, 0, 0.45), c:0x8a1030}], matDark, body2);
  // vết nứt đỏ trên ngực/đầu (lớn dần khi tích tụ, giữ lại ở dạng 2)
  const cracks = new THREE.Group(); B.chest.add(cracks);
  [[0.3, 0.7, 0.4], [-0.35, 0.3, -0.5], [0.5, 0.1, 0.9], [-0.55, 0.85, 0.7], [0.05, 0.05, -0.2], [0.75, 0.55, -0.8]].forEach(([x, y, r])=>{ const c = new THREE.Mesh(Bx(0.07, 0.7, 0.05), matCrack); c.position.set(x, y, 1.02 - Math.abs(x)*0.45); c.rotation.z = r; cracks.add(c); });
  cracks.scale.setScalar(0.001);
  // mắt, lõi ∞, compa — giữ qua cả 2 dạng
  part('head', [{g:Bx(0.34, 0.09, 0.08), m:M4(0.25, 0.62, 0.66, 1, 1, 1, 0, 0, -0.15), c:0xffffff}, {g:Bx(0.34, 0.09, 0.08), m:M4(-0.25, 0.62, 0.66, 1, 1, 1, 0, 0, 0.15), c:0xffffff}], matGlow, null, 0);
  const core = new THREE.Mesh(merge([{g:Oc(0.42), m:M4(0, 0, 0, 1, 1.25, 0.7), c:0xffffff}]), matGlow); core.position.set(0, 0.45, 1.02); B.chest.add(core); all.push(core);
  const sym = (txt, col, size = 0.9)=>{ const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.font = 'bold 96px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = col; x.shadowBlur = 18; x.fillStyle = '#fff'; x.fillText(txt, 64, 70); x.fillStyle = col; x.globalAlpha = 0.85; x.fillText(txt, 64, 70);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({map:t, transparent:true, depthWrite:false, fog:false})); s.scale.setScalar(size); return s; };
  const inf = sym('∞', '#' + new THREE.Color(P.glow).getHexString(), 0.75); inf.position.set(0, 0.47, 1.4); B.chest.add(inf);
  part('weapon', [{g:Cy(0.13, 0.13, 1.1, 8), m:M4(0, 0, 0.05, 1, 1, 1, Math.PI/2, 0, 0), c:0x3a2a1a}, {g:Sp(0.32, 10, 8), m:M4(0, 0, 0.75), c:Cr},
    {g:Cy(0.1, 0.06, 3.9, 6), m:M4(0.22, 0, 2.7, 1, 1, 1, Math.PI/2, 0, -0.06), c:S}, {g:Cy(0.1, 0.06, 3.9, 6), m:M4(-0.22, 0, 2.7, 1, 1, 1, Math.PI/2, 0, 0.06), c:S},
    {g:Co(0.08, 0.5, 5), m:M4(0.34, 0, 4.85, 1, 1, 1, Math.PI/2, 0, 0), c:0x222222}, {g:Bx(0.5, 0.1, 0.12), m:M4(0, 0, 1.5), c:Cr}], matStone, null, 0.05);
  part('weapon', [{g:Oc(0.24), m:M4(-0.36, 0, 4.85, 1, 1, 2.2), c:0xffffff}], matGlow, null, 0);
  // áo choàng rách (mảnh tam giác)
  part('cape1', [{g:Bx(2.3, 1.25, 0.08), m:M4(0, -0.6, 0), c:P.cape}], matStone, armor);
  part('cape2', [{g:Bx(2.5, 1.25, 0.08), m:M4(0, -0.6, 0), c:P.cape}], matStone, armor);
  part('cape3', [{g:Bx(2.6, 0.9, 0.08), m:M4(0, -0.45, 0), c:P.cape}, ...[-1, -0.33, 0.33, 1].map(k=> ({g:Co(0.32, 0.6, 3), m:M4(k*1.0, -1.15, 0, 1, 1, 0.25, Math.PI, 0, 0), c:P.cape}))], matStone, armor);
  // vương miện ký hiệu toán học (xoay quanh đầu)
  const crownSyms = ['π', 'Σ', '√', '∞', '%', '∫'].map(t=>{ const s = sym(t, '#' + new THREE.Color(P.glow).getHexString(), 0.75); const r = sym(t, '#ff3040', 0.9); r.visible = false; B.crown.add(s, r); return {s, r}; });
  const halo = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.07, 6, 40), matHalo); halo.rotation.x = Math.PI/2; halo.visible = false; B.crown.add(halo);
  // cánh dạng 2: mỗi bên 14 mảnh tứ diện (vẽ hàng loạt), bung ra lần lượt
  const wingGeo = merge([{g:Te(0.5), m:M4(0, 0, 0, 0.7, 2.2, 0.5), c:0x5a1028}]);
  const wings = ['L', 'R'].map((s, wi)=>{ const d = wi ? -1 : 1, n = 14, im = new THREE.InstancedMesh(wingGeo, matWing, n); im.frustumCulled = false; B['wing' + s].add(im); addOutline(im, 0.05);
    const P0 = []; for(let i = 0; i < n; i++){ const row = i % 3, k = Math.floor(i/3), a = (k/4)*1.25 - 0.15, dd = 1.0 + row*0.95 + k*0.25;
      P0.push({p:new THREE.Vector3(d*Math.cos(a)*dd*1.25, Math.sin(a)*dd + 0.2, -0.25 - row*0.18), r:new THREE.Euler(0, 0, d*(-Math.PI/2 + a) + (row - 1)*0.15), s:0.8 + row*0.25, delay:i*0.035}); }
    im.visible = false; return {im, P0, d}; });
  B.wingL.visible = B.wingR.visible = false;
  // vệ tinh hình học bay quanh dạng 2
  const orbit = new THREE.Group(); B.root.add(orbit); orbit.visible = false;
  const orbs = [Bx(0.8, 0.8, 0.8), Te(0.6), Oc(0.6), Ic(0.5)].map((g, i)=>{ const m = new THREE.Mesh(merge([{g, c:[0xff3a5a, 0xb05cff, 0xff8a3a, 0x5ac8ff][i]}]), matWing); orbit.add(m); addOutline(m, 0.05); return m; });
  // tia laser từ lõi
  const beamM = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 17, 12, 1, true).rotateX(Math.PI/2).translate(0, 0, 9.5), new THREE.MeshBasicMaterial({color:0xff4060, transparent:true, opacity:0.85, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide}));
  const beamIn = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 17, 8, 1, true).rotateX(Math.PI/2).translate(0, 0, 9.5), new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false}));
  const beam = new THREE.Group(); beam.add(beamM, beamIn); beam.visible = false; B.root.add(beam); beam.position.set(0, 4.4, 0.6); beam.rotation.x = 0.5;
  body2.forEach(m=> m.visible = false);

  /* ---------------- HẠT (dùng chung một hệ, toạ độ thế giới) ---------------- */
  const NP = 320, pPos = new Float32Array(NP*3), pCol = new Float32Array(NP*3), pVel = new Float32Array(NP*3), pLife = new Float32Array(NP), pMax = new Float32Array(NP), pBase = new Float32Array(NP*3); let pNext = 0;
  const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  const dot = (()=>{ const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const pts = new THREE.Points(pGeo, new THREE.PointsMaterial({size:0.55, map:dot, vertexColors:true, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, fog:false})); pts.frustumCulled = false;
  for(let i = 0; i < NP; i++) pPos[i*3 + 1] = -999;
  const _c = new THREE.Color();
  function spawnP(x, y, z, vx, vy, vz, col, life){ const i = pNext; pNext = (pNext + 1) % NP; pPos.set([x, y, z], i*3); pVel.set([vx, vy, vz], i*3); _c.set(col); pBase.set([_c.r, _c.g, _c.b], i*3); pLife[i] = pMax[i] = life; }
  function updP(dt){ for(let i = 0; i < NP; i++){ const j = i*3; if(pLife[i] <= 0){ pPos[j + 1] = -999; continue; } pLife[i] -= dt; pPos[j] += pVel[j]*dt; pPos[j + 1] += pVel[j + 1]*dt; pPos[j + 2] += pVel[j + 2]*dt; const k = Math.max(0, pLife[i]/pMax[i]); pCol[j] = pBase[j]*k; pCol[j + 1] = pBase[j + 1]*k; pCol[j + 2] = pBase[j + 2]*k; }
    pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true; }

  /* ---------------- ĐỘNG TÁC ----------------
     Quy ước: x âm = đưa tay/chân ra trước; với cây compa: tổng góc x của chuỗi (thân→tay→compa) = −góc ngóc của mũi compa. */
  const REST1 = {'root.p':[0, 0, 0], 'root.s':[1, 1, 1], root:[0, 0, 0], 'hips.p':[0, 2.6, 0], hips:[0, 0, 0], spine:[0, 0, 0], chest:[0, 0, 0], neck:[0, 0, 0], head:[0, 0, 0],
    armL:[5, 0, 12], foreL:[-20, 0, 0], handL:[0, 0, 0], armR:[-20, 0, -10], foreR:[-30, 0, 0], handR:[0, 0, 0], weapon:[80, 0, 0],
    thighL:[0, 0, 4], shinL:[0, 0, 0], footL:[0, 0, 0], thighR:[0, 0, -4], shinR:[0, 0, 0], footR:[0, 0, 0],
    cape1:[8, 0, 0], cape2:[5, 0, 0], cape3:[4, 0, 0], wingL:[0, 0, 0], wingR:[0, 0, 0], 'wingL.s':[0.01, 0.01, 0.01], 'wingR.s':[0.01, 0.01, 0.01]};
  const REST2 = Object.assign({}, REST1, {'root.p':[0, 1.1, 0], 'root.s':[1.45, 1.45, 1.45], spine:[10, 0, 0], head:[-6, 0, 0], armL:[15, 0, 28], foreL:[-40, 0, 0], armR:[-10, 0, -26], foreR:[-45, 0, 0], weapon:[65, 0, 0],
    thighL:[20, 0, 10], shinL:[30, 0, 0], thighR:[20, 0, -10], shinR:[30, 0, 0], wingL:[0, -25, 10], wingR:[0, 25, -10], 'wingL.s':[1, 1, 1], 'wingR.s':[1, 1, 1], cape1:[30, 0, 0]});
  const EASE = {lin:t=> t, io:t=> t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2)/2, in:t=> t*t*t, out:t=> 1 - Math.pow(1 - t, 3), sm:t=> t*t*(3 - 2*t),
    back:t=>{ const c1 = 1.9, c3 = c1 + 1; return 1 + c3*Math.pow(t - 1, 3) + c1*Math.pow(t - 1, 2); }, snap:t=> 1 - Math.pow(1 - t, 5)};
  const _q = new THREE.Quaternion(), _e = new THREE.Euler();
  function bake(name, dur, keys, loop, REST){
    const full = []; let prev = Object.assign({}, REST);
    keys.forEach(([t, pose, ease])=>{ prev = Object.assign({}, prev, pose); full.push({t, pose:prev, ease:ease || 'io'}); });
    if(loop) full.push({t:dur, pose:full[0].pose, ease:'io'});
    const N = Math.max(2, Math.round(dur*30) + 1), times = Array.from({length:N}, (_, i)=> i/(N - 1)*dur), tracks = [];
    Object.keys(REST).forEach(k=>{ const kind = k.endsWith('.p') ? 'p' : k.endsWith('.s') ? 's' : 'r', bn = 'boss_' + k.replace(/\.[ps]$/, ''), vals = [];
      times.forEach(t=>{ let v; if(t <= full[0].t) v = full[0].pose[k]; else if(t >= full[full.length - 1].t) v = full[full.length - 1].pose[k];
        else { let i = 0; while(full[i + 1].t < t) i++; const a = full[i], b = full[i + 1], u = EASE[b.ease]((t - a.t)/(b.t - a.t)); v = a.pose[k].map((x, j)=> x + (b.pose[k][j] - x)*u); }
        if(kind === 'r'){ _q.setFromEuler(_e.set(v[0]*D, v[1]*D, v[2]*D)); vals.push(_q.x, _q.y, _q.z, _q.w); } else vals.push(...v); });
      tracks.push(kind === 'r' ? new THREE.QuaternionKeyframeTrack(bn + '.quaternion', times, vals) : new THREE.VectorKeyframeTrack(bn + (kind === 'p' ? '.position' : '.scale'), times, vals)); });
    return new THREE.AnimationClip(name, dur, tracks);
  }
  const R1 = REST1, R2 = REST2;
  const CL = {
    idle: bake('idle', 3.0, [[0, {}], [1.5, {'hips.p':[0, 2.5, 0], chest:[4, 0, 0], head:[4, 0, 0], armL:[8, 0, 15], armR:[-17, 0, -13], cape1:[13, 0, 0], cape2:[9, 0, 0]}, 'sm']], true, R1),
    walk: bake('walk', 2.0, [
      [0, {'hips.p':[0, 2.5, 0], hips:[0, 8, 0], thighL:[-28, 0, 4], shinL:[10, 0, 0], thighR:[22, 0, -4], shinR:[25, 0, 0], armL:[22, 0, 12], armR:[-30, 0, -10], spine:[6, -5, 0], cape1:[20, 0, 0]}],
      [0.5, {'hips.p':[0, 2.35, 0], shinL:[0, 0, 0], cape1:[14, 0, 0]}, 'in'],
      [1.0, {'hips.p':[0, 2.62, 0], hips:[0, -8, 0], thighL:[22, 0, 4], shinL:[25, 0, 0], thighR:[-28, 0, -4], shinR:[10, 0, 0], armL:[-10, 0, 12], armR:[-12, 0, -10], spine:[6, 5, 0], cape1:[22, 0, 0]}, 'out'],
      [1.5, {'hips.p':[0, 2.35, 0], shinR:[0, 0, 0], cape1:[14, 0, 0]}, 'in']], true, R1),
    slam: bake('slam', 1.6, [[0, {}],
      [0.72, {'hips.p':[0, 2.5, -0.2], spine:[-22, 0, 0], chest:[-10, 0, 0], head:[-15, 0, 0], armR:[-170, 0, -15], foreR:[-20, 0, 0], weapon:[60, 0, 0], armL:[-140, 0, 30], foreL:[-30, 0, 0], thighL:[-15, 0, 4], cape1:[3, 0, 0]}, 'out'],
      [0.82, {'hips.p':[0, 2.0, 0.5], spine:[30, 0, 0], chest:[12, 0, 0], head:[15, 0, 0], armR:[-75, 0, -8], foreR:[-10, 0, 0], weapon:[80, 0, 0], armL:[-50, 0, 25], foreL:[-20, 0, 0], thighL:[-45, 0, 4], shinL:[40, 0, 0], thighR:[25, 0, -4], shinR:[30, 0, 0], cape1:[45, 0, 0], cape2:[30, 0, 0]}, 'snap'],
      [1.15, {'hips.p':[0, 2.05, 0.5]}, 'out'], [1.6, {}, 'sm']], false, R1),
    sweep: bake('sweep', 1.7, [[0, {}],
      [0.68, {hips:[0, -40, 0], spine:[0, -25, 0], head:[0, 30, 0], armR:[-80, -30, -80], foreR:[-15, 0, 0], weapon:[95, 0, 0], armL:[-20, 0, 50], thighL:[-15, 0, 8], thighR:[10, 0, -10], cape1:[10, 0, -15]}, 'out'],
      [0.92, {hips:[0, 55, 0], spine:[0, 40, 0], head:[0, -25, 0], armR:[-85, 60, -20], foreR:[-5, 0, 0], weapon:[95, 0, 0], armL:[10, 0, 40], cape1:[35, 0, 30], cape2:[25, 0, 20]}, 'snap'],
      [1.2, {hips:[0, 60, 0], spine:[0, 45, 0]}, 'out'], [1.7, {}, 'sm']], false, R1),
    hurt: bake('hurt', 0.45, [[0, {}], [0.1, {'hips.p':[0, 2.5, -0.3], spine:[-14, 0, 6], head:[-20, 0, 8], armL:[-30, 0, 40]}, 'snap'], [0.45, {}, 'sm']], false, R1),
    die: bake('die', 2.1, [[0, {}],
      [0.5, {'hips.p':[0, 1.6, 0.3], spine:[35, 0, 0], head:[30, 0, 0], thighL:[-80, 0, 6], shinL:[100, 0, 0], thighR:[-30, 0, -6], shinR:[110, 0, 0], armL:[-30, 0, 20], armR:[-30, 0, -20], weapon:[20, 0, 0]}, 'out'],
      [1.3, {'hips.p':[0, 1.0, 1.0], hips:[50, 0, 0], spine:[30, 0, 0], head:[20, 0, 0], armL:[-150, 0, 30], armR:[-150, 0, -30]}, 'in'], [2.1, {}, 'sm']], false, R1),
    // MÀN BIẾN HÌNH 3.5 giây
    transform: bake('transform', 3.5, [[0, {}],
      [0.4, {'hips.p':[0, 1.7, 0.2], hips:[10, 0, 0], spine:[30, 0, 0], head:[25, 0, 0], thighL:[-75, 0, 6], shinL:[100, 0, 0], footL:[-25, 0, 0], thighR:[-20, 0, -6], shinR:[95, 0, 0], armL:[-55, 0, 18], foreL:[-95, 0, 0], armR:[-40, 0, -15], foreR:[-60, 0, 0], weapon:[100, 0, 0], cape1:[2, 0, 0]}, 'out'],
      [0.8, {spine:[38, 0, 0], head:[32, 0, 0], foreL:[-105, 0, 0]}, 'sm'],
      [1.3, {'hips.p':[0, 2.75, -0.1], hips:[-8, 0, 0], spine:[-22, 0, 0], chest:[-10, 0, 0], head:[-40, 0, 0], thighL:[0, 0, 8], shinL:[0, 0, 0], footL:[0, 0, 0], thighR:[0, 0, -8], shinR:[0, 0, 0], armL:[-150, 0, 40], foreL:[-20, 0, 0], armR:[-150, 0, -40], foreR:[-20, 0, 0], weapon:[110, 0, 0], cape1:[40, 0, 0], cape2:[30, 0, 0]}, 'back'],
      [1.6, {spine:[-26, 0, 0], head:[-48, 0, 0]}, 'sm'],
      [2.2, {'root.s':[1.45, 1.45, 1.45], 'root.p':[0, 1.7, 0], spine:[-15, 0, 0], chest:[-5, 0, 0], head:[-20, 0, 0], armL:[-120, 0, 60], foreL:[-30, 0, 0], armR:[-120, 0, -60], foreR:[-30, 0, 0], weapon:[60, 0, 0], thighL:[20, 0, 10], shinL:[30, 0, 0], thighR:[20, 0, -10], shinR:[30, 0, 0],
        'wingL.s':[1, 1, 1], 'wingR.s':[1, 1, 1], wingL:[0, -40, 30], wingR:[0, 40, -30]}, 'back'],
      [2.6, {'root.p':[0, 1.35, 0], spine:[-35, 0, 0], chest:[-12, 0, 0], head:[-55, 0, 0], armL:[-60, 0, 85], foreL:[-10, 0, 0], armR:[-60, 0, -85], foreR:[-10, 0, 0], wingL:[0, -10, 45], wingR:[0, 10, -45]}, 'snap'],
      [2.95, {head:[-50, 0, 0], spine:[-32, 0, 0]}, 'out'],
      [3.5, R2, 'io']], false, R1),
    idle2: bake('idle2', 2.0, [[0, {}], [1.0, {'root.p':[0, 0.85, 0], spine:[13, 0, 0], armL:[20, 0, 32], armR:[-6, 0, -30], wingL:[0, -15, -5], wingR:[0, 15, 5]}, 'sm']], true, R2),
    move2: bake('move2', 1.2, [[0, {'root.p':[0, 1.2, 0], spine:[28, 0, 0], head:[-15, 0, 0], armL:[40, 0, 35], armR:[30, 0, -35], weapon:[100, 0, 0], wingL:[0, -45, 25], wingR:[0, 45, -25]}], [0.6, {'root.p':[0, 0.95, 0], wingL:[0, -10, -15], wingR:[0, 10, 15]}, 'sm']], true, R2),
    slam2: bake('slam2', 1.9, [[0, {}],
      [0.7, {'root.p':[0, 3.2, -0.5], spine:[-25, 0, 0], head:[-20, 0, 0], armR:[-175, 0, -15], foreR:[-15, 0, 0], weapon:[70, 0, 0], armL:[-160, 0, 25], wingL:[0, -50, 45], wingR:[0, 50, -45]}, 'out'],
      [0.85, {'root.p':[0, 0.1, 0.8], spine:[35, 0, 0], head:[15, 0, 0], armR:[-70, 0, -8], foreR:[-5, 0, 0], weapon:[25, 0, 0], armL:[-60, 0, 20], wingL:[0, -5, -20], wingR:[0, 5, 20]}, 'snap'],
      [1.3, {'root.p':[0, 0.2, 0.8]}, 'out'], [1.9, {}, 'sm']], false, R2),
    shardRain: bake('shardRain', 2.2, [[0, {}],
      [0.5, {'root.p':[0, 1.6, 0], spine:[-20, 0, 0], head:[-35, 0, 0], armL:[-175, 0, 30], foreL:[-10, 0, 0], armR:[-170, 0, -30], foreR:[-10, 0, 0], weapon:[100, 0, 0], wingL:[0, -30, 50], wingR:[0, 30, -50]}, 'back'],
      [1.3, {spine:[-24, 0, 0], armL:[-170, 0, 50], armR:[-165, 0, -50]}, 'sm'],
      [1.5, {spine:[20, 0, 0], head:[0, 0, 0], armL:[-40, 0, 60], armR:[-40, 0, -60]}, 'snap'], [2.2, {}, 'sm']], false, R2),
    beam: bake('beam', 2.3, [[0, {}],
      [1.0, {'root.p':[0, 1.0, -0.3], spine:[-20, 0, 0], chest:[-8, 0, 0], head:[-25, 0, 0], armL:[-30, 0, 80], foreL:[-30, 0, 0], armR:[-30, 0, -80], foreR:[-30, 0, 0], wingL:[0, -60, 30], wingR:[0, 60, -30]}, 'out'],
      [1.12, {spine:[5, 0, 0], chest:[0, 0, 0], head:[0, 0, 0], wingL:[0, 0, 10], wingR:[0, 0, -10]}, 'snap'],
      [1.65, {spine:[8, 0, 0]}, 'lin'], [2.3, {}, 'sm']], false, R2),
    charge: bake('charge', 1.6, [[0, {}],
      [0.6, {'root.p':[0, 1.3, -0.6], spine:[-15, 0, 0], head:[-10, 0, 0], armL:[30, 0, 40], armR:[40, 0, -40], weapon:[120, 0, 0], wingL:[0, -60, 40], wingR:[0, 60, -40]}, 'out'],
      [0.7, {'root.p':[0, 0.9, 0.4], spine:[45, 0, 0], head:[-30, 0, 0], armL:[60, 0, 30], armR:[60, 0, -30], wingL:[0, -80, 0], wingR:[0, 80, 0]}, 'snap'],
      [1.0, {}, 'lin'], [1.6, {}, 'sm']], false, R2),
    hurt2: bake('hurt2', 0.45, [[0, {}], [0.1, {'root.p':[0, 1.3, -0.4], spine:[-10, 0, 0], head:[-20, 0, 0]}, 'snap'], [0.45, {}, 'sm']], false, R2),
    die2: bake('die2', 1.6, [[0, {}], [0.9, {'root.p':[0, 2.2, 0], spine:[-35, 0, 0], head:[-55, 0, 0], armL:[-90, 0, 80], armR:[-90, 0, -80], wingL:[0, 0, 60], wingR:[0, 0, -60]}, 'out'], [1.6, {}, 'lin']], false, R2)};

  /* ---------------- SỰ KIỆN THEO KHUNG HÌNH ---------------- */
  const _v = new THREE.Vector3(), _w = new THREE.Vector3();
  const W = (x, y, z)=> object.localToWorld(new THREE.Vector3(x, y, z));
  const yawW = ()=>{ object.getWorldDirection(_w); return Math.atan2(_w.x, _w.z); };
  let targets = [], lineStart = null, lineYaw = 0, playerPos = new THREE.Vector3();
  const EVT = {
    slam:[{t:0.02, f:()=> ['telegraph', {shape:'circle', center:W(0, 0, 4.4), radius:3.6, duration:0.8}]}, {t:0.82, f:()=> ['hit', {shape:'circle', center:W(0, 0, 4.4), radius:3.6, dmgScale:1}]}],
    sweep:[{t:0.02, f:()=> ['telegraph', {shape:'cone', center:W(0, 0, 0), radius:7.5, angle:200*D, yaw:yawW(), duration:0.86}]}, {t:0.88, f:()=> ['hit', {shape:'cone', center:W(0, 0, 0), radius:7.5, angle:200*D, yaw:yawW(), dmgScale:1}]}],
    slam2:[{t:0.02, f:()=> ['telegraph', {shape:'circle', center:W(0, 0, 0), radius:9.5, duration:0.85}]}, {t:0.86, f:()=> ['hit', {shape:'circle', center:W(0, 0, 4.2), radius:4.2, dmgScale:1, wave:0}]},
      {t:1.05, f:()=> ['hit', {shape:'circle', center:W(0, 0, 0), radius:6.5, dmgScale:0.7, wave:1}]}, {t:1.25, f:()=> ['hit', {shape:'circle', center:W(0, 0, 0), radius:9.5, dmgScale:0.5, wave:2}]}],
    shardRain:[{t:0.5, f:()=>{ targets = [playerPos.clone()]; for(let i = 0; i < 4; i++){ const a = Math.random()*Math.PI*2, r = 2.5 + Math.random()*2.5; targets.push(playerPos.clone().add(new THREE.Vector3(Math.cos(a)*r, 0, Math.sin(a)*r))); } return ['telegraph', targets.map(c=> ({shape:'circle', center:c, radius:1.9, duration:0.8}))]; }},
      {t:0.95, f:()=>{ targets.forEach(c=> dropShard(c)); return null; }}, {t:1.3, f:()=> ['hit', targets.map(c=> ({shape:'circle', center:c, radius:1.9, dmgScale:0.8}))]}],
    beam:[{t:0.05, f:()=>{ lineStart = W(0, 0, 1.2); lineYaw = yawW(); return ['telegraph', {shape:'line', center:lineStart, yaw:lineYaw, length:17, width:2.2, duration:1.08}]; }},
      ...[1.15, 1.35, 1.55].map(t=> ({t, f:()=> ['hit', {shape:'line', center:lineStart, yaw:lineYaw, length:17, width:2.2, dmgScale:0.45}]}))],
    charge:[{t:0.02, f:()=>{ lineStart = W(0, 0, 0); lineYaw = yawW(); return ['telegraph', {shape:'line', center:lineStart, yaw:lineYaw, length:12.5, width:3.4, duration:0.6}]; }},
      {t:0.78, f:()=> ['hit', {shape:'line', center:lineStart, yaw:lineYaw, length:12.5, width:3.4, dmgScale:1.2}]}]};
  const CB = {};
  const emit = (ev, d)=> (CB[ev] || []).forEach(f=> f(d));

  /* ---------------- MẢNH VĂNG, MƯA MẢNH ---------------- */
  const flying = [];
  function throwOff(meshes, power = 1){
    const ctr = B.chest.getWorldPosition(new THREE.Vector3()), host = fxParent || object.parent;
    meshes.forEach(m=>{ if(!m.parent || !m.visible) return; m.updateWorldMatrix(true, false); const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(); m.matrixWorld.decompose(p, q, s);
      m.parent.remove(m); host.add(m); m.position.copy(p); m.quaternion.copy(q); m.scale.copy(s);
      const dir = p.clone().sub(ctr); dir.y = Math.max(0.2, dir.y); dir.normalize();
      flying.push({m, v:dir.multiplyScalar((6 + Math.random()*6)*power).add(new THREE.Vector3(0, (5 + Math.random()*5)*power, 0)), av:new THREE.Vector3((Math.random() - 0.5)*8, (Math.random() - 0.5)*8, (Math.random() - 0.5)*8), life:2.6}); });
  }
  const fadeMat = matStone.clone(); fadeMat.transparent = true; allMats.push(fadeMat);
  function updFlying(dt){ for(let i = flying.length - 1; i >= 0; i--){ const f = flying[i]; f.v.y -= 22*dt; f.m.position.addScaledVector(f.v, dt); f.m.rotation.x += f.av.x*dt; f.m.rotation.y += f.av.y*dt; f.m.rotation.z += f.av.z*dt;
      const gy = groundAt(f.m.position.x, f.m.position.z) + 0.3; if(f.m.position.y < gy){ f.m.position.y = gy; f.v.y *= -0.3; f.v.x *= 0.6; f.v.z *= 0.6; f.av.multiplyScalar(0.6); }
      f.life -= dt; if(f.life < 1){ if(f.m.material === matStone) f.m.material = fadeMat; if(f.m.material === matDark){ const m2 = matDark.clone(); m2.transparent = true; f.m.material = m2; allMats.push(m2); } f.m.material.opacity = Math.max(0, f.life); f.m.children.forEach(c=> c.visible = f.life > 0.5); }
      if(f.life <= 0){ f.m.parent && f.m.parent.remove(f.m); flying.splice(i, 1); } }
    fadeMat.opacity = Math.max(0, Math.min(1, ...flying.filter(f=> f.m.material === fadeMat).map(f=> f.life), 1)); }
  const shards = [], shardGeo = merge([{g:Te(0.9), m:M4(0, 0, 0, 0.8, 2.6, 0.8, Math.PI, 0, 0), c:0xff3a5a}]);
  function dropShard(c){ const m = new THREE.Mesh(shardGeo, matWing); addOutline(m, 0.06); m.position.set(c.x, c.y + 16, c.z); (fxParent || object.parent).add(m); shards.push({m, c:c.clone(), t:0}); }
  function updShards(dt){ for(let i = shards.length - 1; i >= 0; i--){ const s = shards[i]; s.t += dt; const k = Math.min(1, s.t/0.35); s.m.position.y = s.c.y + 16*(1 - k*k) + 0.6; s.m.rotation.y += dt*8;
      if(k >= 1 && !s.hit){ s.hit = true; for(let j = 0; j < 14; j++){ const a = Math.random()*Math.PI*2; spawnP(s.c.x, s.c.y + 0.4, s.c.z, Math.cos(a)*6, 3 + Math.random()*4, Math.sin(a)*6, j % 2 ? 0xff3a5a : 0xffa040, 0.6); } }
      if(s.t > 1.1){ s.m.parent && s.m.parent.remove(s.m); shards.splice(i, 1); } } }

  /* ---------------- BỘ TRỘN ĐỘNG TÁC ---------------- */
  const mixer = new THREE.AnimationMixer(object), A = {};
  const BASES = ['idle', 'walk', 'idle2', 'move2'];
  Object.keys(CL).forEach(k=>{ const a = A[k] = mixer.clipAction(CL[k]); if(!BASES.includes(k)){ a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; } a.setEffectiveWeight(0); a.play(); a.paused = !BASES.includes(k); });
  let phase = 1, cur = null, curW = 0, prev = null, prevW = 0, fired = new Set(), speed = 0, speedS = 0, dead = false, flashT = 0, tf = null, clock = 0, stepPh = 0, motion = 0, crownA = 0;
  const FIN = {transform:0.15, die:0.15, die2:0.1};
  function play(name){ if(cur && cur !== name){ prev = cur; prevW = curW; } cur = name; curW = 0; fired = new Set(); const a = A[name]; a.reset(); a.paused = false; a.play(); }
  function enterPhase2(){ phase = 2; throwOff(armor, 1); body2.forEach(m=> m.visible = true); wings.forEach(w=> w.im.visible = true); B.wingL.visible = B.wingR.visible = true; halo.visible = true; crownSyms.forEach(o=>{ o.s.visible = false; o.r.visible = true; });
    matGlow.emissive.set(0xff2040); }
  const api = {
    object, bones:B, core, mixer, clips:CL, actions:A,
    get phase(){ return phase; }, get busy(){ return !!cur && cur !== 'hurt' && cur !== 'hurt2'; }, get action(){ return cur; }, get dead(){ return dead; },
    get height(){ return phase === 1 ? 7.4 : 12.5; }, get motion(){ return motion; },
    on(ev, f){ (CB[ev] = CB[ev] || []).push(f); return api; },
    setMove(s){ speed = Math.max(0, Math.min(1, s)); },
    attack(name){
      if(dead || cur && cur !== 'hurt' && cur !== 'hurt2') return null;
      if(!name){ const d = playerPos.distanceTo(object.position);
        if(phase === 1) name = Math.random() < 0.5 ? 'slam' : 'sweep';
        else { const r = Math.random(); name = d > 7 ? (r < 0.4 ? 'beam' : r < 0.75 ? 'charge' : 'shardRain') : (r < 0.4 ? 'slam2' : r < 0.65 ? 'shardRain' : r < 0.85 ? 'beam' : 'charge'); } }
      if(!CL[name] || (phase === 1) !== ['slam', 'sweep'].includes(name)) return null;
      play(name); return name; },
    transform(){ if(phase !== 1 || dead || tf) return 0; tf = {t:0, shatter:false, roar:false}; play('transform'); return CL.transform.duration; },
    hurt(){ if(dead || tf || (cur && cur !== 'hurt' && cur !== 'hurt2')) return; play(phase === 1 ? 'hurt' : 'hurt2'); },
    flash(){ flashT = 0.12; },
    die(){ if(dead) return; dead = true; tf = null; beam.visible = false; play(phase === 1 ? 'die' : 'die2'); },
    update(dt, pp){
      clock += dt; motion = 0; if(pp) playerPos.copy(pp); speedS += (speed - speedS)*Math.min(1, dt*6);
      // sự kiện theo khung hình
      if(cur){ const a = A[cur], dur = CL[cur].duration;
        (EVT[cur] || []).forEach((e, i)=>{ if(!fired.has(i) && a.time >= e.t){ fired.add(i); const r = e.f(); if(r){ const [ev, d] = r; (Array.isArray(d) ? d : [d]).forEach(x=> emit(ev, Object.assign({attack:cur}, x))); } } });
        curW = Math.min(1, curW + dt/(FIN[cur] || 0.08));
        if(cur === 'charge' && a.time > 0.62 && a.time < 0.95) motion = 32*dt;
        if(cur === 'beam'){ const on = a.time > 1.1 && a.time < 1.65; beam.visible = on; if(on){ const f = 0.8 + Math.random()*0.4; beamM.scale.set(f, f, 1); beamIn.scale.set(f, f, 1); } }
        if(cur === 'beam' && a.time < 1.1){ matGlow.emissiveIntensity = 1 + a.time*4; if(Math.random() < 0.7){ const c = core.getWorldPosition(_v); const r = 4, an = Math.random()*Math.PI*2; spawnP(c.x + Math.cos(an)*r, c.y + (Math.random() - 0.5)*3, c.z + Math.sin(an)*r, -Math.cos(an)*r*1.8, 0, -Math.sin(an)*r*1.8, 0xff4060, 0.55); } }
        if((cur === 'die' && a.time > 1.25 && !fired.has('crumble')) ){ fired.add('crumble'); throwOff(armor, 0.45); throwOff(all.filter(m=> m.visible), 0.3); }
        if(cur === 'die2' && a.time > 0.95 && !fired.has('boom')){ fired.add('boom'); const c = core.getWorldPosition(new THREE.Vector3()); for(let j = 0; j < 90; j++){ const u = new THREE.Vector3().randomDirection().multiplyScalar(6 + Math.random()*10); spawnP(c.x, c.y, c.z, u.x, u.y, u.z, j % 3 ? 0xff3040 : 0xffd0a0, 1.2); }
          throwOff(all.filter(m=> m.visible), 1.4); wings.forEach(w=> w.im.visible = false); B.wingL.visible = B.wingR.visible = false; halo.visible = false; orbit.visible = false; crownSyms.forEach(o=> o.r.visible = false); inf.visible = false; emit('explode', {center:c}); }
        if(a.time >= dur - 1e-4){ if(cur === 'die' || cur === 'die2'){ if(!fired.has('deadEv')){ fired.add('deadEv'); emit('dead', {}); } }
          else { prev = cur; prevW = curW; cur = null; curW = 0; } }
      }
      if(prev){ prevW = Math.max(0, prevW - dt/0.18); if(prevW <= 0){ A[prev].setEffectiveWeight(0); A[prev].paused = true; prev = null; } }
      // màn biến hình: tích tụ → vỡ giáp → thức tỉnh → gầm
      if(tf){ tf.t = A.transform.time; const t = tf.t;
        if(t < 1.6){ const k = t/1.6; matStone.emissive.setRGB(0.55*k*k, 0.02, 0.05*k); cracks.scale.setScalar(Math.max(0.001, k)); matGlow.emissiveIntensity = 1 + k*5;
          const c = core.getWorldPosition(_v); for(let j = 0; j < 3; j++){ const an = Math.random()*Math.PI*2, r = 5 + Math.random()*4; spawnP(c.x + Math.cos(an)*r, groundAt(c.x, c.z) + Math.random()*1.5, c.z + Math.sin(an)*r, -Math.cos(an)*r*1.4, (c.y - 0.5)*1.4, -Math.sin(an)*r*1.4, j ? 0xff2a3a : 0xffa0a0, 0.7); }
          if(t > 0.8){ const s = (t - 0.8)*0.08; B.root.position.x = (Math.random() - 0.5)*s; B.root.position.z = (Math.random() - 0.5)*s; } }
        if(t >= 1.6 && !tf.shatter){ tf.shatter = true; enterPhase2(); emit('shatter', {center:core.getWorldPosition(new THREE.Vector3())}); const c = core.getWorldPosition(_v); for(let j = 0; j < 60; j++){ const u = new THREE.Vector3().randomDirection().multiplyScalar(5 + Math.random()*8); spawnP(c.x, c.y, c.z, u.x, u.y + 3, u.z, j % 2 ? 0xff3040 : 0xffffff, 0.9); } }
        if(tf.shatter){ const k = t - 1.6; wings.forEach(w=> w.P0.forEach((p, i)=>{ const u = Math.max(0, Math.min(1, (k - p.delay)/0.25)), s = p.s*(u < 1 ? u*(1 + 0.4*Math.sin(u*Math.PI)) : 1); w.im.setMatrixAt(i, _m.compose(p.p, _qq.setFromEuler(p.r), _sc.setScalar(Math.max(0.001, s)))); })); wings.forEach(w=> w.im.instanceMatrix.needsUpdate = true);
          orbit.visible = k > 0.6; halo.scale.setScalar(Math.min(1, k*2)); }
        if(t >= 2.6 && !tf.roar){ tf.roar = true; emit('roar', {}); matGlow.emissiveIntensity = 9; }
        if(t > 2.6) matGlow.emissiveIntensity += (2.5 - matGlow.emissiveIntensity)*Math.min(1, dt*3);
        if(t >= CL.transform.duration - 1e-4){ tf = null; B.root.position.set(0, 0, 0); emit('transformDone', {}); }
      }
      // trọng số: nền (đứng/đi) + động tác chồng lên
      const act = (cur ? curW : 0) + (prev ? prevW : 0), base = Math.max(0, 1 - act);
      const [bi, bw] = phase === 1 ? ['idle', 'walk'] : ['idle2', 'move2'], [oi, ow] = phase === 1 ? ['idle2', 'move2'] : ['idle', 'walk'];
      A[bi].setEffectiveWeight(base*(1 - speedS)); A[bw].setEffectiveWeight(base*speedS); A[oi].setEffectiveWeight(0); A[ow].setEffectiveWeight(0);
      if(cur) A[cur].setEffectiveWeight(curW); if(prev) A[prev].setEffectiveWeight(prevW);
      Object.keys(A).forEach(k=>{ if(k !== cur && k !== prev && !BASES.includes(k)) A[k].setEffectiveWeight(0); });
      // bước chân rung đất (dạng 1)
      if(phase === 1 && !cur && speedS > 0.3){ const ph = ((A.walk.time + 0.5) % 1.0); if(ph < stepPh) emit('step', {center:object.position.clone()}); stepPh = ph; }
      mixer.update(dt);
      // vương miện, hào quang, vệ tinh, cánh, lõi
      crownA += dt*(tf && tf.t < 1.6 ? 1 + tf.t*6 : phase === 2 ? 2.4 : 0.6);
      crownSyms.forEach((o, i)=>{ const a = crownA + i/crownSyms.length*Math.PI*2, r = phase === 2 ? 1.75 : 1.25, y = Math.sin(crownA*2 + i)*0.12; o.s.position.set(Math.cos(a)*r, y, Math.sin(a)*r); o.r.position.set(Math.cos(a)*r, y + Math.sin(clock*9 + i)*0.08, Math.sin(a)*r); o.r.material.opacity = 0.75 + Math.random()*0.25; });
      halo.rotation.z = clock*1.5;
      if(phase === 2 && !dead){ orbit.position.set(0, 4.6, 0); orbs.forEach((m, i)=>{ const a = clock*1.3 + i*Math.PI/2; m.position.set(Math.cos(a)*3.4, Math.sin(clock*2 + i)*0.7, Math.sin(a)*3.4); m.rotation.set(clock*2 + i, clock*1.5, 0); });
        if(!tf){ wings.forEach(w=> w.P0.forEach((p, i)=>{ _sc.setScalar(p.s); _vv.copy(p.p); _vv.y += Math.sin(clock*3 + i)*0.08; w.im.setMatrixAt(i, _m.compose(_vv, _qq.setFromEuler(p.r), _sc)); })); wings.forEach(w=> w.im.instanceMatrix.needsUpdate = true); }
        // hạt khói đỏ quanh thân, đuôi khói
        if(Math.random() < 0.8){ const h = B.hips.getWorldPosition(_v); spawnP(h.x + (Math.random() - 0.5)*2, h.y - 2 - Math.random()*2, h.z + (Math.random() - 0.5)*2, (Math.random() - 0.5), -1.5, (Math.random() - 0.5), Math.random() < 0.5 ? 0x8a1030 : 0xff3a5a, 0.9); }
        if(Math.random() < 0.6){ const c = core.getWorldPosition(_v); spawnP(c.x + (Math.random() - 0.5)*5, c.y - 2 + Math.random()*4, c.z + (Math.random() - 0.5)*5, 0, 2 + Math.random()*2, 0, 0xff5060, 1.0); }
        if(!(cur === 'beam')) matGlow.emissiveIntensity = 2.2 + Math.sin(clock*10)*1.2;
      } else if(!tf && !dead){ matGlow.emissiveIntensity = 1 + Math.sin(clock*3)*0.4; }
      // chớp trắng khi trúng đòn
      flashT = Math.max(0, flashT - dt);
      if(!tf){ if(flashT > 0){ matStone.emissive.setRGB(0.6, 0.6, 0.6); matDark.emissive.setRGB(0.7, 0.7, 0.7); } else { matStone.emissive.setRGB(0, 0, 0); matDark.emissive.setHex(0x2a0010); } }
      updFlying(dt); updShards(dt); updP(dt);
    },
    dispose(){ [...flying.map(f=> f.m), ...shards.map(s=> s.m)].forEach(m=> m.parent && m.parent.remove(m)); flying.length = 0; shards.length = 0; pts.parent && pts.parent.remove(pts); pGeo.dispose(); mixer.stopAllAction(); allMats.forEach(m=> m.dispose()); }
  };
  const _m = new THREE.Matrix4(), _qq = new THREE.Quaternion(), _sc = new THREE.Vector3(), _vv = new THREE.Vector3();
  (fxParent || object).add(pts);
  api.update(0);
  return api;
}
