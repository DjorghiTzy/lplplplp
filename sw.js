/* Service worker — supaya aplikasi tetap terbuka saat sinyal gudang jelek. */
const VERSI = 'gudang-retur-v2.0';
const INTI = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/style.css',
  './assets/js/data.js',
  './assets/js/photos.js',
  './assets/js/app.js',
  './assets/vendor/qrcode-generator.js',
  './assets/icon.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSI).then(c => c.addAll(INTI)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(k => Promise.all(k.filter(n => n !== VERSI).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;

  /* Halaman: utamakan jaringan supaya pembaruan langsung terlihat. */
  if(req.mode === 'navigate'){
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(VERSI).then(c => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  /* Aset: pakai cache dulu, perbarui diam-diam di belakang. */
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if(res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')){
          const copy = res.clone();
          caches.open(VERSI).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
