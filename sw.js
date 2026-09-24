/**
 * SaldoCerto - Service Worker para suporte PWA e Cache Offline
 */

const CACHE_NAME = 'saldocerto-cache-v1';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './dashboard.html',
  './receitas.html',
  './despesas.html',
  './contas.html',
  './cartoes.html',
  './metas.html',
  './investimentos.html',
  './patrimonio.html',
  './relatorios.html',
  './orcamentos.html',
  './simulador.html',
  './importar.html',
  './configuracoes.html',
  './css/style.css',
  './css/dashboard.css',
  './css/responsive.css',
  './js/app.js',
  './js/dashboard.js',
  './js/receitas.js',
  './js/despesas.js',
  './js/contas.js',
  './js/cartoes.js',
  './js/metas.js',
  './js/investimentos.js',
  './js/patrimonio.js',
  './js/relatorios.js',
  './js/orcamentos.js',
  './js/simulador.js',
  './js/importar.js',
  './js/configuracoes.js',
  './assets/logo.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('Cache local parcial:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        // Fallback offline se necessário
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('./dashboard.html');
        }
      });
    })
  );
});
