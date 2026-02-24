import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPermission } from '@/lib/api-permissions'
import { logSuccess } from '@/lib/audit'
import { AuditAction } from '@prisma/client'
import { Resend } from 'resend'
import { generateOfferLetterPDF, type OfferLetterData } from '@/lib/offer-letter-generator'
import { format } from 'date-fns'

const resend = new Resend(process.env.RESEND_API_KEY)

const emailHeader = `
  <div style="background: linear-gradient(135deg, #d2302c 0%, #121212 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; color: white; font-size: 32px; font-weight: 700; letter-spacing: -0.5px; font-family: 'Segoe UI', Arial, sans-serif;">Plan Beta</h1>
    <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 13px; letter-spacing: 3px; font-weight: 500; text-transform: uppercase;">School of German</p>
  </div>
`

const emailFooter = `
  <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
    <div style="text-align: center; margin-bottom: 25px;">
      <h2 style="margin: 0 0 5px 0; color: #d2302c; font-size: 20px; font-weight: 700; letter-spacing: -0.3px; font-family: 'Segoe UI', Arial, sans-serif;">Plan Beta</h2>
      <p style="margin: 0; color: #6b7280; font-size: 11px; letter-spacing: 2px; font-weight: 500; text-transform: uppercase;">School of German</p>
    </div>

    <div style="text-align: center; margin: 25px 0; padding: 20px; background: #f9fafb; border-radius: 6px;">
      <p style="margin: 0 0 12px 0; color: #374151; font-size: 14px; line-height: 1.8;">
        <a href="mailto:${process.env.SUPPORT_EMAIL || 'hello@planbeta.in'}" style="color: #d2302c; text-decoration: none; font-weight: 500;">${process.env.SUPPORT_EMAIL || 'hello@planbeta.in'}</a>
      </p>
      <p style="margin: 0 0 12px 0; color: #374151; font-size: 14px; line-height: 1.8;">
        <a href="tel:+919028396035" style="color: #d2302c; text-decoration: none; font-weight: 500;">+91 90283 96035</a>
      </p>
      <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.8;">
        <a href="https://planbeta.in" style="color: #d2302c; text-decoration: none; font-weight: 500;">planbeta.in</a>
      </p>
    </div>

    <div style="text-align: center; margin-top: 25px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #9ca3af; font-size: 11px; line-height: 1.6;">
        © ${new Date().getFullYear()} Plan Beta. All rights reserved.
      </p>
    </div>
  </div>
`

