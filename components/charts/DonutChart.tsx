"use client"

type DataPoint = {
  label: string
  value: number
  color: string
}

type DonutChartProps = {
  data: DataPoint[]
  size?: number
}

export default function DonutChart({ data, size = 200 }: DonutChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400">
        No data available
      </div>
    )
  }

  const total = data.reduce((sum, item) => sum + item.value, 0)
  const radius = 45
  const strokeWidth = 10
  const innerRadius = radius - strokeWidth

  let cumulativePercent = 0

  const arcs = data.map((item) => {
    const itemPercent = (item.value / total) * 100
    const [startX, startY] = getCoordinatesForPercent(cumulativePercent)

    cumulativePercent += itemPercent

    const [endX, endY] = getCoordinatesForPercent(cumulativePercent)

    const largeArcFlag = itemPercent > 50 ? 1 : 0

    const pathData = [
      `M ${startX} ${startY}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
      `L ${endX * (innerRadius / radius)} ${endY * (innerRadius / radius)}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${startX * (innerRadius / radius)} ${startY * (innerRadius / radius)}`,
      'Z',
    ].join(' ')

    return {
      ...item,
      pathData,
      percent: itemPercent,
    }
  })

  function getCoordinatesForPercent(percent: number) {
    const angle = (percent / 100) * 2 * Math.PI - Math.PI / 2
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    return [x, y]
  }

  return (
    <div className="flex items-center gap-8">
      {/* Chart */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          viewBox="-50 -50 100 100"
          className="transform -rotate-90"
        >
          {arcs.map((arc, index) => (
            <path
              key={index}
              d={arc.pathData}
              fill={arc.color}
              className="transition-opacity hover:opacity-80"
            />
          ))}
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{total}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            <div className="text-sm">
              <span className="text-gray-700">{item.label}</span>
              <span className="text-gray-500 ml-2">
                {item.value} ({((item.value / total) * 100).toFixed(0)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
