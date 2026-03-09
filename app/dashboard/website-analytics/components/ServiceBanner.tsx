export function NotConfiguredBanner({ service, message }: { service: string; message?: string }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
      <div className="text-gray-400 dark:text-gray-500 text-4xl mb-3">⚙️</div>
      <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">{service} not configured</h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {message || `Add the required environment variables to enable ${service} data.`}
      </p>
    </div>
  )
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
      <div className="text-red-400 text-4xl mb-3">⚠️</div>
      <h3 className="text-lg font-medium text-red-700 dark:text-red-400">Failed to load data</h3>
      <p className="mt-1 text-sm text-red-500 dark:text-red-400">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 px-4 py-2 text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  )
}
