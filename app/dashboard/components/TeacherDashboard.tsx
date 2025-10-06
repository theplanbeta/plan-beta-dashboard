"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

type TeacherData = {
  myBatches: Array<{
    id: string
    batchCode: string
    level: string
    enrolledCount: number
    totalSeats: number
    status: string
  }>
  myStudents: {
    total: number
    active: number
  }
  todayAttendance: {
    marked: number
    pending: number
  }
  avgAttendanceRate: number
}

export default function TeacherDashboard({ userName }: { userName: string }) {
  const [data, setData] = useState<TeacherData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [batchesRes, studentsRes] = await Promise.all([
        fetch("/api/batches"),
        fetch("/api/students"),
      ])

      const batches = await batchesRes.json()
      const students = await studentsRes.json()

      const activeStudents = students.filter((s: { completionStatus: string }) => s.completionStatus === 'ACTIVE')
      const avgAttendance = students.length > 0
        ? students.reduce((sum: number, s: { attendanceRate: number }) => sum + Number(s.attendanceRate), 0) / students.length
        : 0

      setData({
        myBatches: batches,
        myStudents: {
          total: students.length,
          active: activeStudents.length,
        },
        todayAttendance: {
          marked: 0,
          pending: activeStudents.length,
        },
        avgAttendanceRate: avgAttendance,
      })
    } catch (error) {
      console.error("Error fetching teacher data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Welcome back, {userName}!</h1>
        <p className="text-gray-600">Loading your classes...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Welcome back, {userName}!</h1>
        <p className="mt-2 text-gray-600">Here&apos;s an overview of your classes today.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">My Batches</div>
          <div className="mt-2 text-3xl font-bold text-primary">{data.myBatches.length}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">My Students</div>
          <div className="mt-2 text-3xl font-bold text-primary">{data.myStudents.active}</div>
          <div className="mt-1 text-sm text-gray-500">{data.myStudents.total} total</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">Attendance Today</div>
          <div className="mt-2 text-3xl font-bold text-warning">{data.todayAttendance.pending}</div>
          <div className="mt-1 text-sm text-gray-500">pending</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">Avg Attendance</div>
          <div className="mt-2 text-3xl font-bold text-success">
            {data.avgAttendanceRate.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* My Batches */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-foreground">My Batches</h2>
        </div>
        <div className="p-6">
          {data.myBatches.length === 0 ? (
            <p className="text-gray-500">No batches assigned yet.</p>
          ) : (
            <div className="space-y-4">
              {data.myBatches.map((batch) => (
                <Link
                  key={batch.id}
                  href={`/dashboard/batches/${batch.id}`}
                  className="block p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-foreground">{batch.batchCode}</div>
                      <div className="text-sm text-gray-600">Level {batch.level}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {batch.enrolledCount}/{batch.totalSeats} students
                      </div>
                      <div className="text-xs text-gray-500">{batch.status}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Link
          href="/dashboard/attendance"
          className="bg-primary text-white rounded-lg shadow p-6 hover:bg-primary-dark transition-colors"
        >
          <div className="text-lg font-semibold">Mark Attendance</div>
          <div className="mt-2 text-sm opacity-90">
            Record student attendance for today&apos;s classes
          </div>
        </Link>

        <Link
          href="/dashboard/students"
          className="bg-white border-2 border-primary text-primary rounded-lg shadow p-6 hover:bg-gray-50 transition-colors"
        >
          <div className="text-lg font-semibold">View My Students</div>
          <div className="mt-2 text-sm">
            See all students in your batches
          </div>
        </Link>
      </div>
    </div>
  )
}
