// Plan Beta Service Worker — Push Notifications + Caching + Offline + Background Sync

const CACHE_NAME = "planbeta-v4"

// Pages to precache on install
const PRECACHE_URLS = [
  "/site",
  "/site/courses",
  "/site/contact",
  "/site/about",
  "/offline",
]

// Install — precache critical pages, skip waiting
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

// Activate — clean old caches, claim clients
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

// Fetch — strategy based on request type
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)

  // Skip non-GET requests
  if (event.request.method !== "GET") return

  // Skip API requests
  if (url.pathname.startsWith("/api/")) return

  // Skip dashboard requests (auth-protected, shouldn't cache)
  if (url.pathname.startsWith("/dashboard")) return

  // Static assets (JS, CSS, fonts with hashed names) — cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image") ||
    url.pathname.match(/\.(js|css|woff2?|ttf|otf|ico|svg)$/)
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // Images from Vercel Blob — cache-first
  if (url.hostname.includes("blob.vercel-storage.com")) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // Marketing site pages — network-first with cache fallback and offline fallback
  if (url.pathname.startsWith("/site") || url.pathname === "/offline") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
        .catch(() =>
          caches.match(event.request).then((cached) => {
            if (cached) return cached
            // No cache — show offline fallback
            return caches.match("/offline")
          })
        )
    )
    return
  }
})

// Background Sync — retry failed SpotAJob uploads
self.addEventListener("sync", (event) => {
  if (event.tag === "spotajob-upload") {
    event.waitUntil(retrySyncedUploads())
  }
})

async function retrySyncedUploads() {
  try {
    const db = await openSyncDB()
    const tx = db.transaction("uploads", "readonly")
    const store = tx.objectStore("uploads")
    const uploads = await getAllFromStore(store)

    for (const upload of uploads) {
      try {
        const response = await fetch("/api/jobs/community", {
          method: "POST",
          body: upload.formData,
        })
        if (response.ok) {
          const deleteTx = db.transaction("uploads", "readwrite")
          deleteTx.objectStore("uploads").delete(upload.id)
        }
      } catch {
        // Still offline, will retry next sync
      }
    }
  } catch {
    // IndexedDB not available or empty
  }
}

function openSyncDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("spotajob-sync", 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore("uploads", { keyPath: "id", autoIncrement: true })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

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
    icon: data.icon || "/icon-192.png",
    badge: "/icon-192.png",
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
