/* =========================================================================
   sw.js — Service Worker (GitHub Pages compatible)
   Pirates Tools PWA
   ========================================================================= */

const CACHE_NAME = "pirates-tools-v3"; // ↑ incrémente quand tu changes des assets

// IMPORTANT : sur GitHub Pages, le site n'est pas à / mais à /<repo>/
// On récupère automatiquement le "scope" du SW pour construire des URLs absolues.
const SCOPE = self.registration.scope;         // ex: https://nova971z.github.io/Pirates-tools-app1/
const U = (path) => new URL(path, SCOPE).toString();

const ASSETS_TO_CACHE = [
  U("."),                    // la page racine (index) dans le scope
  U("index.html"),
  U("styles.css"),
  U("app.js"),
  U("manifest.webmanifest"),
  U("products.json"),

  // Images & icônes utilisées au chargement
  U("images/pirates-tools-logo.png"),
  U("icons/icon-180.png"),
  // 👉 ajoute ici d'autres images si tu veux les précharger :
  // U("images/ton-image-1.jpg"),
  // U("images/ton-image-2.png"),
];

/* --------------------------------------------------------------------- */
/* Installation — pré-cache des ressources clés                          */
/* --------------------------------------------------------------------- */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting(); // active la nouvelle version sans attendre
});

/* --------------------------------------------------------------------- */
/* Activation — suppression des anciens caches                           */
/* --------------------------------------------------------------------- */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* --------------------------------------------------------------------- */
/* Fetch — stratégie cache d'abord, puis réseau, avec mise en cache      */
/* --------------------------------------------------------------------- */
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Laisse passer les requêtes de navigation mais on gère un fallback offline
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((res) => {
          // On met en cache la réponse si elle est OK (statut 200, même domaine)
          const copy = res.clone();
          // N’essaye pas de mettre en cache les requêtes opaques cross-origin problématiques
          if (req.method === "GET" && copy && copy.status === 200 && copy.type !== "opaque") {
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => {
          // Fallback offline pour la navigation
          if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
            return caches.match(U("index.html"));
          }
          // Optionnel : retourne une image/statique par défaut si besoin
        });
    })
  );
});
