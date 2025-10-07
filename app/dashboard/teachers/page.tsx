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
            <span className="text-gray-700">Show inactive</span>
          </label>
          <Link
            href="/dashboard/teachers/new"
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
          >
            + Add Teacher
          </Link>
        </div>
      </div>

      {/* Teachers List */}
      {teachers.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-gray-500 mb-4">No teachers added yet</div>
          <Link
            href="/dashboard/teachers/new"
            className="inline-block px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
          >
            Add Your First Teacher
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredTeachers.map((teacher) => (
            <div
              key={teacher.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
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
                <Link
                  href={`/dashboard/teachers/${teacher.id}/edit`}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Edit
                </Link>
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
