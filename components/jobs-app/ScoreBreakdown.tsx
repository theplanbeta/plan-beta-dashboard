// components/jobs-app/ScoreBreakdown.tsx
"use client"

import type { DeepScoreResult } from "@/lib/jobs-ai"
import { getMatchLabel } from "@/lib/heuristic-scorer"

interface ScoreBreakdownProps {
  deepScore: DeepScoreResult
}

export function ScoreBreakdown({ deepScore }: ScoreBreakdownProps) {
  const overall = getMatchLabel(deepScore.overallScore)

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
      {/* Overall score */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">AI Match Analysis</h3>
        <span className={`rounded-full px-3 py-1 text-sm font-bold ${overall.color} ${overall.bgColor}`}>
          {deepScore.overallScore} — {overall.label}
        </span>
      </div>

      {/* Summary */}
      <p className="text-sm text-gray-600">{deepScore.summary}</p>

      {/* Dimensions */}
      <div className="space-y-2">
        {deepScore.dimensions.map((dim) => (
          <div key={dim.name}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-gray-700">{dim.name}</span>
              <span className="text-gray-500">{dim.score}/100</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-gray-100">
              <div
                className={`h-2 rounded-full ${
                  dim.score >= 75 ? "bg-emerald-500" : dim.score >= 50 ? "bg-blue-500" : "bg-orange-400"
                }`}
                style={{ width: `${dim.score}%` }}
              />
            </div>
            <p className="mt-0.5 text-xs text-gray-500">{dim.explanation}</p>
          </div>
        ))}
      </div>

      {/* Gaps */}
      {deepScore.gaps.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-700">Gaps to Address</h4>
          <ul className="mt-1 list-disc pl-4 text-xs text-gray-500">
            {deepScore.gaps.map((gap, i) => (
              <li key={i}>{gap}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
