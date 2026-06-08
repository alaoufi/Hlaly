/* Service Worker — يجعل مراح يعمل بدون إنترنت بعد أول فتح.
   ملفات التطبيق تُخدَم من الكاش (محدّثة في الخلفية)، أما طلبات Supabase
   (المصادقة/البيانات) فتمرّ للشبكة دائماً ولا تُخزَّن. */
const CACHE = 'mrah-v14';
const ASSETS = [
  './',
  './index.html',
  './app.css',
  './app.js',
  './config.js',
  './manifest.webmanifest',
  './icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // لا تتدخّل في طلبات Supabase أو أي نطاق خارجي (المصادقة/البيانات) — اتركها للشبكة
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request).then((cached) =>
      cached ||
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./index.html'))
    )
  );
});
