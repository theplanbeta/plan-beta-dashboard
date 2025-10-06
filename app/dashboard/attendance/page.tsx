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

  useEffect(() => {
    fetchBatches()
  }, [])

  useEffect(() => {
    if (selectedBatch && selectedDate) {
      fetchAttendance()
    }
  }, [selectedBatch, selectedDate])

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
    } catch (error) {
      console.error("Error fetching attendance:", error)
    } finally {
      setLoading(false)
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

  // Calculate attendance stats
  const totalStudents = attendance.length
  const presentCount = attendance.filter((a) => a.status === "PRESENT").length
  const absentCount = attendance.filter((a) => a.status === "ABSENT").length
  const excusedCount = attendance.filter((a) => a.status === "EXCUSED").length
  const attendanceRate = totalStudents > 0 ? ((presentCount / totalStudents) * 100).toFixed(1) : "0"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Attendance Tracking</h1>
          <p className="mt-2 text-gray-600">Mark and track student attendance</p>
        </div>
        <Link
          href="/dashboard/attendance/bulk"
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
        >
          Bulk Mark Attendance
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Batch
            </label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
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
              Select Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {selectedBatch && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-600">Total Students</div>
              <div className="text-2xl font-bold text-foreground mt-1">{totalStudents}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-600">Present</div>
              <div className="text-2xl font-bold text-success mt-1">{presentCount}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-600">Absent</div>
              <div className="text-2xl font-bold text-error mt-1">{absentCount}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-600">Attendance Rate</div>
              <div className="text-2xl font-bold text-info mt-1">{attendanceRate}%</div>
            </div>
          </div>

          {/* Attendance List */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Attendance for {formatDate(selectedDate)}
              </h2>

              {loading ? (
                <div className="text-center py-12 text-gray-500">Loading attendance...</div>
              ) : attendance.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No attendance records found. Use &quot;Bulk Mark Attendance&quot; to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {attendance.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{record.student.name}</div>
                        <div className="text-sm text-gray-600">
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
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          Select a batch and date to view attendance records
        </div>
      )}
    </div>
  )
}
