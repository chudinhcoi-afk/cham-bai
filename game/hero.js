// hero.js — Nhân vật chính "Hiệp sĩ Toán học" (Three.js r160)
// Ý tưởng khung xương + clip hoạt hình theo bản Gemini; dựng lại phần hình, tư thế, động tác và bộ trộn chuyển động.
// Khung xương dạng cây Object3D (mỗi xương mang khối hình riêng, gộp làm một lần vẽ), hoạt hình bằng AnimationMixer.
// Mỗi động tác khai báo bằng vài tư thế chính + kiểu gia tốc, rồi "nướng" ra khung hình 30 hình/giây (có lấy đà, theo đà, nảy).

export function createHero(THREE, opts = {}){
  const D = Math.PI/180;
  const GIRL = opts.style === 'girl';
  const C = Object.assign(GIRL ? {skin:0xffe2cc, hair:0x7a4630, coat:0xff8cc6, coat2:0xff6fb3, pants:0xffffff, boots:0xff5fa2, cape:0xffc4e2, hat:0xff4f9a, gold:0xffd36a, white:0xfff4fa, blade:0xffe27a, dark:0x3a1d2c, cheek:0xff8fb4, ribbon:0xff4f9a, iris:0xa04a8a}
    : {skin:0xffd6b0, hair:0x3a2618, coat:0x2f6fe0, coat2:0x2457b8, pants:0x2a2f4a, boots:0x6b3f22, cape:0xd9363e, hat:0x2b2f6b, gold:0xf2c14e, white:0xf4f1e6, blade:0x9ff3ff, dark:0x15151c, cheek:0xff9a9a}, opts.colors || {});
  const merge = opts.merge, mat = opts.material, glow = opts.glowMaterial, addOutline = opts.outline || (()=>{});
  const M4 = (x = 0, y = 0, z = 0, sx = 1, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0)=> new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
  const Sp = (r, a = 14, b = 10)=> new THREE.SphereGeometry(r, a, b), Cy = (rt, rb, h, s = 12)=> new THREE.CylinderGeometry(rt, rb, h, s), Ca = (r, l, s = 10)=> new THREE.CapsuleGeometry(r, l, 4, s), Bx = (x, y, z)=> new THREE.BoxGeometry(x, y, z), Co = (r, h, s = 12)=> new THREE.ConeGeometry(r, h, s), To = (r, t, a = 8, b = 16)=> new THREE.TorusGeometry(r, t, a, b);

  /* ---------------- KHUNG XƯƠNG ---------------- */
  const B = {};
  const bone = (name, parent, x, y, z)=>{ const b = new THREE.Group(); b.name = 'hero_' + name; b.position.set(x, y, z); (parent ? B[parent] : null)?.add(b); B[name] = b; return b; };
  const root = bone('root', null, 0, 0, 0);
  bone('hips', 'root', 0, 0.95, 0); bone('spine', 'hips', 0, 0.18, 0); bone('chest', 'spine', 0, 0.24, 0); bone('neck', 'chest', 0, 0.22, 0); bone('head', 'neck', 0, 0.1, 0);
  bone('eyes', 'head', 0, 0.37, 0.43); bone('hat', 'head', 0, 0.74, -0.02); bone('hatTip', 'hat', 0, 0.42, -0.04);
  [['L', 1], ['R', -1]].forEach(([s, d])=>{
    bone('thigh' + s, 'hips', d*0.17, -0.06, 0); bone('shin' + s, 'thigh' + s, 0, -0.42, 0); bone('foot' + s, 'shin' + s, 0, -0.4, 0);
    bone('arm' + s, 'chest', d*0.36, 0.1, 0); bone('fore' + s, 'arm' + s, 0, -0.33, 0); bone('hand' + s, 'fore' + s, 0, -0.28, 0);
  });
  bone('weapon', 'handR', 0, -0.07, 0);
  bone('cape1', 'chest', 0, 0.12, -0.3); bone('cape2', 'cape1', 0, -0.36, 0); bone('cape3', 'cape2', 0, -0.36, 0);
  bone('scarf1', 'neck', 0.1, 0.02, -0.24); bone('scarf2', 'scarf1', 0, -0.28, 0);

  /* ---------------- HÌNH KHỐI (gắn cứng vào từng xương) ---------------- */
  const meshes = [];
  const skin = (name, parts, m = mat, ol = 0.035)=>{ const mesh = new THREE.Mesh(merge(parts), m); mesh.castShadow = true; B[name].add(mesh); meshes.push(mesh); if(ol) addOutline(mesh, ol); return mesh; };
  if(!GIRL){
  // đầu: to tròn kiểu chibi, tóc, tai, má hồng, miệng
  skin('head', [
    {g:Sp(0.44, 22, 16), m:M4(0, 0.36, 0.02), c:C.skin},
    {g:new THREE.SphereGeometry(0.47, 20, 12, 0, Math.PI*2, 0, Math.PI*0.55), m:M4(0, 0.4, -0.05, 1, 1, 1, -0.35, 0, 0), c:C.hair},
    {g:Co(0.12, 0.28, 6), m:M4(-0.18, 0.62, 0.34, 1, 1, 1, 2.6, 0, 0.3), c:C.hair}, {g:Co(0.13, 0.3, 6), m:M4(0.02, 0.66, 0.38, 1, 1, 1, 2.7, 0, 0), c:C.hair}, {g:Co(0.11, 0.26, 6), m:M4(0.2, 0.62, 0.33, 1, 1, 1, 2.6, 0, -0.3), c:C.hair},
    {g:Sp(0.09, 8, 6), m:M4(0.43, 0.34, 0, 0.6, 1, 1), c:C.skin}, {g:Sp(0.09, 8, 6), m:M4(-0.43, 0.34, 0, 0.6, 1, 1), c:C.skin},
    {g:Sp(0.07, 8, 6), m:M4(0.26, 0.24, 0.37, 1, 0.6, 0.3), c:C.cheek}, {g:Sp(0.07, 8, 6), m:M4(-0.26, 0.24, 0.37, 1, 0.6, 0.3), c:C.cheek}]);
  // mắt to, có điểm sáng — đặt trên xương riêng để chớp mắt
  skin('eyes', [
    {g:Sp(0.075, 10, 8), m:M4(0.15, 0, 0, 0.9, 1.35, 0.5), c:C.dark}, {g:Sp(0.075, 10, 8), m:M4(-0.15, 0, 0, 0.9, 1.35, 0.5), c:C.dark},
    {g:Sp(0.025, 6, 4), m:M4(0.17, 0.035, 0.035), c:0xffffff}, {g:Sp(0.025, 6, 4), m:M4(-0.13, 0.035, 0.035), c:0xffffff}], mat, 0);
  } else {
  // bé gái: mặt bầu bĩnh, tóc nâu mái bằng, hai bím tóc buộc nơ hồng, má ửng hồng
  B.eyes.position.set(0, 0.33, 0.43);
  const surf = (a, e, r = 0.47)=> [Math.sin(a*D)*Math.cos(e*D)*r, 0.35 + Math.sin(e*D)*r, 0.02 + Math.cos(a*D)*Math.cos(e*D)*r];
  const bangs = [-52, -30, -10, 10, 30, 52].map((a, i)=>{ const [x, y, z] = surf(a, 47 - Math.abs(a)*0.16, 0.455); return {g:Sp(0.125, 10, 8), m:M4(x, y, z, 1.05, 0.78, 0.5, -0.65, a*D*0.9, 0), c:C.hair}; });
  const tails = [-1, 1].flatMap(d=> [
    {g:Ca(0.13, 0.42, 10), m:M4(d*0.6, 0.26, -0.08, 1, 1, 0.9, 0, 0, d*0.28), c:C.hair}, {g:Sp(0.15, 10, 8), m:M4(d*0.5, 0.56, -0.06), c:C.hair},
    {g:Sp(0.1, 8, 6), m:M4(d*0.69, -0.04, -0.08, 1, 1.3, 0.9), c:C.hair},
    {g:Sp(0.09, 8, 6), m:M4(d*0.55, 0.52, -0.02, 1.4, 0.8, 0.5, 0, 0, d*0.4), c:C.ribbon}, {g:Sp(0.09, 8, 6), m:M4(d*0.66, 0.42, -0.02, 1.4, 0.8, 0.5, 0, 0, d*1.4), c:C.ribbon}, {g:Sp(0.05, 6, 4), m:M4(d*0.6, 0.47, 0.0), c:C.gold}]);
  skin('head', [
    {g:Sp(0.45, 24, 18), m:M4(0, 0.35, 0.02, 1.05, 0.97, 1), c:C.skin},
    {g:new THREE.SphereGeometry(0.49, 22, 14, 0, Math.PI*2, 0, Math.PI*0.6), m:M4(0, 0.38, -0.06, 1.04, 1, 1, -0.32, 0, 0), c:C.hair},
    {g:Sp(0.47, 18, 12), m:M4(0, 0.24, -0.13, 1.02, 1.08, 0.82), c:C.hair},
    ...bangs, ...tails,
    {g:Sp(0.09, 10, 8), m:M4(0.27, 0.2, 0.37, 1, 0.55, 0.3), c:C.cheek}, {g:Sp(0.09, 10, 8), m:M4(-0.27, 0.2, 0.37, 1, 0.55, 0.3), c:C.cheek},
    ]);
  // mắt to long lanh: tròng nâu tím, 2 đốm sáng, mi cong
  skin('eyes', [-1, 1].flatMap(d=> [
    {g:Sp(0.088, 12, 10), m:M4(d*0.16, 0, 0, 0.92, 1.38, 0.5), c:C.dark}, {g:Sp(0.06, 10, 8), m:M4(d*0.16, -0.035, 0.022, 0.85, 0.85, 0.4), c:C.iris},
    {g:Sp(0.034, 8, 6), m:M4(d*0.16 + 0.028, 0.05, 0.045), c:0xffffff}, {g:Sp(0.016, 6, 4), m:M4(d*0.16 - 0.03, -0.055, 0.045), c:0xffffff},
    {g:Bx(0.17, 0.024, 0.02), m:M4(d*0.16, 0.118, 0.01, 1, 1, 1, 0, 0, -d*0.08), c:C.dark},
    {g:Bx(0.07, 0.02, 0.02), m:M4(d*0.25, 0.115, 0.0, 1, 1, 1, 0, 0, d*0.55), c:C.dark}, {g:Bx(0.06, 0.018, 0.02), m:M4(d*0.26, 0.085, -0.005, 1, 1, 1, 0, 0, d*0.15), c:C.dark}]), mat, 0);
  }
  /* ---------- CẢM XÚC: mắt, miệng, lông mày, giọt mồ hôi đổi theo tình huống ---------- */
  const face = (bone, parts)=>{ const m = new THREE.Mesh(merge(parts), mat); B[bone].add(m); meshes.push(m); m.visible = false; return m; };
  const Arc = (r, t, a)=> new THREE.TorusGeometry(r, t, 6, 14, a), MC = 0x7a2a2a, DKc = C.dark;
  const EYES = {normal:meshes[meshes.length - 1],
    happy:face('eyes', [-1, 1].map(d=> ({g:Arc(0.062, 0.02, Math.PI), m:M4(d*0.15, -0.035, 0.015), c:DKc}))),
    closed:face('eyes', [-1, 1].map(d=> ({g:Bx(0.13, 0.024, 0.02), m:M4(d*0.15, -0.01, 0.02), c:DKc}))),
    pain:face('eyes', [-1, 1].flatMap(d=> [{g:Bx(0.11, 0.024, 0.02), m:M4(d*0.15, 0.022, 0.02, 1, 1, 1, 0, 0, -d*0.42), c:DKc}, {g:Bx(0.11, 0.024, 0.02), m:M4(d*0.15, -0.022, 0.02, 1, 1, 1, 0, 0, d*0.42), c:DKc}])),
    dead:face('eyes', [-1, 1].flatMap(d=> [{g:Bx(0.13, 0.024, 0.02), m:M4(d*0.15, 0, 0.02, 1, 1, 1, 0, 0, 0.78), c:DKc}, {g:Bx(0.13, 0.024, 0.02), m:M4(d*0.15, 0, 0.02, 1, 1, 1, 0, 0, -0.78), c:DKc}]))};
  EYES.normal.visible = true;
  const MOUTH = {
    neutral:face('head', [{g:Bx(0.1, 0.025, 0.03), m:M4(0, 0.16, 0.44), c:MC}]),
    smile:face('head', [{g:Arc(0.065, 0.017, Math.PI), m:M4(0, 0.205, 0.425, 1, 1, 1, 0, 0, Math.PI), c:MC}]),
    grin:face('head', [{g:new THREE.CircleGeometry(0.09, 16, Math.PI, Math.PI), m:M4(0, 0.2, 0.442), c:0x8a2030}, {g:Bx(0.16, 0.022, 0.012), m:M4(0, 0.193, 0.446), c:0xffffff}, {g:Sp(0.032, 6, 4), m:M4(0, 0.14, 0.44, 1.4, 0.6, 0.3), c:0xff7a8a}]),
    frown:face('head', [{g:Arc(0.06, 0.017, Math.PI), m:M4(0, 0.125, 0.43), c:MC}]),
    o:face('head', [{g:new THREE.TorusGeometry(0.042, 0.017, 6, 14), m:M4(0, 0.155, 0.436), c:MC}, {g:new THREE.CircleGeometry(0.036, 12), m:M4(0, 0.155, 0.437), c:0x4a1018}]),
    grit:face('head', [{g:Bx(0.15, 0.04, 0.02), m:M4(0, 0.16, 0.438), c:0xffffff}, {g:Bx(0.16, 0.012, 0.026), m:M4(0, 0.16, 0.44), c:MC}])};
  const BY = GIRL ? 0.535 : 0.53; const brow = d=>{ const m = new THREE.Mesh(merge([{g:GIRL ? Bx(0.11, 0.022, 0.025) : Bx(0.14, 0.034, 0.03), c:C.hair}]), mat); m.position.set(d*(GIRL ? 0.16 : 0.15), BY, GIRL ? 0.43 : 0.41); m.rotation.z = -d*0.15; B.head.add(m); meshes.push(m); return m; };
  const browL = brow(1), browR = brow(-1);
  const sweat = face('head', [{g:Sp(0.05, 8, 6), m:M4(0, 0, 0, 1, 1.3, 0.8), c:0x8fd8ff}, {g:Co(0.05, 0.08, 8), m:M4(0, 0.07, 0), c:0x8fd8ff}]); sweat.position.set(0.36, 0.56, 0.22);
  // [mắt, miệng, nâng lông mày, nghiêng đầu trong lông mày (+ = cau có, − = buồn), mồ hôi, phóng to mắt]
  const EMO = {neutral:['normal', 'neutral', 0, 0], happy:['normal', 'smile', 0.02, -0.05], joy:['happy', 'grin', 0.05, -0.1], sad:['normal', 'frown', 0, -0.42, 1], worried:['normal', 'frown', 0.01, -0.3, 1],
    pain:['pain', 'grit', -0.01, 0.35], angry:['normal', 'grit', -0.02, 0.42], surprised:['normal', 'o', 0.065, -0.05, 0, 1.28], think:['normal', 'neutral', 0.02, -0.18], dead:['dead', 'o', 0, -0.2], sleepy:['closed', 'neutral', -0.01, -0.1]};
  let mood = 'neutral', emoteName = null, emoteT = 0, shownEmo = '';
  function showEmo(n){ if(n === shownEmo) return; shownEmo = n; const e = EMO[n] || EMO.neutral;
    Object.keys(EYES).forEach(k=> EYES[k].visible = k === e[0]); Object.keys(MOUTH).forEach(k=> MOUTH[k].visible = k === e[1]);
    EYES.normal.scale.setScalar(e[5] || 1); browL.position.y = browR.position.y = BY + e[2]; browL.rotation.z = -0.15 + e[3]; browR.rotation.z = 0.15 - e[3]; sweat.visible = !!e[4]; }
  showEmo('neutral');
  if(!GIRL){
  // mũ học giả: vành, dải vàng, chóp gập, huy hiệu π
  skin('hat', [
    {g:Cy(0.66, 0.66, 0.06, 20), m:M4(0, 0, 0), c:C.hat}, {g:Cy(0.42, 0.46, 0.14, 18), m:M4(0, 0.09, 0), c:C.gold}, {g:Co(0.44, 0.5, 18), m:M4(0, 0.4, 0), c:C.hat},
    {g:Bx(0.035, 0.12, 0.03), m:M4(-0.05, 0.1, 0.45), c:C.hat}, {g:Bx(0.035, 0.12, 0.03), m:M4(0.05, 0.1, 0.45), c:C.hat}, {g:Bx(0.17, 0.03, 0.03), m:M4(0, 0.16, 0.45), c:C.hat}]);
  skin('hatTip', [{g:Co(0.22, 0.42, 12), m:M4(0, 0.16, 0), c:C.hat}, {g:Sp(0.07, 8, 6), m:M4(0, 0.38, 0), c:C.gold}]);
  // thân: áo khoác có cổ, khăn quàng, nút vàng, dây đeo chéo
  skin('chest', [
    {g:Cy(0.34, 0.38, 0.46, 14), m:M4(0, 0, 0), c:C.coat}, {g:Sp(0.34, 14, 8), m:M4(0, 0.2, 0, 1, 0.45, 0.9), c:C.coat},
    {g:To(0.26, 0.09, 8, 18), m:M4(0, 0.25, 0, 1, 1, 1, Math.PI/2, 0, 0), c:C.cape},
    {g:Sp(0.04, 6, 4), m:M4(0, 0.08, 0.36), c:C.gold}, {g:Sp(0.04, 6, 4), m:M4(0, -0.08, 0.37), c:C.gold},
    {g:Bx(0.1, 0.62, 0.05), m:M4(0.02, -0.02, 0.3, 1, 1, 1, 0, 0, 0.75), c:C.boots}, {g:Bx(0.1, 0.62, 0.05), m:M4(0.02, -0.02, -0.33, 1, 1, 1, 0, 0, 0.75), c:C.boots}]);
  skin('spine', [{g:Cy(0.36, 0.37, 0.22, 14), m:M4(0, 0, 0), c:C.coat2}, {g:Cy(0.385, 0.385, 0.09, 14), m:M4(0, -0.08, 0), c:C.boots}, {g:Bx(0.13, 0.11, 0.05), m:M4(0, -0.08, 0.38), c:C.gold}]);
  skin('hips', [{g:Cy(0.37, 0.46, 0.34, 14), m:M4(0, -0.06, 0), c:C.coat}, {g:Cy(0.3, 0.3, 0.2, 12), m:M4(0, -0.1, 0), c:C.pants},
    {g:Bx(0.22, 0.2, 0.12), m:M4(-0.36, -0.1, 0.12, 1, 1, 1, 0, 0.5, 0), c:C.boots}, {g:Bx(0.08, 0.06, 0.13), m:M4(-0.36, -0.02, 0.13, 1, 1, 1, 0, 0.5, 0), c:C.gold}]);
  // chân: quần, đầu gối, ủng, bàn chân
  ['L', 'R'].forEach(s=>{
    skin('thigh' + s, [{g:Ca(0.13, 0.24), m:M4(0, -0.2, 0), c:C.pants}]);
    skin('shin' + s, [{g:Sp(0.13, 10, 8), m:M4(0, 0, 0), c:C.pants}, {g:Cy(0.15, 0.14, 0.3, 12), m:M4(0, -0.24, 0), c:C.boots}, {g:Cy(0.17, 0.17, 0.06, 12), m:M4(0, -0.1, 0), c:C.gold}]);
    skin('foot' + s, [{g:Ca(0.12, 0.2, 10), m:M4(0, 0.05, 0.08, 1, 0.75, 1, Math.PI/2, 0, 0), c:C.boots}]);
    skin('arm' + s, [{g:Sp(0.15, 12, 8), m:M4(0, 0, 0), c:C.coat2}, {g:Ca(0.105, 0.2), m:M4(0, -0.17, 0), c:C.coat}]);
    skin('fore' + s, [{g:Sp(0.1, 8, 6), m:M4(0, 0, 0), c:C.coat}, {g:Ca(0.095, 0.14), m:M4(0, -0.12, 0), c:C.coat}, {g:Cy(0.12, 0.12, 0.08, 12), m:M4(0, -0.24, 0), c:C.white}]);
    skin('hand' + s, [{g:Sp(0.12, 12, 8), m:M4(0, -0.05, 0), c:C.skin}]);
  });
  // kiếm thước kẻ: chuôi + chắn kiếm hình êke (vật liệu thường), lưỡi thước phát sáng có vạch chia
  skin('weapon', [{g:Cy(0.04, 0.04, 0.3, 8), m:M4(0, 0, 0, 1, 1, 1, Math.PI/2, 0, 0), c:C.boots}, {g:Sp(0.065, 8, 6), m:M4(0, 0, -0.18), c:C.gold},
    {g:Bx(0.08, 0.36, 0.07), m:M4(0, 0, 0.16), c:C.gold}, {g:Co(0.07, 0.16, 3), m:M4(0, 0.2, 0.16), c:C.gold}, {g:Co(0.07, 0.16, 3), m:M4(0, -0.2, 0.16, 1, 1, 1, Math.PI, 0, 0), c:C.gold}]);
  const ticks = []; for(let i = 0; i < 13; i++) ticks.push({g:Bx(0.07, i % 5 === 0 ? 0.09 : 0.05, 0.012), m:M4(0, 0.07 - (i % 5 === 0 ? 0.045 : 0.025), 0.26 + i*0.095), c:0x1b4a5a});
  const bladeMesh = new THREE.Mesh(merge([{g:Bx(0.05, 0.17, 1.25), m:M4(0, 0, 0.83), c:C.blade}, {g:Co(0.085, 0.16, 4), m:M4(0, 0, 1.53, 1, 0.35, 1, Math.PI/2, Math.PI/4, 0), c:C.blade}, ...ticks]), glow);
  B.weapon.add(bladeMesh); meshes.push(bladeMesh); addOutline(bladeMesh, 0.03);
  // áo choàng 3 đoạn + đuôi khăn 2 đoạn (động tác chồng lớp)
  skin('cape1', [{g:Bx(0.66, 0.38, 0.05), m:M4(0, -0.18, 0), c:C.cape}]);
  skin('cape2', [{g:Bx(0.7, 0.38, 0.05), m:M4(0, -0.18, 0), c:C.cape}]);
  skin('cape3', [{g:Bx(0.74, 0.3, 0.05), m:M4(0, -0.14, 0), c:C.cape}, {g:Co(0.12, 0.16, 3), m:M4(-0.25, -0.34, 0, 1, 1, 0.3, Math.PI, 0, 0), c:C.cape}, {g:Co(0.12, 0.16, 3), m:M4(0, -0.34, 0, 1, 1, 0.3, Math.PI, 0, 0), c:C.cape}, {g:Co(0.12, 0.16, 3), m:M4(0.25, -0.34, 0, 1, 1, 0.3, Math.PI, 0, 0), c:C.cape}]);
  skin('scarf1', [{g:Bx(0.15, 0.3, 0.04), m:M4(0, -0.14, 0), c:C.cape}]);
  skin('scarf2', [{g:Bx(0.15, 0.26, 0.04), m:M4(0, -0.12, 0), c:C.cape}, {g:Bx(0.16, 0.04, 0.05), m:M4(0, -0.24, 0), c:C.gold}]);
  } else {
  // nơ lớn trên đỉnh đầu (xương mũ) + 2 dải nơ đung đưa (xương chóp mũ)
  B.hat.position.set(0, 0.72, -0.14); B.hatTip.position.set(0, -0.03, -0.04);
  skin('hat', [{g:Sp(0.13, 12, 8), m:M4(0.17, 0.02, 0, 1.35, 0.95, 0.55, 0, 0, -0.35), c:C.ribbon}, {g:Sp(0.13, 12, 8), m:M4(-0.17, 0.02, 0, 1.35, 0.95, 0.55, 0, 0, 0.35), c:C.ribbon},
    {g:Sp(0.07, 8, 6), m:M4(0.17, 0.02, 0.05, 0.8, 0.6, 0.4), c:0xff86bd}, {g:Sp(0.07, 8, 6), m:M4(-0.17, 0.02, 0.05, 0.8, 0.6, 0.4), c:0xff86bd}, {g:Sp(0.065, 8, 6), m:M4(0, 0.02, 0.03), c:C.gold}]);
  skin('hatTip', [{g:Bx(0.07, 0.3, 0.03), m:M4(0.06, -0.15, -0.02, 1, 1, 1, 0, 0, 0.25), c:C.ribbon}, {g:Bx(0.07, 0.28, 0.03), m:M4(-0.06, -0.14, -0.02, 1, 1, 1, 0, 0, -0.25), c:C.ribbon}]);
  // váy hồng: thân áo, cổ thuỷ thủ trắng, nơ ngực, đai lưng, chân váy xoè có diềm ren
  skin('chest', [
    {g:Cy(0.3, 0.33, 0.46, 16), m:M4(0, 0, 0), c:C.coat}, {g:Sp(0.3, 16, 8), m:M4(0, 0.2, 0, 1, 0.45, 0.9), c:C.coat},
    {g:Cy(0.33, 0.38, 0.07, 18), m:M4(0, 0.22, -0.01), c:C.white}, {g:Bx(0.5, 0.2, 0.04), m:M4(0, 0.13, -0.28, 1, 1, 1, 0.2, 0, 0), c:C.white},
    {g:Sp(0.075, 8, 6), m:M4(0.085, 0.1, 0.31, 1.3, 0.9, 0.5, 0, 0, -0.35), c:C.ribbon}, {g:Sp(0.075, 8, 6), m:M4(-0.085, 0.1, 0.31, 1.3, 0.9, 0.5, 0, 0, 0.35), c:C.ribbon}, {g:Sp(0.04, 6, 4), m:M4(0, 0.1, 0.34), c:C.gold},
    {g:Sp(0.03, 6, 4), m:M4(0, -0.06, 0.32), c:C.white}, {g:Sp(0.03, 6, 4), m:M4(0, -0.16, 0.33), c:C.white}]);
  skin('spine', [{g:Cy(0.31, 0.32, 0.22, 16), m:M4(0, 0, 0), c:C.coat}, {g:Cy(0.335, 0.335, 0.085, 16), m:M4(0, -0.07, 0), c:C.ribbon}]);
  const dots = []; for(let i = 0; i < 10; i++){ const a = i/10*Math.PI*2 + 0.3, y = -0.16 - (i % 2)*0.17, r = 0.5 + (i % 2)*0.12; dots.push({g:Sp(0.035, 6, 4), m:M4(Math.sin(a)*r, y, Math.cos(a)*r, 1, 1, 0.5, 0, a, 0), c:C.white}); }
  skin('hips', [{g:Cy(0.33, 0.76, 0.56, 22), m:M4(0, -0.17, 0), c:C.coat}, {g:Cy(0.6, 0.8, 0.14, 22), m:M4(0, -0.39, 0), c:C.coat2},
    {g:new THREE.TorusGeometry(0.78, 0.055, 6, 32), m:M4(0, -0.46, 0, 1, 1, 1, Math.PI/2, 0, 0), c:C.white}, {g:Cy(0.68, 0.72, 0.1, 22), m:M4(0, -0.48, 0), c:C.white}, ...dots]);
  // chân: tất trắng, giày búp bê hồng có quai
  ['L', 'R'].forEach(s=>{
    skin('thigh' + s, [{g:Ca(0.1, 0.24), m:M4(0, -0.2, 0), c:C.skin}]);
    skin('shin' + s, [{g:Sp(0.1, 10, 8), m:M4(0, 0, 0), c:C.skin}, {g:Cy(0.11, 0.1, 0.32, 12), m:M4(0, -0.22, 0), c:C.white}, {g:new THREE.TorusGeometry(0.11, 0.03, 6, 14), m:M4(0, -0.07, 0, 1, 1, 1, Math.PI/2, 0, 0), c:0xffb3d6}]);
    skin('foot' + s, [{g:Ca(0.11, 0.18, 10), m:M4(0, 0.04, 0.07, 1, 0.7, 1, Math.PI/2, 0, 0), c:C.boots}, {g:Bx(0.2, 0.03, 0.05), m:M4(0, 0.1, 0.02), c:C.boots}, {g:Sp(0.035, 6, 4), m:M4(0, 0.1, 0.2), c:C.gold}]);
    skin('arm' + s, [{g:Sp(0.16, 12, 10), m:M4(0, -0.02, 0, 1, 0.9, 1), c:C.coat}, {g:Cy(0.13, 0.15, 0.05, 12), m:M4(0, -0.13, 0), c:C.white}, {g:Ca(0.08, 0.16), m:M4(0, -0.2, 0), c:C.skin}]);
    skin('fore' + s, [{g:Sp(0.08, 8, 6), m:M4(0, 0, 0), c:C.skin}, {g:Ca(0.075, 0.14), m:M4(0, -0.12, 0), c:C.skin}, {g:new THREE.TorusGeometry(0.08, 0.025, 6, 14), m:M4(0, -0.22, 0, 1, 1, 1, Math.PI/2, 0, 0), c:0xffb3d6}]);
    skin('hand' + s, [{g:Sp(0.105, 12, 8), m:M4(0, -0.05, 0), c:C.skin}]);
  });
  // gậy phép: cán trắng sọc hồng, đầu ngôi sao vàng phát sáng trong vòng tròn, viên ngọc tim
  const stripes = []; for(let i = 0; i < 5; i++) stripes.push({g:Cy(0.042, 0.042, 0.05, 8), m:M4(0, 0, 0.12 + i*0.2, 1, 1, 1, Math.PI/2, 0, 0), c:C.ribbon});
  skin('weapon', [{g:Cy(0.035, 0.035, 1.25, 8), m:M4(0, 0, 0.45, 1, 1, 1, Math.PI/2, 0, 0), c:C.white}, ...stripes, {g:Sp(0.06, 8, 6), m:M4(0, 0, -0.18), c:C.ribbon},
    {g:Co(0.09, 0.14, 8), m:M4(0, 0, 1.1, 1, 1, 1, Math.PI/2, 0, 0), c:C.gold}, {g:new THREE.TorusGeometry(0.24, 0.025, 6, 28), m:M4(0, 0, 1.4, 1, 1, 1, 0, Math.PI/2, 0), c:C.gold}]);
  const star = new THREE.Shape(); for(let i = 0; i < 10; i++){ const r = i % 2 ? 0.09 : 0.21, a = i/10*Math.PI*2; i ? star.lineTo(Math.sin(a)*r, Math.cos(a)*r) : star.moveTo(Math.sin(a)*r, Math.cos(a)*r); }
  const starG = new THREE.ExtrudeGeometry(star, {depth:0.06, bevelEnabled:true, bevelSize:0.02, bevelThickness:0.02, bevelSegments:1}); starG.translate(0, 0, -0.03);
  const heart = new THREE.Shape(); heart.moveTo(0, -0.07); heart.bezierCurveTo(0.09, 0, 0.06, 0.07, 0, 0.035); heart.bezierCurveTo(-0.06, 0.07, -0.09, 0, 0, -0.07);
  const heartG = new THREE.ExtrudeGeometry(heart, {depth:0.03, bevelEnabled:true, bevelSize:0.012, bevelThickness:0.012, bevelSegments:1});
  const bladeMesh = new THREE.Mesh(merge([{g:starG, m:M4(0, 0, 1.4, 1, 1, 1, 0, Math.PI/2, 0), c:C.blade}, {g:heartG, m:M4(0.05, 0, 1.4, 1, 1, 1, 0, Math.PI/2, 0), c:0xff5fa8}, {g:heartG.clone(), m:M4(-0.05, 0, 1.4, 1, 1, 1, 0, -Math.PI/2, 0), c:0xff5fa8}]), glow);
  B.weapon.add(bladeMesh); meshes.push(bladeMesh); addOutline(bladeMesh, 0.025);
  // áo choàng voan hồng, viền vỏ sò + dải nơ sau cổ
  skin('cape1', [{g:Bx(0.58, 0.38, 0.04), m:M4(0, -0.18, 0), c:C.cape}]);
  skin('cape2', [{g:Bx(0.62, 0.38, 0.04), m:M4(0, -0.18, 0), c:C.cape}]);
  skin('cape3', [{g:Bx(0.66, 0.24, 0.04), m:M4(0, -0.12, 0), c:C.cape}, ...[-0.25, -0.083, 0.083, 0.25].map(x=> ({g:new THREE.SphereGeometry(0.09, 10, 6, 0, Math.PI*2, 0, Math.PI/2), m:M4(x, -0.24, 0, 1, 1, 0.25, Math.PI, 0, 0), c:C.cape}))]);
  skin('scarf1', [{g:Bx(0.1, 0.3, 0.03), m:M4(0, -0.14, 0), c:C.ribbon}]);
  skin('scarf2', [{g:Bx(0.1, 0.26, 0.03), m:M4(0, -0.12, 0), c:C.ribbon}, {g:Co(0.07, 0.1, 3), m:M4(0, -0.27, 0, 1, 1, 0.3, Math.PI, 0, 0), c:C.ribbon}]);
  }
  const weaponTip = new THREE.Object3D(); weaponTip.position.set(0, 0, 1.6); B.weapon.add(weaponTip);
  const weaponMid = new THREE.Object3D(); weaponMid.position.set(0, 0, 0.8); B.weapon.add(weaponMid);

  /* ---------------- ĐỘNG TÁC ----------------
     Tư thế ghi bằng góc Euler (độ) cho từng xương; 'x.p' là vị trí, 'x.s' là tỉ lệ.
     Quy ước: tay/chân xoay x âm = đưa ra trước; kiếm xoay x âm = mũi kiếm ngóc lên; áo choàng x dương = bay ra sau. */
  const REST = {'root.p':[0, 0, 0], root:[0, 0, 0], 'hips.p':[0, 0.95, 0], hips:[0, 0, 0], spine:[0, 0, 0], chest:[0, 0, 0], neck:[0, 0, 0], head:[0, 0, 0], 'eyes.s':[1, 1, 1], hat:[0, 0, 0], hatTip:[-18, 0, 0],
    armL:[6, 0, 14], foreL:[-30, 0, 0], handL:[0, 0, 0], armR:[-28, 0, -26], foreR:[-50, 0, 0], handR:[0, 0, 0], weapon:[45, 0, 0],
    thighL:[0, 0, 3], shinL:[0, 0, 0], footL:[0, 0, 0], thighR:[0, 0, -3], shinR:[0, 0, 0], footR:[0, 0, 0],
    cape1:[10, 0, 0], cape2:[6, 0, 0], cape3:[5, 0, 0], scarf1:[18, 20, 0], scarf2:[12, 0, 0]};
  const EASE = {lin:t=> t, io:t=> t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2)/2, in:t=> t*t*t, out:t=> 1 - Math.pow(1 - t, 3), sm:t=> t*t*(3 - 2*t),
    back:t=>{ const c1 = 1.9, c3 = c1 + 1; return 1 + c3*Math.pow(t - 1, 3) + c1*Math.pow(t - 1, 2); }, snap:t=> 1 - Math.pow(1 - t, 5)};
  const _q = new THREE.Quaternion(), _e = new THREE.Euler();
  function bake(name, dur, keys, loop){
    // ghép tư thế: xương không nhắc tới thì giữ nguyên tư thế khoá trước (bắt đầu từ REST)
    const full = []; let prev = Object.assign({}, REST);
    keys.forEach(([t, pose, ease])=>{ prev = Object.assign({}, prev, pose); full.push({t, pose:prev, ease:ease || 'io'}); });
    if(loop) full.push({t:dur, pose:full[0].pose, ease:'io'});
    const fps = 30, N = Math.max(2, Math.round(dur*fps) + 1), times = Array.from({length:N}, (_, i)=> i/(N - 1)*dur), tracks = [];
    Object.keys(REST).forEach(k=>{
      const kind = k.endsWith('.p') ? 'p' : k.endsWith('.s') ? 's' : 'r', bn = 'hero_' + k.replace(/\.[ps]$/, ''), vals = [];
      times.forEach(t=>{ let v;
        if(t <= full[0].t) v = full[0].pose[k]; else if(t >= full[full.length - 1].t) v = full[full.length - 1].pose[k];
        else { let i = 0; while(full[i + 1].t < t) i++; const a = full[i], b = full[i + 1], u = EASE[b.ease]((t - a.t)/(b.t - a.t)); v = a.pose[k].map((x, j)=> x + (b.pose[k][j] - x)*u); }
        if(kind === 'r'){ _q.setFromEuler(_e.set(v[0]*D, v[1]*D, v[2]*D)); vals.push(_q.x, _q.y, _q.z, _q.w); } else vals.push(...v); });
      tracks.push(kind === 'r' ? new THREE.QuaternionKeyframeTrack(bn + '.quaternion', times, vals) : new THREE.VectorKeyframeTrack(bn + (kind === 'p' ? '.position' : '.scale'), times, vals));
    });
    return new THREE.AnimationClip(name, dur, tracks);
  }
  const blinkA = {'eyes.s':[1, 0.1, 1]}, open = {'eyes.s':[1, 1, 1]};
  const CL = {
    idle: bake('idle', 2.4, [
      [0, {}],
      [0.62, open], [0.66, blinkA, 'lin'], [0.72, open, 'lin'],
      [1.2, {'hips.p':[0, 0.92, 0], chest:[-3, 0, 0], head:[3, 0, -2], armL:[4, 0, 17], armR:[-25, 0, -29], weapon:[48, 0, 0], cape1:[16, 0, 0], cape2:[12, 0, 2], cape3:[10, 0, -2], scarf1:[26, 26, 4], scarf2:[20, 0, 0], hatTip:[-24, 0, 4]}, 'sm'],
      [2.4, {}, 'sm']], true),
    run: bake('run', 0.6, [
      [0, {'hips.p':[0, 0.9, 0], hips:[0, 12, 0], spine:[14, -6, 0], chest:[4, -6, 0], head:[-12, 0, 0], thighL:[-50, 0, 3], shinL:[20, 0, 0], footL:[-10, 0, 0], thighR:[40, 0, -3], shinR:[70, 0, 0], footR:[20, 0, 0],
        armL:[40, 0, 14], foreL:[-50, 0, 0], armR:[-10, 0, -18], foreR:[-40, 0, 0], weapon:[-150, 0, 0], cape1:[52, 0, 0], cape2:[20, 0, 0], cape3:[18, 0, 0], scarf1:[70, 30, 0], scarf2:[30, 0, 0], hatTip:[-40, 0, 0]}],
      [0.15, {'hips.p':[0, 1.0, 0], shinL:[40, 0, 0], thighR:[5, 0, -3], shinR:[90, 0, 0], cape1:[60, 0, 0], cape2:[30, 0, 0], scarf2:[45, 0, 0]}, 'out'],
      [0.3, {'hips.p':[0, 0.9, 0], hips:[0, -12, 0], spine:[14, 6, 0], chest:[4, 6, 0], thighL:[40, 0, 3], shinL:[70, 0, 0], footL:[20, 0, 0], thighR:[-50, 0, -3], shinR:[20, 0, 0], footR:[-10, 0, 0],
        armL:[-40, 0, 14], foreL:[-30, 0, 0], armR:[20, 0, -18], foreR:[-60, 0, 0], weapon:[-160, 0, 0], cape1:[52, 0, 0], cape2:[22, 0, 0], scarf1:[70, 10, 0], scarf2:[30, 0, 0]}, 'in'],
      [0.45, {'hips.p':[0, 1.0, 0], thighL:[5, 0, 3], shinL:[90, 0, 0], shinR:[40, 0, 0], cape1:[60, 0, 0], cape2:[32, 0, 0], scarf2:[45, 0, 0]}, 'out']], true),
    // nhát 1: chém ngang từ phải sang trái (lấy đà xoay người sang phải)
    attack1: bake('attack1', 0.46, [
      [0, {}],
      [0.12, {'hips.p':[0, 0.88, -0.05], hips:[0, -30, 0], chest:[0, -35, 0], head:[0, 30, 0], armR:[-60, -20, -95], foreR:[-20, 0, 0], weapon:[0, 0, 0], armL:[-10, 0, 40], thighL:[-20, 0, 8], thighR:[15, 0, -10], cape1:[8, 0, -10], scarf1:[20, -10, 0]}, 'out'],
      [0.2, {'hips.p':[0, 0.85, 0.15], hips:[0, 35, 0], chest:[0, 45, 0], head:[0, -30, 0], armR:[-85, 40, -20], foreR:[-5, 0, 0], weapon:[10, 0, 0], armL:[20, 0, 30], thighL:[-35, 0, 8], shinL:[25, 0, 0], thighR:[25, 0, -8], cape1:[30, 0, 20], cape2:[25, 0, 10], scarf1:[50, 50, 0]}, 'snap'],
      [0.3, {hips:[0, 40, 0], chest:[0, 50, 0], armR:[-75, 55, -10], cape1:[24, 0, 26], scarf1:[40, 60, 0]}, 'out'],
      [0.46, {}, 'sm']]),
    // nhát 2: giơ cao bổ xuống
    attack2: bake('attack2', 0.48, [
      [0, {}],
      [0.13, {'hips.p':[0, 1.0, -0.08], spine:[-12, 0, 0], chest:[-10, 0, 0], head:[-12, 0, 0], armR:[-175, 0, -12], foreR:[-25, 0, 0], weapon:[80, 0, 0], armL:[-160, 0, 20], foreL:[-30, 0, 0], thighL:[-10, 0, 3], cape1:[4, 0, 0], hatTip:[-30, 0, 0]}, 'out'],
      [0.21, {'hips.p':[0, 0.78, 0.2], spine:[22, 0, 0], chest:[14, 0, 0], head:[6, 0, 0], armR:[-55, 0, -8], foreR:[-10, 0, 0], weapon:[60, 0, 0], armL:[-45, 0, 10], foreL:[-15, 0, 0], thighL:[-45, 0, 3], shinL:[35, 0, 0], thighR:[25, 0, -3], shinR:[20, 0, 0], cape1:[40, 0, 0], cape2:[30, 0, 0], scarf1:[60, 20, 0], hatTip:[10, 0, 0]}, 'snap'],
      [0.32, {'hips.p':[0, 0.8, 0.2], armR:[-48, 0, -8], cape1:[32, 0, 0]}, 'out'],
      [0.48, {}, 'sm']]),
    // nhát 3: xoay một vòng rồi lao tới đâm thẳng
    attack3: bake('attack3', 0.62, [
      [0, {}],
      [0.14, {'hips.p':[0, 0.82, -0.1], root:[0, 70, 0], spine:[8, 0, 0], armR:[20, 0, -30], foreR:[-100, 0, 0], weapon:[80, 0, 0], armL:[-30, 0, 30], thighL:[-30, 0, 5], shinL:[40, 0, 0], thighR:[20, 0, -5], shinR:[30, 0, 0], cape1:[20, 0, -20]}, 'out'],
      [0.27, {root:[0, -180, 0], 'hips.p':[0, 0.9, 0.2], cape1:[60, 0, 30], cape2:[40, 0, 0], scarf1:[80, 60, 0]}, 'in'],
      [0.34, {root:[0, -360, 0], 'hips.p':[0, 0.78, 0.65], spine:[20, 0, 0], chest:[6, 0, 0], head:[-14, 0, 0], armR:[-92, 0, -4], foreR:[0, 0, 0], weapon:[66, 0, 0], armL:[30, 0, 40], foreL:[-20, 0, 0], thighL:[-60, 0, 5], shinL:[50, 0, 0], thighR:[45, 0, -5], shinR:[10, 0, 0], footR:[30, 0, 0], cape1:[70, 0, 0], cape2:[40, 0, 0], scarf1:[85, 20, 0]}, 'snap'],
      [0.44, {'hips.p':[0, 0.8, 0.62], armR:[-88, 0, -6], cape1:[50, 0, 0]}, 'out'],
      [0.62, {root:[0, -360, 0]}, 'sm']]),
    // tuyệt chiêu: ngồi lấy đà, bật nhảy xoay vòng, cắm kiếm xuống đất
    skill: bake('skill', 1.05, [
      [0, {}],
      [0.2, {'hips.p':[0, 0.7, 0], spine:[25, 0, 0], head:[-20, 0, 0], thighL:[-70, 0, 8], shinL:[100, 0, 0], footL:[-30, 0, 0], thighR:[-70, 0, -8], shinR:[100, 0, 0], footR:[-30, 0, 0], armR:[40, 0, -30], foreR:[-60, 0, 0], armL:[40, 0, 30], weapon:[70, 0, 0], cape1:[20, 0, 0]}, 'out'],
      [0.42, {'hips.p':[0, 2.5, 0], root:[0, 200, 0], spine:[-15, 0, 0], head:[-15, 0, 0], thighL:[-30, 0, 8], shinL:[60, 0, 0], footL:[0, 0, 0], thighR:[10, 0, -8], shinR:[40, 0, 0], footR:[0, 0, 0], armR:[-180, 0, -10], foreR:[-20, 0, 0], weapon:[-30, 0, 0], armL:[-150, 0, 30], cape1:[80, 0, 0], cape2:[40, 0, 0], cape3:[30, 0, 0], scarf1:[90, 40, 0]}, 'out'],
      [0.55, {'hips.p':[0, 2.3, 0.2], root:[0, 360, 0], spine:[-25, 0, 0], armR:[-200, 0, -10], weapon:[-40, 0, 0], cape1:[20, 0, 0], cape2:[-10, 0, 0]}, 'sm'],
      [0.64, {'hips.p':[0, 0.62, 0.45], spine:[40, 0, 0], chest:[10, 0, 0], head:[10, 0, 0], armR:[-60, 0, -8], foreR:[-20, 0, 0], weapon:[100, 0, 0], armL:[10, 0, 60], thighL:[-80, 0, 8], shinL:[110, 0, 0], footL:[-20, 0, 0], thighR:[30, 0, -8], shinR:[100, 0, 0], footR:[40, 0, 0], cape1:[100, 0, 0], cape2:[50, 0, 0], cape3:[30, 0, 0], scarf1:[100, 30, 0], hatTip:[20, 0, 0]}, 'in'],
      [0.85, {'hips.p':[0, 0.66, 0.45], cape1:[30, 0, 0], cape2:[10, 0, 0], hatTip:[-20, 0, 0]}, 'out'],
      [1.05, {root:[0, 360, 0]}, 'sm']]),
    hurt: bake('hurt', 0.36, [
      [0, {}],
      [0.08, {'hips.p':[0, 0.9, -0.18], spine:[-18, 0, 6], chest:[-10, 0, 0], head:[-25, 0, 8], 'eyes.s':[1, 0.25, 1], armL:[-30, 0, 60], foreL:[-60, 0, 0], armR:[-60, 0, -40], cape1:[-10, 0, 0], hatTip:[10, 0, 0]}, 'snap'],
      [0.36, {'eyes.s':[1, 1, 1]}, 'sm']]),
    die: bake('die', 1.3, [
      [0, {}],
      [0.25, {'hips.p':[0, 0.8, -0.15], spine:[-20, 0, 10], head:[-30, 0, 10], 'eyes.s':[1, 0.15, 1], armL:[-20, 0, 70], armR:[-30, 0, -70], weapon:[60, 0, 0], thighL:[-20, 0, 8], shinL:[30, 0, 0], thighR:[-10, 0, -8], shinR:[30, 0, 0]}, 'out'],
      [0.55, {'hips.p':[0, 0.55, -0.3], hips:[-30, 0, 0], spine:[-10, 0, 0], thighL:[-60, 0, 8], shinL:[90, 0, 0], thighR:[-50, 0, -8], shinR:[90, 0, 0]}, 'in'],
      [0.95, {'hips.p':[0, 0.28, -0.75], hips:[-85, 0, 0], spine:[0, 0, 0], head:[10, 20, 0], armL:[-150, 0, 40], armR:[-160, 0, -40], foreR:[-10, 0, 0], weapon:[0, 0, 0], thighL:[-80, 0, 12], shinL:[30, 0, 0], thighR:[-90, 0, -12], shinR:[10, 0, 0], cape1:[-40, 0, 0], cape2:[-20, 0, 0], cape3:[-10, 0, 0], hatTip:[-60, 0, 0]}, 'in'],
      [1.1, {'hips.p':[0, 0.33, -0.75], head:[0, 25, 0]}, 'out'],
      [1.3, {'hips.p':[0, 0.28, -0.75], head:[8, 25, 0]}, 'sm']]),
    revive: bake('revive', 0.9, [
      [0, {'hips.p':[0, 0.28, -0.75], hips:[-85, 0, 0], head:[8, 25, 0], 'eyes.s':[1, 0.15, 1], armL:[-150, 0, 40], armR:[-160, 0, -40], foreR:[-10, 0, 0], weapon:[0, 0, 0], thighL:[-80, 0, 12], shinL:[30, 0, 0], thighR:[-90, 0, -12], shinR:[10, 0, 0], cape1:[-40, 0, 0], hatTip:[-60, 0, 0]}],
      [0.4, {'hips.p':[0, 0.6, -0.2], hips:[20, 0, 0], spine:[20, 0, 0], head:[-10, 0, 0], 'eyes.s':[1, 1, 1], armL:[20, 0, 30], armR:[0, 0, -30], thighL:[-80, 0, 8], shinL:[110, 0, 0], thighR:[-70, 0, -8], shinR:[110, 0, 0], cape1:[20, 0, 0]}, 'out'],
      [0.9, {}, 'back']]),
    victory: bake('victory', 1.7, [
      [0, {}],
      [0.2, {'hips.p':[0, 0.75, 0], spine:[15, 0, 0], thighL:[-50, 0, 8], shinL:[80, 0, 0], thighR:[-50, 0, -8], shinR:[80, 0, 0], armR:[20, 0, -30], armL:[20, 0, 30]}, 'out'],
      [0.45, {'hips.p':[0, 1.55, 0], spine:[-10, 0, 0], head:[-20, 0, 0], thighL:[-20, 0, 8], shinL:[30, 0, 0], thighR:[10, 0, -8], shinR:[50, 0, 0], armR:[-175, 0, -15], foreR:[-5, 0, 0], weapon:[90, 0, 0], armL:[-20, 0, 70], foreL:[-60, 0, 0], cape1:[70, 0, 0], cape2:[30, 0, 0], scarf1:[80, 40, 0], hatTip:[-50, 0, 0]}, 'out'],
      [0.7, {'hips.p':[0, 0.88, 0], spine:[0, 0, 0], thighL:[-20, 0, 8], shinL:[30, 0, 0], thighR:[0, 0, -8], shinR:[20, 0, 0], cape1:[10, 0, 0], cape2:[0, 0, 0], hatTip:[0, 0, 0]}, 'in'],
      [0.85, {'hips.p':[0, 0.95, 0], head:[-15, 0, 6], 'eyes.s':[1, 0.35, 1], thighL:[0, 0, 3], shinL:[0, 0, 0], thighR:[0, 0, -3], shinR:[0, 0, 0]}, 'out'],
      [1.4, {head:[-12, 0, -6], armL:[-10, 0, 60], hatTip:[-20, 0, 0]}, 'sm'],
      [1.7, {'eyes.s':[1, 1, 1]}, 'sm']]),
    think: bake('think', 2.0, [
      [0, {'hips.p':[0, 0.94, 0], hips:[0, 0, 4], head:[6, -12, 12], armL:[-30, -30, 40], foreL:[-130, 0, 0], handL:[0, 0, 0], armR:[-5, 0, -10], foreR:[-15, 0, 0], weapon:[95, 0, 0], thighL:[0, 0, 8], thighR:[0, 0, -2]}],
      [0.5, {'eyes.s':[1, 1, 1]}], [0.54, {'eyes.s':[1, 0.1, 1]}, 'lin'], [0.6, {'eyes.s':[1, 1, 1]}, 'lin'],
      [1.0, {'hips.p':[0, 0.92, 0], head:[2, -16, 16], hatTip:[-28, 0, 6]}, 'sm'],
      [2.0, {'hips.p':[0, 0.94, 0], head:[6, -12, 12], hatTip:[-18, 0, 0]}, 'sm']], true)};

  /* ---------------- BỘ TRỘN: chạy/đứng làm nền, động tác chồng lên, chuyển mượt ---------------- */
  const mixer = new THREE.AnimationMixer(root), A = {};
  Object.keys(CL).forEach(k=>{ const a = A[k] = mixer.clipAction(CL[k]); if(!['idle', 'run', 'think'].includes(k)){ a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; } a.enabled = true; a.setEffectiveWeight(0); a.play(); a.paused = true; });
  A.idle.paused = false; A.run.paused = false; A.think.paused = false;
  const EVT = {attack1:[{t:0.17, ev:'hit', d:{combo:1, dmgScale:1}}], attack2:[{t:0.2, ev:'hit', d:{combo:2, dmgScale:1.15}}], attack3:[{t:0.34, ev:'hit', d:{combo:3, dmgScale:1.6}}], skill:[{t:0.63, ev:'impact', d:{}}]};
  const CB = {hit:[], impact:[], end:[]};
  let speed = 0, speedS = 0, cur = null, curW = 0, prev = null, prevW = 0, fired = new Set(), dead = false, thinking = false, thinkW = 0, queued = false, lastAtkEnd = -9, clock = 0;
  const FADE_IN = {attack1:0.06, attack2:0.05, attack3:0.06, skill:0.08, hurt:0.04, die:0.15, revive:0.1, victory:0.12};
  function play(name){
    if(cur && cur !== name){ prev = cur; prevW = curW; }
    cur = name; curW = cur === prev ? curW : 0; fired = new Set(); const a = A[name]; a.reset(); a.paused = false; a.play();
  }
  function busy(){ return cur && !['hurt'].includes(cur); }
  const api = {
    object:root, bones:B, weaponTip, weaponMid, mixer, clips:CL, actions:A,
    on(ev, fn){ (CB[ev] = CB[ev] || []).push(fn); return api; },
    setMove(s){ speed = Math.max(0, Math.min(1, s)); },
    get action(){ return cur; },
    attack(){
      if(dead || cur === 'skill' || cur === 'victory' || cur === 'revive') return 0;
      if(cur && cur.startsWith('attack')){ const a = A[cur], k = a.time/CL[cur].duration;
        if(cur === 'attack3') { if(k > 0.75){ play('attack1'); return 1; } queued = false; return 0; }
        if(k > 0.42){ const n = +cur.slice(-1) + 1; play('attack' + n); return n; }
        queued = true; return 0; }
      const n = clock - lastAtkEnd < 0.35 && api._lastCombo && api._lastCombo < 3 ? api._lastCombo + 1 : 1; play('attack' + n); return n; },
    skill(){ if(dead || cur === 'skill' || cur === 'revive') return false; play('skill'); return true; },
    hurt(){ if(dead) return; api.emote('pain', 0.6); if(busy()) return; play('hurt'); },
    die(){ if(dead) return; dead = true; emoteT = 0; play('die'); },
    revive(){ if(!dead) return; dead = false; api.emote('happy', 1.2); play('revive'); },
    victory(){ api.emote('joy', 2); if(dead || busy()) return; play('victory'); },
    emote(n, t = 1.6){ if(dead || !EMO[n]) return; emoteName = n; emoteT = t; },
    setMood(n){ if(EMO[n]) mood = n; },
    get emotion(){ return shownEmo; },
    think(on){ thinking = !!on; },
    update(dt){
      clock += dt; speedS += (speed - speedS)*Math.min(1, dt*10);
      emoteT = Math.max(0, emoteT - dt); showEmo(dead ? 'dead' : emoteT > 0 ? emoteName : thinking ? 'think' : mood);
      if(shownEmo === 'sad' || shownEmo === 'worried') sweat.position.y = 0.56 - ((clock*0.4) % 1)*0.12;
      // động tác đang chạy: báo sự kiện đúng khung hình, hết thì trả về nền
      if(cur){ const a = A[cur], dur = CL[cur].duration;
        (EVT[cur] || []).forEach((e, i)=>{ if(!fired.has(i) && a.time >= e.t){ fired.add(i); CB[e.ev].forEach(f=> f(e.d)); } });
        curW = Math.min(1, curW + dt/(FADE_IN[cur] || 0.08));
        const left = dur - a.time;
        if(cur.startsWith('attack') && queued && a.time/dur > 0.42 && cur !== 'attack3'){ queued = false; const n = +cur.slice(-1) + 1; play('attack' + n); }
        else if(cur !== 'die' && left <= 0.0001){ if(cur.startsWith('attack')){ lastAtkEnd = clock; api._lastCombo = +cur.slice(-1); } prev = cur; prevW = curW; cur = null; curW = 0; queued = false; CB.end.forEach(f=> f(prev)); }
      }
      if(prev){ prevW = Math.max(0, prevW - dt/0.16); if(prevW <= 0){ A[prev].setEffectiveWeight(0); A[prev].paused = true; prev = null; } }
      thinkW += ((thinking && !dead ? 1 : 0) - thinkW)*Math.min(1, dt*6);
      const act = (cur ? curW : 0) + (prev ? prevW : 0), base = Math.max(0, 1 - act);
      A.run.setEffectiveWeight(base*speedS); A.idle.setEffectiveWeight(base*(1 - speedS)*(1 - thinkW)); A.think.setEffectiveWeight(base*(1 - speedS)*thinkW);
      A.run.timeScale = 0.75 + speedS*0.45;
      if(cur) A[cur].setEffectiveWeight(curW); if(prev) A[prev].setEffectiveWeight(prevW);
      Object.keys(A).forEach(k=>{ if(k !== cur && k !== prev && !['idle', 'run', 'think'].includes(k)) A[k].setEffectiveWeight(0); });
      mixer.update(dt);
    },
    dispose(){ meshes.forEach(m=> m.geometry.dispose()); mixer.stopAllAction(); }
  };
  api.update(0);
  return api;
}
