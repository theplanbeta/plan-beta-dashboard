"use client"

import { useState } from "react"

type PeriodPreset = {
  label: string
  days: number
}

const PRESETS: PeriodPreset[] = [
  { label: "7d", days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "180d", days: 180 },
  { label: "365d", days: 365 },
  { label: "All", days: 0 },
]

type PeriodSelectorProps = {
  value: number
  onChange: (days: number, startDate?: string, endDate?: string) => void
  className?: string
}

export default function PeriodSelector({ value, onChange, className = "" }: PeriodSelectorProps) {
  const [showCustom, setShowCustom] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const handlePresetClick = (days: number) => {
    setShowCustom(false)
    onChange(days)
  }

  const handleCustomApply = () => {
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays > 0) {
        onChange(diffDays, startDate, endDate)
      }
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {PRESETS.map((preset) => (
        <button
          key={preset.label}
          onClick={() => handlePresetClick(preset.days)}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            value === preset.days && !showCustom
              ? "bg-primary text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-400 dark:hover:bg-white/20"
          }`}
        >
          {preset.label}
        </button>
      ))}
      <button
        onClick={() => setShowCustom(!showCustom)}
        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
          showCustom
            ? "bg-primary text-white"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-400 dark:hover:bg-white/20"
        }`}
      >
        Custom
      </button>

      {showCustom && (
        <div className="flex items-center gap-2 ml-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2 py-1.5 text-sm border rounded-lg bg-white dark:bg-white/10 dark:border-white/20 dark:text-gray-300"
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2 py-1.5 text-sm border rounded-lg bg-white dark:bg-white/10 dark:border-white/20 dark:text-gray-300"
          />
          <button
            onClick={handleCustomApply}
            disabled={!startDate || !endDate}
            className="px-3 py-1.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  )
}
