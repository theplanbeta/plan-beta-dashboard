import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import html2canvas from 'html2canvas'
import { SCHOOL_INFO, BANK_DETAILS, CURRENCY_SYMBOLS, type Currency } from './pricing'

/** Format amount with proper locale: ₹14,000 or €134.00 */
function fmtAmt(amount: number, currency: string): string {
  if (currency === 'INR') {
    return '₹' + amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })
  }
  return '€' + amount.toLocaleString('en-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Same but for PDF (no ₹ support in Helvetica) */
function fmtAmtPdf(amount: number, currency: string): string {
  if (currency === 'INR') {
    return 'Rs. ' + amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })
  }
  return 'EUR ' + amount.toLocaleString('en-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function escapeHtml(str: string | number | null | undefined): string {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export interface InvoiceItem {
  level: string
  description: string
  month: string
  batch: string
  amount: number
}

export interface InvoiceData {
  invoiceNumber: string
  date: string
  dueDate: string
  currency: Currency

  // Student info
  studentName: string
  studentAddress?: string
  studentGst?: string
  studentEmail: string
  studentPhone: string

  // Course items
  items: InvoiceItem[]

  // Payment details
  payableNow: number
  remainingAmount: number

  // Terms
  additionalNotes?: string
}

// Helper function to load image as base64
async function loadImageAsBase64(imagePath: string): Promise<string> {
  try {
    // For browser environment, load the image
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = reject
      img.src = imagePath
    })
  } catch (error) {
    console.error('Error loading image:', error)
    return ''
  }
}

