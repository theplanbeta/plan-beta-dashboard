"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils"

type Teacher = {
  id: string
  email: string
  name: string
  phone: string | null
  active: boolean
  hourlyRate: number | null
  availableMorning: boolean | null
  availableEvening: boolean | null
  batches: Array<{
    id: string
    batchCode: string
    timing: string
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

  const getAvailabilityStatus = (
    teacher: Teacher,
    slot: "Morning" | "Evening"
  ) => {
    const slotAvailable = slot === "Morning"
      ? teacher.availableMorning
      : teacher.availableEvening

    if (slotAvailable === false) {
      return { status: "Not Available", color: "bg-gray-200 text-gray-600", nextAvailable: null }
    }

    const currentBatches = teacher.batches.filter(
      (b) => b.timing === slot && (b.status === "RUNNING" || b.status === "FILLING")
    )

    if (currentBatches.length === 0) {
      return { status: "Available", color: "bg-success/10 text-success", nextAvailable: null }
    }

    // Find the latest endDate among current batches
    const latestEndDate = currentBatches
      .map((b) => b.endDate)
      .filter((d) => d !== null)
      .sort()
      .pop()

    if (!latestEndDate) {
      return { status: "Busy", color: "bg-error/10 text-error", nextAvailable: null }
    }

    return {
      status: "Busy",
      color: "bg-error/10 text-error",
      nextAvailable: new Date(latestEndDate).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
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
          <p className="text-gray-500">Manage teachers and their availability</p>
        </div>
        <Link
          href="/dashboard/teachers/new"
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
        >
          + Add Teacher
        </Link>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {teachers.map((teacher) => {
            const morningStatus = getAvailabilityStatus(teacher, "Morning")
            const eveningStatus = getAvailabilityStatus(teacher, "Evening")

            return (
              <div
                key={teacher.id}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
              >
                {/* Teacher Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-xl font-semibold text-foreground">
                        {teacher.name}
                      </h3>
                      {!teacher.active && (
                        <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">{teacher.email}</div>
                    {teacher.phone && (
                      <div className="text-sm text-gray-600">{teacher.phone}</div>
                    )}
                  </div>
                  {teacher.hourlyRate && (
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Hourly Rate</div>
                      <div className="text-lg font-bold text-foreground">
                        {formatCurrency(Number(teacher.hourlyRate))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Availability Status */}
                <div className="space-y-3 mb-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">Morning Slot</span>
                      <span className={`px-2 py-1 rounded text-xs ${morningStatus.color}`}>
                        {morningStatus.status}
                      </span>
                    </div>
                    {morningStatus.nextAvailable && (
                      <div className="text-xs text-gray-500">
                        Available from: {morningStatus.nextAvailable}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">Evening Slot</span>
                      <span className={`px-2 py-1 rounded text-xs ${eveningStatus.color}`}>
                        {eveningStatus.status}
                      </span>
                    </div>
                    {eveningStatus.nextAvailable && (
                      <div className="text-xs text-gray-500">
                        Available from: {eveningStatus.nextAvailable}
                      </div>
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
                          className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                        >
                          <div>
                            <div className="text-sm font-medium text-foreground">
                              {batch.batchCode}
                            </div>
                            <div className="text-xs text-gray-600">
                              {batch.timing} • {batch.status}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">
                            {batch.endDate &&
                              new Date(batch.endDate).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                              })}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Total Batches */}
                <div className="mt-4 pt-4 border-t text-sm text-gray-600">
                  Total Batches: <span className="font-medium">{teacher._count.batches}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
