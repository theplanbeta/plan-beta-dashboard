"use client"

type DataPoint = {
  label: string
  value: number
  color?: string
}

type BarChartProps = {
  data: DataPoint[]
  height?: number
  valuePrefix?: string
  valueSuffix?: string
}

export default function BarChart({
  data,
  height = 300,
  valuePrefix = "",
  valueSuffix = "",
}: BarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400">
        No data available
      </div>
    )
  }

  const maxValue = Math.max(...data.map((d) => d.value))
  const minValue = Math.min(...data.map((d) => d.value), 0)
  const range = maxValue - minValue || 1
  const hasNegative = minValue < 0
  // Zero line position as percentage from top
  const zeroLinePercent = (maxValue / range) * 100

  return (
    <div className="space-y-4">
      <div className="relative flex items-stretch justify-between gap-2" style={{ height: `${height}px` }}>
        {/* Zero line for mixed positive/negative */}
        {hasNegative && (
          <div
            className="absolute left-0 right-0 border-t border-gray-400 dark:border-gray-500 pointer-events-none z-10"
            style={{ top: `${zeroLinePercent}%` }}
          />
        )}

        {data.map((item, index) => {
          const barColor = item.color || "#3b82f6"
          const isNegative = item.value < 0

          // Bar height as percentage of the total range
          const barHeightPercent = (Math.abs(item.value) / range) * 100

          return (
            <div key={index} className="flex-1 flex flex-col items-center group relative">
              <div className="relative w-full h-full">
                {/* Tooltip */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20"
                  style={{
                    bottom: isNegative ? undefined : `${100 - zeroLinePercent + barHeightPercent}%`,
                    top: isNegative ? `${zeroLinePercent + barHeightPercent}%` : undefined,
                  }}
                >
                  <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                    {valuePrefix}{item.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}{valueSuffix}
                  </div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                </div>

                {/* Bar */}
                {!isNegative ? (
                  <div
                    className="absolute left-0 right-0 rounded-t-md transition-all duration-300 hover:opacity-80"
                    style={{
                      bottom: `${100 - zeroLinePercent}%`,
                      height: `${barHeightPercent}%`,
                      backgroundColor: barColor,
                      minHeight: item.value > 0 ? "4px" : "0px",
                    }}
                  />
                ) : (
                  <div
                    className="absolute left-0 right-0 rounded-b-md transition-all duration-300 hover:opacity-80"
                    style={{
                      top: `${zeroLinePercent}%`,
                      height: `${barHeightPercent}%`,
                      backgroundColor: barColor,
                      minHeight: "4px",
                    }}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Labels */}
      <div className="flex justify-between gap-2">
        {data.map((item, index) => (
          <div key={index} className="flex-1 text-center">
            <div className="text-xs text-gray-600 dark:text-gray-400 truncate">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
