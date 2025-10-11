"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useToast } from "@/components/Toast"
import { parseZodIssues } from "@/lib/form-errors"

type Student = {
  id: string
  studentId: string
  name: string
  whatsapp: string
}

export default function NewReferralPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [students, setStudents] = useState<Student[]>([])
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isDirty, setIsDirty] = useState(false)
  const { addToast } = useToast()

  const [formData, setFormData] = useState({
    referrerId: "",
    refereeId: "",
    referralDate: new Date().toISOString().split("T")[0],
    enrollmentDate: "",
    payoutAmount: 2000,
    notes: "",
  })

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    try {
      const res = await fetch("/api/students")
      const data = await res.json()
      setStudents(data)
    } catch (error) {
      console.error("Error fetching students:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.referrerId === formData.refereeId) {
      setError("Referrer and referee cannot be the same student")
      return
    }

    setLoading(true)
    setError("")
    setFieldErrors({})

    try {
      const res = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        try {
          const data = await res.json()
          if (Array.isArray(data?.details)) {
            setFieldErrors(parseZodIssues(data.details))
            setError(data?.error || 'Validation failed')
          } else {
            setError(data?.error || 'Failed to create referral')
          }
        } catch {
          setError('Failed to create referral')
        }
        return
      }

      addToast('Referral created successfully', { type: 'success' })
      router.push("/dashboard/referrals")
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create referral. Please try again.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    }))
    setIsDirty(true)
  }

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty && !loading) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty, loading])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Add Referral</h1>
          <p className="mt-2 text-gray-600">Record a new student referral</p>
        </div>
        <Link
          href="/dashboard/referrals"
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="panel p-6 space-y-6">
        {error && (
          <div className="bg-error/10 border border-error text-error px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Referral Information */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Referral Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                Referrer (Existing Student) <span className="text-error">*</span>
              </label>
              <select
                name="referrerId"
                value={formData.referrerId}
                onChange={handleChange}
                required
                className={`select ${fieldErrors.referrerId ? 'border-red-500 focus:ring-red-500' : ''}`}
              >
                <option value="">Select student who referred...</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} ({student.studentId})
                  </option>
                ))}
              </select>
              {fieldErrors.referrerId && (
                <p className="text-red-600 text-xs mt-1">{fieldErrors.referrerId}</p>
              )}
            </div>

            <div>
              <label className="form-label">
                Referee (New Student) <span className="text-error">*</span>
              </label>
              <select
                name="refereeId"
                value={formData.refereeId}
                onChange={handleChange}
                required
                className={`select ${fieldErrors.refereeId ? 'border-red-500 focus:ring-red-500' : ''}`}
              >
                <option value="">Select referred student...</option>
                {students
                  .filter((s) => s.id !== formData.referrerId)
                  .map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name} ({student.studentId})
                    </option>
                  ))}
              </select>
              {fieldErrors.refereeId && (
                <p className="text-red-600 text-xs mt-1">{fieldErrors.refereeId}</p>
              )}
            </div>

            <div>
              <label className="form-label">
                Referral Date <span className="text-error">*</span>
              </label>
              <input
                type="date"
                name="referralDate"
                value={formData.referralDate}
                onChange={handleChange}
                required
                className={`input ${fieldErrors.referralDate ? 'border-red-500 focus:ring-red-500' : ''}`}
              />
              {fieldErrors.referralDate && (
                <p className="text-red-600 text-xs mt-1">{fieldErrors.referralDate}</p>
              )}
            </div>

            <div>
              <label className="form-label">
                Enrollment Date (Optional)
              </label>
              <input
                type="date"
                name="enrollmentDate"
                value={formData.enrollmentDate}
                onChange={handleChange}
                className={`input ${fieldErrors.enrollmentDate ? 'border-red-500 focus:ring-red-500' : ''}`}
              />
              {fieldErrors.enrollmentDate && (
                <p className="text-red-600 text-xs mt-1">{fieldErrors.enrollmentDate}</p>
              )}
            </div>
          </div>
        </div>

        {/* Payout Details */}
        <div className="space-y-4 border-t pt-6">
          <h2 className="text-lg font-semibold text-foreground">Payout Details</h2>

          <div>
            <label className="form-label">
              Payout Amount (€)
            </label>
            <input
              type="number"
              name="payoutAmount"
              value={formData.payoutAmount}
              onChange={handleChange}
              min="0"
              step="0.01"
              className={`input ${fieldErrors.payoutAmount ? 'border-red-500 focus:ring-red-500' : ''}`}
            />
            {fieldErrors.payoutAmount && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.payoutAmount}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Default: €2,000 (paid after referee completes 1 month with ≥50% attendance)
            </p>
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
            rows={3}
            className={`textarea ${fieldErrors.notes ? 'border-red-500 focus:ring-red-500' : ''}`}
            placeholder="Any additional information about this referral..."
          />
          {fieldErrors.notes && (
            <p className="text-red-600 text-xs mt-1">{fieldErrors.notes}</p>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-info/10 border border-info p-4 rounded-md">
          <h3 className="font-semibold text-info mb-2">Referral Program Rules:</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Referee must complete 1 month with ≥50% attendance</li>
            <li>• Payout is processed after Month 1 completion</li>
            <li>• Default payout: €2,000 per successful referral</li>
            <li>• System automatically tracks attendance and triggers payouts</li>
          </ul>
        </div>

        {/* Submit */}
        <div className="flex justify-end space-x-4 panel-section pt-6">
          <Link href="/dashboard/referrals" className="btn-outline px-6 py-2">Cancel</Link>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create Referral"}
          </button>
        </div>
      </form>
    </div>
  )
}
