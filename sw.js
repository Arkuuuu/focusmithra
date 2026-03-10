// FocusMithra Service Worker — v6
// Bump this version string whenever you deploy a new build
const CACHE_NAME = 'focusmithra-v6';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
  '/icon-72.png',
  '/icon-96.png',
  '/icon-128.png',
  '/icon-144.png',
  '/icon-152.png',
  '/icon-192.png',
  '/icon-384.png',
  '/icon-512.png'
];

// ── Install: cache core assets ─────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      // allSettled so one missing asset doesn't break the whole SW
      Promise.allSettled(CORE_ASSETS.map(url => cache.add(url).catch(() => {})))
    ).then(() => self.skipWaiting()) // activate immediately
  );
});

// ── Activate: delete old caches ────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim()) // take control of all open pages
  );
});

// ── Fetch: network-first for HTML, cache-first for static assets ───────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Always go network-first for the HTML page so updates are seen immediately
  const isHtml = url.pathname === '/' || url.pathname.endsWith('.html');
  // Firebase and external APIs always go network-only (no caching)
  const isExternal = !url.origin.startsWith(self.location.origin);

  if (isExternal) return; // let Firebase requests pass through unmodified

  if (isHtml) {
    // Network-first: try network, fall back to cache
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache-first for static assets (images, icons, fonts)
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return res;
        }).catch(() => cached); // offline fallback
      })
    );
  }
});

// ── Push notifications ─────────────────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;

  // Safely parse push payload — handle both JSON and plain text
  let title = 'FocusMithra';
  let body  = 'You have a new notification';
  let tag   = 'fm-notif';

  try {
    const data = event.data.json();
    title = data.title || title;
    body  = data.body  || body;
    tag   = data.tag   || tag;
  } catch {
    // Not JSON — treat as plain text
    body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:     '/icon-192.png',
      badge:    '/icon-96.png',
      tag,
      renotify: true,
      vibrate:  [300, 100, 300, 100, 300]
    })
  );
});

// ── Notification click: focus or open app ─────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // If app is already open, focus it
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      return clients.openWindow('/');
    })
  );
});
