// MBP Chấm bài — lưu sẵn ứng dụng để mở được khi không có mạng. Đổi số phiên bản khi cập nhật tệp.
const CACHE = 'mbp-scan-v3';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e=>{ e.waitUntil(caches.open(CACHE).then(c=> c.addAll(FILES)).then(()=> self.skipWaiting())); });
self.addEventListener('activate', e=>{ e.waitUntil(caches.keys().then(ks=> Promise.all(ks.filter(k=> k!==CACHE).map(k=> caches.delete(k)))).then(()=> self.clients.claim())); });
self.addEventListener('fetch', e=>{
  if(e.request.method !== 'GET') return;
  // ưu tiên bản mới trên mạng, mất mạng thì dùng bản đã lưu
  e.respondWith(fetch(e.request).then(r=>{ const copy = r.clone(); caches.open(CACHE).then(c=> c.put(e.request, copy)).catch(()=>{}); return r; }).catch(()=> caches.match(e.request, {ignoreSearch:true}).then(r=> r || caches.match('index.html'))));
});
