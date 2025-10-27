"use client"

import { use, useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { COURSE_PRICING, REFUND_POLICY, SCHOOL_INFO, COURSE_INFO, type CourseLevel } from "@/lib/pricing"
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
        scale: 3, // Higher quality for professional invoice
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
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
      }, 'image/jpeg', 0.92)

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
          style={{
            position: 'absolute',
            left: '-10000px',
            width: '794px',
            backgroundColor: '#ffffff',
            fontFamily: 'Arial, sans-serif'
          }}
        >
          {/* Red Header */}
          <div style={{ background: '#d2302c', padding: '40px 30px', color: 'white', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
              <img src="/blogo.png" style={{ width: '70px', height: '70px' }} crossOrigin="anonymous" />
              <div>
                <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 'bold' }}>PLAN BETA</h1>
                <p style={{ margin: '5px 0 0 0', fontSize: '14px', fontStyle: 'italic' }}>School of German</p>
              </div>
            </div>
            <div style={{ position: 'absolute', top: '30px', right: '30px', background: 'white', padding: '15px', borderRadius: '8px' }}>
              <div style={{ color: '#787878', fontSize: '10px' }}>INVOICE NUMBER</div>
              <div style={{ color: '#d2302c', fontSize: '16px', fontWeight: 'bold', marginTop: '5px' }}>#INV-{new Date().toISOString().split('T')[0].replace(/-/g, '')}-{lead?.id.slice(0, 4)}</div>
              <div style={{ color: '#646464', fontSize: '11px', marginTop: '5px' }}>Date: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: '2-digit', day: '2-digit' })}</div>
            </div>
          </div>

          {/* Main Content */}
          <div style={{ padding: '30px' }}>
            {/* School and Student Info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '13px' }}>{SCHOOL_INFO.name}</h3>
                <p style={{ margin: '8px 0 0 0', fontSize: '11px', lineHeight: '1.5', color: '#505050' }}>
                  {SCHOOL_INFO.address}<br/>
                  Kannammoola, Thiruvananthapuram<br/>
                  Kerala 695011, India<br/>
                  <strong>GST: {SCHOOL_INFO.gst}</strong>
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h3 style={{ margin: 0, fontSize: '13px', color: '#d2302c' }}>BILL TO</h3>
                <p style={{ margin: '8px 0 0 0', fontSize: '13px', fontWeight: 'bold' }}>{lead?.name}</p>
              </div>
            </div>

            {/* Course Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
              <thead>
                <tr style={{ background: '#d2302c', color: 'white' }}>
                  <th style={{ padding: '10px', textAlign: 'left', fontSize: '10px' }}>DESCRIPTION</th>
                  <th style={{ padding: '10px', textAlign: 'left', fontSize: '10px' }}>LEVEL</th>
                  <th style={{ padding: '10px', textAlign: 'left', fontSize: '10px' }}>MONTH</th>
                  <th style={{ padding: '10px', textAlign: 'right', fontSize: '10px' }}>AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: '#fafcfe', borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px 10px', fontSize: '11px' }}>German Language Course</td>
                  <td style={{ padding: '12px 10px' }}>
                    <span style={{ backgroundColor: COURSE_INFO[selectedLevel]?.color || '#f59e0b', color: '#ffffff', padding: '5px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', display: 'inline-block', minWidth: '50px', textAlign: 'center' }}>{selectedLevel}</span>
                  </td>
                  <td style={{ padding: '12px 10px', fontSize: '11px' }}>{new Date().toLocaleDateString('en-US', { month: 'long' })}</td>
                  <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 'bold', fontSize: '12px' }}>{currencySymbol}{coursePrice.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            {/* Payment Summary Box */}
            <div style={{ background: '#fffcfc', border: '2px solid #d2302c', borderRadius: '6px', padding: '15px', marginLeft: 'auto', width: '280px' }}>
              <div style={{ background: '#d2302c', color: 'white', padding: '10px', margin: '-15px -15px 12px -15px' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold' }}>TOTAL AMOUNT</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '3px' }}>{currencySymbol}{finalAmount.toFixed(2)}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 'bold', color: '#16a34a', fontSize: '11px' }}>Payable Now</span>
                <span style={{ fontWeight: 'bold', color: '#16a34a', fontSize: '14px' }}>{currencySymbol}{amountPayableNow.toFixed(2)}</span>
              </div>
              {balance > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 'bold', color: '#ef4444', fontSize: '11px' }}>Remaining</span>
                  <span style={{ fontWeight: 'bold', color: '#ef4444', fontSize: '14px' }}>{currencySymbol}{balance.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Bank Details */}
            <div style={{ background: '#fafbfd', border: '1px solid #d2d2d2', borderRadius: '6px', padding: '15px', marginTop: '20px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#d2302c' }}>BANK DETAILS FOR PAYMENT</h3>
              <div style={{ fontSize: '10px' }}>
                Account: <strong>PLAN BETA</strong> | A/C: <strong>50200087416170</strong> | IFSC: <strong>HDFC0009459</strong><br/>
                UPI ID: <strong style={{ color: '#d2302c' }}>7736638706@ybl</strong>
              </div>
            </div>

            {/* No Refund Warning */}
            <div style={{ background: '#fee2e2', border: '2px solid #d2302c', borderRadius: '4px', padding: '15px', marginTop: '20px' }}>
              <div style={{ color: '#d2302c', fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>⚠ IMPORTANT: NO REFUND POLICY</div>
              <div style={{ color: '#8b0000', fontSize: '10px', fontWeight: 'bold', marginBottom: '8px' }}>Once classes begin, ALL FEES ARE 100% NON-REFUNDABLE regardless of attendance</div>
            </div>

            {/* Payment Terms */}
            <div style={{ borderLeft: '4px solid #d2302c', paddingLeft: '15px', marginTop: '15px', marginBottom: '15px' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold', color: '#d2302c' }}>PAYMENT TERMS & REFUND POLICY</h3>
              <p style={{ margin: 0, fontSize: '9px', lineHeight: '1.6', color: '#323232' }}>
                Full payment is due today. By making this payment, you acknowledge and accept our refund policy: Once the first class of the batch has commenced, all fees are <strong style={{ color: '#d2302c' }}>non-refundable</strong> <strong style={{ color: '#d2302c' }}>regardless of attendance</strong>. This policy exists because our small group batches begin with committed class sizes and instructor compensation is allocated accordingly from the course fees. This term is <strong style={{ color: '#d2302c' }}>binding and non-negotiable</strong> upon payment.
              </p>
            </div>

            {/* Confirmation Box */}
            <div style={{ background: '#f5f5f5', border: '1px solid #c8c8c8', borderRadius: '4px', padding: '10px', fontSize: '9px', fontStyle: 'italic', color: '#505050' }}>
              By signing/accepting this invoice, I confirm that I have read and understood the refund policy stated above.
            </div>
          </div>

          {/* Footer */}
          <div style={{ background: '#d2302c', color: 'white', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>{SCHOOL_INFO.name}</div>
            <div style={{ fontSize: '9px', lineHeight: '1.5', opacity: 0.95, marginBottom: '5px' }}>
              {SCHOOL_INFO.address}, Kannammoola, Thiruvananthapuram, Kerala 695011, India<br/>
              <strong>GST: {SCHOOL_INFO.gst}</strong>
            </div>
            <div style={{ fontSize: '9px', marginBottom: '8px' }}>Email: {SCHOOL_INFO.email} | Phone: {SCHOOL_INFO.phone}</div>
            <div style={{ fontSize: '8px', fontStyle: 'italic', lineHeight: '1.4', opacity: 0.9 }}>
              All fees are subject to our no-refund policy once batch commences, even if no classes are attended.<br/>
              <strong>By paying this invoice, you acknowledge and accept this condition.</strong>
            </div>
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
