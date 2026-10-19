// Hydro (version locale) : hors ligne. Réseau d'abord pour toujours recevoir la dernière version quand on est connecté,
// cache ensuite quand il n'y a pas de réseau ou qu'il ne répond pas en 3 s. Tout est sur le même site (polices et images incluses dans la page).
const CACHE = "hydro-v2"
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"]

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()))
})

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

// A slow network (one bar, a basement) never keeps the app waiting: after 3 s the cached copy is shown and the network
// answer, when it comes, updates the cache for next time (lot 10d).
const NETWORK_TIMEOUT_MS = 3000

function fromCache(req) {
  return caches.match(req).then((hit) => hit || (req.mode === "navigate" ? caches.match("./index.html") : undefined))
}

self.addEventListener("fetch", (e) => {
  const req = e.request
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return
  // version.json says whether a newer build is online: always from the network, never cached.
  if (new URL(req.url).pathname.endsWith("/version.json")) return
  const net = fetch(req).then((res) => {
    if (res.ok) {
      const copy = res.clone()
      return caches
        .open(CACHE)
        .then((c) => c.put(req, copy))
        .then(() => res, () => res)
    }
    return res
  })
  e.waitUntil(net.catch(() => undefined))
  e.respondWith(
    new Promise((resolve) => {
      let done = false
      const finish = (res) => {
        if (done || !res) return
        done = true
        resolve(res)
      }
      net.then(finish, () => fromCache(req).then((hit) => finish(hit || Response.error())))
      setTimeout(() => fromCache(req).then(finish), NETWORK_TIMEOUT_MS)
    }),
  )
})
