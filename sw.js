const CACHE_NAME = 'carnet-du-verger-v2';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Ne jamais intercepter les appels vers les services externes (carte, recherche d'adresse, librairies)
  if (event.request.url.includes('arcgisonline.com') || event.request.url.includes('nominatim.openstreetmap.org') || event.request.url.includes('tile.openstreetmap.org') || event.request.url.includes('cdnjs.cloudflare.com')) {
    return;
  }

  // Réseau en priorité : la dernière version déployée s'affiche toujours si internet est disponible.
  // Le cache ne sert que de secours si l'appareil est hors-ligne.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(()=>{});
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
