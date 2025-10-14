"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { formatDate } from "@/lib/utils"

type Batch = {
  id: string
  batchCode: string
  level: string
  students: Array<{
    id: string
    name: string
  }>
}

type AttendanceRecord = {
  id: string
  date: string
  status: string
  student: {
    id: string
    studentId: string
    name: string
    currentLevel: string
    batch: {
      id: string
      batchCode: string
    } | null
  }
}

export default function AttendancePage() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [selectedBatch, setSelectedBatch] = useState("")
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<"quick" | "table" | "history">("quick")
  const [quickAttendance, setQuickAttendance] = useState<Map<string, "PRESENT" | "ABSENT" | "EXCUSED" | "LATE">>(new Map())
  const [savingQuick, setSavingQuick] = useState(false)
  const [historyRecords, setHistoryRecords] = useState<AttendanceRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    fetchBatches()
  }, [])

  useEffect(() => {
    if (selectedBatch && selectedDate) {
      fetchAttendance()
    }
  }, [selectedBatch, selectedDate])

  useEffect(() => {
    if (viewMode === "history" && selectedBatch) {
      fetchHistory()
    }
  }, [viewMode, selectedBatch])

  const fetchBatches = async () => {
    try {
      const res = await fetch("/api/batches")
      const data = await res.json()
      setBatches(data)
    } catch (error) {
      console.error("Error fetching batches:", error)
    }
  }

  const fetchAttendance = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedBatch) params.append("batchId", selectedBatch)
      if (selectedDate) params.append("date", selectedDate)

      const res = await fetch(`/api/attendance?${params.toString()}`)
      const data = await res.json()
      setAttendance(data)
      const map = new Map<string, "PRESENT" | "ABSENT" | "EXCUSED" | "LATE">()
      data.forEach((record: AttendanceRecord) => {
        map.set(record.student.id, record.status as "PRESENT" | "ABSENT" | "EXCUSED" | "LATE")
      })
      setQuickAttendance(map)
    } catch (error) {
      console.error("Error fetching attendance:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true)
      const params = new URLSearchParams()
      params.append("batchId", selectedBatch)
      const res = await fetch(`/api/attendance?${params.toString()}`)
      const data = await res.json()
      setHistoryRecords(
        data.sort(
          (a: AttendanceRecord, b: AttendanceRecord) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        )
      )
    } catch (error) {
      console.error("Error fetching attendance history:", error)
    } finally {
      setHistoryLoading(false)
    }
  }

  const updateQuickStatus = (studentId: string, status: "PRESENT" | "ABSENT" | "EXCUSED" | "LATE") => {
    setQuickAttendance((prev) => {
      const map = new Map(prev)
      map.set(studentId, status)
      return map
    })
  }

  const handleQuickSave = async () => {
    if (!selectedBatchDetails) return
    setSavingQuick(true)
    try {
      const payload = selectedBatchDetails.students.map((student) => ({
        studentId: student.id,
        date: selectedDate,
        status: quickAttendance.get(student.id) ?? "PRESENT",
        notes: null,
      }))

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error("Failed to save attendance")

      await fetchAttendance()
    } catch (error) {
      console.error("Error saving attendance:", error)
      alert("Could not save attendance. Please try again.")
    } finally {
      setSavingQuick(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      PRESENT: "bg-success/10 text-success",
      ABSENT: "bg-error/10 text-error",
      EXCUSED: "bg-warning/10 text-warning",
      LATE: "bg-info/10 text-info",
    }
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  const selectedBatchDetails = batches.find((batch) => batch.id === selectedBatch)

  useEffect(() => {
    if (!selectedBatchDetails) {
      setQuickAttendance(new Map())
      return
    }

    setQuickAttendance((prev) => {
      const map = new Map(prev)
      const validIds = new Set(selectedBatchDetails.students.map((student) => student.id))

      selectedBatchDetails.students.forEach((student) => {
        if (!map.has(student.id)) {
          map.set(student.id, "PRESENT")
        }
      })

      Array.from(map.keys()).forEach((studentId) => {
        if (!validIds.has(studentId)) {
          map.delete(studentId)
        }
      })

      return map
    })
  }, [selectedBatchDetails?.id])

  const totalStudents = selectedBatchDetails?.students.length ?? 0
  const presentCount = selectedBatchDetails
    ? selectedBatchDetails.students.filter((student) => (quickAttendance.get(student.id) ?? "PRESENT") === "PRESENT").length
    : 0
  const absentCount = selectedBatchDetails
    ? selectedBatchDetails.students.filter((student) => (quickAttendance.get(student.id) ?? "PRESENT") === "ABSENT").length
    : 0
  const excusedCount = selectedBatchDetails
    ? selectedBatchDetails.students.filter((student) => {
        const status = quickAttendance.get(student.id) ?? "PRESENT"
        return status === "EXCUSED" || status === "LATE"
      }).length
    : 0
  const attendanceRate = totalStudents > 0 ? ((presentCount / totalStudents) * 100).toFixed(1) : "0"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Attendance Tracking</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Mark and track student attendance</p>
        </div>
        <Link
          href="/dashboard/attendance/bulk"
          className="btn-primary"
        >
          Bulk Mark Attendance
        </Link>
      </div>

      {/* Helper banner */}
      <div className="bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700 rounded-lg px-4 py-3 text-sm text-blue-900 dark:text-blue-100">
        <strong>Quick tip:</strong> Switch to <em>Quick Mark</em> for tap-friendly attendance during class, then review <em>History</em> to verify earlier sessions. You can still use the spreadsheet-style view when needed.
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Select Batch
            </label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Select Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {selectedBatch && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Students</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totalStudents}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">Present</div>
              <div className="text-2xl font-bold text-success mt-1">{presentCount}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">Absent</div>
              <div className="text-2xl font-bold text-error mt-1">{absentCount}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">Attendance Rate</div>
              <div className="text-2xl font-bold text-info mt-1">{attendanceRate}%</div>
            </div>
          </div>

          {/* Attendance List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Attendance for {formatDate(selectedDate)}
              </h2>

              {loading ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading attendance...</div>
              ) : attendance.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  No attendance records found. Use &quot;Bulk Mark Attendance&quot; to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {attendance.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">{record.student.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {record.student.studentId} • Level {record.student.currentLevel}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 rounded text-sm ${getStatusBadge(record.status)}`}>
                          {record.status}
                        </span>
                        <Link
                          href={`/dashboard/students/${record.student.id}`}
                          className="text-primary hover:underline text-sm"
                        >
                          View Profile
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {!selectedBatch && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-12 text-center text-gray-500 dark:text-gray-400">
          Select a batch and date to view attendance records
        </div>
      )}
    </div>
  )
}