// POST /api/offers/[id]/send-email - Send offer letter via email with PDF attachment
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const check = await checkPermission('offers', 'update')
    if (!check.authorized) return check.response

    const { id } = await params

    // Get offer letter
    const offerLetter = await prisma.offerLetter.findUnique({
      where: { id },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!offerLetter) {
      return NextResponse.json({ error: 'Offer letter not found' }, { status: 404 })
    }

    // Prepare data for PDF generation
    const pdfData: OfferLetterData = {
      offerNumber: offerLetter.offerNumber,
      offerDate: format(new Date(offerLetter.offerDate), 'dd MMM yyyy'),
      acceptanceDeadline: format(new Date(offerLetter.acceptanceDeadline), 'dd MMM yyyy'),
      teacherName: offerLetter.teacher.name,
      teacherAddress: offerLetter.teacherAddress,
      teacherEmail: offerLetter.teacher.email,
      positionType: offerLetter.positionType,
      batchAssignments: offerLetter.batchAssignments as Array<{ level: string; rate: number }>,
    }

    // Generate PDF
    const pdfDoc = await generateOfferLetterPDF(pdfData)
    const pdfBuffer = pdfDoc.output('arraybuffer')
    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64')

    // Create elegant email content
    const batches = (offerLetter.batchAssignments as Array<{ level: string; rate: number }>) || []
    const batchList = batches
      .map((batch) => `<li style="padding: 5px 0;"><strong>${batch.level}:</strong> INR ${batch.rate} per hour</li>`)
      .join('')

    const emailHtml = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        ${emailHeader}
        <div style="padding: 35px 30px;">
          <h1 style="color: #1f2937; margin: 0 0 10px 0; font-size: 26px;">Offer Letter - Part-Time German Language Trainer 🎓</h1>
          <p style="color: #6b7280; margin: 0 0 25px 0; font-size: 15px;">Dear ${offerLetter.teacher.name},</p>

          <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
            We are delighted to extend this offer to you for the position of <strong>Part-Time German Language Trainer</strong> at Plan Beta School of German.
          </p>

          <div style="background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%); padding: 25px; border-radius: 10px; margin: 25px 0; border-left: 4px solid #d2302c;">
            <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">📋 Offer Details</h3>
            <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px;"><strong>Offer Number:</strong> ${offerLetter.offerNumber}</p>
            <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px;"><strong>Offer Date:</strong> ${format(new Date(offerLetter.offerDate), 'dd MMM yyyy')}</p>
            <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px;"><strong>Acceptance Deadline:</strong> ${format(new Date(offerLetter.acceptanceDeadline), 'dd MMM yyyy')}</p>
            <p style="margin: 0; color: #374151; font-size: 14px;"><strong>Position:</strong> ${offerLetter.positionType === 'FULL_TIME' ? 'Full-Time' : 'Part-Time'} German Language Trainer</p>
          </div>

          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px;">💰 Assigned Batches & Hourly Rates</h3>
            <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px;">
              ${batchList}
            </ul>
          </div>

          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
            <h3 style="margin: 0 0 12px 0; color: #92400e; font-size: 16px;">📄 Next Steps</h3>
            <ol style="margin: 0; padding-left: 20px; color: #78350f; font-size: 14px; line-height: 1.8;">
              <li>Download and review the attached offer letter PDF carefully</li>
              <li>Read all terms and conditions mentioned in the document</li>
              <li>Sign the acceptance section on the last page</li>
              <li>Reply to this email with the signed PDF attached</li>
              <li>Ensure you respond before the acceptance deadline: <strong>${format(new Date(offerLetter.acceptanceDeadline), 'dd MMM yyyy')}</strong></li>
            </ol>
          </div>

          <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #10b981;">
            <p style="margin: 0 0 10px 0; color: #065f46; font-size: 14px; font-weight: 600;">
              ✅ This offer letter is digitally authorized
            </p>
            <p style="margin: 0; color: #047857; font-size: 13px;">
              This document has been digitally authorized by Aparna Bose, Founder and Director of Plan Beta School of German, and does not require a physical signature from our end.
            </p>
          </div>

          <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 20px 0;">
            We believe your expertise and passion for teaching will be a valuable addition to our team. We look forward to working with you!
          </p>

          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            If you have any questions or concerns about this offer, please don't hesitate to reach out to us.
          </p>

          <p style="color: #374151; font-size: 15px; margin-top: 30px; font-weight: 600;">Best regards,</p>
          <p style="color: #374151; font-size: 15px; margin: 5px 0;"><strong>Aparna Bose</strong></p>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Founder and Director</p>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Plan Beta School of German</p>

          ${emailFooter}
        </div>
      </div>
    `

    // Send email with PDF attachment
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Plan Beta <noreply@planbeta.in>',
      to: offerLetter.teacher.email,
      subject: `Offer Letter - Part-Time German Language Trainer (${offerLetter.offerNumber})`,
      html: emailHtml,
      attachments: [
        {
          filename: `${offerLetter.offerNumber}-${offerLetter.teacher.name}.pdf`,
          content: pdfBase64,
        },
      ],
    })

    console.log('Offer letter email sent successfully:', result)

    // Update offer letter status to SENT
    await prisma.offerLetter.update({
      where: { id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    })

    // Audit log
    await logSuccess(
      AuditAction.TEACHER_UPDATED,
      `Offer letter sent via email: ${offerLetter.offerNumber} to ${offerLetter.teacher.name} (${offerLetter.teacher.email})`,
      {
        entityType: 'OfferLetter',
        entityId: offerLetter.id,
        metadata: {
          offerNumber: offerLetter.offerNumber,
          teacherName: offerLetter.teacher.name,
          teacherEmail: offerLetter.teacher.email,
          emailId: result.data?.id,
        },
        request: req,
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Offer letter sent successfully',
      emailId: result.data?.id,
    })
  } catch (error) {
    console.error('Error sending offer letter email:', error)
    return NextResponse.json(
      { error: 'Failed to send offer letter email', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
