// hero.js — Nhân vật chính "Hiệp sĩ Toán học" (Three.js r160)
// Ý tưởng khung xương + clip hoạt hình theo bản Gemini; dựng lại phần hình, tư thế, động tác và bộ trộn chuyển động.
// Khung xương dạng cây Object3D (mỗi xương mang khối hình riêng, gộp làm một lần vẽ), hoạt hình bằng AnimationMixer.
// Mỗi động tác khai báo bằng vài tư thế chính + kiểu gia tốc, rồi "nướng" ra khung hình 30 hình/giây (có lấy đà, theo đà, nảy).

export function createHero(THREE, opts = {}){
  const D = Math.PI/180;
  const GIRL = opts.style === 'girl', ANI = {}; let api_texs = [];
  const C = Object.assign(GIRL ? {skin:0xffe9da, hair:0x7a4630, coat:0xff8cc6, coat2:0xff6fb3, pants:0xffffff, boots:0xff5fa2, cape:0xffc4e2, hat:0xff4f9a, gold:0xffd36a, white:0xfff4fa, blade:0xffe27a, dark:0x3a1d2c, cheek:0xff8fb4, ribbon:0xff4f9a, iris:0xa04a8a}
    : {skin:0xffd6b0, hair:0x3a2618, coat:0x2f6fe0, coat2:0x2457b8, pants:0x2a2f4a, boots:0x6b3f22, cape:0xd9363e, hat:0x2b2f6b, gold:0xf2c14e, white:0xf4f1e6, blade:0x9ff3ff, dark:0x15151c, cheek:0xff9a9a}, opts.colors || {});
  if(opts.hairColor != null) C.hair = opts.hairColor;
  const HS = opts.hair || (GIRL ? 'g0' : 'b0'), HATON = GIRL || !opts.noHat;   // kiểu tóc, có đội mũ không
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
    {g:Sp(0.09, 8, 6), m:M4(0.43, 0.34, 0, 0.6, 1, 1), c:C.skin}, {g:Sp(0.09, 8, 6), m:M4(-0.43, 0.34, 0, 0.6, 1, 1), c:C.skin},
    {g:Sp(0.07, 8, 6), m:M4(0.26, 0.24, 0.37, 1, 0.6, 0.3), c:C.cheek}, {g:Sp(0.07, 8, 6), m:M4(-0.26, 0.24, 0.37, 1, 0.6, 0.3), c:C.cheek}]);
  // tóc theo kiểu học sinh chọn (b0…b6); phần chóp tóc bị mũ che khi đội mũ
  { const H = C.hair, HD = new THREE.Color(H).multiplyScalar(0.78).getHex(), cap = {g:new THREE.SphereGeometry(0.47, 20, 12, 0, Math.PI*2, 0, Math.PI*0.55), m:M4(0, 0.4, -0.05, 1, 1, 1, -0.35, 0, 0), c:H};
    const front = [{g:Co(0.12, 0.28, 6), m:M4(-0.18, 0.62, 0.34, 1, 1, 1, 2.6, 0, 0.3), c:H}, {g:Co(0.13, 0.3, 6), m:M4(0.02, 0.66, 0.38, 1, 1, 1, 2.7, 0, 0), c:H}, {g:Co(0.11, 0.26, 6), m:M4(0.2, 0.62, 0.33, 1, 1, 1, 2.6, 0, -0.3), c:H}];
    const onTop = (n, f)=>{ const out = []; for(let i = 0; i < n; i++) out.push(f(i, i/n*Math.PI*2)); return out; };
    const P = {
      b0:[cap, ...front],
      b1:[cap, ...onTop(9, (i, a)=>{ const r = i % 2 ? 0.3 : 0.2, x = Math.sin(a)*r, z = Math.cos(a)*r - 0.04; return {g:Co(0.12, 0.38, 6), m:M4(x, 0.78 - r*0.35, z, 1, 1, 1, Math.cos(a)*0.55*r/0.25, 0, -Math.sin(a)*0.55*r/0.25), c:i % 3 ? H : HD}; }), {g:Co(0.13, 0.42, 6), m:M4(0, 0.86, 0), c:H}],
      b2:[cap, {g:new THREE.SphereGeometry(0.485, 26, 10, Math.PI/2 - 1.15, 2.3, 0.2*Math.PI, 0.22*Math.PI), m:M4(0, 0.38, 0.02), c:H}, {g:Sp(0.16, 10, 8), m:M4(-0.38, 0.32, 0.02, 0.5, 1.2, 0.9), c:H}, {g:Sp(0.16, 10, 8), m:M4(0.38, 0.32, 0.02, 0.5, 1.2, 0.9), c:H}],
      b3:[{g:new THREE.SphereGeometry(0.465, 20, 12, 0, Math.PI*2, 0, Math.PI*0.5), m:M4(0, 0.38, -0.06, 1, 0.95, 1, -0.3, 0, 0), c:H}, {g:Sp(0.22, 14, 10), m:M4(0.02, 0.78, 0.16, 1.55, 0.75, 1.15, 0.35, 0, 0), c:H}, {g:Co(0.16, 0.3, 8), m:M4(0.03, 0.84, 0.36, 1.3, 1, 0.7, 1.9, 0, 0), c:HD}],
      b4:[cap, ...onTop(14, (i, a)=>{ const ring = i < 9 ? 0 : 1, aa = ring ? a*9/5 : a, r = ring ? 0.17 : 0.36, y = ring ? 0.82 : 0.66; return {g:Sp(0.13, 10, 8), m:M4(Math.sin(aa)*r, y, Math.cos(aa)*r - 0.04), c:i % 2 ? H : HD}; })],
      b5:[cap, ...front, {g:Sp(0.15, 12, 10), m:M4(0, 0.86, -0.22), c:H}, {g:Cy(0.09, 0.11, 0.06, 10), m:M4(0, 0.76, -0.2, 1, 1, 1, -0.4, 0, 0), c:C.cape}],
      b6:[cap, ...front, {g:Sp(0.42, 16, 12), m:M4(0, 0.18, -0.16, 1.05, 1.3, 0.75), c:H}, {g:Sp(0.14, 10, 8), m:M4(-0.36, 0.1, -0.02, 0.6, 1.6, 0.9), c:H}, {g:Sp(0.14, 10, 8), m:M4(0.36, 0.1, -0.02, 0.6, 1.6, 0.9), c:H}]};
    skin('head', P[HS] || P.b0, mat, 0.03); }
  // mắt to, có điểm sáng — đặt trên xương riêng để chớp mắt
  skin('eyes', [
    {g:Sp(0.075, 10, 8), m:M4(0.15, 0, 0, 0.9, 1.35, 0.5), c:C.dark}, {g:Sp(0.075, 10, 8), m:M4(-0.15, 0, 0, 0.9, 1.35, 0.5), c:C.dark},
    {g:Sp(0.025, 6, 4), m:M4(0.17, 0.035, 0.035), c:0xffffff}, {g:Sp(0.025, 6, 4), m:M4(-0.13, 0.035, 0.035), c:0xffffff}], mat, 0);
  } else {
  // bé gái kiểu anime: mặt mịn (đổ bóng nhẹ), mắt/miệng/má hồng vẽ tay trên "vỏ" bám mặt, tóc là các lọn thon nhọn mượt
  B.eyes.position.set(0, 0.33, 0.43);
  const FC = new THREE.Vector3(0, 0.35, 0.02), FR = new THREE.Vector3(0.45*1.05, 0.45*0.97, 0.45);
  const soft = (()=>{ const t = new THREE.DataTexture(new Uint8Array([228, 248, 255]), 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true;
    return new THREE.MeshToonMaterial({vertexColors:true, gradientMap:t}); })();
  const sm = new THREE.Mesh(merge([{g:Sp(0.45, 40, 30), m:M4(FC.x, FC.y, FC.z, 1.05, 0.97, 1), c:C.skin}]), soft); sm.castShadow = true; B.head.add(sm); meshes.push(sm); addOutline(sm, 0.022);
  // lọn tóc: ống cong thon dần về đầu nhọn, dẹt theo mặt da đầu
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _n = new THREE.Vector3();
  function strand(pts, r0, flat = 0.45, seg = 16, ring = 10, pw = 0.85){
    const cv = new THREE.CatmullRomCurve3(pts.map(p=> new THREE.Vector3(...p))), P = [], I = [];
    for(let i = 0; i <= seg; i++){ const t = i/seg, c = cv.getPointAt(t), T = cv.getTangentAt(t); _n.copy(c).sub(FC).normalize(); _b.crossVectors(T, _n).normalize(); _n.crossVectors(_b, T).normalize();
      const w = r0*Math.pow(1 - t, pw)*(0.75 + 0.25*Math.sin(Math.min(1, t*4)*Math.PI/2)) + 0.002;
      for(let j = 0; j < ring; j++){ const a = j/ring*Math.PI*2; P.push(c.x + _b.x*Math.cos(a)*w + _n.x*Math.sin(a)*w*flat, c.y + _b.y*Math.cos(a)*w + _n.y*Math.sin(a)*w*flat, c.z + _b.z*Math.cos(a)*w + _n.z*Math.sin(a)*w*flat); } }
    for(let i = 0; i < seg; i++) for(let j = 0; j < ring; j++){ const a = i*ring + j, b = i*ring + (j + 1) % ring, c = a + ring, d = b + ring; I.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals(); return g; }
  const surf = (a, e, r = 0.47)=> [FC.x + Math.sin(a*D)*Math.cos(e*D)*r*1.05, FC.y + Math.sin(e*D)*r*0.97, FC.z + Math.cos(a*D)*Math.cos(e*D)*r];
  const HL = new THREE.Color(C.hair).lerp(new THREE.Color(0xffe0c0), 0.38).getHex(), HD = new THREE.Color(C.hair).multiplyScalar(0.8).getHex();
  const hair = [
    {g:new THREE.SphereGeometry(0.49, 44, 30, 0, Math.PI*2, 0, Math.PI*0.52), m:M4(0, 0.4, -0.06, 1.04, 1, 1, -0.4, 0, 0), c:C.hair},
    {g:Sp(0.47, 40, 28), m:M4(0, 0.22, -0.2, 0.93, 1.1, 0.8), c:C.hair},
    // vầng sáng trên tóc (thiên thần)
    {g:new THREE.SphereGeometry(0.496, 48, 3, Math.PI/2 - 1.0, 2.0, 0.55, 0.075), m:M4(0, 0.4, -0.06, 1.04, 1, 1, -0.4, 0, 0), c:HL}];
  // mái: 9 lọn nhọn từ đỉnh đầu rủ xuống trán
  // mái bằng: các lọn dày, đuôi cắt gần ngang (hơi so le), rủ từ đỉnh đầu xuống trán
  for(let i = 0; i < 15; i++){ const a = -70 + i*10, s = Math.sign(a) || 1, L = 31 - Math.abs(a)*0.13 + (i % 3 === 1 ? 2.5 : 0);
    hair.push({g:strand([surf(a*0.45, 85, 0.5), surf(a*0.8, 66, 0.518), surf(a, L + 14, 0.508), surf(a + s*1.5, L, 0.478)], 0.105, 0.34, 18, 12, 0.32), c:i % 4 === 1 ? HD : C.hair}); }
  // tóc mai hai bên má
  [-1, 1].forEach(d=>{ hair.push({g:strand([surf(d*70, 40, 0.5), surf(d*80, 12, 0.5), surf(d*78, -18, 0.49), surf(d*72, -36, 0.47)], 0.085, 0.4, 18), c:C.hair},
    {g:strand([surf(d*84, 36, 0.5), surf(d*94, 5, 0.5), surf(d*96, -24, 0.48)], 0.075, 0.45), c:HD}); });
  // hai bím tóc dài, mượt, cong ra ngoài rồi rủ xuống, buộc nơ hồng
  const tails = [];
  if(HS === 'g0') [-1, 1].forEach(d=>{ const r0 = [d*0.48, 0.6, -0.12];
    tails.push({g:strand([r0, [d*0.66, 0.56, -0.16], [d*0.8, 0.32, -0.16], [d*0.8, 0.04, -0.12], [d*0.72, -0.22, -0.1], [d*0.76, -0.46, -0.08], [d*0.7, -0.66, -0.06]], 0.17, 0.75, 30, 12, 0.9), c:C.hair},
      {g:strand([[d*0.5, 0.62, -0.1], [d*0.62, 0.6, -0.05], [d*0.74, 0.38, -0.05], [d*0.76, 0.1, -0.02], [d*0.68, -0.14, 0.0], [d*0.72, -0.38, 0.0], [d*0.66, -0.56, 0.02]], 0.1, 0.7, 28, 10, 0.9), c:HD},
      {g:strand([[d*0.5, 0.6, -0.16], [d*0.7, 0.5, -0.24], [d*0.84, 0.22, -0.24], [d*0.82, -0.08, -0.2], [d*0.78, -0.34, -0.18], [d*0.8, -0.54, -0.16]], 0.1, 0.7, 26, 10, 0.9), c:HL},
      {g:Sp(0.11, 16, 12), m:M4(d*0.5, 0.6, -0.1, 1, 1, 0.9), c:C.hair},
      {g:Sp(0.1, 14, 10), m:M4(d*0.54, 0.7, -0.0, 1.5, 0.85, 0.5, 0, d*0.3, d*0.45), c:C.ribbon}, {g:Sp(0.1, 14, 10), m:M4(d*0.62, 0.53, 0.0, 1.5, 0.85, 0.5, 0, d*0.3, d*1.5), c:C.ribbon}, {g:Sp(0.05, 10, 8), m:M4(d*0.58, 0.62, 0.05), c:0xff7fb6}, {g:Bx(0.05, 0.26, 0.02), m:M4(d*0.62, 0.44, 0.06, 1, 1, 1, 0, 0, d*0.35), c:C.ribbon}, {g:Bx(0.05, 0.22, 0.02), m:M4(d*0.54, 0.46, 0.07, 1, 1, 1, 0, 0, -d*0.2), c:C.ribbon}); });
  // các kiểu khác: bob, đuôi ngựa, xõa dài, búi hai bên, búi cao
  if(HS === 'g1'){ tails.push({g:Sp(0.5, 32, 22), m:M4(0, 0.24, -0.1, 1.1, 0.92, 0.95), c:C.hair});
    for(let i = 0; i < 11; i++){ const a = 95 + i*17; tails.push({g:strand([surf(a, 30, 0.5), surf(a, -5, 0.53), surf(a + 3, -30, 0.5)], 0.12, 0.45, 14, 10, 0.6), c:i % 3 === 1 ? HD : C.hair}); } }
  if(HS === 'g2'){ tails.push({g:Sp(0.12, 14, 10), m:M4(0, 0.66, -0.44), c:C.hair}, {g:Cy(0.1, 0.1, 0.06, 12), m:M4(0, 0.62, -0.48, 1, 1, 1, 1.2, 0, 0), c:C.ribbon},
      {g:strand([[0, 0.64, -0.46], [0, 0.6, -0.68], [0, 0.32, -0.74], [0.02, 0.0, -0.7], [-0.02, -0.3, -0.64], [0, -0.55, -0.6]], 0.17, 0.75, 30, 12, 0.9), c:C.hair},
      {g:strand([[0.03, 0.62, -0.5], [0.05, 0.5, -0.74], [0.06, 0.2, -0.78], [0.04, -0.1, -0.72], [0.06, -0.4, -0.66]], 0.09, 0.7, 24, 10, 0.9), c:HL}); }
  if(HS === 'g3') for(let i = 0; i < 9; i++){ const a = (110 + i*17.5)*D, x = Math.sin(a), z = Math.cos(a);
      tails.push({g:strand([[x*0.46, 0.5, z*0.46 - 0.06], [x*0.58, 0.2, z*0.58 - 0.1], [x*0.6, -0.15, z*0.58 - 0.1], [x*0.56, -0.5, z*0.54 - 0.08], [x*0.52, -0.68, z*0.5 - 0.06]], 0.16, 0.55, 26, 10, 0.8), c:i % 3 === 1 ? HD : i % 4 === 2 ? HL : C.hair}); }
  if(HS === 'g4') [-1, 1].forEach(d=> tails.push({g:Sp(0.17, 16, 12), m:M4(d*0.34, 0.8, -0.06), c:C.hair}, {g:Sp(0.06, 8, 6), m:M4(d*0.4, 0.88, 0.06), c:HL}, {g:Sp(0.075, 10, 8), m:M4(d*0.24, 0.72, 0.06, 1.4, 0.8, 0.5, 0, 0, d*0.5), c:C.ribbon}));
  if(HS === 'g5') tails.push({g:Sp(0.19, 16, 12), m:M4(0, 0.96, -0.12), c:C.hair}, {g:Sp(0.07, 8, 6), m:M4(0.05, 1.05, -0.02), c:HL}, {g:Cy(0.13, 0.15, 0.06, 14), m:M4(0, 0.82, -0.1), c:C.ribbon});
  const hm = new THREE.Mesh(merge([...hair, ...tails]), mat); hm.castShadow = true; B.head.add(hm); meshes.push(hm); addOutline(hm, 0.02);
  // vỏ bám mặt có vân UV phẳng: lớp mắt (gắn xương mắt để chớp) + lớp nét mặt vẽ tay (lông mày, mũi, miệng, má, nước mắt) — vẽ khi cần lần đầu
  function shell(x0, x1, y0, y1, nx = 26, ny = 14, lift = 0.006){
    const P = [], U = [], I = [];
    for(let j = 0; j <= ny; j++) for(let i = 0; i <= nx; i++){ const x = x0 + (x1 - x0)*i/nx, y = y0 + (y1 - y0)*j/ny, k = 1 - ((x - FC.x)/FR.x)**2 - ((y - FC.y)/FR.y)**2;
      const z = FC.z + (FR.z + lift)*Math.sqrt(Math.max(0, k)); P.push(x, y, z); U.push(i/nx, j/ny); }
    for(let j = 0; j < ny; j++) for(let i = 0; i < nx; i++){ const a = j*(nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; I.push(a, b, c, b, d, c); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); g.computeVertexNormals(); return g; }
  const texs = []; api_texs = texs;
  const paint = (w, h, draw)=>{ const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.lineCap = 'round'; x.lineJoin = 'round'; draw(x, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; texs.push(t); return t; };
  // lớp vẽ: tạo mesh ngay, vẽ texture khi hiện lần đầu
  function layer(bone, geo, draws, order){ const mat = new THREE.MeshBasicMaterial({transparent:true, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-4 - order, polygonOffsetUnits:-4 - order, toneMapped:false});
    const m = new THREE.Mesh(geo, mat); m.renderOrder = 2 + order; m.visible = false; B[bone].add(m); meshes.push(m); const cache = {};
    return {mesh:m, set(k){ if(!draws[k]) k = Object.keys(draws)[0]; if(!cache[k]) cache[k] = paint(draws[k].w, draws[k].h, draws[k].f); mat.map = cache[k]; mat.needsUpdate = true; m.visible = true; }}; }
  // ---------- MẮT: 512×256 phủ x∈[-0.3,0.3], y∈[0.17,0.49]; tâm mắt (115|397, 128); vẽ mắt bên phải, mắt trái lật gương
  const EG = shell(-0.36, 0.36, 0.11, 0.51, 28, 16), EOFF = new THREE.Vector3(0, -0.33, -0.43); EG.translate(EOFF.x, EOFF.y, EOFF.z);
  const LASH = '#24101c', EX = [139, 373], EY = 146, EK = 1.36;
  const both = f=> (x)=> EX.forEach((cx, i)=>{ x.save(); x.translate(cx, EY); x.scale(i ? EK : -EK, EK); f(x); x.restore(); });
  // mi: [đầu mắt y, điểm uốn y, đuôi mắt y]; gaze: lệch con ngươi; iris: tỉ lệ tròng
  function eyeOpen(o){ return x=>{ const li = o.li ?? -4, lc = o.lc ?? -96, lo = o.lo ?? -30, gy = o.gy || 0, gx = o.gx || 0, ir = o.ir || 1, lw = o.lw ?? 92;
    const lid = ()=>{ x.beginPath(); x.moveTo(-60, li); x.quadraticCurveTo(-4, lc, 66, lo); };
    x.save(); x.beginPath(); x.moveTo(-60, li); x.quadraticCurveTo(-4, lc, 66, lo); x.quadraticCurveTo(14, lw + 6, -60, li); x.closePath(); x.clip();
    x.fillStyle = '#fbf7fb'; x.fillRect(-80, -110, 160, 220);
    // tròng mắt tím nhiều lớp
    const ix = gx, iy = 8 + gy, rx = 47*ir, ry = 56*ir;
    let g = x.createRadialGradient(ix, iy + 22*ir, 4, ix, iy, ry); g.addColorStop(0, '#e8c8ff'); g.addColorStop(0.3, '#a46ad8'); g.addColorStop(0.7, '#5a2a96'); g.addColorStop(1, '#22103e');
    x.fillStyle = g; x.beginPath(); x.ellipse(ix, iy, rx, ry, 0, 0, 7); x.fill();
    for(let k = 0; k < 44; k++){ const a = k/44*Math.PI*2; x.strokeStyle = k % 2 ? 'rgba(255,255,255,.16)' : 'rgba(50,15,80,.22)'; x.lineWidth = 2; x.beginPath(); x.moveTo(ix + Math.cos(a)*rx*0.36, iy + Math.sin(a)*ry*0.36); x.lineTo(ix + Math.cos(a)*rx*0.92, iy + Math.sin(a)*ry*0.92); x.stroke(); }
    x.strokeStyle = '#26103e'; x.lineWidth = 4.5; x.beginPath(); x.ellipse(ix, iy, rx, ry, 0, 0, 7); x.stroke();
    x.fillStyle = '#170722'; x.beginPath(); x.ellipse(ix, iy + 2, 15*ir*(o.pup || 1), 19*ir*(o.pup || 1), 0, 0, 7); x.fill();
    g = x.createRadialGradient(ix, iy + 34*ir, 2, ix, iy + 30*ir, 26*ir); g.addColorStop(0, 'rgba(255,235,255,.7)'); g.addColorStop(1, 'rgba(255,235,255,0)'); x.fillStyle = g; x.beginPath(); x.ellipse(ix, iy + 28*ir, 34*ir, 22*ir, 0, 0, 7); x.fill();
    // bóng mí trên đổ xuống
    g = x.createLinearGradient(0, lc*0.5 - 10, 0, lc*0.5 + 46); g.addColorStop(0, 'rgba(40,12,55,.62)'); g.addColorStop(1, 'rgba(40,12,55,0)'); x.fillStyle = g; x.fillRect(-80, -110, 160, lc*0.5 + 160);
    // điểm sáng
    x.fillStyle = '#ffffff'; x.beginPath(); x.ellipse(ix - 14, iy - 22*ir, 13, 17, -0.5, 0, 7); x.fill(); x.beginPath(); x.arc(ix + 17, iy + 26*ir, 6, 0, 7); x.fill(); x.beginPath(); x.arc(ix + 21, iy - 12*ir, 3, 0, 7); x.fill();
    if(o.tear){ x.fillStyle = 'rgba(200,235,255,.55)'; x.beginPath(); x.ellipse(0, lw - 12, 62, 16, 0, 0, 7); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(-20, lw - 18, 4, 0, 7); x.arc(14, lw - 16, 3, 0, 7); x.fill(); }
    x.restore();
    // nếp mí đôi
    x.strokeStyle = 'rgba(120,60,60,.45)'; x.lineWidth = 3; x.beginPath(); x.moveTo(-40, li - 26); x.quadraticCurveTo(0, lc - 18, 52, lo - 22); x.stroke();
    // viền mi trên dày + mi cong từng sợi
    x.strokeStyle = LASH; x.lineWidth = 10; lid(); x.stroke();
    x.fillStyle = LASH; for(let k = 0; k < 6; k++){ const t = 0.45 + k*0.11, px = (1 - t)*(1 - t)*-60 + 2*(1 - t)*t*-4 + t*t*66, py = (1 - t)*(1 - t)*li + 2*(1 - t)*t*lc + t*t*lo, L = 16 + k*4, a = -1.25 + k*0.17;
      x.beginPath(); x.moveTo(px - 4, py + 2); x.quadraticCurveTo(px + Math.cos(a)*L*0.4 - 6, py + Math.sin(a)*L*0.6, px + Math.cos(a)*L, py + Math.sin(a)*L); x.lineTo(px + 5, py + 1); x.fill(); }
    x.lineWidth = 7; x.beginPath(); x.moveTo(58, lo + 2); x.quadraticCurveTo(76, lo - 2, 84, lo - 16); x.stroke();
    // mi dưới mảnh
    x.strokeStyle = 'rgba(110,50,60,.45)'; x.lineWidth = 3; x.beginPath(); x.moveTo(-30, lw*0.42 + 8); x.quadraticCurveTo(14, lw*0.62 + 2, 60, lo + 14); x.stroke();
    x.strokeStyle = 'rgba(70,25,40,.55)'; x.lineWidth = 2.5; for(let k = 0; k < 4; k++){ const px = 20 + k*11, py = lw*0.55 - k*6; x.beginPath(); x.moveTo(px, py); x.lineTo(px + 3, py + 8); x.stroke(); } }; }
  const arcEye = (up)=> x=>{ x.strokeStyle = LASH; x.lineWidth = 11; x.beginPath(); if(up){ x.moveTo(-54, 24); x.quadraticCurveTo(0, -44, 56, 22); } else { x.moveTo(-56, 0); x.quadraticCurveTo(0, 40, 58, 2); } x.stroke();
    x.lineWidth = 6; x.beginPath(); if(up){ x.moveTo(50, 12); x.lineTo(70, 4); } else { for(let k = 0; k < 4; k++){ const px = 10 + k*13, py = 22 - k*5; x.moveTo(px, py); x.lineTo(px + 3, py + 13); } } x.stroke(); };
  const E = (f)=> ({w:512, h:284, f:both(f)});
  const EYE_D = {
    open:E(eyeOpen({})), wide:E(eyeOpen({li:-10, lc:-110, lo:-36, lw:100, ir:0.88, pup:0.7})), half:E(eyeOpen({li:12, lc:-24, lo:6, gx:6, gy:6})),
    up:E(eyeOpen({gy:-16, gx:-4})), teary:E(eyeOpen({li:-10, lc:-90, lo:-12, tear:1, gy:4})), droop:E(eyeOpen({li:-12, lc:-88, lo:-10})), narrow:E(eyeOpen({li:16, lc:-46, lo:-30, gy:4, pup:0.85})),
    arc:E(arcEye(true)), closed:E(arcEye(false)),
    pain:E(x=>{ x.strokeStyle = LASH; x.lineWidth = 11; x.beginPath(); x.moveTo(40, -32); x.lineTo(-34, 0); x.lineTo(40, 32); x.stroke(); }),
    dead:E(x=>{ x.strokeStyle = LASH; x.lineWidth = 11; x.beginPath(); x.moveTo(-36, -36); x.lineTo(36, 36); x.moveTo(36, -36); x.lineTo(-36, 36); x.stroke(); })};
  // ---------- NÉT MẶT: 512×384 phủ x∈[-0.42,0.42], y∈[0,0.62]; lông mày y≈74, mũi y≈232, miệng (256, 285), má (91|421, 262)
  const FG = shell(-0.42, 0.42, 0.0, 0.62, 30, 22, 0.004), MX = 256, MY = 285;
  const brows = (L, R)=> x=>{ x.strokeStyle = 'rgba(95,52,38,.9)'; [[L, -1], [R, 1]].forEach(([b, d])=>{ const cx = MX + d*100, Y = 92; x.lineWidth = 7; x.beginPath(); x.moveTo(cx - d*44, Y + b[0]); x.quadraticCurveTo(cx, Y - 14 + b[1], cx + d*42, Y - 2 + b[2]); x.stroke(); x.lineWidth = 3.5; x.beginPath(); x.moveTo(cx + d*30, Y - 4 + b[2]*0.8); x.lineTo(cx + d*50, Y + 4 + b[2]); x.stroke(); }); };
  const blush = (a = 0.55)=> x=>{ [MX - 165, MX + 165].forEach(bx=>{ const g = x.createRadialGradient(bx, 262, 6, bx, 262, 78); g.addColorStop(0, `rgba(255,110,140,${a})`); g.addColorStop(1, 'rgba(255,110,140,0)'); x.fillStyle = g; x.beginPath(); x.ellipse(bx, 262, 84, 50, 0, 0, 7); x.fill();
      if(a > 0.6){ x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 3; for(let k = -1; k <= 1; k++){ x.beginPath(); x.moveTo(bx + k*15 - 5, 272); x.lineTo(bx + k*15 + 6, 252); x.stroke(); } } }); };
  const base = x=>{ let g = x.createLinearGradient(0, 0, 0, 60); g.addColorStop(0, 'rgba(150,80,70,.32)'); g.addColorStop(1, 'rgba(150,80,70,0)'); x.fillStyle = g; x.fillRect(60, 0, 392, 60);   // bóng tóc mái trên trán
    g = x.createRadialGradient(MX, 384, 30, MX, 384, 120); g.addColorStop(0, 'rgba(200,120,110,.22)'); g.addColorStop(1, 'rgba(200,120,110,0)'); x.fillStyle = g; x.fillRect(120, 280, 272, 104);   // bóng cằm
    x.strokeStyle = 'rgba(190,110,95,.75)'; x.lineWidth = 3; x.beginPath(); x.moveTo(MX + 4, 222); x.quadraticCurveTo(MX + 9, 236, MX + 2, 242); x.stroke();   // mũi
    x.fillStyle = 'rgba(255,255,255,.6)'; x.beginPath(); x.arc(MX - 2, 226, 3, 0, 7); x.fill(); };
  const LIP = '#b8485e', IN = '#7a1f34';
  const mouth = {
    neutral:x=>{ x.strokeStyle = LIP; x.lineWidth = 4; x.beginPath(); x.moveTo(MX - 15, MY); x.quadraticCurveTo(MX, MY + 4, MX + 15, MY); x.stroke(); x.fillStyle = 'rgba(230,120,140,.35)'; x.beginPath(); x.ellipse(MX, MY + 9, 11, 4, 0, 0, 7); x.fill(); },
    smile:x=>{ x.strokeStyle = LIP; x.lineWidth = 4.5; x.beginPath(); x.moveTo(MX - 26, MY - 6); x.quadraticCurveTo(MX, MY + 16, MX + 26, MY - 6); x.stroke(); x.fillStyle = 'rgba(230,120,140,.35)'; x.beginPath(); x.ellipse(MX, MY + 14, 12, 4, 0, 0, 7); x.fill(); },
    coy:x=>{ x.strokeStyle = LIP; x.lineWidth = 4; x.beginPath(); x.moveTo(MX - 18, MY - 1); x.quadraticCurveTo(MX + 2, MY + 10, MX + 22, MY - 7); x.stroke(); },
    grin:x=>{ x.fillStyle = IN; x.beginPath(); x.moveTo(MX - 30, MY - 8); x.quadraticCurveTo(MX, MY - 2, MX + 30, MY - 8); x.quadraticCurveTo(MX + 22, MY + 30, MX, MY + 30); x.quadraticCurveTo(MX - 22, MY + 30, MX - 30, MY - 8); x.fill(); x.strokeStyle = LIP; x.lineWidth = 3; x.stroke();
      x.fillStyle = '#fff'; x.beginPath(); x.moveTo(MX - 24, MY - 6); x.quadraticCurveTo(MX, MY, MX + 24, MY - 6); x.lineTo(MX + 20, MY + 2); x.quadraticCurveTo(MX, MY + 6, MX - 20, MY + 2); x.fill(); x.fillStyle = '#ff7f99'; x.beginPath(); x.ellipse(MX, MY + 21, 14, 7, 0, 0, 7); x.fill(); },
    sad:x=>{ x.strokeStyle = LIP; x.lineWidth = 4; x.beginPath(); x.moveTo(MX - 16, MY + 8); x.quadraticCurveTo(MX, MY - 6, MX + 16, MY + 8); x.stroke(); x.fillStyle = 'rgba(230,120,140,.35)'; x.beginPath(); x.ellipse(MX, MY + 14, 9, 4, 0, 0, 7); x.fill(); },
    pout:x=>{ x.fillStyle = 'rgba(200,80,100,.85)'; x.beginPath(); x.ellipse(MX, MY + 4, 13, 8, 0, 0, 7); x.fill(); x.strokeStyle = IN; x.lineWidth = 3; x.beginPath(); x.moveTo(MX - 11, MY + 3); x.quadraticCurveTo(MX, MY - 3, MX + 11, MY + 3); x.stroke(); },
    o:x=>{ x.fillStyle = IN; x.beginPath(); x.ellipse(MX, MY + 4, 11, 14, 0, 0, 7); x.fill(); x.strokeStyle = LIP; x.lineWidth = 3.5; x.stroke(); x.fillStyle = '#ff7f99'; x.beginPath(); x.ellipse(MX, MY + 12, 6, 4, 0, 0, 7); x.fill(); },
    side:x=>{ x.strokeStyle = LIP; x.lineWidth = 4; x.beginPath(); x.moveTo(MX - 6, MY + 2); x.quadraticCurveTo(MX + 10, MY + 6, MX + 22, MY - 4); x.stroke(); },
    grit:x=>{ x.fillStyle = '#fff'; x.beginPath(); x.ellipse(MX, MY + 2, 22, 8, 0, 0, 7); x.fill(); x.strokeStyle = LIP; x.lineWidth = 3.5; x.stroke(); x.strokeStyle = 'rgba(120,60,70,.6)'; x.lineWidth = 2; x.beginPath(); x.moveTo(MX - 20, MY + 2); x.lineTo(MX + 20, MY + 2); x.stroke(); },
    flat:x=>{ x.strokeStyle = LIP; x.lineWidth = 4; x.beginPath(); x.moveTo(MX - 14, MY + 2); x.lineTo(MX + 14, MY + 2); x.stroke(); }};
  const tear = x=>{ const tx = MX + 108, ty = 250; let g = x.createLinearGradient(tx, ty - 20, tx, ty + 40); g.addColorStop(0, 'rgba(180,225,255,.2)'); g.addColorStop(1, 'rgba(180,225,255,.85)'); x.fillStyle = g;
    x.beginPath(); x.moveTo(tx, ty - 26); x.quadraticCurveTo(tx + 12, ty + 6, tx + 10, ty + 18); x.arc(tx, ty + 18, 10, 0, Math.PI); x.quadraticCurveTo(tx - 12, ty + 6, tx, ty - 26); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(tx - 3, ty + 14, 3, 0, 7); x.fill(); };
  const F = (...fs)=> ({w:512, h:384, f:x=>{ base(x); fs.forEach(f=> f(x)); }});
  const N = [0, 0, 0];
  const FACE_D = {
    neutral:F(blush(0.45), brows(N, N), mouth.neutral), happy:F(blush(0.55), brows([-2, -6, -2], [-2, -6, -2]), mouth.smile), joy:F(blush(0.7), brows([-8, -14, -6], [-8, -14, -6]), mouth.grin),
    coy:F(blush(0.85), brows([2, -2, 2], [2, -2, 2]), mouth.coy), sad:F(blush(0.5), brows([-14, 2, 10], [-14, 2, 10]), mouth.sad, tear), worried:F(blush(0.4), brows([-12, 0, 8], [-12, 0, 8]), mouth.sad),
    pain:F(blush(0.5), brows([10, 2, -4], [10, 2, -4]), mouth.grit), angry:F(blush(0.65), brows([16, 4, -8], [16, 4, -8]), mouth.pout), surprised:F(blush(0.5), brows([-16, -22, -12], [-16, -22, -12]), mouth.o),
    think:F(blush(0.45), brows([4, 2, 0], [-10, -16, -6]), mouth.side), dead:F(blush(0.25), brows([0, 4, 6], [0, 4, 6]), mouth.flat), sleepy:F(blush(0.5), brows([4, 4, 4], [4, 4, 4]), mouth.neutral)};
  const eyeL = layer('eyes', EG, EYE_D, 1), faceL = layer('head', FG, FACE_D, 0);
  // [lớp mắt, lớp nét mặt]
  const GE = {neutral:'open', happy:'open', joy:'arc', coy:'half', sad:'teary', worried:'droop', pain:'pain', angry:'narrow', surprised:'wide', think:'up', dead:'dead', sleepy:'closed'};
  ANI.show = n=>{ if(!GE[n]) n = 'neutral'; eyeL.set(GE[n]); faceL.set(n); };
  }
  /* ---------- CẢM XÚC: mắt, miệng, lông mày, giọt mồ hôi đổi theo tình huống ---------- */
  const face = (bone, parts)=>{ const m = new THREE.Mesh(merge(parts), mat); B[bone].add(m); meshes.push(m); m.visible = false; return m; };
  const Arc = (r, t, a)=> new THREE.TorusGeometry(r, t, 6, 14, a), MC = 0x7a2a2a, DKc = C.dark;
  const EYES = GIRL ? {} : {normal:meshes[meshes.length - 1],
    happy:face('eyes', [-1, 1].map(d=> ({g:Arc(0.062, 0.02, Math.PI), m:M4(d*0.15, -0.035, 0.015), c:DKc}))),
    closed:face('eyes', [-1, 1].map(d=> ({g:Bx(0.13, 0.024, 0.02), m:M4(d*0.15, -0.01, 0.02), c:DKc}))),
    pain:face('eyes', [-1, 1].flatMap(d=> [{g:Bx(0.11, 0.024, 0.02), m:M4(d*0.15, 0.022, 0.02, 1, 1, 1, 0, 0, -d*0.42), c:DKc}, {g:Bx(0.11, 0.024, 0.02), m:M4(d*0.15, -0.022, 0.02, 1, 1, 1, 0, 0, d*0.42), c:DKc}])),
    dead:face('eyes', [-1, 1].flatMap(d=> [{g:Bx(0.13, 0.024, 0.02), m:M4(d*0.15, 0, 0.02, 1, 1, 1, 0, 0, 0.78), c:DKc}, {g:Bx(0.13, 0.024, 0.02), m:M4(d*0.15, 0, 0.02, 1, 1, 1, 0, 0, -0.78), c:DKc}]))};
  if(!GIRL) EYES.normal.visible = true;
  const MOUTH = GIRL ? {} : {
    neutral:face('head', [{g:Bx(0.1, 0.025, 0.03), m:M4(0, 0.16, 0.44), c:MC}]),
    smile:face('head', [{g:Arc(0.065, 0.017, Math.PI), m:M4(0, 0.205, 0.425, 1, 1, 1, 0, 0, Math.PI), c:MC}]),
    grin:face('head', [{g:new THREE.CircleGeometry(0.09, 16, Math.PI, Math.PI), m:M4(0, 0.2, 0.442), c:0x8a2030}, {g:Bx(0.16, 0.022, 0.012), m:M4(0, 0.193, 0.446), c:0xffffff}, {g:Sp(0.032, 6, 4), m:M4(0, 0.14, 0.44, 1.4, 0.6, 0.3), c:0xff7a8a}]),
    frown:face('head', [{g:Arc(0.06, 0.017, Math.PI), m:M4(0, 0.125, 0.43), c:MC}]),
    o:face('head', [{g:new THREE.TorusGeometry(0.042, 0.017, 6, 14), m:M4(0, 0.155, 0.436), c:MC}, {g:new THREE.CircleGeometry(0.036, 12), m:M4(0, 0.155, 0.437), c:0x4a1018}]),
    grit:face('head', [{g:Bx(0.15, 0.04, 0.02), m:M4(0, 0.16, 0.438), c:0xffffff}, {g:Bx(0.16, 0.012, 0.026), m:M4(0, 0.16, 0.44), c:MC}])};
  const BY = GIRL ? 0.53 : 0.53; const brow = d=>{ const m = new THREE.Mesh(merge([{g:GIRL ? Ca(0.012, 0.09, 6) : Bx(0.14, 0.034, 0.03), m:GIRL ? M4(0, 0, 0, 1, 1, 1, 0, 0, Math.PI/2) : null, c:GIRL ? 0x5a2a20 : C.hair}]), mat); m.position.set(d*(GIRL ? 0.16 : 0.15), BY, GIRL ? 0.43 : 0.41); m.rotation.z = -d*0.15; B.head.add(m); meshes.push(m); return m; };
  const browL = brow(1), browR = brow(-1); if(GIRL) browL.visible = browR.visible = false;
  const sweat = face('head', [{g:Sp(0.05, 8, 6), m:M4(0, 0, 0, 1, 1.3, 0.8), c:0x8fd8ff}, {g:Co(0.05, 0.08, 8), m:M4(0, 0.07, 0), c:0x8fd8ff}]); sweat.position.set(0.36, 0.56, 0.22);
  // [mắt, miệng, nâng lông mày, nghiêng đầu trong lông mày (+ = cau có, − = buồn), mồ hôi, phóng to mắt]
  const EMO = {neutral:['normal', 'neutral', 0, 0], happy:['normal', 'smile', 0.02, -0.05], joy:['happy', 'grin', 0.05, -0.1], sad:['normal', 'frown', 0, -0.42, 1], worried:['normal', 'frown', 0.01, -0.3, 1],
    pain:['pain', 'grit', -0.01, 0.35], angry:['normal', 'grit', -0.02, 0.42], surprised:['normal', 'o', 0.065, -0.05, 0, 1.28], think:['normal', 'neutral', 0.02, -0.18], dead:['dead', 'o', 0, -0.2], sleepy:['closed', 'neutral', -0.01, -0.1], coy:['happy', 'smile', 0.02, -0.05]};
  let mood = 'neutral', emoteName = null, emoteT = 0, shownEmo = '';
  function showEmo(n){ if(n === shownEmo) return; shownEmo = n; const e = EMO[n] || EMO.neutral;
    if(GIRL){ ANI.show(n); sweat.visible = n === 'worried'; return; }
    Object.keys(EYES).forEach(k=> EYES[k].visible = k === e[0]); Object.keys(MOUTH).forEach(k=> MOUTH[k].visible = k === e[1]);
    EYES.normal.scale.setScalar(e[5] || 1); browL.position.y = browR.position.y = BY + e[2]; browL.rotation.z = -0.15 + e[3]; browR.rotation.z = 0.15 - e[3]; sweat.visible = !!e[4]; }
  showEmo('neutral');
  if(!GIRL){
  // mũ học giả: vành, dải vàng, chóp gập, huy hiệu π (bỏ mũ được để khoe kiểu tóc)
  if(HATON) skin('hat', [
    {g:Cy(0.66, 0.66, 0.06, 20), m:M4(0, 0, 0), c:C.hat}, {g:Cy(0.42, 0.46, 0.14, 18), m:M4(0, 0.09, 0), c:C.gold}, {g:Co(0.44, 0.5, 18), m:M4(0, 0.4, 0), c:C.hat},
    {g:Bx(0.035, 0.12, 0.03), m:M4(-0.05, 0.1, 0.45), c:C.hat}, {g:Bx(0.035, 0.12, 0.03), m:M4(0.05, 0.1, 0.45), c:C.hat}, {g:Bx(0.17, 0.03, 0.03), m:M4(0, 0.16, 0.45), c:C.hat}]);
  if(HATON) skin('hatTip', [{g:Co(0.22, 0.42, 12), m:M4(0, 0.16, 0), c:C.hat}, {g:Sp(0.07, 8, 6), m:M4(0, 0.38, 0), c:C.gold}]);
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
  function flowers(list, R){ const out = [], cols = [0xfff4e0, 0xffd6ec, 0xfff0a0];
    list.forEach(([fx, fy], i)=>{ const fz = Math.sqrt(Math.max(0, R*R - fx*fx)) + 0.006, ry = Math.atan2(fx, fz), c = cols[i % 3];
      for(let k = 0; k < 5; k++){ const a = k/5*Math.PI*2, dx = Math.cos(a)*0.026, dy = Math.sin(a)*0.026; out.push({g:Sp(0.017, 6, 4), m:M4(fx + dx*Math.cos(ry), fy + dy, fz - dx*Math.sin(ry), 1, 1, 0.5, 0, ry, 0), c}); }
      out.push({g:Sp(0.013, 6, 4), m:M4(fx, fy, fz + 0.006, 1, 1, 0.6, 0, ry, 0), c:0xf2b84e}); }); return out; }
  // váy hồng: thân áo, cổ thuỷ thủ trắng, nơ ngực, đai lưng, chân váy xoè có diềm ren
  skin('chest', [
    {g:Cy(0.3, 0.33, 0.46, 16), m:M4(0, 0, 0), c:C.coat}, {g:Sp(0.3, 16, 8), m:M4(0, 0.2, 0, 1, 0.45, 0.9), c:C.coat},
    {g:Cy(0.33, 0.38, 0.07, 18), m:M4(0, 0.22, -0.01), c:C.white}, {g:Bx(0.5, 0.2, 0.04), m:M4(0, 0.13, -0.28, 1, 1, 1, 0.2, 0, 0), c:C.white},
    {g:Sp(0.075, 8, 6), m:M4(0.085, 0.1, 0.31, 1.3, 0.9, 0.5, 0, 0, -0.35), c:C.ribbon}, {g:Sp(0.075, 8, 6), m:M4(-0.085, 0.1, 0.31, 1.3, 0.9, 0.5, 0, 0, 0.35), c:C.ribbon}, {g:Sp(0.04, 6, 4), m:M4(0, 0.1, 0.34), c:C.gold},
    {g:Sp(0.03, 6, 4), m:M4(0, -0.06, 0.32), c:C.white}, {g:Sp(0.03, 6, 4), m:M4(0, -0.16, 0.33), c:C.white}]);
  skin('chest', [
    // cổ áo Peter Pan bo tròn
    ...[-1, 1].map(d=> ({g:Sp(0.13, 16, 10), m:M4(d*0.12, 0.2, 0.24, 1.25, 0.5, 0.55, 0.35, 0, -d*0.35), c:C.white})),
    // hoa thêu nhỏ trên thân áo
    ...flowers([[-0.2, 0.0], [0.19, 0.04], [-0.12, -0.15], [0.14, -0.13], [-0.24, -0.18], [0.25, -0.16]], 0.315)], mat, 0);
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
    dispose(){ meshes.forEach(m=> m.geometry.dispose()); api_texs.forEach(t=> t.dispose()); mixer.stopAllAction(); }
  };
  api.update(0);
  return api;
}
