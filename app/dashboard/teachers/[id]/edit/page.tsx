"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/Toast"
import { parseZodIssues } from "@/lib/form-errors"

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

export default function EditTeacherPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [usePBTarif, setUsePBTarif] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isDirty, setIsDirty] = useState(false)
  const { addToast } = useToast()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    active: true,
    teacherLevels: [] as string[],
    teacherTimings: [] as string[],
    hourlyRates: {} as Record<string, string>,
    currency: "EUR" as typeof CURRENCIES[number],
    whatsapp: "",
    remarks: "",
  })
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([
    { id: crypto.randomUUID(), startTime: "", endTime: "" }
  ])

  useEffect(() => {
    fetchTeacher()
  }, [params.id])

  const fetchTeacher = async () => {
    try {
      const res = await fetch(\`/api/teachers/\${params.id}\`)
      if (!res.ok) throw new Error("Failed to fetch teacher")

      const teacher = await res.json()

      // Convert hourly rates object to string values
      const hourlyRates: Record<string, string> = {}
      if (teacher.hourlyRate && typeof teacher.hourlyRate === 'object') {
        Object.entries(teacher.hourlyRate).forEach(([level, rate]) => {
          hourlyRates[level] = String(rate)
        })
      }

      setFormData({
        name: teacher.name || "",
        email: teacher.email || "",
        active: teacher.active ?? true,
        teacherLevels: teacher.teacherLevels || [],
        teacherTimings: teacher.teacherTimings || [],
        hourlyRates,
        currency: teacher.currency || "EUR",
        whatsapp: teacher.whatsapp || "",
        remarks: teacher.remarks || "",
      })

      // Set time slots
      if (teacher.teacherTimeSlots && teacher.teacherTimeSlots.length > 0) {
        setTimeSlots(
          teacher.teacherTimeSlots.map((slot: { startTime: string; endTime: string }) => ({
            id: crypto.randomUUID(),
            startTime: slot.startTime,
            endTime: slot.endTime,
          }))
        )
      }
    } catch (error) {
      console.error("Error fetching teacher:", error)
      addToast("Failed to load teacher data", { type: "error" })
    } finally {
      setLoadingData(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setFieldErrors({})

    try {
      // Filter out empty time slots
      const validTimeSlots = timeSlots.filter(
        slot => slot.startTime && slot.endTime
      ).map(({ startTime, endTime }) => ({ startTime, endTime }))

      // Convert string rates to numbers for API
      const hourlyRateNumbers: Record<string, number> = {}
      Object.entries(formData.hourlyRates).forEach(([level, rate]) => {
        if (rate) {
          hourlyRateNumbers[level] = Number(rate)
        }
      })

      const payload = {
        name: formData.name,
        email: formData.email,
        active: formData.active,
        teacherLevels: formData.teacherLevels,
        teacherTimings: formData.teacherTimings,
        teacherTimeSlots: validTimeSlots,
        hourlyRate: Object.keys(hourlyRateNumbers).length > 0 ? hourlyRateNumbers : undefined,
        currency: formData.currency,
        whatsapp: formData.whatsapp || undefined,
        remarks: formData.remarks || undefined,
      }

      const res = await fetch(\`/api/teachers/\${params.id}\`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setIsDirty(false)
        addToast('Teacher updated successfully', { type: 'success' })
        router.push('/dashboard/teachers')
        return
      }

      try {
        const data = await res.json()
        if (Array.isArray(data?.details)) {
          setFieldErrors(parseZodIssues(data.details))
          addToast(data?.error || 'Validation failed', { type: 'error' })
        } else {
          addToast(data?.error || 'Failed to update teacher', { type: 'error' })
        }
      } catch {
        addToast('Failed to update teacher', { type: 'error' })
      }
    } catch (error) {
      console.error("Error updating teacher:", error)
      addToast("Failed to update teacher", { type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleCheckboxChange = (field: 'teacherLevels' | 'teacherTimings', value: string) => {
    setFormData(prev => {
      const currentValues = prev[field]
      const isRemoving = currentValues.includes(value)
      const newValues = isRemoving
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value]

      // If PB Tarif is enabled and we're changing levels, update hourly rates
      if (field === 'teacherLevels' && usePBTarif) {
        const newRates = calculatePBTarifRates(newValues)
        return { ...prev, [field]: newValues, hourlyRates: newRates, currency: "INR" }
      }

      // If PB Tarif is not enabled and we're removing a level, remove its rate
      if (field === 'teacherLevels' && isRemoving) {
        const newRates = { ...prev.hourlyRates }
        delete newRates[value]
        return { ...prev, [field]: newValues, hourlyRates: newRates }
      }

      return { ...prev, [field]: newValues }
    })
    setIsDirty(true)
  }

  const calculatePBTarifRates = (levels: string[]): Record<string, string> => {
    const rates: Record<string, string> = {}
    levels.forEach(level => {
      rates[level] = String(PB_TARIF_RATES[level as keyof typeof PB_TARIF_RATES])
    })
    return rates
  }

  const handlePBTarifToggle = (checked: boolean) => {
    setUsePBTarif(checked)
    if (checked) {
      // Auto-fill rates for all selected levels and set currency to INR
      const rates = calculatePBTarifRates(formData.teacherLevels)
      setFormData(prev => ({
        ...prev,
        hourlyRates: rates,
        currency: "INR"
      }))
    }
  }

  const handleRateChange = (level: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      hourlyRates: {
        ...prev.hourlyRates,
        [level]: value
      }
    }))
    setIsDirty(true)
  }

  const addTimeSlot = () => {
    setTimeSlots([...timeSlots, { id: crypto.randomUUID(), startTime: "", endTime: "" }])
    setIsDirty(true)
  }

  const removeTimeSlot = (id: string) => {
    if (timeSlots.length > 1) {
      setTimeSlots(timeSlots.filter(slot => slot.id !== id))
    }
    setIsDirty(true)
  }

  const updateTimeSlot = (id: string, field: 'startTime' | 'endTime', value: string) => {
    setTimeSlots(timeSlots.map(slot =>
      slot.id === id ? { ...slot, [field]: value } : slot
    ))
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

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading teacher data...</div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Edit Teacher</h1>
        <p className="text-gray-500">Update teacher profile and credentials</p>
      </div>

      <form onSubmit={handleSubmit} className="panel p-6 space-y-6">
        {/* Basic Information */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label className="form-label">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setIsDirty(true) }}
                className={\`input \${fieldErrors.name ? 'border-red-500 focus:ring-red-500' : ''}\`}
                placeholder="Teacher's full name"
              />
              {fieldErrors.name && (
                <p className="text-red-600 text-xs mt-1">{fieldErrors.name}</p>
              )}
            </div>

            <div>
              <label className="form-label">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => { setFormData({ ...formData, email: e.target.value }); setIsDirty(true) }}
                className={\`input \${fieldErrors.email ? 'border-red-500 focus:ring-red-500' : ''}\`}
                placeholder="teacher@example.com"
              />
              {fieldErrors.email && (
                <p className="text-red-600 text-xs mt-1">{fieldErrors.email}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                This email is used for login credentials
              </p>
            </div>

            <div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => { setFormData({ ...formData, active: e.target.checked }); setIsDirty(true) }}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Inactive teachers cannot log in
              </p>
            </div>
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

          <div className="space-y-4">
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

            {/* Hourly Rates per Level */}
            {formData.teacherLevels.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hourly Pay per Level
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {formData.teacherLevels.map((level) => (
                    <div key={level} className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700 w-10">{level}:</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.hourlyRates[level] || ""}
                        onChange={(e) => handleRateChange(level, e.target.value)}
                        disabled={usePBTarif}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="600"
                      />
                      <span className="text-sm text-gray-500">{formData.currency}/hr</span>
                    </div>
                  ))}
                </div>
                {usePBTarif && (
                  <p className="text-xs text-gray-500 mt-2">
                    Rates are auto-calculated from PB Tarif
                  </p>
                )}
              </div>
            )}
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
