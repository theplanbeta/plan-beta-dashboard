"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Teacher {
  id: string
  name: string
  email: string
  specializations?: string
  hourlyRate?: number
}

export default function NewBatchPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loadingTeachers, setLoadingTeachers] = useState(true)

  const [formData, setFormData] = useState({
    batchCode: "",
    level: "A1",
    timing: "Morning",
    totalSeats: 10,
    revenueTarget: 0,
    teacherCost: 0,
    teacherId: "",
    startDate: "",
    endDate: "",
    schedule: "",
    status: "PLANNING",
    notes: "",
  })

  useEffect(() => {
    fetchTeachers()
  }, [])

  const fetchTeachers = async () => {
    try {
      const res = await fetch('/api/teachers?active=true')
      if (!res.ok) throw new Error('Failed to fetch teachers')
      const data = await res.json()
      setTeachers(data)
    } catch (err) {
      console.error('Error fetching teachers:', err)
    } finally {
      setLoadingTeachers(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to create batch")
      }

      router.push("/dashboard/batches")
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Failed to create batch. Please try again.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Calculate end date based on level and start date
  const calculateEndDate = (startDate: string, level: string): string => {
    if (!startDate) return ""

    const start = new Date(startDate)
    // A1/A2: 60 hours ÷ 1.5 hours/session = 40 sessions ÷ 5 sessions/week = 8 weeks
    // B1/B2: 90 hours ÷ 1.5 hours/session = 60 sessions ÷ 5 sessions/week = 12 weeks
    const weeksToAdd = (level === "A1" || level === "A2") ? 8 : 12

    const endDate = new Date(start)
    endDate.setDate(endDate.getDate() + (weeksToAdd * 7))

    return endDate.toISOString().split('T')[0]
  }

  // Auto-generate batch code: LEVEL-MONTH-TIMING-01
  const generateBatchCode = (level: string, timing: string, startDate: string): string => {
    if (!startDate) return ""

    const date = new Date(startDate)
    const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
    const month = monthNames[date.getMonth()]
    const timingCode = timing === "Morning" ? "MOR" : "EVE"

    return `${level}-${month}-${timingCode}-01`
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    const newValue = type === "number" ? parseFloat(value) || 0 : value

    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: newValue,
      }

      // Auto-calculate end date when start date or level changes
      if (name === "startDate" || name === "level") {
        const startDate = name === "startDate" ? newValue as string : prev.startDate
        const level = name === "level" ? newValue as string : prev.level
        updated.endDate = calculateEndDate(startDate, level)
      }

      // Auto-generate batch code when level, timing, or start date changes
      if (name === "level" || name === "timing" || name === "startDate") {
        const level = name === "level" ? newValue as string : prev.level
        const timing = name === "timing" ? newValue as string : prev.timing
        const startDate = name === "startDate" ? newValue as string : prev.startDate
        updated.batchCode = generateBatchCode(level, timing, startDate)
      }

      return updated
    })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Create New Batch</h1>
          <p className="mt-2 text-gray-600">Set up a new course batch</p>
        </div>
        <Link
          href="/dashboard/batches"
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {error && (
          <div className="bg-error/10 border border-error text-error px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Batch Details */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Batch Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Level <span className="text-error">*</span>
              </label>
              <select
                name="level"
                value={formData.level}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="A1">A1 (60 hours - 8 weeks)</option>
                <option value="A2">A2 (60 hours - 8 weeks)</option>
                <option value="B1">B1 (90 hours - 12 weeks)</option>
                <option value="B2">B2 (90 hours - 12 weeks)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timing <span className="text-error">*</span>
              </label>
              <select
                name="timing"
                value={formData.timing}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="Morning">Morning</option>
                <option value="Evening">Evening</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch Code (Auto-generated)
              </label>
              <input
                type="text"
                name="batchCode"
                value={formData.batchCode}
                onChange={handleChange}
                required
                placeholder="Select level, timing, and start date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary"
                readOnly
              />
              <p className="text-xs text-success mt-1">
                {formData.batchCode && (
                  <>Auto-generated: LEVEL-MONTH-TIMING-01</>
                )}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Seats <span className="text-error">*</span>
              </label>
              <input
                type="number"
                name="totalSeats"
                value={formData.totalSeats}
                onChange={handleChange}
                required
                min="1"
                max="50"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="PLANNING">Planning</option>
                <option value="FILLING">Filling</option>
                <option value="FULL">Full</option>
                <option value="RUNNING">Running</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign Teacher
              </label>
              <select
                name="teacherId"
                value={formData.teacherId}
                onChange={handleChange}
                disabled={loadingTeachers}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
              >
                <option value="">-- No teacher assigned --</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name} ({teacher.email})
                    {teacher.specializations ? ` - ${teacher.specializations}` : ''}
                    {teacher.hourlyRate ? ` - ₹${teacher.hourlyRate}/hr` : ''}
                  </option>
                ))}
              </select>
              {loadingTeachers && (
                <p className="text-xs text-gray-500 mt-1">Loading teachers...</p>
              )}
              {!loadingTeachers && teachers.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  No active teachers available. Create a teacher account first.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="space-y-4 border-t pt-6">
          <h2 className="text-lg font-semibold text-foreground">Schedule</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date <span className="text-error">*</span>
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-gray-500 mt-1">
                Mon-Fri classes, 1.5 hours/session
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date (Auto-calculated)
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary"
                readOnly
              />
              <p className="text-xs text-success mt-1">
                {formData.endDate && formData.startDate && (
                  <>Automatically set based on level and start date</>
                )}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Schedule (Optional)
            </label>
            <input
              type="text"
              name="schedule"
              value={formData.schedule}
              onChange={handleChange}
              placeholder="e.g., Mon/Wed/Fri 6:00 PM - 8:00 PM"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Financial */}
        <div className="space-y-4 border-t pt-6">
          <h2 className="text-lg font-semibold text-foreground">Financial</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Revenue Target (€)
              </label>
              <input
                type="number"
                name="revenueTarget"
                value={formData.revenueTarget}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-gray-500 mt-1">Expected total revenue from this batch</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teacher Cost (€)
              </label>
              <input
                type="number"
                name="teacherCost"
                value={formData.teacherCost}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-gray-500 mt-1">Total cost to pay the teacher</p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Expected Profit:</span>
              <span className="font-semibold text-success">
                €{(formData.revenueTarget - formData.teacherCost).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="border-t pt-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (Optional)
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Any additional information about this batch..."
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end space-x-4 border-t pt-6">
          <Link
            href="/dashboard/batches"
            className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create Batch"}
          </button>
        </div>
      </form>
    </div>
  )
}
