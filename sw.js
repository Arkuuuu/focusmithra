// FocusMithra Service Worker
const CACHE = 'focusmithra-v3';
const CORE = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(CORE.map(u => c.add(u).catch(()=>{})))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const net = fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});

// Push notification support
self.addEventListener('push', e => {
  if (!e.data) return;
  const d = e.data.json().catch(() => ({ title:'FocusMithra', body: e.data.text() }));
  e.waitUntil(d.then(data => self.registration.showNotification(data.title||'FocusMithra', {
    body: data.body||'', icon: '/icon-192.png', badge: '/icon-96.png',
    vibrate: [300, 100, 300], tag: 'fm-notif', renotify: true
  })));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({type:'window'}).then(list => list.length ? list[0].focus() : clients.openWindow('/')));
});
