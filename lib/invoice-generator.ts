import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import html2canvas from 'html2canvas'
import { SCHOOL_INFO, BANK_DETAILS, CURRENCY_SYMBOLS, COURSE_INFO, type Currency } from './pricing'

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
  const currencySymbol = CURRENCY_SYMBOLS[data.currency]

  // Plan Beta brand color - red
  const brandRed: [number, number, number] = [210, 48, 44] // #d2302c
  const textDark: [number, number, number] = [31, 41, 55]
  const textGray: [number, number, number] = [107, 114, 128]
  const darkRed: [number, number, number] = [139, 0, 0]

  // Helper function to format currency
  const formatAmount = (amount: number) => `${currencySymbol}${amount.toFixed(2)}`

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
    doc.text(data.studentAddress, 15, yPos)
    yPos += 4
  }
  doc.text(`Email: ${data.studentEmail}`, 15, yPos)
  yPos += 4
  doc.text(`Phone: ${data.studentPhone}`, 15, yPos)

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
    '• Payment is due today. By making this payment, you acknowledge and accept our refund policy.',
    '• Once the first class of the batch has commenced, all fees are non-refundable regardless of attendance.',
    '• This policy exists because our small group batches begin with committed class sizes and instructor',
    '  compensation is allocated accordingly from the course fees.',
    '• This term is binding and non-negotiable upon payment.',
    '• The remaining balance, if any, must be paid within 7 days from the first class date, irrespective',
    '  of attendance.',
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
  const currencySymbol = CURRENCY_SYMBOLS[data.currency]
  const total = (data.payableNow + data.remainingAmount).toFixed(2)
  const payableNow = data.payableNow.toFixed(2)
  const remaining = data.remainingAmount.toFixed(2)

  // Create invoice preview div for screenshot
  const invoicePreview = document.createElement('div')
  invoicePreview.style.position = 'absolute'
  invoicePreview.style.left = '-10000px'
  invoicePreview.style.width = '794px' // A4 width in pixels at 96 DPI
  invoicePreview.style.backgroundColor = '#ffffff'
  invoicePreview.style.fontFamily = 'Arial, sans-serif'

  invoicePreview.innerHTML = `
    <div style="background: #d2302c; padding: 40px 30px; color: white; position: relative;">
      <div style="display: flex; align-items: flex-start; gap: 20px;">
        <img src="/blogo.png" style="width: 70px; height: 70px;" crossorigin="anonymous" />
        <div>
          <h1 style="margin: 0; font-size: 32px; font-weight: bold;">PLAN BETA</h1>
          <p style="margin: 5px 0 0 0; font-size: 14px; font-style: italic;">School of German</p>
        </div>
      </div>
      <div style="position: absolute; top: 30px; right: 30px; background: white; padding: 15px; border-radius: 8px;">
        <div style="color: #787878; font-size: 10px;">INVOICE NUMBER</div>
        <div style="color: #d2302c; font-size: 16px; font-weight: bold; margin-top: 5px;">#${data.invoiceNumber}</div>
        <div style="color: #646464; font-size: 11px; margin-top: 5px;">Date: ${data.date}</div>
      </div>
    </div>

    <div style="padding: 30px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 25px;">
        <div>
          <h3 style="margin: 0; font-size: 13px;">${SCHOOL_INFO.name}</h3>
          <p style="margin: 8px 0 0 0; font-size: 11px; line-height: 1.5; color: #505050;">
            ${SCHOOL_INFO.address}<br/>
            ${SCHOOL_INFO.city}<br/>
            ${SCHOOL_INFO.state}<br/>
            <strong>GST: ${SCHOOL_INFO.gst}</strong>
          </p>
        </div>
        <div style="text-align: right;">
          <h3 style="margin: 0; font-size: 13px; color: #d2302c;">BILL TO</h3>
          <p style="margin: 8px 0 0 0; font-size: 13px; font-weight: bold;">${data.studentName}</p>
          ${data.studentAddress ? `<p style="margin: 5px 0 0 0; font-size: 10px; color: #505050;">${data.studentAddress.replace(/\n/g, '<br/>')}</p>` : ''}
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background: #d2302c; color: white;">
            <th style="padding: 10px; text-align: left; font-size: 10px;">DESCRIPTION</th>
            <th style="padding: 10px; text-align: left; font-size: 10px;">LEVEL</th>
            <th style="padding: 10px; text-align: left; font-size: 10px;">MONTH</th>
            <th style="padding: 10px; text-align: right; font-size: 10px;">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map((item, idx) => {
            const levelColor = COURSE_INFO[item.level as keyof typeof COURSE_INFO]?.color || '#6b7280'
            return `
              <tr style="background: ${idx % 2 === 0 ? '#fafcfe' : '#fff'}; border-bottom: 1px solid #eee;">
                <td style="padding: 12px 10px; font-size: 11px;">${item.description}</td>
                <td style="padding: 12px 10px;">
                  <span style="background-color: ${levelColor}; color: #ffffff; padding: 5px 12px; border-radius: 4px; font-size: 11px; font-weight: bold; display: inline-block; min-width: 50px; text-align: center;">${item.level}</span>
                </td>
                <td style="padding: 12px 10px; font-size: 11px;">${item.month}</td>
                <td style="padding: 12px 10px; text-align: right; font-weight: bold; font-size: 12px;">${currencySymbol}${parseFloat(item.amount.toString()).toFixed(2)}</td>
              </tr>
            `
          }).join('')}
        </tbody>
      </table>

      <div style="background: #fffcfc; border: 2px solid #d2302c; border-radius: 6px; padding: 15px; margin-left: auto; width: 280px;">
        <div style="background: #d2302c; color: white; padding: 10px; margin: -15px -15px 12px -15px;">
          <div style="font-size: 11px; font-weight: bold;">TOTAL AMOUNT</div>
          <div style="font-size: 18px; font-weight: bold; margin-top: 3px;">${currencySymbol}${total}</div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-weight: bold; color: #16a34a; font-size: 11px;">Payable Now</span>
          <span style="font-weight: bold; color: #16a34a; font-size: 14px;">${currencySymbol}${payableNow}</span>
        </div>
        ${parseFloat(remaining) > 0 ? `
          <div style="display: flex; justify-content: space-between;">
            <span style="font-weight: bold; color: #ef4444; font-size: 11px;">Remaining</span>
            <span style="font-weight: bold; color: #ef4444; font-size: 14px;">${currencySymbol}${remaining}</span>
          </div>
        ` : ''}
      </div>

      <div style="background: #fafbfd; border: 1px solid #d2d2d2; border-radius: 6px; padding: 15px; margin-top: 20px;">
        <h3 style="margin: 0 0 10px 0; font-size: 12px; color: #d2302c;">BANK DETAILS FOR PAYMENT</h3>
        <div style="font-size: 10px;">
          Account: <strong>${BANK_DETAILS.accountName}</strong> | A/C: <strong>${BANK_DETAILS.accountNumber}</strong> | IFSC: <strong>${BANK_DETAILS.ifscCode}</strong><br/>
          UPI ID: <strong style="color: #d2302c;">${BANK_DETAILS.upiId}</strong>
        </div>
      </div>

      <div style="background: #fee2e2; border: 2px solid #d2302c; border-radius: 4px; padding: 15px; margin-top: 20px;">
        <div style="color: #d2302c; font-size: 13px; font-weight: bold; margin-bottom: 8px;">⚠ IMPORTANT: NO REFUND POLICY</div>
        <div style="color: #8b0000; font-size: 10px; font-weight: bold; margin-bottom: 8px;">Once classes begin, ALL FEES ARE 100% NON-REFUNDABLE regardless of attendance</div>
      </div>

      <div style="border-left: 4px solid #d2302c; padding-left: 15px; margin-top: 15px; margin-bottom: 15px;">
        <h3 style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold; color: #d2302c;">PAYMENT TERMS & REFUND POLICY</h3>
        <p style="margin: 0; font-size: 9px; line-height: 1.6; color: #323232;">
          Payment due today. By making this payment, you acknowledge and accept our refund policy: Once the first class of the batch has commenced, all fees are <strong style="color: #d2302c;">non-refundable</strong> <strong style="color: #d2302c;">regardless of attendance</strong>. This policy exists because our small group batches begin with committed class sizes and instructor compensation is allocated accordingly from the course fees. This term is <strong style="color: #d2302c;">binding and non-negotiable</strong> upon payment. The remaining balance, if any, must be paid within 7 days from the first class date, irrespective of attendance.
        </p>
      </div>

      <div style="background: #f5f5f5; border: 1px solid #c8c8c8; border-radius: 4px; padding: 10px; font-size: 9px; font-style: italic; color: #505050;">
        By signing/accepting this invoice, I confirm that I have read and understood the refund policy stated above.
      </div>
    </div>

    <div style="background: #d2302c; color: white; padding: 20px; text-align: center;">
      <div style="font-size: 14px; font-weight: bold; margin-bottom: 8px;">${SCHOOL_INFO.name}</div>
      <div style="font-size: 9px; line-height: 1.5; opacity: 0.95; margin-bottom: 5px;">
        ${SCHOOL_INFO.address}, ${SCHOOL_INFO.city}, ${SCHOOL_INFO.state}<br/>
        <strong>GST: ${SCHOOL_INFO.gst}</strong>
      </div>
      <div style="font-size: 9px; margin-bottom: 8px;">Email: ${SCHOOL_INFO.email} | Phone: ${SCHOOL_INFO.phone}</div>
      <div style="font-size: 8px; font-style: italic; line-height: 1.4; opacity: 0.9;">
        All fees are subject to our no-refund policy once batch commences, even if no classes are attended.<br/>
        <strong>By paying this invoice, you acknowledge and accept this condition.</strong>
      </div>
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
