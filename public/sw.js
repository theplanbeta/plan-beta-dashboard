// Self-cleaning service worker to replace broken cached version
// This will clear all caches and unregister itself

self.addEventListener('install', (event) => {
  console.log('[SW] Installing cleanup service worker')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating cleanup service worker')

  event.waitUntil(
    // Delete all caches
    caches.keys().then((cacheNames) => {
      console.log('[SW] Deleting caches:', cacheNames)
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      )
    }).then(() => {
      console.log('[SW] All caches deleted, unregistering service worker')
      return self.registration.unregister()
    }).then(() => {
      console.log('[SW] Service worker unregistered, reloading clients')
      return self.clients.matchAll()
    }).then((clients) => {
      clients.forEach(client => {
        console.log('[SW] Reloading client:', client.url)
        client.navigate(client.url)
      })
    }).catch((error) => {
      console.error('[SW] Error during cleanup:', error)
    })
  )
})

// Serve no content for any fetch requests while cleanup is happening
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response('Service worker is cleaning up, please refresh the page.', {
        headers: { 'Content-Type': 'text/plain' }
      })
    })
  )
})
