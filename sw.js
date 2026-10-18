/* Service worker — Lumber Tycoon 2, galerie des gifts
   - la page et les icônes sont gardées pour ouvrir le site hors ligne ;
   - les réponses du wiki, les images et les polices sont gardées au fil de l'eau. */
const V = 'lt2-v7';
const SHELL = V + '-shell', RUNTIME = V + '-runtime';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];
const API_HOST = 'lumber-tycoon-2.fandom.com';
const ASSET_HOSTS = ['static.wikia.nocookie.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('lt2-') && !k.startsWith(V + '-')).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const cacheable = r => r && (r.ok || r.type === 'opaque');
const store = (name, req, res) => { if (cacheable(res)) { const copy = res.clone(); caches.open(name).then(c => c.put(req, copy)); } return res; };

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Fichiers du site : réseau d'abord (les mises à jour arrivent), cache si hors ligne.
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req).then(res => store(SHELL, req, res))
        .catch(() => caches.match(req, { ignoreSearch: true }).then(m => m || caches.match('index.html')))
    );
    return;
  }

  // Descriptions et contenus du wiki : réseau d'abord, cache si hors ligne.
  if (url.hostname === API_HOST) {
    e.respondWith(
      fetch(req).then(res => store(RUNTIME, req, res))
        .catch(() => caches.match(req).then(m => m || Response.error()))
    );
    return;
  }

  // Images du wiki : réseau d'abord (une image ratée n'est jamais « collée » en cache), cache si hors ligne.
  if (url.hostname === 'static.wikia.nocookie.net') {
    e.respondWith(
      fetch(req).then(res => store(RUNTIME, req, res))
        .catch(() => caches.match(req).then(m => m || Response.error()))
    );
    return;
  }

  // Polices : cache d'abord, mise à jour en arrière-plan.
  if (ASSET_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.match(req).then(m => {
        const net = fetch(req).then(res => store(RUNTIME, req, res)).catch(() => m || Response.error());
        return m || net;
      })
    );
  }
});
