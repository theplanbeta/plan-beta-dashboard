"use client"

import { useState, useEffect, Suspense, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { COURSE_PRICING, COURSE_LEVELS, type Currency, type CourseLevel, getCurrencySymbol, calculateFinalPrice, calculateBalance, getPrice, calculateComboPrice } from "@/lib/pricing"
import { parseZodIssues } from "@/lib/form-errors"


type Batch = {
  id: string
  batchCode: string
  level: string
  status: string
  totalSeats: number
  enrolledCount: number
}

type Lead = {
  id: string
  name: string
  whatsapp: string | null
  email: string | null
  phone: string | null
  status: string
  quality: string
  interestedLevel: string | null
}

function NewStudentForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const batchId = searchParams.get("batchId")
  const leadId = searchParams.get("leadId")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [batches, setBatches] = useState<Batch[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [showLeadConversion, setShowLeadConversion] = useState(!!leadId)
  const [selectedLeadId, setSelectedLeadId] = useState(leadId || "")
  const [parsing, setParsing] = useState(false)
  const [showSmartPaste, setShowSmartPaste] = useState(false)
  const [pastedText, setPastedText] = useState("")

  // Returning student detection
  const [existingStudent, setExistingStudent] = useState<{
    id: string
    studentId: string
    name: string
    whatsapp: string
    email: string | null
    currentLevel: string
    completionStatus: string
    batch: { id: string; batchCode: string; level: string; status: string } | null
    enrollments: Array<{
      id: string
      status: string
      batch: { id: string; batchCode: string; level: string; status: string }
    }>
  } | null>(null)
  const [reEnrollMode, setReEnrollMode] = useState(false)
  const [reEnrollBatchId, setReEnrollBatchId] = useState("")
  const [reEnrollNotes, setReEnrollNotes] = useState("")
  const [searchingStudent, setSearchingStudent] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Ref to prevent double-clicks (instant check, doesn't wait for React state)
  const isSubmittingRef = useRef(false)

  const [formData, setFormData] = useState({
    name: "",
    whatsapp: "",
    email: "",
    isCombo: false,
    comboLevels: [] as string[],
    currentLevel: "NEW",
    batchId: batchId || "",
    originalPrice: 0,
    discountApplied: 0,
    totalPaid: 0,
    paymentStatus: "PENDING",
    referralSource: "ORGANIC",
    trialAttended: false,
    notes: "",
    currency: "EUR" as Currency,
    leadId: leadId || "",
  })

  useEffect(() => {
    fetchBatches()
    fetchLeads()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selectedLeadId && leads.length > 0) {
      const lead = leads.find(l => l.id === selectedLeadId)
      if (lead) {
        setFormData(prev => ({
          ...prev,
          name: lead.name || "",
          whatsapp: lead.whatsapp || lead.phone || "",
          email: lead.email || "",
          currentLevel: lead.interestedLevel || "NEW",
          leadId: lead.id,
        }))
      } else {
        // Try fetching from API if not in the leads list
        fetch(`/api/leads/${selectedLeadId}`)
          .then(res => res.json())
          .then(leadData => {
            if (leadData) {
              setFormData(prev => ({
                ...prev,
                name: leadData.name || "",
                whatsapp: leadData.whatsapp || leadData.phone || "",
                email: leadData.email || "",
                currentLevel: leadData.interestedLevel || "NEW",
                leadId: leadData.id,
              }))
            }
          })
          .catch(error => console.error("Error fetching lead:", error))
      }
    }
  }, [selectedLeadId, leads])

  // Auto-populate pricing based on selection
  useEffect(() => {
    // Combo pricing
    if (formData.isCombo) {
      const comboLevels = formData.comboLevels as any as ("A1" | "A2" | "B1" | "B2")[]
      const price = comboLevels.length > 0 ? calculateComboPrice(comboLevels, formData.currency) : 0
      setFormData(prev => ({ ...prev, originalPrice: price }))
      return
    }

    // Single level pricing
    const level = formData.currentLevel
    if (level && level !== 'NEW' && (COURSE_PRICING as any)[level]) {
      const price = getPrice(level as CourseLevel, formData.currency)
      setFormData(prev => ({ ...prev, originalPrice: price }))
    }
  }, [formData.currentLevel, formData.currency, formData.isCombo, JSON.stringify(formData.comboLevels)])

  const fetchBatches = async () => {
    try {
      const res = await fetch("/api/batches")
      const data = await res.json()
      // Filter to show only PLANNING and FILLING batches
      const availableBatches = data.filter((b: Batch) =>
        b.status === "PLANNING" || b.status === "FILLING" || b.status === "RUNNING"
      )
      setBatches(availableBatches)
    } catch (error) {
      console.error("Error fetching batches:", error)
    }
  }

  const fetchLeads = async () => {
    try {
      // Fetch all unconverted leads
      const res = await fetch("/api/leads?converted=false")
      if (!res.ok) {
        throw new Error("Failed to fetch leads")
      }
      const data = await res.json()
      // Show all unconverted leads
      setLeads(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching leads:", error)
      setLeads([])
    }
  }

  // Search for existing student by WhatsApp (debounced)
  const searchExistingStudent = (whatsapp: string) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    if (!whatsapp || whatsapp.trim().length < 6) {
      setExistingStudent(null)
      return
    }
    searchTimeoutRef.current = setTimeout(async () => {
      setSearchingStudent(true)
      try {
        const res = await fetch(`/api/students/search?whatsapp=${encodeURIComponent(whatsapp.trim())}`)
        if (res.ok) {
          const data = await res.json()
          if (data.found) {
            setExistingStudent(data.student)
          } else {
            setExistingStudent(null)
          }
        }
      } catch (err) {
        console.error("Error searching student:", err)
      } finally {
        setSearchingStudent(false)
      }
    }, 500)
  }

  // Handle re-enrollment of existing student into new batch
  const handleReEnroll = async () => {
    if (!existingStudent || !reEnrollBatchId) return

    if (isSubmittingRef.current) return
    isSubmittingRef.current = true
    setLoading(true)
    setError("")

    try {
      const res = await fetch(`/api/students/${existingStudent.id}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: reEnrollBatchId,
          notes: reEnrollNotes || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data?.error || "Failed to enroll student in batch")
      } else {
        router.push(`/dashboard/students/${existingStudent.id}`)
        router.refresh()
      }
    } catch (err) {
      setError("Failed to enroll student. Please try again.")
      console.error(err)
    } finally {
      setLoading(false)
      isSubmittingRef.current = false
    }
  }

  // Validation: Check if combo levels include currentLevel
  const validateEnrollment = (isCombo: boolean, comboLevels: string[], currentLevel: string): string | null => {
    if (isCombo && comboLevels.length === 0) {
      return "Please select at least one level for combo enrollment"
    }
    if (isCombo && !comboLevels.includes(currentLevel)) {
      return `Current level "${currentLevel}" must be included in combo levels`
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Instant double-click prevention using ref (doesn't wait for React state)
    if (isSubmittingRef.current) {
      console.log("Prevented duplicate submission")
      return
    }
    isSubmittingRef.current = true

    setLoading(true)
    setError("")

    // Validate combo enrollment
    const validationError = validateEnrollment(formData.isCombo, formData.comboLevels, formData.currentLevel)
    if (validationError) {
      setError(validationError)
      setLoading(false)
      isSubmittingRef.current = false
      return
    }

    try {
      const res = await fetch("/api/students", {
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
            setError(data?.error || 'Failed to create student')
          }
        } catch {
          setError('Failed to create student')
        }
      } else {
        // success
        router.push("/dashboard/students")
        router.refresh()
      }
    } catch (err) {
      setError("Failed to create student. Please try again.")
      console.error(err)
    } finally {
      setLoading(false)
      isSubmittingRef.current = false
    }
  }

  // Auto-calculate price based on batch and currency
  const updatePriceFromBatch = (batchId: string, currency: Currency) => {
    if (!batchId) return null

    const selectedBatch = batches.find(b => b.id === batchId)
    if (!selectedBatch) return null

    // Map batch level to course level (A1, A2, B1, B2)
    const level = selectedBatch.level as CourseLevel
    if (level && COURSE_PRICING[level]) {
      return getPrice(level, currency)
    }
    return null
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    const newValue = type === "number"
      ? parseFloat(value) || 0
      : type === "checkbox"
      ? (e.target as HTMLInputElement).checked
      : value

    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: newValue,
      }

      // Auto-fill price when batch or currency changes
      if (name === "batchId" || name === "currency") {
        const batchId = name === "batchId" ? newValue as string : prev.batchId
        const currency = name === "currency" ? newValue as Currency : prev.currency
        const price = updatePriceFromBatch(batchId, currency)
        if (price !== null) {
          updated.originalPrice = price
        }
      }

      return updated
    })
  }

  const handleSmartParse = async () => {
    if (!pastedText.trim()) {
      alert("Please paste some text to parse")
      return
    }

    setParsing(true)

    try {
      // Warmup call to reduce latency
      fetch("/api/warmup").catch(() => {})

      const res = await fetch("/api/students/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pastedText }),
      })

      if (res.ok) {
        const result = await res.json()
        const parsed = result.data

        // Update form with parsed data
        setFormData(prev => ({
          ...prev,
          name: parsed.name || prev.name,
          whatsapp: parsed.whatsapp || prev.whatsapp,
          email: parsed.email || prev.email,
          notes: parsed.notes ?
            (prev.notes ? `${prev.notes}\n\n${parsed.notes}` : parsed.notes)
            : prev.notes,
        }))

        // Close the smart paste panel
        setShowSmartPaste(false)
        setPastedText("")

        alert("✅ Student data parsed successfully! Review and edit as needed before saving.")
      } else {
        const error = await res.json()
        alert(error.error || "Failed to parse student data")
      }
    } catch (error) {
      console.error("Error parsing student data:", error)
      alert("Failed to parse student data. Please try again.")
    } finally {
      setParsing(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Add New Student</h1>
          <p className="mt-2 text-gray-600">Enter student information to create enrollment</p>
        </div>
        <Link
          href="/dashboard/students"
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </Link>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="panel p-6 space-y-6">
        {error && (
          <div className="bg-error/10 border border-error text-error px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Returning Student Detection */}
        {existingStudent && !reEnrollMode && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-5">
            <h3 className="text-base font-semibold text-amber-900 mb-2">
              Existing Student Found
            </h3>
            <p className="text-sm text-amber-800 mb-3">
              <span className="font-semibold">{existingStudent.name}</span> ({existingStudent.whatsapp})
              is already enrolled
              {existingStudent.batch
                ? <> in <span className="font-semibold">{existingStudent.batch.batchCode}</span> ({existingStudent.batch.level})</>
                : <> (no batch assigned)</>
              }.
              {existingStudent.enrollments.length > 1 && (
                <span className="block mt-1 text-xs text-amber-700">
                  Total enrollments: {existingStudent.enrollments.length} batches
                </span>
              )}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setReEnrollMode(true)}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium"
              >
                Add to New Batch
              </button>
              <button
                type="button"
                onClick={() => setExistingStudent(null)}
                className="px-4 py-2 border border-amber-400 text-amber-800 rounded-lg hover:bg-amber-100 text-sm"
              >
                This is a different person
              </button>
            </div>
          </div>
        )}

        {/* Re-enrollment Form (simplified) */}
        {reEnrollMode && existingStudent && (
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-green-900">
                Add {existingStudent.name} to New Batch
              </h3>
              <button
                type="button"
                onClick={() => { setReEnrollMode(false); setReEnrollBatchId(""); setReEnrollNotes("") }}
                className="text-sm text-green-700 hover:text-green-900 underline"
              >
                Cancel
              </button>
            </div>

            <div className="bg-white/60 rounded-md p-3 text-sm text-green-800 space-y-1">
              <p><span className="font-medium">Student:</span> {existingStudent.name} ({existingStudent.studentId})</p>
              <p><span className="font-medium">WhatsApp:</span> {existingStudent.whatsapp}</p>
              <p><span className="font-medium">Current Level:</span> {existingStudent.currentLevel}</p>
              {existingStudent.enrollments.length > 0 && (
                <p><span className="font-medium">Active Batches:</span>{" "}
                  {existingStudent.enrollments
                    .filter(e => e.status === "ACTIVE")
                    .map(e => e.batch.batchCode)
                    .join(", ") || "None"}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-green-800 mb-1">
                Select New Batch <span className="text-error">*</span>
              </label>
              <select
                value={reEnrollBatchId}
                onChange={(e) => setReEnrollBatchId(e.target.value)}
                className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">-- Select a batch --</option>
                {batches
                  .filter(b => !existingStudent.enrollments.some(e => e.batch.id === b.id))
                  .map((batch) => {
                    const available = batch.totalSeats - batch.enrolledCount
                    return (
                      <option key={batch.id} value={batch.id}>
                        {batch.batchCode} ({batch.level}) - {available} seats available
                      </option>
                    )
                  })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-green-800 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={reEnrollNotes}
                onChange={(e) => setReEnrollNotes(e.target.value)}
                rows={2}
                placeholder="e.g., Re-enrolling for B2 after completing Spoken German"
                className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <button
              type="button"
              onClick={handleReEnroll}
              disabled={loading || !reEnrollBatchId}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? "Enrolling..." : `Enroll ${existingStudent.name} in New Batch`}
            </button>
          </div>
        )}

        {/* Hide the rest of the form when in re-enroll mode */}
        {!reEnrollMode && (<>

        {/* Smart Paste Feature */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-dashed border-blue-300 rounded-lg p-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                ✨ Smart Paste (AI-Powered)
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                Paste student data from any source - AI will auto-fill name, phone, email
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSmartPaste(!showSmartPaste)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              {showSmartPaste ? "Hide" : "Try Smart Paste"}
            </button>
          </div>

          {showSmartPaste && (
            <div className="mt-4 space-y-3">
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste anything here... Examples:&#10;&#10;• Copy-paste from WhatsApp&#10;• Walk-in student notes&#10;• Any unstructured text with student info&#10;&#10;AI will extract: name, phone, email, and notes"
                rows={8}
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSmartParse}
                  disabled={parsing || !pastedText.trim()}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 font-medium"
                >
                  {parsing ? "🤖 Parsing with AI..." : "🚀 Parse with AI"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPastedText("")
                    setShowSmartPaste(false)
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
              <p className="text-xs text-blue-600">
                💡 Tip: After AI fills the fields, you can still select batch, pricing, and payment details manually!
              </p>
            </div>
          )}
        </div>

        {/* Convert from Lead */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Convert from Existing Lead</h3>
            <button
              type="button"
              onClick={() => setShowLeadConversion(!showLeadConversion)}
              className="text-sm text-primary hover:text-primary-dark"
            >
              {showLeadConversion ? "Hide" : "Show"}
            </button>
          </div>

          {showLeadConversion && (
            <div className="space-y-3">
              <select
                value={selectedLeadId}
                onChange={(e) => setSelectedLeadId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">-- Select a lead to convert --</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.name} ({lead.whatsapp || lead.phone || lead.email}) - {lead.quality} - {lead.status}
                  </option>
                ))}
              </select>
              {selectedLeadId && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
                  ✓ Lead data has been auto-filled below. Review and complete the remaining fields.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Personal Information */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Personal Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-error">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                WhatsApp Number <span className="text-error">*</span>
              </label>
              <input
                type="text"
                name="whatsapp"
                value={formData.whatsapp}
                onChange={(e) => {
                  handleChange(e)
                  searchExistingStudent(e.target.value)
                }}
                required
                placeholder="+49 123 4567890"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {searchingStudent && (
                <p className="text-xs text-gray-500 mt-1">Checking for existing student...</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email (Optional)
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Enrollment Details */}
        <div className="space-y-4 border-t pt-6">
          <h2 className="text-lg font-semibold text-foreground">Enrollment Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Starting Level <span className="text-error">*</span>
              </label>
              <select
                name="currentLevel"
                value={formData.currentLevel}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="NEW">New (Starting from A1)</option>
                <option value="A1">A1</option>
                <option value="A2">A2</option>
                <option value="B1">B1</option>
                <option value="B2">B2</option>
                <option value="SPOKEN_GERMAN">Spoken German</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Which level are they enrolling in right now?
              </p>
            </div>

            <div className="col-span-2">
              <div className="flex items-center mb-3">
                <input
                  type="checkbox"
                  name="isCombo"
                  checked={formData.isCombo}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, isCombo: e.target.checked }))
                  }
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <label className="ml-2 text-sm font-medium text-gray-700">
                  Combo Enrollment (Multiple Levels)
                </label>
              </div>

              {formData.isCombo && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Combo Levels <span className="text-error">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {['A1', 'A2', 'B1', 'B2'].map((level) => (
                      <label key={level} className="flex items-center p-2 border border-gray-300 rounded-md hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={formData.comboLevels.includes(level)}
                          onChange={(e) => {
                            const checked = e.target.checked
                            setFormData((prev) => ({
                              ...prev,
                              comboLevels: checked
                                ? [...prev.comboLevels, level]
                                : prev.comboLevels.filter(l => l !== level)
                            }))
                          }}
                          className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                        <span className="ml-2 text-sm text-gray-700">{level}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Student will progress through all selected levels
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign to Batch (Optional)
              </label>
              <select
                name="batchId"
                value={formData.batchId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">No Batch</option>
                {batches.map((batch) => {
                  const available = batch.totalSeats - batch.enrolledCount
                  const statusBadge = batch.status === "PLANNING" ? "📝 Planning" :
                                     batch.status === "FILLING" ? "🎯 Filling" : "▶️ Running"
                  return (
                    <option key={batch.id} value={batch.id}>
                      {batch.batchCode} ({batch.level}) - {statusBadge} - {available} seats available
                    </option>
                  )
                })}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Showing only active batches (Planning, Filling, Running)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Referral Source <span className="text-error">*</span>
              </label>
              <select
                name="referralSource"
                value={formData.referralSource}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="META_ADS">Meta Ads</option>
                <option value="INSTAGRAM">Instagram</option>
                <option value="GOOGLE">Google</option>
                <option value="ORGANIC">Organic</option>
                <option value="REFERRAL">Referral</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="flex items-center pt-8">
              <input
                type="checkbox"
                name="trialAttended"
                checked={formData.trialAttended}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, trialAttended: e.target.checked }))
                }
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <label className="ml-2 text-sm text-gray-700">Trial Attended</label>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="space-y-4 border-t pt-6">
          <h2 className="text-lg font-semibold text-foreground">Pricing & Payment</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency <span className="text-error">*</span>
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="EUR">EUR (€)</option>
                <option value="INR">INR (₹)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Original Price ({getCurrencySymbol(formData.currency)}) <span className="text-error">*</span>
              </label>
              <input
                type="number"
                name="originalPrice"
                value={formData.originalPrice}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount ({getCurrencySymbol(formData.currency)})
              </label>
              <input
                type="number"
                name="discountApplied"
                value={formData.discountApplied}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Initial Payment ({getCurrencySymbol(formData.currency)})
              </label>
              <input
                type="number"
                name="totalPaid"
                value={formData.totalPaid}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Final Price:</span>
              <span className="font-semibold">
                {getCurrencySymbol(formData.currency)}{calculateFinalPrice(formData.originalPrice, formData.discountApplied).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-gray-600">Balance Remaining:</span>
              <span className="font-semibold text-warning">
                {getCurrencySymbol(formData.currency)}{calculateBalance(calculateFinalPrice(formData.originalPrice, formData.discountApplied), formData.totalPaid).toFixed(2)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Status
            </label>
            <select
              name="paymentStatus"
              value={formData.paymentStatus}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="PENDING">Pending</option>
              <option value="PARTIAL">Partial</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
            </select>
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
            placeholder="Any additional information about the student..."
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end space-x-4 border-t pt-6">
          <Link
            href="/dashboard/students"
            className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create Student"}
          </button>
        </div>

        </>)}
      </form>
    </div>
  )
}

export default function NewStudentPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto p-6">Loading...</div>}>
      <NewStudentForm />
    </Suspense>
  )
}
