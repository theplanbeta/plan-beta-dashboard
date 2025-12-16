"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"

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
  priority: string
  callType: string
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
}

interface CallModalProps {
  call: CallData | null
  isOpen: boolean
  onClose: () => void
  onComplete: (data: CallOutcomeData) => void
}

export interface CallOutcomeData {
  studentId: string
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'
  notes: string
  outcome: string
  followUpNeeded: boolean
  followUpDate?: Date
  goals?: string
  challenges?: string
  wins?: string
  personalNotes?: string
  actionItems?: string[]
}

export default function CallModal({ call, isOpen, onClose, onComplete }: CallModalProps) {
  const { data: session } = useSession()
  const [sentiment, setSentiment] = useState<'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'>('NEUTRAL')
  const [notes, setNotes] = useState('')
  const [outcome, setOutcome] = useState('')
  const [followUpNeeded, setFollowUpNeeded] = useState(false)
  const [followUpDate, setFollowUpDate] = useState('')
  const [goals, setGoals] = useState('')
  const [challenges, setChallenges] = useState('')
  const [wins, setWins] = useState('')
  const [personalNotes, setPersonalNotes] = useState('')
  const [actionItems, setActionItems] = useState<string[]>([''])
  const [saving, setSaving] = useState(false)
  const [callStartTime] = useState(new Date())

  useEffect(() => {
    if (isOpen && call) {
      // Reset form when modal opens
      setSentiment('NEUTRAL')
      setNotes('')
      setOutcome('')
      setFollowUpNeeded(false)
      setFollowUpDate('')
      setGoals('')
      setChallenges('')
      setWins('')
      setPersonalNotes('')
      setActionItems([''])
    }
  }, [isOpen, call])

  if (!isOpen || !call) return null

  const handleAddActionItem = () => {
    setActionItems([...actionItems, ''])
  }

  const handleActionItemChange = (index: number, value: string) => {
    const newItems = [...actionItems]
    newItems[index] = value
    setActionItems(newItems)
  }

  const handleRemoveActionItem = (index: number) => {
    setActionItems(actionItems.filter((_, i) => i !== index))
  }

  const handleSubmit = async (status: 'COMPLETED' | 'NOT_REACHED') => {
    if (status === 'COMPLETED' && !outcome) {
      alert('Please provide a call outcome')
      return
    }

    setSaving(true)

    try {
      const callDuration = Math.floor((new Date().getTime() - callStartTime.getTime()) / 1000 / 60)

      const outcomeData: CallOutcomeData = {
        studentId: call.id,
        sentiment,
        notes: status === 'NOT_REACHED' ? 'Student not reachable' : notes,
        outcome: status === 'NOT_REACHED' ? 'Not Reached' : outcome,
        followUpNeeded: status === 'NOT_REACHED' ? true : followUpNeeded,
        followUpDate: followUpDate ? new Date(followUpDate) : undefined,
        goals,
        challenges,
        wins,
        personalNotes,
        actionItems: actionItems.filter(item => item.trim() !== '')
      }

      // Save interaction to database
      await fetch(`/api/students/${call.id}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interactionType: 'PHONE_CALL',
          category: call.callType === 'PAYMENT' ? 'PAYMENT_REMINDER' :
                   call.callType === 'ATTENDANCE' ? 'ATTENDANCE_FOLLOW_UP' :
                   call.callType === 'URGENT' ? 'CHURN_OUTREACH' :
                   'GENERAL_CHECK_IN',
          notes: `${outcomeData.notes}\n\nDuration: ${callDuration} min\nSentiment: ${sentiment}\n\n${goals ? `Goals: ${goals}\n` : ''}${challenges ? `Challenges: ${challenges}\n` : ''}${wins ? `Wins: ${wins}\n` : ''}${personalNotes ? `Personal Notes: ${personalNotes}\n` : ''}${actionItems.length > 0 && actionItems[0] ? `\nAction Items:\n${actionItems.map(item => `- ${item}`).join('\n')}` : ''}`,
          outcome: outcomeData.outcome,
          followUpNeeded: outcomeData.followUpNeeded,
          followUpDate: outcomeData.followUpDate
        })
      })

      onComplete(outcomeData)
      onClose()
    } catch (error) {
      console.error('Error saving call outcome:', error)
      alert('Failed to save call outcome. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Call with {call.studentName}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              {call.studentId} • {call.level} • {call.batch?.code || 'No batch'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Quick Context */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">📋 Call Context</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-blue-700 dark:text-blue-400 font-medium">Attendance:</span>
                <span className="ml-2 text-blue-900 dark:text-blue-200">{call.stats.attendanceRate}%</span>
              </div>
              <div>
                <span className="text-blue-700 dark:text-blue-400 font-medium">Payment:</span>
                <span className="ml-2 text-blue-900 dark:text-blue-200">{call.stats.paymentStatus}</span>
              </div>
              <div>
                <span className="text-blue-700 dark:text-blue-400 font-medium">Churn Risk:</span>
                <span className="ml-2 text-blue-900 dark:text-blue-200">{call.stats.churnRisk}</span>
              </div>
              <div>
                <span className="text-blue-700 dark:text-blue-400 font-medium">Absences:</span>
                <span className="ml-2 text-blue-900 dark:text-blue-200">{call.stats.consecutiveAbsences} consecutive</span>
              </div>
            </div>
          </div>

          {/* Talking Points */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-2">💡 Talking Points</h3>
            <ul className="space-y-2">
              {call.talkingPoints.map((point, idx) => (
                <li key={idx} className="text-sm text-yellow-900 dark:text-yellow-200 flex items-start gap-2">
                  <span className="text-yellow-600 dark:text-yellow-400 mt-0.5">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Sentiment Selection */}
          <div>
            <label className="form-label">How did the conversation feel?</label>
            <div className="grid grid-cols-3 gap-3">
              {(['POSITIVE', 'NEUTRAL', 'NEGATIVE'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSentiment(s)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    sentiment === s
                      ? s === 'POSITIVE' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' :
                        s === 'NEUTRAL' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' :
                        'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }`}
                >
                  <div className="text-3xl mb-1">
                    {s === 'POSITIVE' ? '😊' : s === 'NEUTRAL' ? '😐' : '😟'}
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{s}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Call Notes */}
          <div>
            <label className="form-label">Call Notes *</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="textarea min-h-[100px]"
              placeholder="What did you discuss? Any important points to remember..."
              required
            />
          </div>

          {/* Outcome */}
          <div>
            <label className="form-label">Call Outcome *</label>
            <input
              type="text"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              className="input"
              placeholder="e.g., Will attend next class, Paid pending amount, Needs makeup class..."
              required
            />
          </div>

          {/* Journey Updates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">🎯 Goals Discussed</label>
              <textarea
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                className="textarea min-h-[80px]"
                placeholder="Their learning goals..."
              />
            </div>
            <div>
              <label className="form-label">💪 Challenges Faced</label>
              <textarea
                value={challenges}
                onChange={(e) => setChallenges(e.target.value)}
                className="textarea min-h-[80px]"
                placeholder="Any difficulties..."
              />
            </div>
            <div>
              <label className="form-label">🎉 Recent Wins</label>
              <textarea
                value={wins}
                onChange={(e) => setWins(e.target.value)}
                className="textarea min-h-[80px]"
                placeholder="Achievements to celebrate..."
              />
            </div>
          </div>

          {/* Personal Notes */}
          <div>
            <label className="form-label">📝 Personal Notes</label>
            <textarea
              value={personalNotes}
              onChange={(e) => setPersonalNotes(e.target.value)}
              className="textarea min-h-[80px]"
              placeholder="Personal details to remember (family, hobbies, preferences...)"
            />
          </div>

          {/* Action Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="form-label mb-0">✅ Action Items</label>
              <button
                type="button"
                onClick={handleAddActionItem}
                className="text-sm text-primary dark:text-blue-400 hover:underline"
              >
                + Add Item
              </button>
            </div>
            <div className="space-y-2">
              {actionItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => handleActionItemChange(idx, e.target.value)}
                    className="input"
                    placeholder="e.g., Send makeup class link, Follow up on payment..."
                  />
                  {actionItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveActionItem(idx)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Follow-up */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="followUp"
              checked={followUpNeeded}
              onChange={(e) => setFollowUpNeeded(e.target.checked)}
              className="mt-1"
            />
            <div className="flex-1">
              <label htmlFor="followUp" className="form-label cursor-pointer">
                Schedule Follow-up
              </label>
              {followUpNeeded && (
                <input
                  type="datetime-local"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="input mt-2"
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => handleSubmit('NOT_REACHED')}
            disabled={saving}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Not Reachable
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSubmit('COMPLETED')}
              disabled={saving || !outcome}
              className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-md font-medium disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Complete Call ✓'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
