import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { SCHOOL_INFO, BANK_DETAILS, CURRENCY_SYMBOLS, type Currency } from './pricing'
import type { ReceiptData } from './receipt-types'

function escapeHtml(str: string | number | null | undefined): string {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function fmtAmt(amount: number, currency: string): string {
  if (currency === 'INR') {
    return '₹' + amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })
  }
  return '€' + amount.toLocaleString('en-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function buildReceiptHTML(data: ReceiptData): string {
  const fmt = (n: number) => fmtAmt(n, data.currency)
  const cleanGst = (s: string) => s.replace(/^GST:\s*/i, '')
  const isPaidInFull = data.balanceRemaining <= 0

  return `
    <style>
      * { box-sizing: border-box; }
      .rcpt-font { font-family: 'Outfit', system-ui, sans-serif; }
    </style>

    <!-- Header — green tint for receipts -->
    <div class="rcpt-font" style="background: linear-gradient(135deg, #15803d 0%, #16a34a 50%, #166534 100%); padding: 36px 40px; color: white; display: flex; justify-content: space-between; align-items: center;">
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

    <div class="rcpt-font" style="padding: 36px 40px;">

      <!-- Receipt title + PAID badge -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 2px solid #f0f0f0;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="font-size: 28px; font-weight: 700; color: #1a1a1a; letter-spacing: -0.5px;">RECEIPT</div>
          <span style="background: #16a34a; color: white; padding: 5px 16px; border-radius: 20px; font-size: 11px; font-weight: 600; letter-spacing: 1px;">${isPaidInFull ? 'PAID IN FULL' : 'PARTIAL'}</span>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 14px; font-weight: 600; color: #16a34a;">#${escapeHtml(data.receiptNumber)}</div>
          <div style="font-size: 12px; color: #888; margin-top: 4px; font-weight: 400;">Date: ${data.date}</div>
        </div>
      </div>

      <!-- Payment confirmation banner -->
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 18px; margin-bottom: 28px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 11px; font-weight: 600; color: #16a34a;">✓ Payment Received</div>
          <div style="font-size: 10px; color: #555; margin-top: 3px;">
            Method: <strong>${escapeHtml(data.paymentMethod)}</strong>
            ${data.transactionReference ? ` &middot; Ref: <strong>${escapeHtml(data.transactionReference)}</strong>` : ''}
          </div>
        </div>
        ${data.invoiceNumber ? `<div style="font-size: 10px; color: #888;">Invoice: <strong>#${escapeHtml(data.invoiceNumber)}</strong></div>` : ''}
      </div>

      <!-- From / Received From -->
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
          <div style="font-size: 9px; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">Received From</div>
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
              <td style="padding: 14px 0; font-size: 12px; color: #333; font-weight: 400; vertical-align: middle;">
                ${escapeHtml(item.description)}<br/>
                <span style="font-size: 10px; color: #999;">Batch: ${escapeHtml(item.batch)}</span>
              </td>
              <td style="padding: 14px 0; vertical-align: middle;">
                <span style="background: #16a34a; color: white; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 600; display: inline-block; line-height: 1;">${escapeHtml(item.level)}</span>
              </td>
              <td style="padding: 14px 0; font-size: 12px; color: #555; vertical-align: middle;">${escapeHtml(item.month)}</td>
              <td style="padding: 14px 0; text-align: right; font-size: 14px; font-weight: 600; color: #1a1a1a; vertical-align: middle;">${fmt(item.amount)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Summary -->
      <div style="display: flex; justify-content: flex-end; margin-bottom: 32px;">
        <div style="width: 280px;">
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
            <span style="font-size: 12px; color: #888;">Total Course Fee</span>
            <span style="font-size: 14px; font-weight: 600; color: #1a1a1a;">${fmt(data.totalAmount)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
            <span style="font-size: 12px; color: #888;">Amount Paid</span>
            <span style="font-size: 14px; font-weight: 600; color: #16a34a;">${fmt(data.amountPaid)}</span>
          </div>
          ${data.balanceRemaining > 0 ? `
          <div style="display: flex; justify-content: space-between; padding: 10px 0;">
            <span style="font-size: 12px; color: #888;">Balance Due</span>
            <span style="font-size: 14px; font-weight: 600; color: #ef4444;">${fmt(data.balanceRemaining)}</span>
          </div>` : ''}
          <div style="background: ${isPaidInFull ? '#16a34a' : '#1a1a1a'}; color: white; padding: 14px 16px; border-radius: 8px; margin-top: 12px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">${isPaidInFull ? '✓ Paid in Full' : 'Amount Paid'}</span>
            <span style="font-size: 20px; font-weight: 700;">${fmt(data.amountPaid)}</span>
          </div>
        </div>
      </div>

      <!-- Bank details -->
      <div style="background: #fafafa; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <div style="font-size: 9px; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">Bank Details</div>
        <div style="display: flex; gap: 40px; font-size: 11px; color: #555;">
          <div><span style="color: #999;">Account:</span> <strong>${BANK_DETAILS.accountName}</strong></div>
          <div><span style="color: #999;">A/C No:</span> <strong>${BANK_DETAILS.accountNumber}</strong></div>
          <div><span style="color: #999;">IFSC:</span> <strong>${BANK_DETAILS.ifscCode}</strong></div>
        </div>
        <div style="font-size: 11px; margin-top: 8px; color: #555;"><span style="color: #999;">UPI:</span> <strong style="color: #16a34a;">${BANK_DETAILS.upiId}</strong></div>
      </div>

      <!-- Refund policy — compact -->
      <div style="border: 1px solid #e5e5e5; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <div style="font-size: 10px; font-weight: 600; color: #c62828; margin-bottom: 6px;">Terms & Refund Policy</div>
        <p style="margin: 0; font-size: 9px; line-height: 1.7; color: #666;">
          Once the first class of the batch has commenced, all fees are <strong style="color: #333;">non-refundable regardless of attendance</strong>. This term is binding and non-negotiable upon payment.
        </p>
      </div>

      <div style="font-size: 8px; color: #bbb; text-align: center; padding-top: 8px;">
        This is a computer-generated receipt and does not require a signature.
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #1a1a1a; color: white; padding: 20px 40px; display: flex; justify-content: space-between; align-items: center;" class="rcpt-font">
      <div style="font-size: 12px; font-weight: 600;">Thank you for choosing Plan Beta!</div>
      <div style="font-size: 10px; opacity: 0.6;">${SCHOOL_INFO.email} &middot; ${SCHOOL_INFO.phone}</div>
    </div>
  `
}

/** Render receipt HTML to canvas */
async function renderReceiptToCanvas(data: ReceiptData): Promise<HTMLCanvasElement> {
  // Load Outfit font
  const fontLink = document.createElement('link')
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap'
  fontLink.rel = 'stylesheet'
  document.head.appendChild(fontLink)
  await new Promise(r => setTimeout(r, 400))

  const el = document.createElement('div')
  el.style.position = 'absolute'
  el.style.left = '-10000px'
  el.style.width = '794px'
  el.style.backgroundColor = '#ffffff'
  el.style.fontFamily = "'Outfit', system-ui, sans-serif"

  el.innerHTML = buildReceiptHTML(data)
  document.body.appendChild(el)

  try {
    const canvas = await html2canvas(el, {
      scale: 3,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: true,
      logging: false,
    })
    return canvas
  } finally {
    document.body.removeChild(el)
  }
}

export async function generateReceiptPDF(data: ReceiptData): Promise<jsPDF> {
  const canvas = await renderReceiptToCanvas(data)

  const pdfWidth = 210
  const pdfHeight = 297
  const imgWidth = pdfWidth
  const imgHeight = (canvas.height * pdfWidth) / canvas.width

  const doc = new jsPDF('p', 'mm', 'a4')
  const imgData = canvas.toDataURL('image/jpeg', 0.95)

  if (imgHeight > pdfHeight) {
    const scale = pdfHeight / imgHeight
    const scaledWidth = imgWidth * scale
    const xOffset = (pdfWidth - scaledWidth) / 2
    doc.addImage(imgData, 'JPEG', xOffset, 0, scaledWidth, pdfHeight)
  } else {
    doc.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight)
  }

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

// JPG Generation - returns Blob for upload
export async function generateReceiptJPGBlob(data: ReceiptData): Promise<Blob> {
  const canvas = await renderReceiptToCanvas(data)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('Failed to create JPG blob'))
      }
    }, 'image/jpeg', 0.92)
  })
}

// JPG Generation - directly downloads file
export async function generateReceiptJPG(data: ReceiptData): Promise<void> {
  const blob = await generateReceiptJPGBlob(data)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = `PlanBeta_Receipt_${data.receiptNumber}_${data.studentName.replace(/\s+/g, '_')}.jpg`
  link.href = url
  link.click()
  URL.revokeObjectURL(url)
}
