import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import html2canvas from 'html2canvas'
import { SCHOOL_INFO, BANK_DETAILS, CURRENCY_SYMBOLS, COURSE_INFO, type Currency } from './pricing'
import type { ReceiptData, ReceiptItem, PaymentMethod, PaymentStatus } from './receipt-types'

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

export async function generateReceiptPDF(data: ReceiptData): Promise<jsPDF> {
  const doc = new jsPDF()
  const currencySymbol = CURRENCY_SYMBOLS[data.currency]

  // Plan Beta brand color - red
  const brandRed: [number, number, number] = [210, 48, 44] // #d2302c
  const textDark: [number, number, number] = [31, 41, 55]
  const textGray: [number, number, number] = [107, 114, 128]
  const successGreen: [number, number, number] = [22, 163, 74] // #16a34a
  const lightGreen: [number, number, number] = [220, 252, 231] // light green bg

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

  // === RECEIPT TITLE & NUMBER BOX with PAID STATUS ===
  doc.setFillColor(245, 245, 245)
  doc.roundedRect(15, yPos, 180, 18, 2, 2, 'F')

  doc.setTextColor(...textDark)
  doc.setFontSize(22)
  doc.setFont('times', 'bold')
  doc.text('RECEIPT', 20, yPos + 12)

  // PAID badge - green
  const paidBadgeX = 75
  doc.setFillColor(...successGreen)
  doc.roundedRect(paidBadgeX, yPos + 4, 30, 10, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('PAID', paidBadgeX + 15, yPos + 11, { align: 'center' })

  // Receipt number and date - right aligned in box
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...brandRed)
  doc.text(`#${data.receiptNumber}`, 190, yPos + 8, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...textGray)
  doc.setFontSize(9)
  doc.text(`Date: ${data.date}`, 190, yPos + 14, { align: 'right' })

  yPos += 28

  // === PAYMENT INFORMATION BOX ===
  doc.setFillColor(...lightGreen)
  doc.setDrawColor(...successGreen)
  doc.setLineWidth(0.5)
  doc.roundedRect(15, yPos, 180, 20, 2, 2, 'FD')

  const paymentInfoX = 20
  let paymentInfoY = yPos + 7

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...successGreen)
  doc.text('PAYMENT RECEIVED', paymentInfoX, paymentInfoY)

  paymentInfoY += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...textDark)
  doc.text(`Payment Method: ${data.paymentMethod}`, paymentInfoX, paymentInfoY)

  if (data.transactionReference) {
    doc.text(`Transaction Ref: ${data.transactionReference}`, 110, paymentInfoY)
  }

  if (data.invoiceNumber) {
    paymentInfoY += 5
    doc.setTextColor(...textGray)
    doc.text(`Against Invoice: #${data.invoiceNumber}`, paymentInfoX, paymentInfoY)
  }

  yPos += 30

  // === RECEIVED FROM SECTION ===
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...textDark)
  doc.text('RECEIVED FROM:', 15, yPos)

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
  doc.setDrawColor(...successGreen)
  doc.setLineWidth(0.8)
  doc.setFillColor(...lightGreen)
  doc.roundedRect(120, yPos, 75, 40, 2, 2, 'FD')

  const summaryX = 125
  let summaryY = yPos + 8

  // Total Course Fee
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...textGray)
  doc.text('Total Course Fee:', summaryX, summaryY)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...textDark)
  doc.text(formatAmount(data.totalAmount), 190, summaryY, { align: 'right' })

  summaryY += 8

  // Amount Paid
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...successGreen)
  doc.text('Amount Paid:', summaryX, summaryY)
  doc.setFontSize(14)
  doc.text(formatAmount(data.amountPaid), 190, summaryY, { align: 'right' })

  summaryY += 10

  // Balance Remaining (if any)
  if (data.balanceRemaining > 0) {
    doc.setDrawColor(...brandRed)
    doc.setLineWidth(0.5)
    doc.line(summaryX, summaryY, 190, summaryY)
    summaryY += 6

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...brandRed)
    doc.text('Balance Due:', summaryX, summaryY)
    doc.setFontSize(11)
    doc.text(formatAmount(data.balanceRemaining), 190, summaryY, { align: 'right' })
  } else {
    // Paid in Full
    doc.setDrawColor(...successGreen)
    doc.setLineWidth(0.5)
    doc.line(summaryX, summaryY, 190, summaryY)
    summaryY += 6

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...successGreen)
    doc.text('✓ PAID IN FULL', summaryX + 15, summaryY)
  }

  yPos += 50

  // === PAYMENT METHOD DETAILS ===
  if (data.paymentMethod === 'UPI' || data.paymentMethod === 'Bank Transfer') {
    doc.setFillColor(249, 250, 251)
    doc.roundedRect(15, yPos, 180, 22, 2, 2, 'F')

    yPos += 7
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...textDark)
    doc.text('OUR BANK DETAILS', 20, yPos)

    yPos += 6
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...textGray)

    const col1X = 20
    const col2X = 110

    doc.text(`Account Name: ${BANK_DETAILS.accountName}`, col1X, yPos)
    doc.text(`IFSC Code: ${BANK_DETAILS.ifscCode}`, col2X, yPos)

    yPos += 5
    doc.text(`Account Number: ${BANK_DETAILS.accountNumber}`, col1X, yPos)
    doc.text(`UPI ID: ${BANK_DETAILS.upiId}`, col2X, yPos)

    yPos += 12
  }

  // === ACKNOWLEDGMENT BOX ===
  doc.setDrawColor(...successGreen)
  doc.setLineWidth(1)
  doc.setFillColor(...lightGreen)
  doc.roundedRect(15, yPos, 180, 22, 2, 2, 'FD')

  doc.setTextColor(...successGreen)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('✓ Payment Received - Thank You!', 20, yPos + 8)

  doc.setTextColor(...textDark)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.text(
    'This receipt confirms that the payment has been received and processed successfully.',
    20,
    yPos + 14
  )

  if (data.balanceRemaining > 0) {
    doc.setTextColor(...brandRed)
    doc.setFont('helvetica', 'bold')
    doc.text(
      `Remaining balance of ${formatAmount(data.balanceRemaining)} is due immediately.`,
      20,
      yPos + 19
    )
  }

  yPos += 28

  // === ADDITIONAL NOTES (if any) ===
  if (data.additionalNotes) {
    doc.setFillColor(250, 250, 250)
    doc.roundedRect(15, yPos, 180, 15, 1, 1, 'F')

    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...textGray)
    const noteLines = doc.splitTextToSize(data.additionalNotes, 170)
    doc.text(noteLines, 20, yPos + 6)

    yPos += 20
  }

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

