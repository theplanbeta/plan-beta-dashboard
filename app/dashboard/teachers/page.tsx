"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils"

type TimeSlot = {
  startTime: string
  endTime: string
}

type Teacher = {
  id: string
  name: string
  email: string
  active: boolean
  teacherLevels: string[]
  teacherTimings: string[]
  teacherTimeSlots: TimeSlot[]
  hourlyRate: Record<string, number> | null // Changed to object: {"A1": 600, "B2": 750}
  currency: string | null
  whatsapp: string | null
  remarks: string | null
  batches: Array<{
    id: string
    batchCode: string
    level: string
    schedule: string | null
    startDate: string | null
    endDate: string | null
    status: string
  }>
  _count: {
    batches: number
  }
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [showInactive, setShowInactive] = useState(false)
  const [sendingEmails, setSendingEmails] = useState(false)
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null)

  useEffect(() => {
    fetchTeachers()
  }, [])

  const fetchTeachers = async () => {
    try {
      const res = await fetch("/api/teachers")
      if (!res.ok) throw new Error("Failed to fetch teachers")

      const data = await res.json()
      setTeachers(data)
    } catch (error) {
      console.error("Error fetching teachers:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTeachers = showInactive
    ? teachers
    : teachers.filter(t => t.active)

  const formatTimeSlot = (slot: TimeSlot) => {
    return `${slot.startTime} - ${slot.endTime}`
  }

  const sendSetupEmails = async (teacherIds: string[]) => {
    setSendingEmails(true)
    try {
      const res = await fetch("/api/teachers/send-setup-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherIds }),
      })

      if (res.ok) {
        const data = await res.json()
        alert(`✅ Emails sent!\n\nSent: ${data.results.sent}\nFailed: ${data.results.failed}\nSkipped: ${data.results.skipped}`)
      } else {
        const error = await res.json()
        alert(`❌ Failed to send emails: ${error.error}`)
      }
    } catch (error) {
      console.error("Error sending setup emails:", error)
      alert("❌ Failed to send setup emails")
    } finally {
      setSendingEmails(false)
      setSendingEmailId(null)
    }
  }

  const sendSingleSetupEmail = async (teacherId: string) => {
    setSendingEmailId(teacherId)
    await sendSetupEmails([teacherId])
  }

  const sendAllSetupEmails = async () => {
    const teachersNeedingSetup = teachers.filter(t =>
      t.email.includes('@planbeta.internal') && t.active
    )

    if (teachersNeedingSetup.length === 0) {
      alert("No teachers need setup emails")
      return
    }

    if (!confirm(`Send welcome emails to ${teachersNeedingSetup.length} teacher(s)?`)) {
      return
    }

    await sendSetupEmails(teachersNeedingSetup.map(t => t.id))
  }

  const teachersNeedingSetup = teachers.filter(t =>
    t.email.includes('@planbeta.internal') && t.active
  ).length

  const toggleTeacherActive = async (teacherId: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/teachers/${teacherId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !currentActive }),
      })

      if (res.ok) {
        // Update local state
        setTeachers(teachers.map(t =>
          t.id === teacherId ? { ...t, active: !currentActive } : t
        ))
        alert(`✅ Teacher ${!currentActive ? 'activated' : 'deactivated'} successfully`)
      } else {
        const error = await res.json()
        alert(`❌ Failed: ${error.error}`)
      }
    } catch (error) {
      console.error("Error toggling teacher status:", error)
      alert("❌ Failed to update teacher status")
    }
  }

  const deleteTeacher = async (teacher: Teacher) => {
    // Check if teacher has active batches
    if (teacher._count.batches > 0) {
      alert(`❌ Cannot delete teacher with ${teacher._count.batches} active batch(es).\n\nPlease reassign or complete batches first.`)
      return
    }

    // Double confirmation for safety
    if (!confirm(`⚠️ WARNING: This will permanently delete ${teacher.name} and all their credentials.\n\nAre you absolutely sure you want to delete this teacher?`)) {
      return
    }

    try {
      const res = await fetch(`/api/teachers/${teacher.id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        // Remove teacher from local state
        setTeachers(teachers.filter(t => t.id !== teacher.id))
        alert(`✅ Teacher ${teacher.name} deleted successfully`)
      } else {
        const error = await res.json()
        alert(`❌ Failed to delete teacher: ${error.error}`)
      }
    } catch (error) {
      console.error("Error deleting teacher:", error)
      alert("❌ Failed to delete teacher")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading teachers...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Teachers</h1>
          <p className="text-gray-500">Manage teachers and their assignments</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary"
            />
            <span className="text-gray-700 dark:text-gray-300">Show inactive</span>
          </label>
          {teachersNeedingSetup > 0 && (
            <button
              onClick={sendAllSetupEmails}
              disabled={sendingEmails}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              {sendingEmails ? "Sending..." : `📧 Send Welcome Emails (${teachersNeedingSetup})`}
            </button>
          )}
          <Link
            href="/dashboard/teachers/new"
            className="btn-primary"
          >
            + Add Teacher
          </Link>
        </div>
      </div>

      {/* Teachers List */}
      {teachers.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="text-gray-500 mb-4">No teachers added yet</div>
          <Link
            href="/dashboard/teachers/new"
            className="btn-primary inline-block px-6 py-2"
          >
            Add Your First Teacher
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredTeachers.map((teacher) => (
            <div
              key={teacher.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md dark:hover:shadow-lg transition-shadow"
            >
              {/* Teacher Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-semibold text-foreground">
                      {teacher.name}
                    </h3>
                    {!teacher.active && (
                      <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded">
                        Inactive
                      </span>
                    )}
                    {teacher.email.includes('@planbeta.internal') && teacher.active && (
                      <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs rounded">
                        Needs Setup
                      </span>
                    )}
                  </div>

                  {/* Quick Info */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    {teacher.hourlyRate && typeof teacher.hourlyRate === 'object' && Object.keys(teacher.hourlyRate).length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-gray-600">Rates:</span>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(teacher.hourlyRate as Record<string, number>).map(([level, rate]) => (
                            <span key={level} className="font-medium text-foreground">
                              {level}: {formatCurrency(Number(rate))} {teacher.currency || 'EUR'}/hr
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {teacher.whatsapp && (
                      <div className="flex items-center gap-1">
                        <span className="text-gray-600">WhatsApp:</span>
                        <span className="font-medium text-foreground">{teacher.whatsapp}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <span className="text-gray-600">Batches:</span>
                      <span className="font-medium text-foreground">{teacher._count.batches}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {teacher.email.includes('@planbeta.internal') && teacher.active && (
                    <button
                      onClick={() => sendSingleSetupEmail(teacher.id)}
                      disabled={sendingEmailId === teacher.id}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                      title="Send welcome email with setup instructions"
                    >
                      {sendingEmailId === teacher.id ? "Sending..." : "📧 Send Email"}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to ${teacher.active ? 'deactivate' : 'activate'} ${teacher.name}?`)) {
                        toggleTeacherActive(teacher.id, teacher.active)
                      }
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      teacher.active
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                    title={teacher.active ? "Deactivate teacher" : "Activate teacher"}
                  >
                    {teacher.active ? '🔒 Deactivate' : '✅ Activate'}
                  </button>
                  <Link
                    href={`/dashboard/teachers/${teacher.id}/edit`}
                    className="btn-outline text-sm"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => deleteTeacher(teacher)}
                    disabled={teacher._count.batches > 0}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      teacher._count.batches > 0
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                    title={teacher._count.batches > 0 ? `Cannot delete - ${teacher._count.batches} active batches` : "Delete teacher permanently"}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Teaching Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {/* Levels */}
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Levels</div>
                  {teacher.teacherLevels.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {teacher.teacherLevels.map((level) => (
                        <span
                          key={level}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                        >
                          {level}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500">Not specified</span>
                  )}
                </div>

                {/* Timings */}
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Timings</div>
                  {teacher.teacherTimings.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {teacher.teacherTimings.map((timing) => (
                        <span
                          key={timing}
                          className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded"
                        >
                          {timing}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500">Not specified</span>
                  )}
                </div>

                {/* Time Slots */}
                <div className="md:col-span-2">
                  <div className="text-sm font-medium text-gray-700 mb-2">Time Slots</div>
                  {teacher.teacherTimeSlots && teacher.teacherTimeSlots.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {teacher.teacherTimeSlots.map((slot, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded"
                        >
                          {formatTimeSlot(slot)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500">Not specified</span>
                  )}
                </div>
              </div>

              {/* Current Batches */}
              {teacher.batches.length > 0 && (
                <div className="pt-4 border-t">
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Current Batches ({teacher.batches.length})
                  </div>
                  <div className="space-y-2">
                    {teacher.batches.map((batch) => (
                      <Link
                        key={batch.id}
                        href={`/dashboard/batches/${batch.id}`}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="text-sm font-medium text-foreground">
                              {batch.batchCode}
                            </div>
                            <div className="text-xs text-gray-600">
                              {batch.level} • {batch.status}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {batch.schedule || "No schedule"}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Remarks */}
              {teacher.remarks && (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm font-medium text-gray-700 mb-1">Remarks</div>
                  <div className="text-sm text-gray-600">{teacher.remarks}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
