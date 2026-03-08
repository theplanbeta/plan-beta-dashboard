"use client"

import { useEffect, useState } from "react"

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  useEffect(() => {
    if (isOnline) {
      window.location.reload()
    }
  }, [isOnline])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            You&apos;re Offline
          </h1>

          <p className="text-gray-600 dark:text-gray-300 mb-6">
            It looks like you&apos;ve lost your internet connection. Some pages you&apos;ve visited before may still be available.
          </p>

          {isOnline && (
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-4 mb-4">
              <p className="text-green-800 dark:text-green-300 font-medium">
                Back online! Reloading...
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>

        <div className="mt-8 text-sm text-gray-500 dark:text-gray-500">
          <p className="mb-2">Cached pages you can visit:</p>
          <div className="space-y-1">
            <a href="/" className="block text-blue-600 dark:text-blue-400 hover:underline">Home</a>
            <a href="/courses" className="block text-blue-600 dark:text-blue-400 hover:underline">Courses</a>
            <a href="/about" className="block text-blue-600 dark:text-blue-400 hover:underline">About</a>
            <a href="/contact" className="block text-blue-600 dark:text-blue-400 hover:underline">Contact</a>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-400">
            Your data will sync automatically when you&apos;re back online.
          </p>
        </div>
      </div>
    </div>
  )
}
