"use client"

import { useState } from "react"
import Link from "next/link"

type CallPriority = 'HIGH' | 'MEDIUM' | 'LOW'
type CallType = 'URGENT' | 'CHECK_IN' | 'PAYMENT' | 'ATTENDANCE'

interface CallData {
  id: string
  studentId: string
  studentName: string
  whatsapp: string
  email: string | null
  level: string
  batch: {
    code: string
    teacher: string | undefined
  } | null
  priority: CallPriority
  callType: CallType
  reasons: string[]
  talkingPoints: string[]
  stats: {
    attendanceRate: number
    consecutiveAbsences: number
    classesAttended: number
    totalClasses: number
    paymentStatus: string
    balance: number
    churnRisk: string
  }
  lastInteraction: {
    type: string
    category: string
    date: string
    notes: string
    userName: string
  } | null
  recentAttendance: Array<{
    date: string
    status: string
  }>
}

interface CallCardProps {
  call: CallData
  onCallNow: (call: CallData) => void
  onSnooze: (callId: string, hours: number) => void
  onComplete: (callId: string) => void
}

export default function CallCard({ call, onCallNow, onSnooze, onComplete }: CallCardProps) {
  const [expanded, setExpanded] = useState(false)

  const priorityColors = {
    HIGH: 'bg-red-100 dark:bg-red-900/30 border-red-500 dark:border-red-400',
    MEDIUM: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500 dark:border-yellow-400',
    LOW: 'bg-green-100 dark:bg-green-900/30 border-green-500 dark:border-green-400'
  }

  const priorityBadgeColors = {
    HIGH: 'bg-red-500 text-white',
    MEDIUM: 'bg-yellow-500 text-white',
    LOW: 'bg-green-500 text-white'
  }

  const callTypeEmoji = {
    URGENT: '🚨',
    CHECK_IN: '💬',
    PAYMENT: '💰',
    ATTENDANCE: '📅'
  }

  const paymentStatusColors: Record<string, string> = {
    PAID: 'text-green-600 dark:text-green-400',
    PENDING: 'text-yellow-600 dark:text-yellow-400',
    PARTIAL: 'text-orange-600 dark:text-orange-400',
    OVERDUE: 'text-red-600 dark:text-red-400'
  }

  return (
    <div className={`panel p-4 border-l-4 ${priorityColors[call.priority]} transition-all hover:shadow-md`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{callTypeEmoji[call.callType]}</span>
            <Link
              href={`/dashboard/students/${call.id}`}
              className="text-lg font-semibold text-gray-900 dark:text-white hover:text-primary dark:hover:text-blue-400 transition-colors"
            >
              {call.studentName}
            </Link>
            <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${priorityBadgeColors[call.priority]}`}>
              {call.priority}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-300 mb-3">
            <span className="font-medium">{call.studentId}</span>
            <span>•</span>
            <span>{call.level}</span>
            {call.batch && (
              <>
                <span>•</span>
                <span>{call.batch.code}</span>
              </>
            )}
          </div>

          {/* Reasons */}
          <div className="flex flex-wrap gap-2 mb-3">
            {call.reasons.map((reason, idx) => (
              <span
                key={idx}
                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md"
              >
                {reason}
              </span>
            ))}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            <div className="flex flex-col">
              <span className="text-gray-500 dark:text-gray-400 text-xs">Attendance</span>
              <span className={`font-semibold ${call.stats.attendanceRate < 70 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                {call.stats.attendanceRate}%
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500 dark:text-gray-400 text-xs">Classes</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {call.stats.classesAttended}/{call.stats.totalClasses}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500 dark:text-gray-400 text-xs">Payment</span>
              <span className={`font-semibold ${paymentStatusColors[call.stats.paymentStatus] || 'text-gray-900 dark:text-white'}`}>
                {call.stats.paymentStatus}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500 dark:text-gray-400 text-xs">Churn Risk</span>
              <span className={`font-semibold ${
                call.stats.churnRisk === 'HIGH' ? 'text-red-600 dark:text-red-400' :
                call.stats.churnRisk === 'MEDIUM' ? 'text-yellow-600 dark:text-yellow-400' :
                'text-green-600 dark:text-green-400'
              }`}>
                {call.stats.churnRisk}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => onCallNow(call)}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-md font-medium transition-colors whitespace-nowrap"
          >
            📞 Call Now
          </button>
          <a
            href={`https://wa.me/${call.whatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors text-center whitespace-nowrap"
          >
            💬 WhatsApp
          </a>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
          {/* Talking Points */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">💡 Talking Points</h4>
            <ul className="space-y-1">
              {call.talkingPoints.map((point, idx) => (
                <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Last Interaction */}
          {call.lastInteraction && (
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">🕒 Last Contact</h4>
              <div className="text-sm bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {new Date(call.lastInteraction.date).toLocaleDateString()}
                  </span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-600 dark:text-gray-300">{call.lastInteraction.type}</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-600 dark:text-gray-300">{call.lastInteraction.userName}</span>
                </div>
                <p className="text-gray-700 dark:text-gray-300">{call.lastInteraction.notes}</p>
              </div>
            </div>
          )}

          {/* Recent Attendance */}
          {call.recentAttendance.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">📊 Recent Attendance</h4>
              <div className="flex flex-wrap gap-2">
                {call.recentAttendance.map((att, idx) => (
                  <div
                    key={idx}
                    className={`px-2 py-1 text-xs rounded-md ${
                      att.status === 'PRESENT' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                      att.status === 'EXCUSED' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                      'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    }`}
                  >
                    {new Date(att.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer Actions */}
      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-primary dark:text-blue-400 hover:underline font-medium"
        >
          {expanded ? '▲ Show Less' : '▼ Show More'}
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSnooze(call.id, 2)}
            className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            ⏰ Snooze 2h
          </button>
          <button
            onClick={() => onSnooze(call.id, 24)}
            className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            📅 Tomorrow
          </button>
          <button
            onClick={() => onComplete(call.id)}
            className="px-3 py-1 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md transition-colors font-medium"
          >
            ✓ Mark Done
          </button>
        </div>
      </div>
    </div>
  )
}
