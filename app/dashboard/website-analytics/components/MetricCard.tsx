export default function MetricCard({
  label,
  value,
  subtitle,
  color = "text-gray-900 dark:text-white",
}: {
  label: string
  value: string | number
  subtitle?: string
  color?: string
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
      <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</div>
      <div className={`mt-1.5 text-2xl font-bold ${color}`}>{value}</div>
      {subtitle && <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">{subtitle}</div>}
    </div>
  )
}
