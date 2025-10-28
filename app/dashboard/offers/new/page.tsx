"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

type Teacher = {
  id: string
  name: string
  email: string
}

type BatchAssignment = {
  level: string
  rate: number
}

export default function NewOfferLetterPage() {
  const router = useRouter()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [teacherId, setTeacherId] = useState("")
  const [teacherAddress, setTeacherAddress] = useState("")
  const [offerDate, setOfferDate] = useState(new Date().toISOString().split("T")[0])
  const [acceptanceDeadline, setAcceptanceDeadline] = useState("")
  const [positionType, setPositionType] = useState<"PART_TIME" | "FULL_TIME">("PART_TIME")
  const [batchAssignments, setBatchAssignments] = useState<BatchAssignment[]>([
    { level: "", rate: 0 },
  ])
  const [notes, setNotes] = useState("")

  useEffect(() => {
    fetchTeachers()
    // Set default deadline to 7 days from now
    const deadline = new Date()
    deadline.setDate(deadline.getDate() + 7)
    setAcceptanceDeadline(deadline.toISOString().split("T")[0])
  }, [])

  const fetchTeachers = async () => {
    try {
      const res = await fetch("/api/teachers?active=true")
      if (!res.ok) throw new Error("Failed to fetch teachers")

      const data = await res.json()
      setTeachers(data)
    } catch (error) {
      console.error("Error fetching teachers:", error)
      alert("Failed to load teachers")
    } finally {
      setLoading(false)
    }
  }

  const handleAddBatch = () => {
    setBatchAssignments([...batchAssignments, { level: "", rate: 0 }])
  }

  const handleRemoveBatch = (index: number) => {
    setBatchAssignments(batchAssignments.filter((_, i) => i !== index))
  }

  const handleBatchChange = (index: number, field: keyof BatchAssignment, value: string | number) => {
    const newAssignments = [...batchAssignments]
    newAssignments[index] = {
      ...newAssignments[index],
      [field]: value,
    }
    setBatchAssignments(newAssignments)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!teacherId) {
      alert("Please select a teacher")
      return
    }

    if (!teacherAddress.trim()) {
      alert("Please enter teacher's address")
      return
    }

    if (!offerDate || !acceptanceDeadline) {
      alert("Please set offer date and acceptance deadline")
      return
    }

    if (new Date(acceptanceDeadline) <= new Date(offerDate)) {
      alert("Acceptance deadline must be after offer date")
      return
    }

    // Validate batch assignments
    const validBatches = batchAssignments.filter(b => b.level.trim() && b.rate > 0)
    if (validBatches.length === 0) {
      alert("Please add at least one batch assignment with valid level and rate")
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId,
          teacherAddress,
          offerDate,
          acceptanceDeadline,
          positionType,
          batchAssignments: validBatches,
          notes: notes.trim() || undefined,
        }),
      })

      if (res.ok) {
        alert("✅ Offer letter created successfully!")
        router.push("/dashboard/offers")
      } else {
        const error = await res.json()
        alert(`❌ Failed to create offer letter: ${error.error}`)
      }
    } catch (error) {
      console.error("Error creating offer letter:", error)
      alert("❌ Failed to create offer letter")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Create Offer Letter</h1>
          <p className="text-gray-500">Generate a new teacher offer letter</p>
        </div>
        <Link href="/dashboard/offers" className="btn-outline">
          ← Back to Offers
        </Link>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
        {/* Teacher Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Teacher *
          </label>
          <select
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="">-- Select Teacher --</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name} ({teacher.email})
              </option>
            ))}
          </select>
        </div>

        {/* Teacher Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Teacher Address *
          </label>
          <textarea
            value={teacherAddress}
            onChange={(e) => setTeacherAddress(e.target.value)}
            required
            rows={3}
            placeholder="Enter full address with street, city, state, and PIN"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          />
          <p className="text-xs text-gray-500 mt-1">
            This will appear on the offer letter. Enter each line of the address on a new line.
          </p>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Offer Date *
            </label>
            <input
              type="date"
              value={offerDate}
              onChange={(e) => setOfferDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Acceptance Deadline *
            </label>
            <input
              type="date"
              value={acceptanceDeadline}
              onChange={(e) => setAcceptanceDeadline(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
        </div>

        {/* Position Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Position Type *
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="PART_TIME"
                checked={positionType === "PART_TIME"}
                onChange={(e) => setPositionType(e.target.value as "PART_TIME")}
                className="w-4 h-4 text-primary border-gray-300 focus:ring-2 focus:ring-primary"
              />
              <span className="text-sm">Part-Time</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="FULL_TIME"
                checked={positionType === "FULL_TIME"}
                onChange={(e) => setPositionType(e.target.value as "FULL_TIME")}
                className="w-4 h-4 text-primary border-gray-300 focus:ring-2 focus:ring-primary"
              />
              <span className="text-sm">Full-Time</span>
            </label>
          </div>
        </div>

        {/* Batch Assignments */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Batch Assignments *
            </label>
            <button
              type="button"
              onClick={handleAddBatch}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + Add Batch
            </button>
          </div>

          <div className="space-y-3">
            {batchAssignments.map((batch, index) => (
              <div key={index} className="flex gap-3 items-start">
                <div className="flex-1">
                  <input
                    type="text"
                    value={batch.level}
                    onChange={(e) => handleBatchChange(index, "level", e.target.value)}
                    placeholder="e.g., A1, A2, B1, B2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div className="flex-1">
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">₹</span>
                    <input
                      type="number"
                      value={batch.rate || ""}
                      onChange={(e) => handleBatchChange(index, "rate", parseFloat(e.target.value) || 0)}
                      placeholder="Rate per hour"
                      min="0"
                      step="50"
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveBatch(index)}
                  disabled={batchAssignments.length === 1}
                  className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Add all batch levels and hourly rates that will be mentioned in the offer letter.
          </p>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Internal Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Add any internal notes about this offer (not shown in PDF)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        {/* Submit Button */}
        <div className="flex items-center gap-3 pt-4 border-t">
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Creating..." : "Create Offer Letter"}
          </button>
          <Link href="/dashboard/offers" className="btn-outline px-6 py-2">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
