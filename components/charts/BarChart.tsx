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

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-2" style={{ height: `${height}px` }}>
        {data.map((item, index) => {
          const heightPercentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0
          const barColor = item.color || "#3b82f6"

          return (
            <div key={index} className="flex-1 flex flex-col items-center group">
              <div className="relative w-full">
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                    {valuePrefix}{item.value.toLocaleString()}{valueSuffix}
                  </div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                </div>

                {/* Bar */}
                <div
                  className="w-full rounded-t-md transition-all duration-300 hover:opacity-80"
                  style={{
                    height: `${heightPercentage}%`,
                    backgroundColor: barColor,
                    minHeight: item.value > 0 ? "4px" : "0px",
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Labels */}
      <div className="flex justify-between gap-2">
        {data.map((item, index) => (
          <div key={index} className="flex-1 text-center">
            <div className="text-xs text-gray-600 truncate">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
