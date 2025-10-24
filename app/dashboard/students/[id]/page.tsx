"use client"

import { use, useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils"
import { normalizeCurrency } from "@/lib/currency"

type Student = {
  id: string
  studentId: string
  name: string
  whatsapp: string
  email: string | null
  enrollmentDate: string
  currentLevel: string
  isCombo: boolean
  comboLevels: string[]
  originalPrice: number
  discountApplied: number
  finalPrice: number
  currency: string
  paymentStatus: string
  totalPaid: number
  balance: number
  referralSource: string
  trialAttended: boolean
  trialDate: string | null
  classesAttended: number
  totalClasses: number
  attendanceRate: number
  completionStatus: string
  notes: string | null
  createdAt: string
  batch: {
    id: string
    batchCode: string
    level: string
  } | null
  payments: Array<{
    id: string
    amount: number
    paymentDate: string
    method: string
    status: string
    hasReceipt?: boolean
  }>
  attendance: Array<{
    id: string
    date: string
    status: string
  }>
}

type TeacherReview = {
  id: string
  teacherId: string
  rating?: number | null
  category?: string | null
  comment: string
  createdAt: string
  teacher: {
    id: string
    name: string | null
    email: string | null
  }
}

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data: session } = useSession()
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [suspending, setSuspending] = useState(false)
  const [reviews, setReviews] = useState<TeacherReview[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [reviewError, setReviewError] = useState("")
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    category: "",
    comment: "",
  })

  useEffect(() => {
    fetchStudent()
    fetchReviews()
  }, [id])

  const fetchStudent = async () => {
    try {
      const res = await fetch(`/api/students/${id}`)
      if (!res.ok) throw new Error("Failed to fetch student")

      const data = await res.json()
      setStudent(data)
    } catch (error) {
      console.error("Error fetching student:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchReviews = async () => {
    try {
      setReviewsLoading(true)
      const res = await fetch(`/api/students/${id}/reviews`)
      if (!res.ok) throw new Error("Failed to fetch reviews")
      const data = await res.json()
      setReviews(data)
      setReviewError("")
    } catch (error) {
      console.error("Error fetching reviews:", error)
      setReviewError("Could not load teacher notes.")
    } finally {
      setReviewsLoading(false)
    }
  }

  const handleReviewSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!reviewForm.comment.trim()) {
      setReviewError("Please add a quick comment before submitting.")
      return
    }

    setSubmittingReview(true)
    setReviewError("")

    try {
      const res = await fetch(`/api/students/${id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: reviewForm.rating,
          category: reviewForm.category || undefined,
          comment: reviewForm.comment,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to submit review")
      }

      setReviewForm({ rating: 5, category: "", comment: "" })
      await fetchReviews()
    } catch (error: any) {
      setReviewError(error?.message || "Failed to submit review")
    } finally {
      setSubmittingReview(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this student? This action cannot be undone.")) {
      return
    }

    setDeleting(true)
    try {
      const res = await fetch(`/api/students/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to delete student")

      router.push("/dashboard/students")
      router.refresh()
    } catch (error) {
      console.error("Error deleting student:", error)
      alert("Failed to delete student")
    } finally {
      setDeleting(false)
    }
  }

  const handleSuspend = async () => {
    const reason = prompt("Please enter the reason for suspending this student:")
    if (reason === null) return // User cancelled

    setSuspending(true)
    try {
      const res = await fetch(`/api/students/${id}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || undefined }),
      })

      if (!res.ok) throw new Error("Failed to suspend student")

      await fetchStudent()
      alert("Student suspended successfully")
    } catch (error) {
      console.error("Error suspending student:", error)
      alert("Failed to suspend student")
    } finally {
      setSuspending(false)
    }
  }

  const handleReactivate = async () => {
    if (!confirm("Are you sure you want to reactivate this student?")) {
      return
    }

    setSuspending(true)
    try {
      const res = await fetch(`/api/students/${id}/reactivate`, {
        method: "POST",
      })

      if (!res.ok) throw new Error("Failed to reactivate student")

      await fetchStudent()
      alert("Student reactivated successfully")
    } catch (error) {
      console.error("Error reactivating student:", error)
      alert("Failed to reactivate student")
    } finally {
      setSuspending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading student...</div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-error">Student not found</div>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      PAID: "bg-success/10 text-success",
      PENDING: "bg-warning/10 text-warning",
      PARTIAL: "bg-info/10 text-info",
      OVERDUE: "bg-error/10 text-error",
      ACTIVE: "bg-success/10 text-success",
      COMPLETED: "bg-info/10 text-info",
      DROPPED: "bg-error/10 text-error",
      ON_HOLD: "bg-warning/10 text-warning",
      SUSPENDED: "bg-gray-500/10 text-gray-700 dark:text-gray-300",
    }
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  const isTeacher = session?.user?.role === "TEACHER"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold text-foreground">{student.name}</h1>
            <span className={`px-3 py-1 rounded-full text-sm ${getStatusBadge(student.completionStatus)}`}>
              {student.completionStatus}
            </span>
          </div>
          <p className="mt-2 text-gray-600">Student ID: {student.studentId}</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href={`/dashboard/payments/new?studentId=${student.id}`}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            title="Record a new payment"
          >
            Record New Payment
          </Link>
          <Link
            href={`/dashboard/students/${student.id}/edit`}
            className="btn-primary"
          >
            Edit Student
          </Link>
          {student.completionStatus === "SUSPENDED" ? (
            <button
              onClick={handleReactivate}
              disabled={suspending}
              className="px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white disabled:opacity-50"
            >
              {suspending ? "Reactivating..." : "Reactivate Student"}
            </button>
          ) : (
            <button
              onClick={handleSuspend}
              disabled={suspending}
              className="px-4 py-2 border border-orange-600 text-orange-600 rounded-md hover:bg-orange-600 hover:text-white disabled:opacity-50"
            >
              {suspending ? "Suspending..." : "Suspend Student"}
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 border border-error text-error rounded-md hover:bg-error hover:text-white disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
          <Link
            href="/dashboard/students"
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Back
          </Link>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600">Total Paid</div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {formatCurrency(Number(student.totalPaid), normalizeCurrency(student.currency))}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            of {formatCurrency(Number(student.finalPrice), normalizeCurrency(student.currency))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600">Balance</div>
          <div className="text-2xl font-bold text-warning mt-1">
            {formatCurrency(Number(student.balance), normalizeCurrency(student.currency))}
          </div>
          <div className={`text-xs mt-1 px-2 py-1 rounded inline-block ${getStatusBadge(student.paymentStatus)}`}>
            {student.paymentStatus}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600">Attendance Rate</div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {Number(student.attendanceRate).toFixed(0)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {student.classesAttended} / {student.totalClasses} classes
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600">
            {student.isCombo ? 'Combo Package' : 'Current Level'}
          </div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {student.isCombo ? 'Combo' : student.currentLevel}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {student.isCombo && student.comboLevels.length > 0
              ? student.comboLevels.join(', ')
              : student.currentLevel}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Personal Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">WhatsApp</div>
                <div className="font-medium">{student.whatsapp}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Email</div>
                <div className="font-medium">{student.email || "-"}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Enrollment Date</div>
                <div className="font-medium">{formatDate(student.enrollmentDate)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Batch</div>
                <div className="font-medium">{student.batch?.batchCode || "Not Assigned"}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Referral Source</div>
                <div className="font-medium">{student.referralSource}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Trial Attended</div>
                <div className="font-medium">
                  {student.trialAttended ? (
                    <span className="text-success">Yes</span>
                  ) : (
                    <span className="text-gray-500">No</span>
                  )}
                  {student.trialDate && (
                    <span className="text-xs text-gray-500 ml-2">
                      ({formatDate(student.trialDate)})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {student.notes && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm text-gray-600 mb-1">Notes</div>
                <div className="text-sm">{student.notes}</div>
              </div>
            )}
          </div>

          {/* Recent Payments */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Payment History</h2>
            {student.payments.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500 mb-4">No payments recorded yet</div>
                <Link
                  href={`/dashboard/payments/new?studentId=${student.id}`}
                  className="inline-block px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Record New Payment
                </Link>
                <p className="text-xs text-gray-500 mt-3">
                  Record a payment to generate receipts
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {student.payments.slice(0, 5).map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-lg">{formatCurrency(Number(payment.amount), normalizeCurrency(student.currency))}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {formatDate(payment.paymentDate)} • {payment.method}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-1 items-end">
                        {payment.hasReceipt && (
                          <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            Has Receipt
                          </span>
                        )}
                        <span className={`px-2 py-1 rounded text-xs ${getStatusBadge(payment.status)}`}>
                          {payment.status}
                        </span>
                      </div>
                      <Link
                        href={`/dashboard/payments/${payment.id}`}
                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark text-sm font-medium whitespace-nowrap"
                      >
                        {payment.hasReceipt ? 'View Receipt' : 'Generate Receipt'}
                      </Link>
                    </div>
                  </div>
                ))}
                {student.payments.length > 5 && (
                  <div className="text-center pt-2">
                    <Link
                      href={`/dashboard/payments?studentId=${student.id}`}
                      className="text-sm text-primary hover:text-primary-dark hover:underline"
                    >
                      View all {student.payments.length} payments →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pricing Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-foreground mb-4">Pricing Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Original Price</span>
                <span className="font-medium">{formatCurrency(Number(student.originalPrice), normalizeCurrency(student.currency))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Discount</span>
                <span className="font-medium text-success">
                  -{formatCurrency(Number(student.discountApplied), normalizeCurrency(student.currency))}
                </span>
              </div>
              <div className="flex justify-between pt-3 border-t">
                <span className="font-semibold">Final Price</span>
                <span className="font-semibold">{formatCurrency(Number(student.finalPrice), normalizeCurrency(student.currency))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Paid</span>
                <span className="font-medium text-success">
                  {formatCurrency(Number(student.totalPaid), normalizeCurrency(student.currency))}
                </span>
              </div>
              <div className="flex justify-between pt-3 border-t">
                <span className="font-semibold">Balance</span>
                <span className="font-semibold text-warning">
                  {formatCurrency(Number(student.balance), normalizeCurrency(student.currency))}
                </span>
              </div>
            </div>
          </div>

      {/* Recent Attendance */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-foreground mb-4">Recent Attendance</h3>
        {student.attendance.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">No attendance records</div>
        ) : (
          <div className="space-y-2">
            {student.attendance.slice(0, 10).map((record) => (
              <div key={record.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{formatDate(record.date)}</span>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    record.status === "PRESENT"
                      ? "bg-success/10 text-success"
                      : record.status === "ABSENT"
                      ? "bg-error/10 text-error"
                      : "bg-warning/10 text-warning"
                  }`}
                >
                  {record.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>

  {/* Teacher Reviews Section */}
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div className="lg:col-span-2 space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Teacher Notes & Reviews</h2>
          {reviewsLoading && <span className="text-xs text-gray-500">Loading…</span>}
        </div>
        {reviewError && <p className="text-sm text-error mt-2">{reviewError}</p>}
        {!reviewsLoading && reviews.length === 0 && !reviewError && (
          <p className="text-sm text-gray-500 mt-4">No teacher feedback yet. Encourage teachers to leave a quick note after class.</p>
        )}
        <div className="mt-4 space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-foreground">
                    {review.teacher.name || "Teacher"}
                    {review.category && (
                      <span className="ml-2 text-xs uppercase tracking-wide text-info font-medium bg-info/10 px-2 py-0.5 rounded-full">
                        {review.category}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">{formatDateTime(review.createdAt)}</p>
                </div>
                {typeof review.rating === "number" && (
                  <span className="text-sm font-semibold text-warning">⭐ {review.rating}/5</span>
                )}
              </div>
              <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                {review.comment}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-foreground">Daily Teacher Tips</h3>
        <p className="text-sm text-gray-600 mt-2">
          Share brief notes after each class—celebrate progress, highlight blockers, and flag students who need outreach. Admins review these notes daily to coordinate support.
        </p>
        <ul className="mt-3 space-y-2 text-sm text-gray-600 list-disc list-inside">
          <li>Keep feedback constructive and specific.</li>
          <li>Use categories like “Attendance”, “Homework”, “Behaviour”.</li>
          <li>Ratings highlight overall engagement but are optional.</li>
        </ul>
      </div>

      {isTeacher && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-foreground">Leave a Review</h3>
          <form onSubmit={handleReviewSubmit} className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rating</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  value={reviewForm.rating}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, rating: Number(e.target.value) }))}
                >
                  {[5, 4, 3, 2, 1].map((score) => (
                    <option key={score} value={score}>{score}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Category (optional)</label>
                <input
                  type="text"
                  value={reviewForm.category}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, category: e.target.value }))}
                  placeholder="e.g., Attendance"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Comment</label>
              <textarea
                value={reviewForm.comment}
                onChange={(e) => setReviewForm((prev) => ({ ...prev, comment: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Share observations, homework reminders, or blockers..."
                required
              />
            </div>
            <button
              type="submit"
              disabled={submittingReview}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submittingReview ? "Submitting..." : "Submit review"}
            </button>
          </form>
        </div>
      )}
    </div>
  </div>
    </div>
  )
}
