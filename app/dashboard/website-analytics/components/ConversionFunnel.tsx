"use client"

type FunnelData = {
  totalVisitors: number
  returningVisitors: number
  convertedVisitors: number
  visitToReturnRate: number
  returnToConvertRate: number
  visitToConvertRate: number
}

export default function ConversionFunnel({ data }: { data: FunnelData }) {
  if (data.totalVisitors === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">No visitor data yet — collecting...</p>
      </div>
    )
  }

  const bars = [
    {
      label: "Total Visitors",
      value: data.totalVisitors,
      percent: 100,
      color: "bg-blue-500",
    },
    {
      label: "Returning",
      value: data.returningVisitors,
      percent: data.visitToReturnRate,
      color: "bg-amber-500",
    },
    {
      label: "Converted",
      value: data.convertedVisitors,
      percent: data.visitToConvertRate,
      color: "bg-green-500",
    },
  ]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Conversion Funnel</h3>
      <div className="space-y-4">
        {bars.map((bar, i) => (
          <div key={bar.label}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-gray-700 dark:text-gray-300">{bar.label}</span>
              <span className="text-gray-500 dark:text-gray-400">
                {bar.value.toLocaleString()} ({bar.percent}%)
              </span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-6">
              <div
                className={`${bar.color} h-6 rounded-full transition-all duration-500`}
                style={{ width: `${Math.max(bar.percent, 2)}%` }}
              />
            </div>
            {i < bars.length - 1 && (
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">
                {i === 0 ? `${data.visitToReturnRate}% return` : `${data.returnToConvertRate}% convert`}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
