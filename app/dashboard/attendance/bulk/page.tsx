"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { formatDate } from "@/lib/utils"

type Batch = {
  id: string
  batchCode: string
  level: string
  students: Array<{
    id: string
    studentId: string
    name: string
    currentLevel: string
  }>
}

type AttendanceState = {
  studentId: string
  status: "PRESENT" | "ABSENT" | "EXCUSED" | "LATE"
  notes: string
}

export default function BulkAttendancePage() {
  const router = useRouter()
  const [batches, setBatches] = useState<Batch[]>([])
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [attendance, setAttendance] = useState<Map<string, AttendanceState>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    fetchBatches()
  }, [])

  const fetchBatches = async () => {
    try {
      const res = await fetch("/api/batches")
      const data = await res.json()
      setBatches(data)
    } catch (error) {
      console.error("Error fetching batches:", error)
    }
  }

  const handleBatchChange = (batchId: string) => {
    const batch = batches.find((b) => b.id === batchId)
    setSelectedBatch(batch || null)

    // Initialize attendance for all students in batch
    if (batch) {
      const newAttendance = new Map<string, AttendanceState>()
      batch.students.forEach((student) => {
        newAttendance.set(student.id, {
          studentId: student.id,
          status: "PRESENT",
          notes: "",
        })
      })
      setAttendance(newAttendance)
    }
  }

  const updateAttendance = (studentId: string, field: keyof AttendanceState, value: string) => {
    setAttendance((prev) => {
      const newMap = new Map(prev)
      const current = newMap.get(studentId)
      if (current) {
        newMap.set(studentId, { ...current, [field]: value })
      }
      return newMap
    })
  }

  const markAllPresent = () => {
    setAttendance((prev) => {
      const newMap = new Map(prev)
      newMap.forEach((value, key) => {
        newMap.set(key, { ...value, status: "PRESENT" })
      })
      return newMap
    })
  }

  const markAllAbsent = () => {
    setAttendance((prev) => {
      const newMap = new Map(prev)
      newMap.forEach((value, key) => {
        newMap.set(key, { ...value, status: "ABSENT" })
      })
      return newMap
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const attendanceData = Array.from(attendance.values()).map((record) => ({
        studentId: record.studentId,
        date: selectedDate,
        status: record.status,
        notes: record.notes || null,
      }))

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attendanceData),
      })

      if (!res.ok) {
        throw new Error("Failed to mark attendance")
      }

      setSuccess(`Attendance marked successfully for ${attendanceData.length} students!`)

      setTimeout(() => {
        router.push("/dashboard/attendance")
        router.refresh()
      }, 1500)
    } catch (err) {
      setError("Failed to mark attendance. Please try again.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      PRESENT: "bg-success text-white",
      ABSENT: "bg-error text-white",
      EXCUSED: "bg-warning text-white",
      LATE: "bg-info text-white",
    }
    return colors[status as keyof typeof colors] || "bg-gray-500 text-white"
  }

  // Calculate stats
  const totalStudents = attendance.size
  const presentCount = Array.from(attendance.values()).filter((a) => a.status === "PRESENT").length
  const absentCount = Array.from(attendance.values()).filter((a) => a.status === "ABSENT").length
  const excusedCount = Array.from(attendance.values()).filter((a) => a.status === "EXCUSED").length
  const lateCount = Array.from(attendance.values()).filter((a) => a.status === "LATE").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bulk Mark Attendance</h1>
          <p className="mt-2 text-gray-600">Mark attendance for entire batch at once</p>
        </div>
        <Link
          href="/dashboard/attendance"
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Back to Attendance
        </Link>
      </div>

      {/* Batch & Date Selection */}
      <div className="bg-white p-6 rounded-lg shadow space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Batch <span className="text-error">*</span>
            </label>
            <select
              value={selectedBatch?.id || ""}
              onChange={(e) => handleBatchChange(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Choose a batch...</option>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.batchCode} - Level {batch.level} ({batch.students.length} students)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Class Date <span className="text-error">*</span>
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {selectedBatch && (
          <div className="flex items-center space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={markAllPresent}
              className="px-4 py-2 bg-success text-white rounded-md hover:bg-success/90 text-sm"
            >
              Mark All Present
            </button>
            <button
              type="button"
              onClick={markAllAbsent}
              className="px-4 py-2 bg-error text-white rounded-md hover:bg-error/90 text-sm"
            >
              Mark All Absent
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      {selectedBatch && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-sm text-gray-600">Total</div>
            <div className="text-xl font-bold text-foreground mt-1">{totalStudents}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-sm text-gray-600">Present</div>
            <div className="text-xl font-bold text-success mt-1">{presentCount}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-sm text-gray-600">Absent</div>
            <div className="text-xl font-bold text-error mt-1">{absentCount}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-sm text-gray-600">Excused</div>
            <div className="text-xl font-bold text-warning mt-1">{excusedCount}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-sm text-gray-600">Late</div>
            <div className="text-xl font-bold text-info mt-1">{lateCount}</div>
          </div>
        </div>
      )}

      {/* Attendance Form */}
      {selectedBatch && (
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            {error && (
              <div className="bg-error/10 border border-error text-error px-4 py-3 rounded">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-success/10 border border-success text-success px-4 py-3 rounded">
                {success}
              </div>
            )}

            <h2 className="text-xl font-semibold text-foreground mb-4">
              Mark Attendance for {formatDate(selectedDate)}
            </h2>

            <div className="space-y-3">
              {selectedBatch.students.map((student) => {
                const attendanceState = attendance.get(student.id)
                if (!attendanceState) return null

                return (
                  <div
                    key={student.id}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-gray-50 rounded-lg space-y-3 md:space-y-0"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{student.name}</div>
                      <div className="text-sm text-gray-600">
                        {student.studentId} • Level {student.currentLevel}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-2">
                        {(["PRESENT", "ABSENT", "EXCUSED", "LATE"] as const).map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => updateAttendance(student.id, "status", status)}
                            className={`px-3 py-1 rounded text-sm transition-colors ${
                              attendanceState.status === status
                                ? getStatusBadge(status)
                                : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>

                      <input
                        type="text"
                        placeholder="Notes (optional)"
                        value={attendanceState.notes}
                        onChange={(e) => updateAttendance(student.id, "notes", e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm w-40"
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Link
                href="/dashboard/attendance"
                className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Saving..." : "Save Attendance"}
              </button>
            </div>
          </div>
        </form>
      )}

      {!selectedBatch && (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          Select a batch to start marking attendance
        </div>
      )}
    </div>
  )
}
