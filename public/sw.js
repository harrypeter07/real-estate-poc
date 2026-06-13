// filepath: public/sw.js
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Passive fetch listener to satisfy Chrome PWA install criteria
  // without caching API calls and causing stale data in CRM.
  event.respondWith(fetch(event.request));
});
