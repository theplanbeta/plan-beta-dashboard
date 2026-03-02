"use client"

type DataPoint = {
  date: string
  value: number
}

type Dataset = {
  label: string
  data: DataPoint[]
  color: string
}

type LineChartProps = {
  data: DataPoint[]
  color?: string
  height?: number
  valuePrefix?: string
  valueSuffix?: string
  datasets?: Dataset[]
}

export default function LineChart({
  data,
  color = "#3b82f6",
  height = 200,
  valuePrefix = "",
  valueSuffix = "",
  datasets,
}: LineChartProps) {
  // Determine if we're in multi-series mode
  const isMultiSeries = datasets && datasets.length > 0

  // In multi-series mode, combine all data points to compute global min/max
  // In single-series mode, use the existing data prop
  const allDataPoints = isMultiSeries
    ? datasets.flatMap((ds) => ds.data)
    : data

  if (!allDataPoints || allDataPoints.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400">
        No data available
      </div>
    )
  }

  const maxValue = Math.max(...allDataPoints.map((d) => d.value))
  const minValue = Math.min(...allDataPoints.map((d) => d.value))
  const range = maxValue - minValue || 1

  // For x-axis labels, use the longest dataset in multi-series mode, or data in single-series
  const xAxisData = isMultiSeries
    ? datasets.reduce((longest, ds) => ds.data.length > longest.length ? ds.data : longest, [] as DataPoint[])
    : data

  // Helper to generate SVG path for a set of data points
  const generatePath = (points: DataPoint[]) => {
    const coords = points.map((point, index) => {
      const x = points.length > 1 ? (index / (points.length - 1)) * 100 : 50
      const y = 100 - ((point.value - minValue) / range) * 100
      return `${x},${y}`
    })
    return `M ${coords.join(" L ")}`
  }

  if (isMultiSeries) {
    return (
      <div className="space-y-4">
        <div className="relative" style={{ height: `${height}px` }}>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
          >
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map((y) => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2="100"
                y2={y}
                className="stroke-gray-200 dark:stroke-gray-700"
                strokeWidth="0.5"
              />
            ))}

            {/* Render each dataset */}
            {datasets.map((ds, dsIndex) => {
              const pathData = generatePath(ds.data)
              return (
                <g key={dsIndex}>
                  {/* Area fill */}
                  <path
                    d={`${pathData} L 100,100 L 0,100 Z`}
                    fill={ds.color}
                    fillOpacity="0.1"
                  />

                  {/* Line */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke={ds.color}
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />

                  {/* Data points */}
                  {ds.data.map((point, index) => {
                    const x = ds.data.length > 1 ? (index / (ds.data.length - 1)) * 100 : 50
                    const y = 100 - ((point.value - minValue) / range) * 100
                    return (
                      <circle
                        key={index}
                        cx={x}
                        cy={y}
                        r="1.5"
                        fill={ds.color}
                        vectorEffect="non-scaling-stroke"
                      />
                    )
                  })}
                </g>
              )
            })}
          </svg>
        </div>

        {/* X-axis labels */}
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{new Date(xAxisData[0].date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          <span>{new Date(xAxisData[Math.floor(xAxisData.length / 2)].date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          <span>{new Date(xAxisData[xAxisData.length - 1].date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
        </div>

        {/* Value range */}
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>
            {valuePrefix}{minValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}{valueSuffix}
          </span>
          <span>
            {valuePrefix}{maxValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}{valueSuffix}
          </span>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 justify-center text-xs text-gray-600 dark:text-gray-400">
          {datasets.map((ds, dsIndex) => (
            <div key={dsIndex} className="flex items-center gap-1.5">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: ds.color }}
              />
              <span>{ds.label}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Single-series mode (existing behavior)
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
          {[0, 25, 50, 75, 100].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              className="stroke-gray-200 dark:stroke-gray-700"
              strokeWidth="0.5"
            />
          ))}

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
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{new Date(data[0].date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
        <span>{new Date(data[Math.floor(data.length / 2)].date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
        <span>{new Date(data[data.length - 1].date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
      </div>

      {/* Value range */}
      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
        <span>
          {valuePrefix}{minValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}{valueSuffix}
        </span>
        <span>
          {valuePrefix}{maxValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}{valueSuffix}
        </span>
      </div>
    </div>
  )
}
