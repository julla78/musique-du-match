/* Service worker : garde l'application (jamais les sons, qui sont dans le stockage de l'appareil)
   pour qu'elle s'ouvre sans réseau. Ne fonctionne qu'en https ou sur localhost.
   Changer VERSION à chaque mise en ligne pour que les appareils prennent la nouvelle version. */
var VERSION = "mdm-app-1.0";
var COQUE = ["./", "index.html", "style.css", "app.js",
             "polices/BarlowCondensed-700.woff2", "polices/BarlowCondensed-800.woff2",
             "manifest.webmanifest", "icones/icone-180.png", "icones/icone-192.png", "icones/icone-512.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(VERSION).then(function (c) { return c.addAll(COQUE); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* La copie gardée répond tout de suite (ouverture immédiate au gymnase, même avec un réseau capricieux) ;
   en parallèle, on demande la version en ligne pour la prochaine ouverture. */
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.open(VERSION).then(function (c) {
      return c.match(e.request, { ignoreSearch: true }).then(function (garde) {
        var reseau = fetch(e.request).then(function (net) {
          if (net.ok) c.put(e.request, net.clone());
          return net;
        });
        if (garde) { reseau.catch(function () {}); return garde; }
        return reseau.catch(function () { return c.match("index.html"); });
      });
    })
  );
});
