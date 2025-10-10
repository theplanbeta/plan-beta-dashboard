// Self-cleaning service worker to replace broken cached version
// This will clear all caches and unregister itself
// User needs to manually refresh the page after cleanup

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
      console.log('[SW] ✅ Cleanup complete! Please refresh the page manually.')
      console.log('[SW] Press Cmd+R (Mac) or Ctrl+R (Windows/Linux) to reload')
    }).catch((error) => {
      console.error('[SW] Error during cleanup:', error)
    })
  )
})

// Don't intercept any fetch requests - let them pass through normally
self.addEventListener('fetch', (event) => {
  // Just let the request go through to the network normally
  return
})
