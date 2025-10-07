"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface TimeSlot {
  id: string
  startTime: string
  endTime: string
}

const LEVELS = ['A1', 'A2', 'B1', 'B2'] as const
const TIMINGS = ['Morning', 'Evening'] as const
const CURRENCIES = ['EUR', 'INR'] as const

// PB Tarif rates in INR per hour
const PB_TARIF_RATES = {
  A1: 600,
  A2: 650,
  B1: 700,
  B2: 750,
}

export default function EditTeacherPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [usePBTarif, setUsePBTarif] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    teacherLevels: [] as string[],
    teacherTimings: [] as string[],
    hourlyRate: "",
    currency: "EUR" as typeof CURRENCIES[number],
    whatsapp: "",
    remarks: "",
  })
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([
    { id: crypto.randomUUID(), startTime: "", endTime: "" }
  ])

  useEffect(() => {
    fetchTeacher()
  }, [id])

  const fetchTeacher = async () => {
    try {
      const res = await fetch(`/api/teachers/${id}`)
      if (!res.ok) throw new Error("Failed to fetch teacher")

      const teacher = await res.json()

      setFormData({
        name: teacher.name || "",
        teacherLevels: teacher.teacherLevels || [],
        teacherTimings: teacher.teacherTimings || [],
        hourlyRate: teacher.hourlyRate ? String(teacher.hourlyRate) : "",
        currency: teacher.currency || "EUR",
        whatsapp: teacher.whatsapp || "",
        remarks: teacher.remarks || "",
      })

      if (teacher.teacherTimeSlots && teacher.teacherTimeSlots.length > 0) {
        setTimeSlots(teacher.teacherTimeSlots.map((slot: { startTime: string, endTime: string }) => ({
          id: crypto.randomUUID(),
          startTime: slot.startTime,
          endTime: slot.endTime,
        })))
      }
    } catch (error) {
      console.error("Error fetching teacher:", error)
      alert("Failed to load teacher data")
    } finally {
      setFetching(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Filter out empty time slots
      const validTimeSlots = timeSlots.filter(
        slot => slot.startTime && slot.endTime
      ).map(({ startTime, endTime }) => ({ startTime, endTime }))

      const payload = {
        name: formData.name,
        teacherLevels: formData.teacherLevels,
        teacherTimings: formData.teacherTimings,
        teacherTimeSlots: validTimeSlots,
        hourlyRate: formData.hourlyRate ? Number(formData.hourlyRate) : undefined,
        currency: formData.currency,
        whatsapp: formData.whatsapp || undefined,
        remarks: formData.remarks || undefined,
      }

      const res = await fetch(`/api/teachers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        router.push("/dashboard/teachers")
      } else {
        const error = await res.json()
        alert(error.error || "Failed to update teacher")
      }
    } catch (error) {
      console.error("Error updating teacher:", error)
      alert("Failed to update teacher")
    } finally {
      setLoading(false)
    }
  }

  const calculatePBTarifRate = (levels: string[]) => {
    if (levels.length === 0) return null
    // Get the highest rate from selected levels
    const rates = levels.map(level => PB_TARIF_RATES[level as keyof typeof PB_TARIF_RATES])
    return Math.max(...rates)
  }

  const handlePBTarifToggle = (checked: boolean) => {
    setUsePBTarif(checked)
    if (checked) {
      // Auto-fill rate based on selected levels and set currency to INR
      const rate = calculatePBTarifRate(formData.teacherLevels)
      setFormData(prev => ({
        ...prev,
        hourlyRate: rate ? String(rate) : "",
        currency: "INR"
      }))
    }
  }

  const handleCheckboxChange = (field: 'teacherLevels' | 'teacherTimings', value: string) => {
    setFormData(prev => {
      const currentValues = prev[field]
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value]

      // If PB Tarif is enabled and we're changing levels, update hourly rate
      if (field === 'teacherLevels' && usePBTarif) {
        const highestRate = calculatePBTarifRate(newValues)
        return { ...prev, [field]: newValues, hourlyRate: highestRate ? String(highestRate) : "", currency: "INR" }
      }

      return { ...prev, [field]: newValues }
    })
  }

  const addTimeSlot = () => {
    setTimeSlots([...timeSlots, { id: crypto.randomUUID(), startTime: "", endTime: "" }])
  }

  const removeTimeSlot = (id: string) => {
    if (timeSlots.length > 1) {
      setTimeSlots(timeSlots.filter(slot => slot.id !== id))
    }
  }

  const updateTimeSlot = (id: string, field: 'startTime' | 'endTime', value: string) => {
    setTimeSlots(timeSlots.map(slot =>
      slot.id === id ? { ...slot, [field]: value } : slot
    ))
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading teacher...</div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Edit Teacher</h1>
        <p className="text-gray-500">Update teacher profile</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Basic Information */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Basic Information</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Teacher's full name"
            />
          </div>
        </div>

        {/* Teaching Preferences */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Teaching Preferences</h2>

          {/* Batches Assignable */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Batches Assignable
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {LEVELS.map((level) => (
                <label
                  key={level}
                  className="flex items-center space-x-2 cursor-pointer p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={formData.teacherLevels.includes(level)}
                    onChange={() => handleCheckboxChange('teacherLevels', level)}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-gray-700">{level}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Timings Available */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timings Available
            </label>
            <div className="grid grid-cols-2 gap-3">
              {TIMINGS.map((timing) => (
                <label
                  key={timing}
                  className="flex items-center space-x-2 cursor-pointer p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={formData.teacherTimings.includes(timing)}
                    onChange={() => handleCheckboxChange('teacherTimings', timing)}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-gray-700">{timing}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Time Slots */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Time Slots</h2>
            <button
              type="button"
              onClick={addTimeSlot}
              className="px-3 py-1 text-sm bg-primary text-white rounded-md hover:bg-primary-dark"
            >
              + Add Slot
            </button>
          </div>
          <div className="space-y-3">
            {timeSlots.map((slot) => (
              <div key={slot.id} className="flex items-center gap-3">
                <div className="flex-1">
                  <input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) => updateTimeSlot(slot.id, 'startTime', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Start time"
                  />
                </div>
                <span className="text-gray-500">—</span>
                <div className="flex-1">
                  <input
                    type="time"
                    value={slot.endTime}
                    onChange={(e) => updateTimeSlot(slot.id, 'endTime', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="End time"
                  />
                </div>
                {timeSlots.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTimeSlot(slot.id)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Add specific time slots when the teacher is available (e.g., 09:00 - 12:00)
          </p>
        </div>

        {/* Compensation */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Compensation</h2>

          {/* PB Tarif Toggle */}
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={usePBTarif}
                onChange={(e) => handlePBTarifToggle(e.target.checked)}
                className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary"
              />
              <div>
                <span className="font-medium text-gray-900">Use PB Tarif</span>
                <p className="text-xs text-gray-600 mt-1">
                  A1: ₹600/hr • A2: ₹650/hr • B1: ₹700/hr • B2: ₹750/hr
                  <br />
                  <span className="text-blue-600">Auto-fills hourly rate based on highest selected level</span>
                </p>
              </div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hourly Pay
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.hourlyRate}
                onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                disabled={usePBTarif}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="25.00"
              />
              {usePBTarif && (
                <p className="text-xs text-gray-500 mt-1">
                  Rate is auto-calculated from PB Tarif
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value as typeof CURRENCIES[number] })}
                disabled={usePBTarif}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
              {usePBTarif && (
                <p className="text-xs text-gray-500 mt-1">
                  Currency is set to INR for PB Tarif
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Contact & Additional Info */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Contact & Additional Info</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                WhatsApp Number
              </label>
              <input
                type="text"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="+49 123 456789"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remarks
              </label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Additional notes about the teacher..."
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-4 border-t">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update Teacher"}
          </button>
        </div>
      </form>
    </div>
  )
}