export async function generateInvoicePDF(data: InvoiceData): Promise<jsPDF> {
  const doc = new jsPDF()
  // Plan Beta brand color - red
  const brandRed: [number, number, number] = [210, 48, 44] // #d2302c
  const textDark: [number, number, number] = [31, 41, 55]
  const textGray: [number, number, number] = [107, 114, 128]
  const darkRed: [number, number, number] = [139, 0, 0]

  const formatAmount = (amount: number) => fmtAmtPdf(amount, data.currency)

  // Load logo
  let logoBase64 = ''
  try {
    logoBase64 = await loadImageAsBase64('/blogo.png')
  } catch (error) {
    console.error('Could not load logo:', error)
  }

  let yPos = 0

  // === ELEGANT HEADER - Plan Beta red ===
  doc.setFillColor(...brandRed)
  doc.rect(0, 0, 210, 55, 'F')

  // Add circular B logo (if loaded)
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', 15, 12, 30, 30)
    } catch (error) {
      console.error('Error adding logo:', error)
    }
  }

  // School branding - elegant serif font
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(28)
  doc.setFont('times', 'bold')
  doc.text('PLAN BETA', 50, 24)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('School of German', 50, 32)

  // School contact info - right aligned in header
  doc.setFontSize(8.5)
  doc.text(SCHOOL_INFO.phone, 195, 15, { align: 'right' })
  doc.text(SCHOOL_INFO.email, 195, 20, { align: 'right' })
  doc.text(`GST: ${SCHOOL_INFO.gst}`, 195, 25, { align: 'right' })

  // School address in header
  doc.setFontSize(7.5)
  doc.text(SCHOOL_INFO.address, 50, 39)
  doc.text(`${SCHOOL_INFO.city}, ${SCHOOL_INFO.state}`, 50, 44)

  yPos = 65

  // === INVOICE TITLE & NUMBER BOX ===
  doc.setFillColor(245, 245, 245)
  doc.roundedRect(15, yPos, 180, 18, 2, 2, 'F')

  doc.setTextColor(...textDark)
  doc.setFontSize(22)
  doc.setFont('times', 'bold')
  doc.text('INVOICE', 20, yPos + 12)

  // Invoice number and date - right aligned in box
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...brandRed)
  doc.text(`#${data.invoiceNumber}`, 190, yPos + 8, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...textGray)
  doc.setFontSize(9)
  doc.text(`Date: ${data.date}`, 190, yPos + 14, { align: 'right' })

  yPos += 28

  // === BILL TO SECTION ===
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...textDark)
  doc.text('BILL TO:', 15, yPos)

  yPos += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(...textDark)
  doc.text(data.studentName, 15, yPos)

  yPos += 5
  doc.setFontSize(9)
  doc.setTextColor(...textGray)
  if (data.studentAddress) {
    const addressLines = data.studentAddress.split('\n').filter(l => l.trim())
    for (const line of addressLines) {
      doc.text(line.trim(), 15, yPos)
      yPos += 4
    }
  }
  if (data.studentGst) {
    const gst = data.studentGst.replace(/^GST:\s*/i, '')
    doc.text(`GST: ${gst}`, 15, yPos)
    yPos += 4
  }
  if (data.studentEmail) {
    doc.text(`Email: ${data.studentEmail}`, 15, yPos)
    yPos += 4
  }
  if (data.studentPhone) {
    doc.text(`Phone: ${data.studentPhone}`, 15, yPos)
  }

  yPos += 12

  // === COURSE DETAILS TABLE ===
  const tableData = data.items.map(item => {
    // Get level color from pricing
    const levelColors: Record<string, string> = {
      'A1': '#10b981',
      'A1 Hybrid': '#06b6d4',
      'A2': '#3b82f6',
      'B1': '#f59e0b',
      'B2': '#8b5cf6',
      'Spoken German': '#ec4899',
    }
    const levelColor = levelColors[item.level] || '#6b7280'

    return [
      item.level,
      `${item.description}\n${item.month} Batch | ${item.batch}`,
      formatAmount(item.amount),
    ]
  })

  autoTable(doc, {
    startY: yPos,
    head: [['Level', 'Course Details', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: brandRed,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 9.5,
      textColor: textDark,
      cellPadding: 4,
    },
    columnStyles: {
      0: {
        cellWidth: 25,
        fontStyle: 'bold',
        fontSize: 9,
      },
      1: {
        cellWidth: 120,
        fontSize: 9,
      },
      2: {
        cellWidth: 35,
        halign: 'right',
        fontStyle: 'bold',
        fontSize: 10,
      },
    },
    margin: { left: 15, right: 15 },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
  })

  yPos = (doc as any).lastAutoTable.finalY + 15

  // === PAYMENT SUMMARY BOX ===
  doc.setDrawColor(...brandRed)
  doc.setLineWidth(0.8)
  doc.setFillColor(254, 242, 242)
  doc.roundedRect(120, yPos, 75, 35, 2, 2, 'FD')

  const summaryX = 125
  let summaryY = yPos + 8

  // Payable Now
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...brandRed)
  doc.text('Payable Now:', summaryX, summaryY)
  doc.setFontSize(13)
  doc.text(formatAmount(data.payableNow), 190, summaryY, { align: 'right' })

  summaryY += 8

  // Remaining Amount
  if (data.remainingAmount > 0) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...textGray)
    doc.text('Remaining Balance:', summaryX, summaryY)
    doc.setFontSize(10)
    doc.text(formatAmount(data.remainingAmount), 190, summaryY, { align: 'right' })
    summaryY += 7
  }

  // Divider line
  doc.setDrawColor(...brandRed)
  doc.setLineWidth(0.5)
  doc.line(summaryX, summaryY, 190, summaryY)
  summaryY += 6

  // Total Course Fee
  const totalAmount = data.payableNow + data.remainingAmount
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...textDark)
  doc.text('Total Course Fee:', summaryX, summaryY)
  doc.setFontSize(13)
  doc.setTextColor(...brandRed)
  doc.text(formatAmount(totalAmount), 190, summaryY, { align: 'right' })

  yPos += 45

  // === BANK DETAILS ===
  doc.setFillColor(249, 250, 251)
  doc.roundedRect(15, yPos, 180, 28, 2, 2, 'F')

  yPos += 7
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...textDark)
  doc.text('PAYMENT DETAILS', 20, yPos)

  yPos += 6
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...textGray)

  // Two columns for bank details
  const col1X = 20
  const col2X = 110

  doc.text(`Account Name: ${BANK_DETAILS.accountName}`, col1X, yPos)
  doc.text(`IFSC Code: ${BANK_DETAILS.ifscCode}`, col2X, yPos)

  yPos += 5
  doc.text(`Account Number: ${BANK_DETAILS.accountNumber}`, col1X, yPos)
  doc.text(`UPI ID: ${BANK_DETAILS.upiId}`, col2X, yPos)

  yPos += 12

  // === IMPORTANT: NO REFUND WARNING BOX - Prominent ===
  doc.setDrawColor(...brandRed)
  doc.setLineWidth(1)
  doc.setFillColor(254, 226, 226)
  doc.roundedRect(15, yPos, 180, 16, 2, 2, 'FD')

  doc.setTextColor(...brandRed)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('⚠ IMPORTANT: NO REFUND POLICY', 20, yPos + 6)

  doc.setTextColor(...darkRed)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.text('Once classes begin, ALL FEES ARE 100% NON-REFUNDABLE regardless of attendance', 20, yPos + 12)

  yPos += 22

  // === REFUND POLICY - Detailed ===
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...textDark)
  doc.text('Refund Policy:', 15, yPos)

  yPos += 5
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...textGray)

  const policyLines = [
    '• Full payment is due today. By making this payment, you acknowledge and accept our refund policy.',
    '• Once the first class of the batch has commenced, all fees are non-refundable regardless of attendance.',
    '• This policy exists because our small group batches begin with committed class sizes and instructor',
    '  compensation is allocated accordingly from the course fees.',
    '• This term is binding and non-negotiable upon payment.',
  ]

  policyLines.forEach(line => {
    // Highlight key phrases
    if (line.includes('non-refundable') || line.includes('binding and non-negotiable')) {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...darkRed)
    } else {
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...textGray)
    }
    doc.text(line, 15, yPos)
    yPos += 4
  })

  yPos += 4

  // === CONFIRMATION STATEMENT BOX ===
  doc.setDrawColor(100, 100, 100)
  doc.setLineWidth(0.3)
  doc.setFillColor(250, 250, 250)
  doc.roundedRect(15, yPos, 180, 12, 1, 1, 'FD')

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(...textGray)
  doc.text(
    'By making this payment, I confirm that I have read, understood, and agree to abide by the refund policy stated above.',
    20,
    yPos + 5
  )
  doc.text(
    'I acknowledge that this policy is clear, fair, and legally binding.',
    20,
    yPos + 9
  )

  // === FOOTER - Red bar ===
  doc.setFillColor(...brandRed)
  doc.rect(0, 280, 210, 17, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('times', 'bold')
  doc.text(`Thank you for choosing ${SCHOOL_INFO.name}!`, 105, 288, { align: 'center' })

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.text(`${SCHOOL_INFO.email} | ${SCHOOL_INFO.phone}`, 105, 293, { align: 'center' })

  return doc
}

