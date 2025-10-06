'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function HelpPage() {
  const [feedback, setFeedback] = useState({
    type: 'BUG',
    title: '',
    description: '',
    page: '',
    priority: 'MEDIUM',
    contactEmail: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess(false)

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedback),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit feedback')
      }

      setSuccess(true)
      setFeedback({
        type: 'BUG',
        title: '',
        description: '',
        page: '',
        priority: 'MEDIUM',
        contactEmail: '',
      })
      setTimeout(() => setSuccess(false), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Help & Support</h1>
        <p className="text-gray-600 mt-2">Report bugs, request features, or get help</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Feedback Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Report an Issue or Request a Feature</h2>

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-6">
                ✓ Thank you! Your feedback has been submitted successfully. We'll review it soon.
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What would you like to report? <span className="text-red-600">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'BUG', label: '🐛 Bug', desc: 'Something is broken' },
                    { value: 'FEATURE', label: '💡 Feature', desc: 'New idea' },
                    { value: 'QUESTION', label: '❓ Question', desc: 'Need help' },
                  ].map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFeedback({ ...feedback, type: type.value })}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        feedback.type === type.value
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-semibold text-sm">{type.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{type.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={feedback.title}
                  onChange={(e) => setFeedback({ ...feedback, title: e.target.value })}
                  placeholder="Brief summary of the issue or request"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Page/Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Which page/section? <span className="text-red-600">*</span>
                </label>
                <select
                  required
                  value={feedback.page}
                  onChange={(e) => setFeedback({ ...feedback, page: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select a page...</option>
                  <option value="Dashboard">Dashboard (Home)</option>
                  <option value="Leads">Leads</option>
                  <option value="Lead Details">Lead Details</option>
                  <option value="Students">Students</option>
                  <option value="Student Details">Student Details</option>
                  <option value="Payments">Payments</option>
                  <option value="Batches">Batches</option>
                  <option value="Referrals">Referrals</option>
                  <option value="Insights">Insights/Analytics</option>
                  <option value="Activity Log">Activity Log</option>
                  <option value="Attendance">Attendance</option>
                  <option value="Login">Login</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Priority (only for bugs) */}
              {feedback.type === 'BUG' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    How urgent is this? <span className="text-red-600">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'LOW', label: 'Low', desc: 'Minor issue', color: 'text-gray-600' },
                      { value: 'MEDIUM', label: 'Medium', desc: 'Affects work', color: 'text-yellow-600' },
                      { value: 'HIGH', label: 'High', desc: 'Blocking work', color: 'text-red-600' },
                    ].map((priority) => (
                      <button
                        key={priority.value}
                        type="button"
                        onClick={() => setFeedback({ ...feedback, priority: priority.value })}
                        className={`p-3 border-2 rounded-lg text-left transition-all ${
                          feedback.priority === priority.value
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className={`font-semibold text-sm ${priority.color}`}>{priority.label}</div>
                        <div className="text-xs text-gray-500 mt-1">{priority.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Detailed Description <span className="text-red-600">*</span>
                </label>
                <textarea
                  required
                  rows={6}
                  value={feedback.description}
                  onChange={(e) => setFeedback({ ...feedback, description: e.target.value })}
                  placeholder={
                    feedback.type === 'BUG'
                      ? 'Please describe:\n1. What you were trying to do\n2. What happened (the bug)\n3. What you expected to happen\n4. Steps to reproduce the issue'
                      : feedback.type === 'FEATURE'
                      ? 'Describe the feature you would like to see:\n- What problem does it solve?\n- How should it work?\n- Any examples?'
                      : 'What do you need help with? Please provide as much detail as possible.'
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-gray-500 mt-1">Be as detailed as possible to help us understand and fix the issue</p>
              </div>

              {/* Contact Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Email (optional)
                </label>
                <input
                  type="email"
                  value={feedback.contactEmail}
                  onChange={(e) => setFeedback({ ...feedback, contactEmail: e.target.value })}
                  placeholder="your.email@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-gray-500 mt-1">If you want us to follow up with you</p>
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
                <Link
                  href="/dashboard"
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </div>

        {/* Quick Links & Resources */}
        <div className="space-y-6">
          {/* User Guide */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">📚 User Guide</h3>
            <p className="text-sm text-gray-600 mb-4">
              Complete guide for using the dashboard
            </p>
            <a
              href="/MARKETING_GUIDE.md"
              download
              className="text-primary hover:underline text-sm font-medium"
            >
              Download Marketing Guide →
            </a>
          </div>

          {/* Quick Help */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">⚡ Quick Help</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-gray-900">Can&apos;t find a student?</p>
                <p className="text-gray-600 text-xs mt-1">Use the search box at the top</p>
              </div>
              <div>
                <p className="font-medium text-gray-900">Payment not updating?</p>
                <p className="text-gray-600 text-xs mt-1">Refresh the page or check if it was saved</p>
              </div>
              <div>
                <p className="font-medium text-gray-900">Invoice not generating?</p>
                <p className="text-gray-600 text-xs mt-1">Ensure all required fields are filled</p>
              </div>
            </div>
          </div>

          {/* Common Tasks */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">✅ Common Tasks</h3>
            <div className="space-y-2 text-sm">
              <Link href="/dashboard/leads/new" className="block text-primary hover:underline">
                → Add a new lead
              </Link>
              <Link href="/dashboard/students/new" className="block text-primary hover:underline">
                → Enroll a student
              </Link>
              <Link href="/dashboard/payments/new" className="block text-primary hover:underline">
                → Record a payment
              </Link>
              <Link href="/dashboard/batches" className="block text-primary hover:underline">
                → View batches
              </Link>
              <Link href="/dashboard/insights" className="block text-primary hover:underline">
                → Check analytics
              </Link>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">💬 Need Immediate Help?</h3>
            <p className="text-sm text-gray-600 mb-3">
              Contact the admin team for urgent issues
            </p>
            <p className="text-sm text-gray-700">
              <strong>Support:</strong> support@planbeta.in
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