export async function downloadReceipt(data: ReceiptData, filename?: string) {
  const doc = await generateReceiptPDF(data)
  const fileName = filename || `Receipt-${data.receiptNumber}.pdf`
  doc.save(fileName)
}

export async function previewReceipt(data: ReceiptData): Promise<string> {
  const doc = await generateReceiptPDF(data)
  return doc.output('dataurlstring')
}

// JPG Generation using html2canvas - returns Blob for upload
export async function generateReceiptJPGBlob(data: ReceiptData): Promise<Blob> {
  const currencySymbol = CURRENCY_SYMBOLS[data.currency]
  const total = data.totalAmount.toFixed(2)
  const paid = data.amountPaid.toFixed(2)
  const balance = data.balanceRemaining.toFixed(2)

  // Create receipt preview div for screenshot
  const receiptPreview = document.createElement('div')
  receiptPreview.style.position = 'absolute'
  receiptPreview.style.left = '-10000px'
  receiptPreview.style.width = '794px' // A4 width in pixels at 96 DPI
  receiptPreview.style.backgroundColor = '#ffffff'
  receiptPreview.style.fontFamily = 'Arial, sans-serif'

  receiptPreview.innerHTML = `
    <div style="background: #d2302c; padding: 40px 30px; color: white; position: relative;">
      <div style="display: flex; align-items: flex-start; gap: 20px;">
        <img src="/blogo.png" style="width: 70px; height: 70px;" crossorigin="anonymous" />
        <div>
          <h1 style="margin: 0; font-size: 32px; font-weight: bold;">PLAN BETA</h1>
          <p style="margin: 5px 0 0 0; font-size: 14px; font-style: italic;">School of German</p>
        </div>
      </div>
      <div style="position: absolute; top: 30px; right: 30px; background: white; padding: 15px; border-radius: 8px;">
        <div style="color: #787878; font-size: 10px;">RECEIPT NUMBER</div>
        <div style="color: #d2302c; font-size: 16px; font-weight: bold; margin-top: 5px;">#${data.receiptNumber}</div>
        <div style="color: #646464; font-size: 11px; margin-top: 5px;">Date: ${data.date}</div>
        <div style="background: #16a34a; color: white; padding: 5px 10px; border-radius: 4px; margin-top: 8px; text-align: center; font-weight: bold; font-size: 10px;">PAID</div>
      </div>
    </div>

    <div style="padding: 30px;">
      ${data.invoiceNumber ? `
        <div style="background: #dcfce7; border: 2px solid #16a34a; border-radius: 6px; padding: 12px; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div>
              <span style="color: #16a34a; font-size: 12px; font-weight: bold;">✓ PAYMENT RECEIVED</span>
              <div style="color: #374151; font-size: 10px; margin-top: 3px;">
                Payment Method: <strong>${data.paymentMethod}</strong>
                ${data.transactionReference ? ` | Ref: <strong>${data.transactionReference}</strong>` : ''}
              </div>
            </div>
            <div style="text-align: right; font-size: 9px; color: #6b7280;">
              Against Invoice: <strong>#${data.invoiceNumber}</strong>
            </div>
          </div>
        </div>
      ` : `
        <div style="background: #dcfce7; border: 2px solid #16a34a; border-radius: 6px; padding: 12px; margin-bottom: 20px;">
          <div style="color: #16a34a; font-size: 12px; font-weight: bold;">✓ PAYMENT RECEIVED</div>
          <div style="color: #374151; font-size: 10px; margin-top: 3px;">
            Payment Method: <strong>${data.paymentMethod}</strong>
            ${data.transactionReference ? ` | Transaction Ref: <strong>${data.transactionReference}</strong>` : ''}
          </div>
        </div>
      `}

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
          <h3 style="margin: 0; font-size: 13px; color: #16a34a;">RECEIVED FROM</h3>
          <p style="margin: 8px 0 0 0; font-size: 13px; font-weight: bold;">${data.studentName}</p>
          ${data.studentAddress ? `<p style="margin: 5px 0 0 0; font-size: 10px; color: #505050;">${data.studentAddress.replace(/\n/g, '<br/>')}</p>` : ''}
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; table-layout: fixed;">
        <thead>
          <tr style="background: #d2302c; color: white;">
            <th style="padding: 12px 10px; text-align: left; font-size: 10px; font-weight: bold; width: 45%;">DESCRIPTION</th>
            <th style="padding: 12px 10px; text-align: center; font-size: 10px; font-weight: bold; width: 20%;">LEVEL</th>
            <th style="padding: 12px 10px; text-align: center; font-size: 10px; font-weight: bold; width: 15%;">MONTH</th>
            <th style="padding: 12px 10px; text-align: right; font-size: 10px; font-weight: bold; width: 20%;">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map((item, idx) => {
            const levelColor = COURSE_INFO[item.level as keyof typeof COURSE_INFO]?.color || '#6b7280'
            return `
              <tr style="background: ${idx % 2 === 0 ? '#fafcfe' : '#fff'}; border-bottom: 1px solid #eee;">
                <td style="padding: 14px 10px; font-size: 11px; vertical-align: middle;">${item.description}</td>
                <td style="padding: 14px 10px; text-align: center; vertical-align: middle;">
                  <span style="background-color: ${levelColor}; color: #ffffff; padding: 6px 14px; border-radius: 4px; font-size: 11px; font-weight: bold; display: inline-block; white-space: nowrap;">${item.level}</span>
                </td>
                <td style="padding: 14px 10px; font-size: 11px; text-align: center; vertical-align: middle;">${item.month}</td>
                <td style="padding: 14px 10px; text-align: right; font-weight: bold; font-size: 12px; vertical-align: middle;">${currencySymbol}${parseFloat(item.amount.toString()).toFixed(2)}</td>
              </tr>
            `
          }).join('')}
        </tbody>
      </table>

      <div style="background: #dcfce7; border: 2px solid #16a34a; border-radius: 6px; padding: 15px; margin-left: auto; width: 280px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #6b7280; font-size: 11px;">Total Course Fee</span>
          <span style="color: #374151; font-weight: bold; font-size: 12px;">${currencySymbol}${total}</span>
        </div>

        <div style="background: #16a34a; color: white; padding: 10px; margin: -15px -15px 12px -15px; border-radius: 4px 4px 0 0;">
          <div style="font-size: 11px; font-weight: bold;">AMOUNT PAID</div>
          <div style="font-size: 18px; font-weight: bold; margin-top: 3px;">${currencySymbol}${paid}</div>
        </div>

        ${parseFloat(balance) > 0 ? `
          <div style="border-top: 2px solid #16a34a; padding-top: 8px; margin-top: 8px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="font-weight: bold; color: #dc2626; font-size: 11px;">Balance Due</span>
              <span style="font-weight: bold; color: #dc2626; font-size: 14px;">${currencySymbol}${balance}</span>
            </div>
          </div>
        ` : `
          <div style="border-top: 2px solid #16a34a; padding-top: 8px; margin-top: 8px; text-align: center;">
            <div style="color: #16a34a; font-weight: bold; font-size: 12px;">✓ PAID IN FULL</div>
          </div>
        `}
      </div>

      ${(data.paymentMethod === 'UPI' || data.paymentMethod === 'Bank Transfer') ? `
        <div style="background: #fafbfd; border: 1px solid #d2d2d2; border-radius: 6px; padding: 15px; margin-top: 20px;">
          <h3 style="margin: 0 0 10px 0; font-size: 12px; color: #d2302c;">OUR BANK DETAILS</h3>
          <div style="font-size: 10px;">
            Account: <strong>${BANK_DETAILS.accountName}</strong> | A/C: <strong>${BANK_DETAILS.accountNumber}</strong> | IFSC: <strong>${BANK_DETAILS.ifscCode}</strong><br/>
            UPI ID: <strong style="color: #d2302c;">${BANK_DETAILS.upiId}</strong>
          </div>
        </div>
      ` : ''}

      <div style="background: #dcfce7; border: 2px solid #16a34a; border-radius: 4px; padding: 15px; margin-top: 20px;">
        <div style="color: #16a34a; font-size: 13px; font-weight: bold; margin-bottom: 8px;">✓ Payment Received - Thank You!</div>
        <div style="color: #374151; font-size: 10px;">
          This receipt confirms that the payment has been received and processed successfully.
          ${parseFloat(balance) > 0 ? `<br/><span style="color: #dc2626; font-weight: bold;">Remaining balance of ${currencySymbol}${balance} is due immediately.</span>` : ''}
        </div>
      </div>

      ${data.additionalNotes ? `
        <div style="background: #f5f5f5; border: 1px solid #c8c8c8; border-radius: 4px; padding: 10px; margin-top: 15px; font-size: 9px; font-style: italic; color: #505050;">
          ${data.additionalNotes}
        </div>
      ` : ''}
    </div>

    <div style="background: #d2302c; color: white; padding: 20px; text-align: center;">
      <div style="font-size: 14px; font-weight: bold; margin-bottom: 8px;">${SCHOOL_INFO.name}</div>
      <div style="font-size: 9px; line-height: 1.5; opacity: 0.95; margin-bottom: 5px;">
        ${SCHOOL_INFO.address}, ${SCHOOL_INFO.city}, ${SCHOOL_INFO.state}<br/>
        <strong>GST: ${SCHOOL_INFO.gst}</strong>
      </div>
      <div style="font-size: 9px; margin-bottom: 8px;">Email: ${SCHOOL_INFO.email} | Phone: ${SCHOOL_INFO.phone}</div>
      <div style="font-size: 8px; font-style: italic; line-height: 1.4; opacity: 0.9;">
        This is a computer-generated receipt and does not require a signature.
      </div>
    </div>
  `

  document.body.appendChild(receiptPreview)

  try {
    const canvas = await html2canvas(receiptPreview, {
      scale: 3,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: true,
      logging: false
    })

    document.body.removeChild(receiptPreview)

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to create JPG blob'))
        }
      }, 'image/jpeg', 0.92)
    })
  } catch (error) {
    document.body.removeChild(receiptPreview)
    console.error('Error generating JPG:', error)
    throw new Error('Failed to generate JPG receipt')
  }
}

// JPG Generation using html2canvas - directly downloads file
export async function generateReceiptJPG(data: ReceiptData): Promise<void> {
  const blob = await generateReceiptJPGBlob(data)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = `PlanBeta_Receipt_${data.receiptNumber}_${data.studentName.replace(/\s+/g, '_')}.jpg`
  link.href = url
  link.click()
  URL.revokeObjectURL(url)
}
