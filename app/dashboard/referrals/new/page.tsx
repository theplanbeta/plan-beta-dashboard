"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

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

    try {
      const res = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create referral")
      }

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
  }

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

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Referrer (Existing Student) <span className="text-error">*</span>
              </label>
              <select
                name="referrerId"
                value={formData.referrerId}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select student who referred...</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} ({student.studentId})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Referee (New Student) <span className="text-error">*</span>
              </label>
              <select
                name="refereeId"
                value={formData.refereeId}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Referral Date <span className="text-error">*</span>
              </label>
              <input
                type="date"
                name="referralDate"
                value={formData.referralDate}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enrollment Date (Optional)
              </label>
              <input
                type="date"
                name="enrollmentDate"
                value={formData.enrollmentDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Payout Details */}
        <div className="space-y-4 border-t pt-6">
          <h2 className="text-lg font-semibold text-foreground">Payout Details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payout Amount (€)
            </label>
            <input
              type="number"
              name="payoutAmount"
              value={formData.payoutAmount}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-gray-500 mt-1">
              Default: €2,000 (paid after referee completes 1 month with ≥50% attendance)
            </p>
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
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Any additional information about this referral..."
          />
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
        <div className="flex justify-end space-x-4 border-t pt-6">
          <Link
            href="/dashboard/referrals"
            className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create Referral"}
          </button>
        </div>
      </form>
    </div>
  )
}
