/**
 * SaldoCerto - Service Worker PWA
 * Gerenciamento de cache offline e suporte a instalação como aplicativo (PWA).
 */

const CACHE_NAME = 'saldocerto-v2.0';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './login.html',
  './cadastro.html',
  './recuperar-senha.html',
  './onboarding.html',
  './dashboard.html',
  './receitas.html',
  './despesas.html',
  './cartoes.html',
  './contas.html',
  './metas.html',
  './investimentos.html',
  './patrimonio.html',
  './orcamentos.html',
  './simulador.html',
  './importar.html',
  './relatorios.html',
  './configuracoes.html',
  './css/style.css',
  './css/dashboard.css',
  './css/auth.css',
  './css/responsive.css',
  './js/supabase.js',
  './js/auth.js',
  './js/profile.js',
  './js/app.js',
  './js/dashboard.js',
  './js/transactions.js',
  './js/receitas.js',
  './js/despesas.js',
  './js/cartoes.js',
  './js/contas.js',
  './js/metas.js',
  './js/investimentos.js',
  './js/patrimonio.js',
  './js/orcamentos.js',
  './js/notificacoes.js',
  './js/simulador.js',
  './js/importar.js',
  './js/relatorios.js',
  './js/configuracoes.js',
  './assets/logo.svg',
  './assets/icon.svg',
  './manifest.json'
];

// Instalação do Service Worker e pré-cache de ativos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[PWA] Cache parcial de recursos durante instalação:', err);
      });
    })
  );
  self.skipWaiting();
});

// Ativação e limpeza de caches antigos
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

// Estratégia de requisições:
// Requisições para Supabase ou CDN externos não são forçadas em cache estático
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Deixar chamadas da API do Supabase irem direto para a rede
  if (url.origin.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Busca atualização em segundo plano (stale-while-revalidate)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
        }).catch(() => {
          // Offline, ignora erro de revalidação
        });
        return cachedResponse;
      }

      // Se não está no cache, busca na rede
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Fallback para páginas HTML quando estiver totalmente offline
        if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
          return caches.match('./dashboard.html') || caches.match('./index.html');
        }
      });
    })
  );
});
