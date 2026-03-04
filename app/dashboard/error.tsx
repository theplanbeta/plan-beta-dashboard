"use client"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const isChunkError = error.message?.includes("Loading chunk") ||
    error.message?.includes("ChunkLoadError") ||
    error.message?.includes("Failed to fetch dynamically imported module")

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          {isChunkError ? "Page Update Available" : "Something went wrong"}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          {isChunkError
            ? "A new version was deployed. Please refresh to load the latest version."
            : "An error occurred while loading the dashboard. This usually resolves with a refresh."}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark transition-colors"
          >
            Refresh Page
          </button>
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Try Again
          </button>
        </div>
        {!isChunkError && (
          <p className="text-xs text-gray-400 mt-4">
            If this keeps happening, try clearing your browser cache or using incognito mode.
          </p>
        )}
      </div>
    </div>
  )
}