export async function downloadInvoice(data: InvoiceData, filename?: string) {
  const doc = await generateInvoicePDF(data)
  const fileName = filename || `Invoice-${data.invoiceNumber}.pdf`
  doc.save(fileName)
}

export async function previewInvoice(data: InvoiceData): Promise<string> {
  const doc = await generateInvoicePDF(data)
  return doc.output('dataurlstring')
}

// JPG Generation using html2canvas
export async function generateInvoiceJPG(data: InvoiceData): Promise<void> {
  const total = data.payableNow + data.remainingAmount
  const fmt = (n: number) => fmtAmt(n, data.currency)
  const cleanGst = (s: string) => s.replace(/^GST:\s*/i, '')

  // Load Outfit font
  const fontLink = document.createElement('link')
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap'
  fontLink.rel = 'stylesheet'
  document.head.appendChild(fontLink)
  await new Promise(r => setTimeout(r, 300)) // let font load

  const invoicePreview = document.createElement('div')
  invoicePreview.style.position = 'absolute'
  invoicePreview.style.left = '-10000px'
  invoicePreview.style.width = '794px'
  invoicePreview.style.backgroundColor = '#ffffff'
  invoicePreview.style.fontFamily = "'Outfit', system-ui, sans-serif"

  invoicePreview.innerHTML = `
    <style>
      * { box-sizing: border-box; }
      .inv-font { font-family: 'Outfit', system-ui, sans-serif; }
    </style>

    <!-- Header -->
    <div class="inv-font" style="background: linear-gradient(135deg, #c62828 0%, #d32f2f 50%, #b71c1c 100%); padding: 36px 40px; color: white; display: flex; justify-content: space-between; align-items: center;">
      <div style="display: flex; align-items: center; gap: 18px;">
        <img src="/blogo.png" style="width: 56px; height: 56px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3);" crossorigin="anonymous" />
        <div>
          <div style="font-size: 26px; font-weight: 700; letter-spacing: 1.5px;">PLAN BETA</div>
          <div style="font-size: 11px; font-weight: 300; letter-spacing: 2px; opacity: 0.85; margin-top: 2px;">SCHOOL OF GERMAN</div>
        </div>
      </div>
      <div style="text-align: right; font-size: 11px; font-weight: 300; line-height: 1.7; opacity: 0.9;">
        ${SCHOOL_INFO.phone}<br/>
        ${SCHOOL_INFO.email}<br/>
        <span style="font-weight: 500;">GST: ${SCHOOL_INFO.gst}</span>
      </div>
    </div>

    <div class="inv-font" style="padding: 36px 40px;">

      <!-- Invoice title bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #f0f0f0;">
        <div>
          <div style="font-size: 28px; font-weight: 700; color: #1a1a1a; letter-spacing: -0.5px;">INVOICE</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 14px; font-weight: 600; color: #c62828;">#${escapeHtml(data.invoiceNumber)}</div>
          <div style="font-size: 12px; color: #888; margin-top: 4px; font-weight: 400;">Date: ${data.date}</div>
        </div>
      </div>

      <!-- Bill To / From -->
      <div style="display: flex; justify-content: space-between; margin-bottom: 32px;">
        <div style="max-width: 48%;">
          <div style="font-size: 9px; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">From</div>
          <div style="font-size: 13px; font-weight: 600; color: #1a1a1a;">${SCHOOL_INFO.name}</div>
          <div style="font-size: 11px; color: #666; line-height: 1.6; margin-top: 4px;">
            ${SCHOOL_INFO.address}<br/>
            ${SCHOOL_INFO.city}, ${SCHOOL_INFO.state}
          </div>
        </div>
        <div style="text-align: right; max-width: 48%;">
          <div style="font-size: 9px; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">Bill To</div>
          <div style="font-size: 13px; font-weight: 600; color: #1a1a1a;">${escapeHtml(data.studentName)}</div>
          ${data.studentAddress ? `<div style="font-size: 11px; color: #666; line-height: 1.6; margin-top: 4px;">${escapeHtml(data.studentAddress).replace(/\n/g, '<br/>')}</div>` : ''}
          ${data.studentGst ? `<div style="font-size: 11px; color: #555; margin-top: 4px; font-weight: 500;">GST: ${escapeHtml(cleanGst(data.studentGst))}</div>` : ''}
          ${data.studentEmail ? `<div style="font-size: 11px; color: #888; margin-top: 4px;">${escapeHtml(data.studentEmail)}</div>` : ''}
          ${data.studentPhone ? `<div style="font-size: 11px; color: #888;">${escapeHtml(data.studentPhone)}</div>` : ''}
        </div>
      </div>

      <!-- Course table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
        <thead>
          <tr style="border-bottom: 2px solid #1a1a1a;">
            <th style="padding: 12px 0; text-align: left; font-size: 9px; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 1px;">Description</th>
            <th style="padding: 12px 0; text-align: left; font-size: 9px; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 1px;">Level</th>
            <th style="padding: 12px 0; text-align: left; font-size: 9px; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 1px;">Period</th>
            <th style="padding: 12px 0; text-align: right; font-size: 9px; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 1px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map((item) => `
            <tr style="border-bottom: 1px solid #f0f0f0;">
              <td style="padding: 14px 0; font-size: 12px; color: #333; font-weight: 400;">
                ${escapeHtml(item.description)}<br/>
                <span style="font-size: 10px; color: #999;">Batch: ${escapeHtml(item.batch)}</span>
              </td>
              <td style="padding: 14px 0;">
                <span style="background: #c62828; color: white; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 600;">${escapeHtml(item.level)}</span>
              </td>
              <td style="padding: 14px 0; font-size: 12px; color: #555;">${escapeHtml(item.month)}</td>
              <td style="padding: 14px 0; text-align: right; font-size: 14px; font-weight: 600; color: #1a1a1a;">${fmt(item.amount)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Summary -->
      <div style="display: flex; justify-content: flex-end; margin-bottom: 32px;">
        <div style="width: 280px;">
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
            <span style="font-size: 12px; color: #888;">Total Course Fee</span>
            <span style="font-size: 14px; font-weight: 600; color: #1a1a1a;">${fmt(total)}</span>
          </div>
          ${data.payableNow > 0 ? `
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
            <span style="font-size: 12px; color: #888;">Payable Now</span>
            <span style="font-size: 14px; font-weight: 600; color: #16a34a;">${fmt(data.payableNow)}</span>
          </div>` : ''}
          ${data.remainingAmount > 0 ? `
          <div style="display: flex; justify-content: space-between; padding: 10px 0;">
            <span style="font-size: 12px; color: #888;">Remaining</span>
            <span style="font-size: 14px; font-weight: 600; color: #ef4444;">${fmt(data.remainingAmount)}</span>
          </div>` : ''}
          <div style="background: #1a1a1a; color: white; padding: 14px 16px; border-radius: 8px; margin-top: 12px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Amount Due</span>
            <span style="font-size: 20px; font-weight: 700;">${fmt(data.payableNow || total)}</span>
          </div>
        </div>
      </div>

      <!-- Bank details -->
      <div style="background: #fafafa; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <div style="font-size: 9px; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">Payment Details</div>
        <div style="display: flex; gap: 40px; font-size: 11px; color: #555;">
          <div><span style="color: #999;">Account:</span> <strong>${BANK_DETAILS.accountName}</strong></div>
          <div><span style="color: #999;">A/C No:</span> <strong>${BANK_DETAILS.accountNumber}</strong></div>
          <div><span style="color: #999;">IFSC:</span> <strong>${BANK_DETAILS.ifscCode}</strong></div>
        </div>
        <div style="font-size: 11px; margin-top: 8px; color: #555;"><span style="color: #999;">UPI:</span> <strong style="color: #c62828;">${BANK_DETAILS.upiId}</strong></div>
      </div>

      <!-- Refund policy — compact -->
      <div style="border: 1px solid #e5e5e5; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <div style="font-size: 10px; font-weight: 600; color: #c62828; margin-bottom: 6px;">Terms & Refund Policy</div>
        <p style="margin: 0; font-size: 9px; line-height: 1.7; color: #666;">
          Full payment is due today. Once the first class of the batch has commenced, all fees are <strong style="color: #333;">non-refundable regardless of attendance</strong>. This term is binding and non-negotiable upon payment.
        </p>
      </div>

      <div style="font-size: 8px; color: #bbb; text-align: center; padding-top: 8px;">
        By paying this invoice, you acknowledge and accept the refund policy stated above.
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #1a1a1a; color: white; padding: 20px 40px; display: flex; justify-content: space-between; align-items: center;" class="inv-font">
      <div style="font-size: 12px; font-weight: 600;">Thank you for choosing Plan Beta!</div>
      <div style="font-size: 10px; opacity: 0.6;">${SCHOOL_INFO.email} &middot; ${SCHOOL_INFO.phone}</div>
    </div>
  `

  document.body.appendChild(invoicePreview)

  try {
    const canvas = await html2canvas(invoicePreview, {
      scale: 3,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: true,
      logging: false
    })

    document.body.removeChild(invoicePreview)

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.download = `PlanBeta_Invoice_${data.invoiceNumber}_${data.studentName.replace(/\s+/g, '_')}.jpg`
        link.href = url
        link.click()
        URL.revokeObjectURL(url)
      }
    }, 'image/jpeg', 0.92)
  } catch (error) {
    document.body.removeChild(invoicePreview)
    console.error('Error generating JPG:', error)
    throw new Error('Failed to generate JPG invoice')
  }
}
