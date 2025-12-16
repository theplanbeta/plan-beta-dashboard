"use client"

import { useState } from "react"
import Link from "next/link"

interface Student {
  id: string
  studentId: string
  name: string
  level: string
  whatsapp: string
  email: string | null
}

interface ConnectionSuggestionProps {
  student1: Student
  student2: Student
  reason: string
  commonalities: string[]
  onSendIntro: (student1Id: string, student2Id: string, message: string) => void
}

export default function ConnectionSuggestion({
  student1,
  student2,
  reason,
  commonalities,
  onSendIntro
}: ConnectionSuggestionProps) {
  const [expanded, setExpanded] = useState(false)
  const [customMessage, setCustomMessage] = useState(
    `Hi ${student1.name} and ${student2.name}! 👋\n\nI thought you two might enjoy connecting! You're both learning ${student1.level} German and have some things in common:\n\n${commonalities.map(c => `• ${c}`).join('\n')}\n\nFeel free to reach out to each other for practice, study sessions, or just to share your German learning journey!\n\nHappy learning! 🇩🇪✨`
  )
  const [sending, setSending] = useState(false)

  const handleSendIntro = async () => {
    setSending(true)
    try {
      await onSendIntro(student1.id, student2.id, customMessage)
    } catch (error) {
      console.error('Error sending intro:', error)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="panel p-5 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🤝</span>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Suggested Connection
            </h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">{reason}</p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <svg
            className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Students */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <Link
            href={`/dashboard/students/${student1.id}`}
            className="text-base font-semibold text-blue-900 dark:text-blue-300 hover:underline block mb-1"
          >
            {student1.name}
          </Link>
          <div className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
            <p>{student1.studentId} • {student1.level}</p>
            {student1.email && <p className="truncate">{student1.email}</p>}
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <Link
            href={`/dashboard/students/${student2.id}`}
            className="text-base font-semibold text-green-900 dark:text-green-300 hover:underline block mb-1"
          >
            {student2.name}
          </Link>
          <div className="text-sm text-green-700 dark:text-green-400 space-y-1">
            <p>{student2.studentId} • {student2.level}</p>
            {student2.email && <p className="truncate">{student2.email}</p>}
          </div>
        </div>
      </div>

      {/* Commonalities */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
          What they have in common:
        </h4>
        <div className="flex flex-wrap gap-2">
          {commonalities.map((item, idx) => (
            <span
              key={idx}
              className="px-3 py-1 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Expanded Section */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
          <div>
            <label className="form-label">Introduction Message</label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="textarea min-h-[200px] font-mono text-sm"
              placeholder="Write a warm introduction..."
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              This message will be sent to both students
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSendIntro}
              disabled={sending || !customMessage.trim()}
              className="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? 'Sending...' : '📧 Send Introduction via Email'}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(customMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors"
            >
              💬 WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
