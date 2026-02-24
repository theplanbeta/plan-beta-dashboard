"use client"

import { useState, useEffect } from "react"

export default function PushNotificationPrompt() {
  const [show, setShow] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidKey) return null

  useEffect(() => {
    // Don't show if no service worker support or already subscribed
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return
    if (Notification.permission === "granted" || Notification.permission === "denied") return
    if (sessionStorage.getItem("pb-push-dismissed")) return

    // Show after 30 seconds on page
    const timer = setTimeout(() => setShow(true), 30000)
    return () => clearTimeout(timer)
  }, [])

  const handleSubscribe = async () => {
    try {
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        setShow(false)
        return
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisuallyPrompted: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      } as PushSubscriptionOptionsInit)

      const json = subscription.toJSON()

      await fetch("/api/notifications/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: {
            p256dh: json.keys?.p256dh,
            auth: json.keys?.auth,
          },
          topics: ["new_batches"],
        }),
      })

      setShow(false)
    } catch (error) {
      console.error("Push subscription failed:", error)
      setShow(false)
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    setShow(false)
    sessionStorage.setItem("pb-push-dismissed", "1")
  }

  if (!show || dismissed) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 p-5 z-50 animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 text-sm">Stay Updated</h4>
          <p className="text-xs text-gray-600 mt-1">
            Get notified when new German batches open or seats fill up. No spam, only useful updates.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleSubscribe}
              className="px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary-dark transition-colors"
            >
              Allow Notifications
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-gray-500 text-xs font-medium hover:text-gray-700 transition-colors"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
