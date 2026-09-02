/* ============================================================================
   Service worker - what makes the site work at a field with no signal.

   Caching strategy, by what the file is:

     HTML and data/team-data.js   network first, cache as fallback.
                                  These change when you publish, so a fresh
                                  copy is always preferred; the cache is the
                                  safety net when there is no connection.

     CSS, JS, icons               stale-while-revalidate. Serve the cached
                                  copy instantly, fetch a fresh one in the
                                  background, and the next load uses it.

   Bump CACHE_VERSION whenever PRECACHE changes, otherwise old clients keep
   serving the previous shell.
   ========================================================================== */
'use strict';

var CACHE_VERSION = 'ff-v42';

var PRECACHE = [
  './',
  './index.html',
  './roster.html',
  './plays.html',
  './drills.html',
  './drill-editor.html',
  './play-editor.html',
  './play-viewer.html',
  './schedule.html',
  './settings.html',
  './css/base.css',
  './js/store.js',
  './js/field.js',
  './js/ui.js',
  './js/routes.js',
  './js/mirror.js',
  './js/ball.js',
  './js/playback.js',
  './js/announcer.js',
  './js/mp4.js',
  './js/recorder.js',
  './js/viewer.js',
  './js/drills.js',
  './js/drill-editor.js',
  './js/roster.js',
  './js/play-editor.js',
  './js/schedule.js',
  './js/settings.js',
  './data/team-data.js',
  './manifest.webmanifest',
  './rules/osaa-flag-rules.pdf',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/spartan-white.png',
  './icons/players/warrior-01.jpg',
  './icons/players/warrior-02.jpg',
  './icons/players/warrior-03.jpg',
  './icons/players/warrior-04.jpg',
  './icons/players/warrior-05.jpg',
  './icons/players/warrior-06.jpg',
  './icons/players/warrior-07.jpg',
  './icons/players/warrior-08.jpg',
  './icons/players/warrior-09.jpg',
  './icons/players/warrior-10.jpg',
  './icons/players/warrior-11.jpg',
  './fonts/cinzel-700-latin.woff2'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) {
      /* Added one at a time: addAll rejects the whole batch if any single
         file 404s, which would leave the site with no offline copy at all. */
      return Promise.all(PRECACHE.map(function (url) {
        return cache.add(new Request(url, { cache: 'reload' }))['catch'](function () {
          console.warn('[sw] could not precache', url);
        });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE_VERSION ? null : caches['delete'](k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function networkFirst(request) {
  return fetch(request).then(function (response) {
    if (response && response.ok) {
      var copy = response.clone();
      caches.open(CACHE_VERSION).then(function (c) { c.put(request, copy); });
    }
    return response;
  })['catch'](function () {
    return caches.match(request).then(function (hit) {
      return hit || caches.match('./index.html');
    });
  });
}

function staleWhileRevalidate(request) {
  return caches.match(request).then(function (hit) {
    var network = fetch(request).then(function (response) {
      if (response && response.ok) {
        var copy = response.clone();
        caches.open(CACHE_VERSION).then(function (c) { c.put(request, copy); });
      }
      return response;
    })['catch'](function () { return hit; });
    return hit || network;
  });
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;

  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return;   // never touch other hosts

  var isData = /\/data\/team-data\.js$/.test(url.pathname);
  var isPage = request.mode === 'navigate'
    || /\.html$/.test(url.pathname)
    || url.pathname.endsWith('/');

  event.respondWith((isData || isPage) ? networkFirst(request)
                                       : staleWhileRevalidate(request));
});
