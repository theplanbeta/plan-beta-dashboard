"use client"

type DataPoint = {
  date: string
  value: number
}

type LineChartProps = {
  data: DataPoint[]
  color?: string
  height?: number
  valuePrefix?: string
  valueSuffix?: string
}

export default function LineChart({
  data,
  color = "#3b82f6",
  height = 200,
  valuePrefix = "",
  valueSuffix = "",
}: LineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400">
        No data available
      </div>
    )
  }

  const maxValue = Math.max(...data.map((d) => d.value))
  const minValue = Math.min(...data.map((d) => d.value))
  const range = maxValue - minValue || 1

  // Generate SVG path
  const points = data.map((point, index) => {
    const x = (index / (data.length - 1)) * 100
    const y = 100 - ((point.value - minValue) / range) * 100
    return `${x},${y}`
  })

  const pathData = `M ${points.join(" L ")}`

  return (
    <div className="space-y-4">
      <div className="relative" style={{ height: `${height}px` }}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
        >
          {/* Grid lines */}
          <line
            x1="0"
            y1="0"
            x2="100"
            y2="0"
            stroke="#e5e7eb"
            strokeWidth="0.5"
          />
          <line
            x1="0"
            y1="25"
            x2="100"
            y2="25"
            stroke="#e5e7eb"
            strokeWidth="0.5"
          />
          <line
            x1="0"
            y1="50"
            x2="100"
            y2="50"
            stroke="#e5e7eb"
            strokeWidth="0.5"
          />
          <line
            x1="0"
            y1="75"
            x2="100"
            y2="75"
            stroke="#e5e7eb"
            strokeWidth="0.5"
          />
          <line
            x1="0"
            y1="100"
            x2="100"
            y2="100"
            stroke="#e5e7eb"
            strokeWidth="0.5"
          />

          {/* Area fill */}
          <path
            d={`${pathData} L 100,100 L 0,100 Z`}
            fill={color}
            fillOpacity="0.1"
          />

          {/* Line */}
          <path
            d={pathData}
            fill="none"
            stroke={color}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />

          {/* Data points */}
          {data.map((point, index) => {
            const x = (index / (data.length - 1)) * 100
            const y = 100 - ((point.value - minValue) / range) * 100
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="1.5"
                fill={color}
                vectorEffect="non-scaling-stroke"
              />
            )
          })}
        </svg>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between text-xs text-gray-500">
        <span>{new Date(data[0].date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
        <span>{new Date(data[Math.floor(data.length / 2)].date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
        <span>{new Date(data[data.length - 1].date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
      </div>

      {/* Value range */}
      <div className="flex justify-between text-xs text-gray-600">
        <span>
          {valuePrefix}{minValue.toLocaleString()}{valueSuffix}
        </span>
        <span>
          {valuePrefix}{maxValue.toLocaleString()}{valueSuffix}
        </span>
      </div>
    </div>
  )
}
