// Plan Beta Service Worker — Push Notifications + Basic Caching

const CACHE_NAME = "planbeta-v2"

// Install — skip waiting to activate immediately
self.addEventListener("install", () => {
  self.skipWaiting()
})

// Activate — clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      )
    )
  )
  self.clients.claim()
})

// Fetch — network first, cache fallback for site pages
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)

  // Skip non-GET and API/dashboard requests
  if (event.request.method !== "GET") return
  if (url.pathname.startsWith("/api/")) return
  if (url.pathname.startsWith("/dashboard")) return

  // Only cache marketing site pages
  if (!url.pathname.startsWith("/site")) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => caches.match(event.request))
  )
})

// Push notification received
self.addEventListener("push", (event) => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: "Plan Beta", body: event.data.text() }
  }

  const options = {
    body: data.body,
    icon: data.icon || "/icon-192x192.png",
    badge: "/icon-192x192.png",
    data: { url: data.url || "/site" },
    vibrate: [200, 100, 200],
  }

  event.waitUntil(self.registration.showNotification(data.title || "Plan Beta", options))
})

// Notification click — navigate to URL
self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const url = event.notification.data?.url || "/site"

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    })
  )
})
