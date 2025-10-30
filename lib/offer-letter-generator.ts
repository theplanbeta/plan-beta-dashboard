import jsPDF from 'jspdf'
import { SCHOOL_INFO } from './pricing'

export interface BatchAssignment {
  level: string
  rate: number
}

export interface OfferLetterData {
  offerNumber: string
  offerDate: string
  acceptanceDeadline: string
  teacherName: string
  teacherAddress: string
  teacherEmail: string
  positionType: string // "PART_TIME" or "FULL_TIME"
  batchAssignments: BatchAssignment[]
}

// Helper function to load image as base64
async function loadImageAsBase64(imagePath: string): Promise<string> {
  try {
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

export async function generateOfferLetterPDF(data: OfferLetterData): Promise<jsPDF> {
  const doc = new jsPDF()

  // Plan Beta brand colors
  const brandRed: [number, number, number] = [210, 48, 44] // #d2302c
  const textDark: [number, number, number] = [31, 41, 55]
  const textGray: [number, number, number] = [107, 114, 128]

  // Load logo
  let logoBase64 = ''
  try {
    logoBase64 = await loadImageAsBase64('/blogo.png')
  } catch (error) {
    console.error('Could not load logo:', error)
  }

  // Helper function to add header to each page
  const addHeader = (pageNum: number) => {
    // Header background
    doc.setFillColor(...brandRed)
    doc.rect(0, 0, 210, 35, 'F')

    // Add logo
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', 15, 8, 20, 20)
      } catch (error) {
        console.error('Error adding logo:', error)
      }
    }

    // School branding
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20)
    doc.setFont('times', 'bold')
    doc.text('PLAN BETA', 40, 17)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('School of German', 40, 23)

    // Page number
    doc.setFontSize(8)
    doc.text(`Page ${pageNum} of 5`, 195, 30, { align: 'right' })
  }

  // Helper function to add footer
  const addFooter = () => {
    doc.setFillColor(...brandRed)
    doc.rect(0, 280, 210, 17, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `${SCHOOL_INFO.address}, ${SCHOOL_INFO.city} | ${SCHOOL_INFO.phone} | ${SCHOOL_INFO.email}`,
      105,
      289,
      { align: 'center' }
    )
  }

  // ===== PAGE 1: HEADER AND BASIC DETAILS =====
  addHeader(1)

  let yPos = 45

  // Offer Letter Title
  doc.setTextColor(...brandRed)
  doc.setFontSize(18)
  doc.setFont('times', 'bold')
  doc.text('OFFER LETTER', 105, yPos, { align: 'center' })

  yPos += 15

  // Date and Offer Number
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...textDark)
  doc.text(`Ref: ${data.offerNumber}`, 15, yPos)
  doc.text(`Date: ${data.offerDate}`, 195, yPos, { align: 'right' })

  yPos += 15

  // Teacher Details
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('To,', 15, yPos)

  yPos += 6
  doc.setFont('helvetica', 'normal')
  doc.text(data.teacherName, 15, yPos)

  yPos += 5
  // Split address by lines
  const addressLines = data.teacherAddress.split('\n')
  addressLines.forEach(line => {
    doc.text(line, 15, yPos)
    yPos += 5
  })

  doc.text(`Email: ${data.teacherEmail}`, 15, yPos)

  yPos += 12

  // Salutation
  doc.text(`Dear ${data.teacherName.split(' ')[0]},`, 15, yPos)

  yPos += 10

  // Introduction paragraph
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...textDark)

  const intro = `We are pleased to offer you the position of ${
    data.positionType === 'FULL_TIME' ? 'Full-Time' : 'Part-Time'
  } German Language Trainer at ${SCHOOL_INFO.name}. We believe your expertise and passion for teaching will be a valuable addition to our team.`

  const introLines = doc.splitTextToSize(intro, 180)
  introLines.forEach((line: string) => {
    doc.text(line, 15, yPos)
    yPos += 5
  })

  yPos += 5

  // Position type
  doc.setFont('helvetica', 'bold')
  doc.text('Position: ', 15, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `${data.positionType === 'FULL_TIME' ? 'Full-Time' : 'Part-Time'} German Language Trainer`,
    40,
    yPos
  )

  yPos += 8

  // Batch assignments
  doc.setFont('helvetica', 'bold')
  doc.text('Assigned Batches and Hourly Rates:', 15, yPos)
  yPos += 7

  doc.setFont('helvetica', 'normal')
  data.batchAssignments.forEach(batch => {
    doc.text(`• ${batch.level}: INR ${batch.rate} per hour`, 20, yPos)
    yPos += 6
  })

  yPos += 7

  // Acceptance deadline
  doc.setFont('helvetica', 'bold')
  doc.text('Acceptance Deadline: ', 15, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(data.acceptanceDeadline, 60, yPos)

  yPos += 10

  // This offer is subject to terms
  doc.setFontSize(9)
  doc.setTextColor(...textGray)
  const termsText =
    'This offer is subject to the terms and conditions outlined in the following pages. Please review them carefully.'
  const termsLines = doc.splitTextToSize(termsText, 180)
  termsLines.forEach((line: string) => {
    doc.text(line, 15, yPos)
    yPos += 4
  })

  addFooter()

  // ===== PAGE 2: TERMS AND CONDITIONS (Sections 1-3) =====
  doc.addPage()
  addHeader(2)
  yPos = 45

  doc.setFontSize(14)
  doc.setFont('times', 'bold')
  doc.setTextColor(...brandRed)
  doc.text('TERMS AND CONDITIONS', 105, yPos, { align: 'center' })

  yPos += 12

  // Section 1: Position and Responsibilities
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...textDark)
  doc.text('1. Position and Responsibilities', 15, yPos)
  yPos += 6

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const section1 = [
    `As a ${
      data.positionType === 'FULL_TIME' ? 'Full-Time' : 'Part-Time'
    } German Language Trainer, your responsibilities will include:`,
    '',
    '• Conducting engaging and effective German language classes for assigned batches',
    '• Preparing lesson plans and course materials in accordance with the curriculum',
    '• Assessing student progress through regular tests and assignments',
    '• Maintaining accurate attendance and grade records',
    '• Providing constructive feedback to students to enhance their learning experience',
    '• Participating in faculty meetings and professional development activities',
    '',
    'Hourly compensation rates for your assigned batches:',
  ]

  section1.forEach(line => {
    const splitLines = doc.splitTextToSize(line, 180)
    splitLines.forEach((l: string) => {
      doc.text(l, 15, yPos)
      yPos += 4
    })
  })

  data.batchAssignments.forEach(batch => {
    doc.text(`• ${batch.level}: INR ${batch.rate} per hour`, 20, yPos)
    yPos += 4
  })

  yPos += 6

  // Section 2: Monthly Payment Structure
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('2. Monthly Payment Structure', 15, yPos)
  yPos += 6

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const section2 = [
    'Your monthly payment will be calculated based on the total number of hours taught during the month, at the hourly rates specified above. Payments will be processed by the 7th of the following month via bank transfer.',
    '',
    'To ensure timely payment, please submit:',
    '• Attendance records for all classes taught',
    '• Summary of total hours taught per batch',
    '',
    'Payments are contingent upon receipt of complete and accurate documentation.',
  ]

  section2.forEach(line => {
    const splitLines = doc.splitTextToSize(line, 180)
    splitLines.forEach((l: string) => {
      doc.text(l, 15, yPos)
      yPos += 4
    })
  })

  yPos += 6

  // Section 3: Course Assignment
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('3. Course Assignment', 15, yPos)
  yPos += 6

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const section3 = [
    'Batches will be assigned to you based on student enrollment and scheduling requirements. Each batch must have a minimum of 6 enrolled students for the course to commence.',
    '',
    'If a batch does not meet the minimum enrollment requirement, Plan Beta reserves the right to:',
    '• Postpone the batch start date until sufficient enrollment is achieved',
    '• Cancel the batch and reassign you to alternative batches',
    '• Merge students with other suitable batches',
    '',
    'You will be notified of any changes to batch assignments with reasonable notice.',
  ]

  section3.forEach(line => {
    const splitLines = doc.splitTextToSize(line, 180)
    splitLines.forEach((l: string) => {
      doc.text(l, 15, yPos)
      yPos += 4
    })
  })

  addFooter()

  // ===== PAGE 3: TERMS AND CONDITIONS (Sections 4-5) =====
  doc.addPage()
  addHeader(3)
  yPos = 45

  // Section 4: Leave and Holidays
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...textDark)
  doc.text('4. Leave and Holidays', 15, yPos)
  yPos += 6

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const section4 = [
    'As a part-time trainer, you are expected to maintain regular attendance for your assigned classes. In case of unavoidable absence, you must:',
    '',
    '• Notify Plan Beta administration at least 24 hours in advance',
    '• Provide a suitable replacement trainer (subject to approval)',
    '• Make arrangements to reschedule the missed class',
    '',
    'Frequent unexcused absences may result in batch reassignment or termination of this agreement.',
    '',
    'Plan Beta observes national holidays as per the academic calendar. Classes will not be scheduled on these dates, and no compensation will be provided for holidays.',
  ]

  section4.forEach(line => {
    const splitLines = doc.splitTextToSize(line, 180)
    splitLines.forEach((l: string) => {
      doc.text(l, 15, yPos)
      yPos += 4
    })
  })

  yPos += 6

  // Section 5: Termination and Resignation
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('5. Termination and Resignation', 15, yPos)
  yPos += 6

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const section5 = [
    'Either party may terminate this agreement with 30 days written notice. However, you are expected to complete any ongoing batches unless mutually agreed otherwise.',
    '',
    'Plan Beta reserves the right to terminate this agreement immediately in cases of:',
    '• Gross misconduct or violation of code of conduct',
    '• Consistent failure to meet teaching standards',
    '• Breach of confidentiality or intellectual property terms',
    '• Student complaints regarding inappropriate behavior',
    '',
    'In case of termination by Plan Beta, you will be compensated for all classes taught up to the termination date.',
    '',
    'If you resign mid-batch without completing the assigned course, Plan Beta reserves the right to withhold final payment until a suitable replacement is found and transitioned.',
  ]

  section5.forEach(line => {
    const splitLines = doc.splitTextToSize(line, 180)
    splitLines.forEach((l: string) => {
      doc.text(l, 15, yPos)
      yPos += 4
    })
  })

  addFooter()

  // ===== PAGE 4: TERMS AND CONDITIONS (Sections 6-7) =====
  doc.addPage()
  addHeader(4)
  yPos = 45

  // Section 6: Intellectual Property
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...textDark)
  doc.text('6. Intellectual Property', 15, yPos)
  yPos += 6

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const section6 = [
    'All course materials, lesson plans, presentations, and teaching resources provided by Plan Beta remain the intellectual property of Plan Beta School of German.',
    '',
    'You may not:',
    '• Share, distribute, or sell Plan Beta course materials to third parties',
    '• Use Plan Beta materials for personal tutoring or classes outside of Plan Beta',
    '• Reproduce or modify course materials without written permission',
    '',
    'Any original teaching materials you create specifically for Plan Beta batches will become the joint property of you and Plan Beta, and may be used by Plan Beta for future courses with appropriate attribution.',
    '',
    'Violation of intellectual property terms may result in immediate termination and legal action.',
  ]

  section6.forEach(line => {
    const splitLines = doc.splitTextToSize(line, 180)
    splitLines.forEach((l: string) => {
      doc.text(l, 15, yPos)
      yPos += 4
    })
  })

  yPos += 6

  // Section 7: Code of Conduct and Canvassing Policy
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('7. Code of Conduct and Canvassing Policy', 15, yPos)
  yPos += 6

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const section7 = [
    'As a representative of Plan Beta, you are expected to maintain the highest standards of professionalism, integrity, and ethical behavior.',
    '',
    'Specifically, you must NOT:',
    '• Solicit Plan Beta students for private tutoring or external classes',
    '• Share student contact information with third parties',
    '• Promote or recommend competing language institutes',
    '• Engage in any form of discrimination or harassment',
    '• Make disparaging remarks about Plan Beta, its faculty, or students',
    '',
    'ANTI-CANVASSING POLICY:',
    'You are strictly prohibited from directly or indirectly soliciting, recruiting, or encouraging Plan Beta students to enroll in your personal classes or any other competing language programs.',
    '',
    'Violation of this policy will result in:',
    '• Immediate termination of this agreement',
    '• Forfeiture of any pending payments',
    '• Legal action for damages caused to Plan Beta',
    '',
    'This policy remains in effect during your engagement with Plan Beta and for 12 months following termination of this agreement.',
  ]

  section7.forEach(line => {
    const splitLines = doc.splitTextToSize(line, 180)
    splitLines.forEach((l: string) => {
      doc.text(l, 15, yPos)
      yPos += 4
    })
  })

  addFooter()

  // ===== PAGE 5: SECTION 8 AND SIGNATURES =====
  doc.addPage()
  addHeader(5)
  yPos = 45

  // Section 8: Other Conditions
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...textDark)
  doc.text('8. Other Conditions', 15, yPos)
  yPos += 6

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const section8 = [
    '• This is a part-time engagement and does not constitute an employer-employee relationship. You are responsible for your own tax obligations.',
    '',
    '• You may be required to provide identification documents and educational credentials for verification purposes.',
    '',
    '• Plan Beta may modify hourly rates and batch assignments with 15 days notice.',
    '',
    '• All disputes arising from this agreement will be subject to the jurisdiction of courts in Kerala, India.',
    '',
    '• This offer letter supersedes any prior verbal or written agreements.',
  ]

  section8.forEach(line => {
    const splitLines = doc.splitTextToSize(line, 180)
    splitLines.forEach((l: string) => {
      doc.text(l, 15, yPos)
      yPos += 4
    })
  })

  yPos += 10

  // Closing
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(
    'We look forward to working with you and are confident that you will make significant contributions to our students\' learning journey.',
    15,
    yPos
  )
  yPos += 10

  doc.text('Sincerely,', 15, yPos)
  yPos += 15

  // Digital authorization section
  doc.setFont('helvetica', 'bold')
  doc.text('Digitally Authorized By:', 15, yPos)
  yPos += 6
  doc.setFont('helvetica', 'normal')
  doc.text('Aparna Bose', 15, yPos)
  yPos += 4
  doc.text('Founder and Director, Plan Beta School of German', 15, yPos)
  yPos += 4
  doc.text(`Date: ${data.offerDate}`, 15, yPos)
  yPos += 6
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text('This offer letter is digitally authorized and does not require a physical signature.', 15, yPos)
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(10)

  yPos += 20

  // Acceptance section
  doc.setFillColor(245, 245, 245)
  doc.roundedRect(15, yPos, 180, 50, 2, 2, 'F')

  yPos += 8
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...brandRed)
  doc.text('ACCEPTANCE OF OFFER', 20, yPos)

  yPos += 8
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...textDark)
  doc.text(
    'I, ' + data.teacherName + ', hereby accept the offer of employment as a Part-Time German Language',
    20,
    yPos
  )
  yPos += 4
  doc.text('Trainer at Plan Beta School of German. I have read and understood all the terms and conditions', 20, yPos)
  yPos += 4
  doc.text('outlined in this offer letter and agree to abide by them.', 20, yPos)

  yPos += 10
  doc.setFont('helvetica', 'bold')
  doc.text('________________________', 20, yPos)
  yPos += 5
  doc.setFont('helvetica', 'normal')
  doc.text('Signature', 20, yPos)

  yPos += 8
  doc.setFont('helvetica', 'bold')
  doc.text('Date: _________________', 20, yPos)

  addFooter()

  return doc
}

export async function downloadOfferLetter(data: OfferLetterData, filename?: string) {
  const doc = await generateOfferLetterPDF(data)
  const fileName = filename || `OfferLetter-${data.offerNumber}-${data.teacherName.replace(/\s+/g, '_')}.pdf`
  doc.save(fileName)
}

export async function previewOfferLetter(data: OfferLetterData): Promise<string> {
  const doc = await generateOfferLetterPDF(data)
  return doc.output('dataurlstring')
}
