"use client"

import { use, useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { COURSE_PRICING, REFUND_POLICY, SCHOOL_INFO, type CourseLevel } from "@/lib/pricing"
import html2canvas from "html2canvas"

type Lead = {
  id: string
  name: string
  whatsapp: string
  email: string | null
  interestedLevel: string | null
  status: string
}

export default function LeadInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  // Invoice calculation state
  const [coursePrice, setCoursePrice] = useState(0)
  const [discount, setDiscount] = useState(0)
  const [discountIsPercent, setDiscountIsPercent] = useState(false)
  const [amountPayableNow, setAmountPayableNow] = useState(0)
  const [isEditingDiscount, setIsEditingDiscount] = useState(false)
  const [isEditingPayable, setIsEditingPayable] = useState(false)
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const invoiceRef = useRef<HTMLDivElement>(null)
  // User-selected options
  const [selectedLevel, setSelectedLevel] = useState<CourseLevel>('A1')
  const [currency, setCurrency] = useState<'EUR' | 'INR'>('EUR')

  useEffect(() => {
    fetchLead()
  }, [id])

  const fetchLead = async () => {
    try {
      const res = await fetch(`/api/leads/${id}`)
      if (!res.ok) throw new Error("Failed to fetch lead")

      const data = await res.json()
      setLead(data)
      const initialLevel = (data.interestedLevel as CourseLevel) || 'A1'
      setSelectedLevel(initialLevel)
      setCurrency('EUR')
      // Set initial course price based on interestedLevel & currency
      const price = COURSE_PRICING[initialLevel]?.['EUR'] || 0
      setCoursePrice(price)
      setAmountPayableNow(price) // Default: full payment
    } catch (error) {
      console.error("Error fetching lead:", error)
    } finally {
      setLoading(false)
    }
  }

  const discountAmount = discountIsPercent
    ? Math.max(0, Math.min(100, discount)) * (coursePrice / 100)
    : Math.max(0, discount)
  const finalAmount = Math.max(0, coursePrice - discountAmount)
  const balance = finalAmount - amountPayableNow
  const currencySymbol = currency === 'INR' ? '₹' : '€'

  // Recalculate price when level or currency changes
  useEffect(() => {
    const p = COURSE_PRICING[selectedLevel]?.[currency] || 0
    setCoursePrice(p)
  }, [selectedLevel, currency])

  // Load persisted options
  useEffect(() => {
    try {
      const savedCurrency = localStorage.getItem('invoice.currency') as 'EUR' | 'INR' | null
      const savedLevel = localStorage.getItem('invoice.level') as CourseLevel | null
      const savedMode = localStorage.getItem('invoice.discountMode') as 'amount' | 'percent' | null
      if (savedCurrency) setCurrency(savedCurrency)
      if (savedLevel) setSelectedLevel(savedLevel)
      if (savedMode) setDiscountIsPercent(savedMode === 'percent')
    } catch {}
  }, [])

  // Persist options
  useEffect(() => {
    try {
      localStorage.setItem('invoice.currency', currency)
      localStorage.setItem('invoice.level', selectedLevel)
      localStorage.setItem('invoice.discountMode', discountIsPercent ? 'percent' : 'amount')
    } catch {}
  }, [currency, selectedLevel, discountIsPercent])

  const handleGenerateInvoice = async () => {
    if (!lead || !invoiceRef.current) return

    setGenerating(true)
    try {
      // Generate image from the invoice preview
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2, // Higher quality
        backgroundColor: '#ffffff',
        logging: false,
      })

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (!blob) {
          alert("Failed to generate invoice image")
          setGenerating(false)
          return
        }

        // Create object URL for the image
        const url = URL.createObjectURL(blob)
        setGeneratedImageUrl(url)
        setGenerating(false)

        // Show success message
        alert(`Invoice generated successfully!\nYou can now share it via WhatsApp, Email, or Download.`)
      }, 'image/jpeg', 0.95)

    } catch (error) {
      console.error("Error generating invoice:", error)
      alert("Failed to generate invoice")
      setGenerating(false)
    }
  }

  const handleShare = async (method: 'whatsapp' | 'email' | 'download') => {
    if (!lead) return

    // If no image generated yet, generate it first
    if (!generatedImageUrl) {
      alert('Please generate the invoice first by clicking "Generate Invoice"')
      return
    }

    switch (method) {
      case 'whatsapp':
        // For WhatsApp, we need to use Web Share API with the image
        try {
          // Fetch the blob from the generated URL
          const response = await fetch(generatedImageUrl)
          const blob = await response.blob()
          const file = new File([blob], 'invoice.jpg', { type: 'image/jpeg' })

          // Check if Web Share API is available
          if (navigator.share && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: `Invoice - ${lead.name}`,
              text: `Hi ${lead.name}! Here's your invoice for ${selectedLevel} German Course.\n\nAmount Due: ${currencySymbol}${amountPayableNow.toFixed(2)}\nBalance: ${currencySymbol}${balance.toFixed(2)}\n\nPay now to confirm your seat!`,
              files: [file],
            })
          } else {
            // Fallback: Open WhatsApp with text message only
            const message = `Hi ${lead.name}! Here's your invoice for ${selectedLevel} German Course.\n\nAmount Due: ${currencySymbol}${amountPayableNow.toFixed(2)}\nBalance: ${currencySymbol}${balance.toFixed(2)}\n\nPay now to confirm your seat!`
            const whatsappUrl = `https://wa.me/${lead.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`
            window.open(whatsappUrl, '_blank')
            alert('Note: Please manually attach the downloaded invoice image to WhatsApp')
          }
        } catch (error) {
          console.error('Error sharing:', error)
          // Fallback to text-only WhatsApp
          const message = `Hi ${lead.name}! Here's your invoice for ${selectedLevel} German Course.\n\nAmount Due: ${currencySymbol}${amountPayableNow.toFixed(2)}\nBalance: ${currencySymbol}${balance.toFixed(2)}\n\nPay now to confirm your seat!`
          const whatsappUrl = `https://wa.me/${lead.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`
          window.open(whatsappUrl, '_blank')
        }
        break

      case 'email':
        // Download the image and prompt user to attach manually
        handleShare('download')
        alert(`Invoice downloaded! Please attach it to your email manually.\n\nSuggested email text:\n\nHi ${lead.name}!\n\nPlease find attached your invoice for ${selectedLevel} German Course.\n\nAmount Due: ${currencySymbol}${amountPayableNow.toFixed(2)}\nBalance: ${currencySymbol}${balance.toFixed(2)}\n\nPay now to confirm your seat!`)
        break

      case 'download':
        // Download the generated image
        const link = document.createElement('a')
        link.href = generatedImageUrl
        link.download = `invoice-${lead.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.jpg`
        link.click()
        break
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Lead not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Mobile Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href={`/dashboard/leads/${id}`} className="text-gray-600">
            ← Back
          </Link>
          <h1 className="text-lg font-semibold flex-1">Generate Invoice</h1>
        </div>
      </div>

      {/* Invoice Preview */}
      <div className="p-4 space-y-4">
        {/* Invoice template for image generation (hidden from view but rendered) */}
        <div
          ref={invoiceRef}
          className="bg-white p-8 space-y-6"
          style={{ position: 'absolute', left: '-9999px', width: '600px' }}
        >
          {/* School Header */}
          <div className="text-center border-b-2 border-primary pb-4">
            <h1 className="text-2xl font-bold text-primary">{SCHOOL_INFO.name}</h1>
            <p className="text-sm text-gray-600 mt-1">German Language Course</p>
          </div>

          {/* Invoice Title */}
          <div className="text-center">
            <h2 className="text-xl font-semibold">COURSE INVOICE</h2>
            <p className="text-sm text-gray-600 mt-1">
              Date: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Student Details */}
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-700 border-b pb-1">Student Details</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-600">Name:</span></div>
              <div className="font-medium">{lead?.name}</div>
              <div><span className="text-gray-600">Phone:</span></div>
              <div className="font-medium">{lead?.whatsapp}</div>
              {lead?.email && (
                <>
                  <div><span className="text-gray-600">Email:</span></div>
                  <div className="font-medium text-xs">{lead.email}</div>
                </>
              )}
            </div>
          </div>

          {/* Course Details */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-700 border-b pb-1">Course Details</h3>
            <div className="flex justify-between items-center py-2">
              <div>
                <div className="font-medium">Level: {lead?.interestedLevel || 'A1'}</div>
                <div className="text-sm text-gray-600">German Language Course</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{currencySymbol}{coursePrice}</div>
              </div>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between items-center py-2 border-t">
                <div className="text-gray-700">Discount</div>
                <div className="font-medium text-green-600">
                  - {discountIsPercent ? `${Math.min(100, Math.max(0, discount)).toFixed(0)}%` : `${currencySymbol}${discountAmount.toFixed(2)}`}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center py-3 border-t-2 border-primary bg-primary/5">
              <div className="font-bold text-lg">Total Amount</div>
              <div className="font-bold text-xl text-primary">
                {currencySymbol}{finalAmount.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="space-y-3 bg-gray-50 p-4 rounded">
            <h3 className="font-semibold text-gray-700">Payment Details</h3>
            <div className="flex justify-between items-center py-2">
              <div className="font-medium">Amount Payable Now</div>
              <div className="text-xl font-bold text-primary">
                {currencySymbol}{amountPayableNow.toFixed(2)}
              </div>
            </div>
            {balance > 0 && (
              <>
                <div className="flex justify-between items-center py-2 border-t border-gray-300">
                  <div className="font-medium">Balance Remaining</div>
                  <div className="text-lg font-semibold text-warning">
                    {currencySymbol}{balance.toFixed(2)}
                  </div>
                </div>
                <div className="text-xs text-gray-600 text-center pt-2">
                  Balance to be paid within 7 days of enrollment
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-600 border-t pt-4">
            <p>{SCHOOL_INFO.address}</p>
            <p className="mt-1">{SCHOOL_INFO.phone} | {SCHOOL_INFO.email}</p>
            <p className="mt-2 italic">Thank you for choosing {SCHOOL_INFO.name}!</p>
          </div>
        </div>

        {/* Visible preview for user */}
        {/* Lead Info Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="font-semibold text-gray-700 mb-3">Lead Details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Name:</span>
              <span className="font-medium">{lead.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Phone:</span>
              <span className="font-medium">{lead.whatsapp}</span>
            </div>
            {lead.email && (
              <div className="flex justify-between">
                <span className="text-gray-600">Email:</span>
                <span className="font-medium text-xs">{lead.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Course & Pricing */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-md border border-gray-200 dark:border-gray-700 p-4 space-y-4">
          <h2 className="font-semibold text-gray-700">Invoice Details</h2>

          {/* Controls */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Course Level</label>
              <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value as CourseLevel)} className="select">
                {(['A1','A1_HYBRID','A1_HYBRID_MALAYALAM','A2','B1','B2','SPOKEN_GERMAN'] as CourseLevel[]).map(lvl => (
                  <option key={lvl} value={lvl}>{lvl.replace(/_/g,' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Currency</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value as 'EUR' | 'INR')} className="select">
                <option value="EUR">EUR (€)</option>
                <option value="INR">INR (₹)</option>
              </select>
            </div>
          </div>

          {/* Course */}
          <div className="flex justify-between items-center py-3 border-b">
            <div>
              <div className="font-medium">Course: {selectedLevel}</div>
              <div className="text-sm text-gray-500">German Language Course</div>
            </div>
            <div className="text-right">
              <div className="font-semibold">{currencySymbol}{coursePrice}</div>
              <div className="text-xs text-gray-500">{currency}</div>
            </div>
          </div>

          {/* Discount */}
          <div className="flex justify-between items-center py-3 border-b">
            <div className="font-medium text-gray-700">Discount</div>
            {isEditingDiscount ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-24 px-2 py-1 border rounded text-right"
                  autoFocus
                  onBlur={() => setIsEditingDiscount(false)}
                />
                <span className="text-sm text-gray-600">{discountIsPercent ? '%' : currency}</span>
                <label className="flex items-center gap-2 text-xs text-gray-600 ml-2">
                  <input type="checkbox" checked={discountIsPercent} onChange={(e) => setDiscountIsPercent(e.target.checked)} />
                  As %
                </label>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingDiscount(true)}
                className="flex items-center gap-2 text-primary"
              >
                <span className="font-medium">
                  {discountIsPercent
                    ? `${Math.min(100, Math.max(0, discount)).toFixed(0)}%`
                    : `${currencySymbol}${discountAmount.toFixed(2)}`}
                </span>
                <span className="text-xs">✏️ Edit</span>
              </button>
            )}
          </div>

          {/* Final Amount */}
          <div className="flex justify-between items-center py-3 border-b bg-gray-50 -mx-4 px-4">
            <div className="font-semibold text-gray-900">Total Amount</div>
            <div className="text-xl font-bold text-gray-900">
              {currencySymbol}{finalAmount.toFixed(2)}
            </div>
          </div>

          {/* Amount Payable Now */}
          <div className="flex justify-between items-center py-3 border-b">
            <div>
              <div className="font-medium text-gray-700">Amount Payable Now</div>
              <div className="text-xs text-gray-500">Minimum payment to confirm</div>
            </div>
            {isEditingPayable ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={amountPayableNow}
                  onChange={(e) => setAmountPayableNow(Number(e.target.value))}
                  max={finalAmount}
                  className="w-24 px-2 py-1 border rounded text-right"
                  autoFocus
                  onBlur={() => setIsEditingPayable(false)}
                />
                <span className="text-sm text-gray-600">{currency}</span>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingPayable(true)}
                className="flex items-center gap-2 text-primary"
              >
                <span className="text-lg font-semibold">{currencySymbol}{amountPayableNow.toFixed(2)}</span>
                <span className="text-xs">✏️ Edit</span>
              </button>
            )}
          </div>

          {/* Balance Remaining */}
          <div className="flex justify-between items-center py-3">
            <div>
              <div className="font-medium text-gray-700">Balance Remaining</div>
              <div className="text-xs text-gray-500">To be paid later</div>
            </div>
            <div className="text-lg font-semibold text-warning">
              {currencySymbol}{balance.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Payment Summary Card */}
        <div className="bg-primary/5 border-2 border-primary/20 rounded-lg p-4">
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">Total Amount Due</div>
            <div className="text-3xl font-bold text-primary mb-3">
              {currencySymbol}{amountPayableNow.toFixed(2)}
            </div>
            {balance > 0 && (
              <div className="text-xs text-gray-600">
                + {currencySymbol}{balance.toFixed(2)} payable within 7 days
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 space-y-2">
        <button
          onClick={handleGenerateInvoice}
          disabled={generating || amountPayableNow <= 0 || amountPayableNow > finalAmount}
          className="w-full py-3 bg-primary text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? "Generating..." : "Generate Invoice"}
        </button>

        {/* Share Options */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleShare('whatsapp')}
            disabled={!generatedImageUrl}
            className="py-2 bg-green-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>📱</span> WhatsApp
          </button>
          <button
            onClick={() => handleShare('email')}
            disabled={!generatedImageUrl}
            className="py-2 bg-blue-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>📧</span> Email
          </button>
          <button
            onClick={() => handleShare('download')}
            disabled={!generatedImageUrl}
            className="py-2 bg-gray-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>💾</span> Save
          </button>
        </div>

        {/* Status indicator */}
        {generatedImageUrl && (
          <div className="text-center text-xs text-green-600 font-medium">
            ✓ Invoice generated! You can now share it.
          </div>
        )}
      </div>
    </div>
  )
}
