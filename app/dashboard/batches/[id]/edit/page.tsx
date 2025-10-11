"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { COURSE_PRICING, EXCHANGE_RATE, type CourseLevel } from "@/lib/pricing"

interface Teacher {
  id: string
  name: string
  email: string
  teacherLevels: string[]
  hourlyRate?: Record<string, number> | null
  currency?: string | null
}

export default function EditBatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [initialLoading, setInitialLoading] = useState(true)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loadingTeachers, setLoadingTeachers] = useState(true)
  const [hasManualRevenueTarget, setHasManualRevenueTarget] = useState(false)
  const [hasManualTeacherCost, setHasManualTeacherCost] = useState(false)

  const getSuggestedRevenueTarget = (level: CourseLevel) => {
    const pricePerStudent = COURSE_PRICING[level]?.INR || 0
    const minProfitableStudents = (level === "A1" || level === "A2") ? 5 : 6
    return pricePerStudent * minProfitableStudents
  }

  const applySuggestedRevenueTarget = () => {
    const suggested = getSuggestedRevenueTarget(formData.level)
    setFormData((prev) => ({
      ...prev,
      revenueTarget: suggested,
    }))
    setHasManualRevenueTarget(false)
  }

  const applySuggestedTeacherCost = () => {
    if (!formData.teacherId) return
    const teacher = teachers.find(t => t.id === formData.teacherId)
    if (!teacher?.hourlyRate?.[formData.level]) return
    const hourlyRate = teacher.hourlyRate[formData.level]
    setFormData((prev) => ({
      ...prev,
      teacherCost: hourlyRate * 60,
    }))
    setHasManualTeacherCost(false)
  }

  const [formData, setFormData] = useState({
    batchCode: "",
    level: "A1" as CourseLevel,
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
  const suggestedRevenueTarget = getSuggestedRevenueTarget(formData.level)
  const suggestedTeacherCost = (() => {
    if (!formData.teacherId) return null
    const teacher = teachers.find(t => t.id === formData.teacherId)
    if (!teacher?.hourlyRate?.[formData.level]) return null
    const hourlyRate = teacher.hourlyRate[formData.level]
    return hourlyRate * 60
  })()

  useEffect(() => {
    fetchBatch()
    fetchTeachers()
  }, [id])

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

  const fetchBatch = async () => {
    try {
      const res = await fetch(`/api/batches/${id}`)
      if (!res.ok) throw new Error("Failed to fetch batch")

      const data = await res.json()
      setFormData({
        batchCode: data.batchCode,
        level: data.level,
        totalSeats: data.totalSeats,
        // Convert revenue target from EUR (DB) to INR (UI)
        revenueTarget: Number(data.revenueTarget) * EXCHANGE_RATE,
        teacherCost: Number(data.teacherCost),
        teacherId: data.teacherId || "",
        startDate: data.startDate ? new Date(data.startDate).toISOString().split("T")[0] : "",
        endDate: data.endDate ? new Date(data.endDate).toISOString().split("T")[0] : "",
        schedule: data.schedule || "",
        status: data.status,
        notes: data.notes || "",
      })
      setHasManualRevenueTarget(Number(data.revenueTarget) !== 0)
      setHasManualTeacherCost(Number(data.teacherCost) !== 0)
    } catch (err) {
      console.error(err)
      setError("Failed to load batch")
    } finally {
      setInitialLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setFieldErrors({})

    try {
      // Convert revenue target from INR (UI) to EUR (DB) before saving
      const dataToSave = {
        ...formData,
        revenueTarget: formData.revenueTarget / EXCHANGE_RATE,
      }

      const res = await fetch(`/api/batches/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSave),
      })

      if (!res.ok) {
        // Try to parse validation errors from API
        try {
          const data = await res.json()
          if (data?.details && Array.isArray(data.details)) {
            const fe: Record<string, string> = {}
            data.details.forEach((issue: any) => {
              const path = Array.isArray(issue?.path) ? issue.path.join('.') : ''
              const message = issue?.message || 'Invalid value'
              if (path) fe[path] = message
            })
            setFieldErrors(fe)
            setError(data?.error || 'Validation failed')
          } else {
            setError(data?.error || 'Failed to update batch')
          }
        } catch {
          setError('Failed to update batch')
        }
        return
      }

      router.push(`/dashboard/batches/${id}`)
      router.refresh()
    } catch (err) {
      setError("Failed to update batch. Please try again.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    const newValue = type === "number" ? parseFloat(value) || 0 : value

    if (name === "revenueTarget") {
      setHasManualRevenueTarget(true)
    }
    if (name === "teacherCost") {
      setHasManualTeacherCost(true)
    }

    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: newValue,
      }

      // Auto-fill teacher cost when teacher is selected
      if (name === "teacherId" && value && !hasManualTeacherCost) {
        const selectedTeacher = teachers.find(t => t.id === value)
        if (selectedTeacher?.hourlyRate?.[prev.level]) {
          // Assuming 60 hours total for a batch (adjust as needed)
          const hourlyRate = selectedTeacher.hourlyRate[prev.level]
          updated.teacherCost = hourlyRate * 60
        }
      }

      // Auto-fill revenue target when level changes (in INR)
      if (name === "level" && !hasManualRevenueTarget) {
        const level = value as CourseLevel
        updated.revenueTarget = getSuggestedRevenueTarget(level)
      }

      // Also update teacher cost if teacher is already selected and auto mode active
      if (name === "level" && prev.teacherId && !hasManualTeacherCost) {
        const selectedTeacher = teachers.find(t => t.id === prev.teacherId)
        if (selectedTeacher?.hourlyRate?.[value as string]) {
          const hourlyRate = selectedTeacher.hourlyRate[value as string]
          updated.teacherCost = hourlyRate * 60
        }
      }

      return updated
    })
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading batch...</div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Edit Batch</h1>
          <p className="mt-2 text-gray-600">Update batch information</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFormData(prev => ({...prev, teacherId: "", startDate: "", endDate: "", schedule: "", notes: ""}))}
            className="btn-outline px-3 py-2"
            title="Reset optional fields"
          >
            Reset Optional
          </button>
          <Link
            href={`/dashboard/batches/${id}`}
            className="btn-outline px-4 py-2"
          >
            Cancel
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="panel p-6 space-y-6">
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
              <label className="form-label">
                Batch Code <span className="text-error">*</span>
              </label>
              <input
                type="text"
                name="batchCode"
                value={formData.batchCode}
                onChange={handleChange}
                required
                placeholder="e.g., A1-JAN-EVE-01"
                className={`input ${fieldErrors.batchCode ? 'border-red-500 focus:ring-red-500' : ''}`}
              />
              {fieldErrors.batchCode && (
                <p className="text-red-600 text-xs mt-1">{fieldErrors.batchCode}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">Format: LEVEL-MONTH-TIME-NUMBER</p>
            </div>

            <div>
              <label className="form-label">
                Level <span className="text-error">*</span>
              </label>
              <select
                name="level"
                value={formData.level}
                onChange={handleChange}
                required
                className={`select ${fieldErrors.level ? 'border-red-500 focus:ring-red-500' : ''}`}
              >
                <option value="A1">A1</option>
                <option value="A1_HYBRID">A1 Hybrid (Pre-recorded)</option>
                <option value="A2">A2</option>
                <option value="B1">B1</option>
                <option value="B2">B2</option>
              </select>
              {fieldErrors.level && (
                <p className="text-red-600 text-xs mt-1">{fieldErrors.level}</p>
              )}
            </div>

            <div>
              <label className="form-label">
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
                className={`input ${fieldErrors.totalSeats ? 'border-red-500 focus:ring-red-500' : ''}`}
              />
              {fieldErrors.totalSeats && (
                <p className="text-red-600 text-xs mt-1">{fieldErrors.totalSeats}</p>
              )}
            </div>

            <div>
              <label className="form-label">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className={`select ${fieldErrors.status ? 'border-red-500 focus:ring-red-500' : ''}`}
              >
                <option value="PLANNING">Planning</option>
                <option value="FILLING">Filling</option>
                <option value="FULL">Full</option>
                <option value="RUNNING">Running</option>
                <option value="COMPLETED">Completed</option>
                <option value="POSTPONED">Postponed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              {fieldErrors.status && (
                <p className="text-red-600 text-xs mt-1">{fieldErrors.status}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="form-label">
                Assign Teacher
              </label>
              <select
                name="teacherId"
                value={formData.teacherId}
                onChange={handleChange}
                disabled={loadingTeachers}
                className={`select disabled:bg-gray-100 ${fieldErrors.teacherId ? 'border-red-500 focus:ring-red-500' : ''}`}
              >
                <option value="">-- No teacher assigned --</option>
                {teachers.map((teacher) => {
                  const levelRate = teacher.hourlyRate?.[formData.level]
                  const currency = teacher.currency || 'EUR'
                  const currencySymbol = currency === 'INR' ? '₹' : '€'
                  const rateText = levelRate ? ` - ${currencySymbol}${levelRate}/hr` : ''

                  return (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name} ({teacher.teacherLevels.join(', ')}){rateText}
                    </option>
                  )
                })}
              </select>
              {fieldErrors.teacherId && (
                <p className="text-red-600 text-xs mt-1">{fieldErrors.teacherId}</p>
              )}
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
              <label className="form-label">
                Start Date
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className={`input ${fieldErrors.startDate ? 'border-red-500 focus:ring-red-500' : ''}`}
              />
              {fieldErrors.startDate && (
                <p className="text-red-600 text-xs mt-1">{fieldErrors.startDate}</p>
              )}
            </div>

            <div>
              <label className="form-label">
                End Date
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className={`input ${fieldErrors.endDate ? 'border-red-500 focus:ring-red-500' : ''}`}
              />
              {fieldErrors.endDate && (
                <p className="text-red-600 text-xs mt-1">{fieldErrors.endDate}</p>
              )}
            </div>
          </div>

          <div>
            <label className="form-label">
              Schedule (Optional)
            </label>
            <input
              type="text"
              name="schedule"
              value={formData.schedule}
              onChange={handleChange}
              placeholder="e.g., Mon/Wed/Fri 6:00 PM - 8:00 PM"
              className={`input ${fieldErrors.schedule ? 'border-red-500 focus:ring-red-500' : ''}`}
            />
            {fieldErrors.schedule && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.schedule}</p>
            )}
          </div>
        </div>

        {/* Financial */}
        <div className="space-y-4 border-t pt-6">
          <h2 className="text-lg font-semibold text-foreground">Financial</h2>

          {/* Pricing Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Course Price: ₹{COURSE_PRICING[formData.level as CourseLevel]?.INR || 0} per student (€{COURSE_PRICING[formData.level as CourseLevel]?.EUR || 0})
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Minimum profitable: {formData.level === "A1" || formData.level === "A2" ? "5" : "6"} students
                  ({formData.level === "A1" || formData.level === "A2" ? "3" : "4"} is break-even but risky)
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Revenue Target (₹)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  name="revenueTarget"
                  value={formData.revenueTarget}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={applySuggestedRevenueTarget}
                  className="px-3 py-2 border border-primary text-primary rounded-md text-xs font-semibold hover:bg-primary hover:text-white transition-colors"
                >
                  Use suggested
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Suggested: ₹{COURSE_PRICING[formData.level as CourseLevel]?.INR || 0} × {formData.level === "A1" || formData.level === "A2" ? "5" : "6"} students = ₹{suggestedRevenueTarget.toFixed(2)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teacher Cost (₹)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  name="teacherCost"
                  value={formData.teacherCost}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={applySuggestedTeacherCost}
                  disabled={!suggestedTeacherCost}
                  className="px-3 py-2 border border-primary text-primary rounded-md text-xs font-semibold hover:bg-primary hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Use suggested
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Suggested baseline: {suggestedTeacherCost ? `₹${suggestedTeacherCost.toFixed(2)}` : "Select a teacher to calculate"} (hourly rate × 60 hrs). Adjust for custom arrangements.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Expected Profit (INR):</span>
              <span className="font-semibold text-success">
                ₹{(formData.revenueTarget - formData.teacherCost).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm mt-2 pt-2 border-t border-gray-200">
              <span className="text-gray-600">Expected Profit (EUR):</span>
              <span className="font-semibold text-success">
                €{((formData.revenueTarget - formData.teacherCost) / EXCHANGE_RATE).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="border-t pt-6">
          <label className="form-label">
            Notes (Optional)
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={4}
            className={`textarea ${fieldErrors.notes ? 'border-red-500 focus:ring-red-500' : ''}`}
            placeholder="Any additional information about this batch..."
          />
          {fieldErrors.notes && (
            <p className="text-red-600 text-xs mt-1">{fieldErrors.notes}</p>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end space-x-4 border-t pt-6">
          <Link href={`/dashboard/batches/${id}`} className="btn-outline px-6 py-2">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Updating..." : "Update Batch"}
          </button>
        </div>
      </form>
    </div>
  )
}
