const CACHE_NAME = 'carnet-du-verger-v3';
const LIBS_CACHE = 'carnet-du-verger-libs-v1';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
// Librairies externes mises en cache pour que l'appli marche sans réseau
const LIB_URLS = [
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    try{ const c = await caches.open(CACHE_NAME); await c.addAll(ASSETS); }catch(e){}
    const lc = await caches.open(LIBS_CACHE);
    await Promise.all(LIB_URLS.map(async (u) => {
      try{
        if(await lc.match(u)) return;
        const r = await fetch(u, { mode:'cors' });
        if(r.ok) await lc.put(u, r);
      }catch(e){}
    }));
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME && n !== LIBS_CACHE).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = req.url;

  // Librairies : d'abord le cache (elles ne changent jamais, version figée dans l'URL)
  if (LIB_URLS.indexOf(url) !== -1) {
    event.respondWith((async () => {
      const lc = await caches.open(LIBS_CACHE);
      const hit = await lc.match(url);
      if (hit) return hit;
      try{
        const r = await fetch(url, { mode:'cors' });
        if (r.ok) lc.put(url, r.clone()).catch(()=>{});
        return r;
      }catch(e){ return Response.error(); }
    })());
    return;
  }

  // Services externes (cartes, adresses, météo, identification) : jamais interceptés
  if (new URL(url).origin !== self.location.origin) return;

  // Fichiers de l'appli : réseau en priorité (dernière version), cache en secours hors-ligne.
  event.respondWith(
    fetch(req)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(()=>{});
        return response;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
  );
});
