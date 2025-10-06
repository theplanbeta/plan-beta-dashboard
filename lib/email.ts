import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export type EmailTemplate =
  | 'student-welcome'
  | 'payment-received'
  | 'payment-reminder'
  | 'batch-start'
  | 'attendance-alert'
  | 'referral-payout'
  | 'month-complete'

interface EmailData {
  to: string
  subject: string
  html: string
}

// Email template generator
export function generateEmail(template: EmailTemplate, data: Record<string, string | number | boolean | null | undefined>): EmailData {
  const templates = {
    'student-welcome': {
      subject: `Welcome to Plan Beta, ${data.studentName}!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #3b82f6;">Welcome to Plan Beta! 🎉</h1>
          <p>Dear ${data.studentName},</p>
          <p>We're excited to have you join us for your German language journey!</p>

          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Your Enrollment Details:</h3>
            <p><strong>Student ID:</strong> ${data.studentId}</p>
            <p><strong>Level:</strong> ${data.level}</p>
            <p><strong>Batch:</strong> ${data.batchCode || 'To be assigned'}</p>
            <p><strong>Start Date:</strong> ${data.startDate}</p>
          </div>

          <p>Your learning portal is now active. Log in to access your schedule, materials, and track your progress.</p>

          <div style="margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/login"
               style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Access Your Portal
            </a>
          </div>

          <p>If you have any questions, feel free to reach out to us at ${process.env.SUPPORT_EMAIL}.</p>

          <p>Best regards,<br>The Plan Beta Team</p>
        </div>
      `,
    },

    'payment-received': {
      subject: `Payment Received - €${data.amount}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #10b981;">Payment Received ✓</h1>
          <p>Dear ${data.studentName},</p>
          <p>We've successfully received your payment. Thank you!</p>

          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Payment Details:</h3>
            <p><strong>Amount Paid:</strong> €${data.amount}</p>
            <p><strong>Payment Method:</strong> ${data.method}</p>
            <p><strong>Transaction ID:</strong> ${data.transactionId || 'N/A'}</p>
            <p><strong>Date:</strong> ${data.paymentDate}</p>
            <p><strong>Remaining Balance:</strong> €${data.balance}</p>
          </div>

          ${data.balance && Number(data.balance) > 0 ? `
            <p style="color: #f59e0b;">You still have a balance of €${data.balance}. Please clear it at your earliest convenience.</p>
          ` : `
            <p style="color: #10b981;">Your fees are fully paid! 🎉</p>
          `}

          <p>You can view your complete payment history in your student portal.</p>

          <p>Best regards,<br>The Plan Beta Team</p>
        </div>
      `,
    },

    'payment-reminder': {
      subject: `Payment Reminder - €${data.balance} Due`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #f59e0b;">Payment Reminder</h1>
          <p>Dear ${data.studentName},</p>
          <p>This is a friendly reminder about your pending payment.</p>

          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h3 style="margin-top: 0;">Outstanding Balance:</h3>
            <p style="font-size: 24px; font-weight: bold; color: #f59e0b; margin: 10px 0;">€${data.balance}</p>
            <p><strong>Original Fee:</strong> €${data.originalPrice}</p>
            <p><strong>Paid So Far:</strong> €${data.totalPaid}</p>
            ${data.daysOverdue && Number(data.daysOverdue) > 0 ? `<p style="color: #dc2626;"><strong>Days Overdue:</strong> ${data.daysOverdue}</p>` : ''}
          </div>

          <p>Please clear your dues to continue enjoying uninterrupted access to our classes and materials.</p>

          <p><strong>Payment Options:</strong></p>
          <ul>
            <li>Online Transfer</li>
            <li>Cash at Office</li>
            <li>UPI: ${process.env.UPI_ID || 'Available in portal'}</li>
          </ul>

          <p>For any payment-related queries, contact us at ${process.env.SUPPORT_EMAIL}.</p>

          <p>Best regards,<br>The Plan Beta Team</p>
        </div>
      `,
    },

    'batch-start': {
      subject: `Your Batch Starts ${data.startDate} - ${data.batchCode}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #3b82f6;">Your Batch is Starting Soon! 🚀</h1>
          <p>Dear ${data.studentName},</p>
          <p>Great news! You've been assigned to a new batch.</p>

          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Batch Details:</h3>
            <p><strong>Batch Code:</strong> ${data.batchCode}</p>
            <p><strong>Level:</strong> ${data.level}</p>
            <p><strong>Start Date:</strong> ${data.startDate}</p>
            <p><strong>Schedule:</strong> ${data.schedule}</p>
            <p><strong>Instructor:</strong> ${data.instructor || 'To be announced'}</p>
            <p><strong>Total Students:</strong> ${data.enrolledCount}/${data.totalSeats}</p>
          </div>

          <p><strong>What to Bring for First Class:</strong></p>
          <ul>
            <li>Notebook and pen</li>
            <li>Positive attitude and enthusiasm!</li>
            <li>Your student ID</li>
          </ul>

          <div style="margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard"
               style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Batch Details
            </a>
          </div>

          <p>We're excited to start this journey with you!</p>

          <p>Best regards,<br>The Plan Beta Team</p>
        </div>
      `,
    },

    'attendance-alert': {
      subject: `Attendance Alert - Action Required`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #dc2626;">Attendance Alert ⚠️</h1>
          <p>Dear ${data.studentName},</p>
          <p>We've noticed your attendance has fallen below our minimum requirement.</p>

          <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <h3 style="margin-top: 0;">Current Attendance:</h3>
            <p style="font-size: 32px; font-weight: bold; color: #dc2626; margin: 10px 0;">${data.attendanceRate}%</p>
            <p><strong>Classes Attended:</strong> ${data.classesAttended} / ${data.totalClasses}</p>
            <p style="color: #dc2626;"><strong>Minimum Required:</strong> 50%</p>
          </div>

          <p><strong>Why Attendance Matters:</strong></p>
          <ul>
            <li>Consistent learning leads to better outcomes</li>
            <li>Required for course completion certificate</li>
            <li>Affects referral program eligibility</li>
          </ul>

          <p>Please make every effort to attend upcoming classes. If you're facing any challenges, reach out to us - we're here to help!</p>

          <p>Contact us: ${process.env.SUPPORT_EMAIL}</p>

          <p>Best regards,<br>The Plan Beta Team</p>
        </div>
      `,
    },

    'referral-payout': {
      subject: `Referral Payout Processed - €${data.amount}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #10b981;">Referral Payout Processed! 🎉</h1>
          <p>Dear ${data.referrerName},</p>
          <p>Great news! Your referral payout has been processed successfully.</p>

          <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <h3 style="margin-top: 0;">Payout Details:</h3>
            <p style="font-size: 32px; font-weight: bold; color: #10b981; margin: 10px 0;">€${data.amount}</p>
            <p><strong>Referee:</strong> ${data.refereeName}</p>
            <p><strong>Payout Date:</strong> ${data.payoutDate}</p>
            <p><strong>Payment Method:</strong> ${data.paymentMethod || 'Bank Transfer'}</p>
          </div>

          <p>Thank you for referring ${data.refereeName}! They've successfully completed their first month with excellent attendance.</p>

          <p><strong>Keep Referring, Keep Earning:</strong></p>
          <ul>
            <li>€2,000 for each successful referral</li>
            <li>No limit on number of referrals</li>
            <li>Payout after referee completes 1 month with ≥50% attendance</li>
          </ul>

          <div style="margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/referrals"
               style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Track Your Referrals
            </a>
          </div>

          <p>Best regards,<br>The Plan Beta Team</p>
        </div>
      `,
    },

    'month-complete': {
      subject: `Congratulations! Month ${data.month} Complete 🎉`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #8b5cf6;">Month ${data.month} Complete! 🎉</h1>
          <p>Dear ${data.studentName},</p>
          <p>Congratulations on completing Month ${data.month} of your German learning journey!</p>

          <div style="background: #f3e8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Your Progress:</h3>
            <p><strong>Attendance Rate:</strong> ${data.attendanceRate}%</p>
            <p><strong>Classes Attended:</strong> ${data.classesAttended} / ${data.totalClasses}</p>
            <p><strong>Current Level:</strong> ${data.currentLevel}</p>
            ${data.referrerName ? `<p style="color: #10b981;">✓ Referral payout triggered for ${data.referrerName}!</p>` : ''}
          </div>

          <p><strong>What's Next:</strong></p>
          <ul>
            <li>Continue with Month ${parseInt(String(data.month)) + 1} starting ${data.nextMonthStart}</li>
            <li>Practice regularly to retain what you've learned</li>
            <li>Consider referring friends to earn €2,000 per referral</li>
          </ul>

          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>💡 Tip:</strong> Students who maintain 80%+ attendance learn 40% faster!</p>
          </div>

          <p>Keep up the excellent work!</p>

          <p>Best regards,<br>The Plan Beta Team</p>
        </div>
      `,
    },
  }

  const selectedTemplate = templates[template as keyof typeof templates]

  return {
    to: String(data.to),
    subject: selectedTemplate.subject,
    html: selectedTemplate.html,
  }
}

// Send email function
export async function sendEmail(
  template: EmailTemplate,
  data: Record<string, string | number | boolean | null | undefined>
) {
  try {
    const emailData = generateEmail(template, data)

    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Plan Beta <noreply@planbeta.in>',
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
    })

    console.log('Email sent successfully:', result)
    return { success: true, data: result }
  } catch (error) {
    console.error('Error sending email:', error)
    return { success: false, error }
  }
}

// Batch email function
export async function sendBatchEmails(
  template: EmailTemplate,
  recipients: Array<{ email: string; data: Record<string, string | number | boolean | null | undefined> }>
) {
  const results = await Promise.allSettled(
    recipients.map((recipient) =>
      sendEmail(template, { ...recipient.data, to: recipient.email })
    )
  )

  const successful = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  return { successful, failed, total: recipients.length }
}
