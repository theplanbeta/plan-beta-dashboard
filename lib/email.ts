import { Resend } from 'resend'
import { gzipSync } from 'zlib'

const resend = new Resend(process.env.RESEND_API_KEY)

// Elegant email header with clean typography - Plan Beta branding
const emailHeader = `
  <div style="background: linear-gradient(135deg, #d2302c 0%, #121212 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; color: white; font-size: 32px; font-weight: 700; letter-spacing: -0.5px; font-family: 'Segoe UI', Arial, sans-serif;">Plan Beta</h1>
    <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 13px; letter-spacing: 3px; font-weight: 500; text-transform: uppercase;">School of German</p>
  </div>
`

// Elegant email footer with clean typography and contact details
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
        <a href="tel:+918547081550" style="color: #d2302c; text-decoration: none; font-weight: 500;">+91 85470 81550</a>
      </p>
      <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.8;">
        <a href="https://planbeta.in" style="color: #d2302c; text-decoration: none; font-weight: 500;">planbeta.in</a>
      </p>
    </div>

    <div style="text-align: center; margin: 25px 0;">
      <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 12px; font-weight: 600;">Connect With Us</p>
      <div style="margin: 0;">
        <a href="https://facebook.com/theplanbeta" style="display: inline-block; margin: 0 10px; color: #6b7280; text-decoration: none; font-size: 13px;">Facebook</a>
        <span style="color: #d1d5db;">•</span>
        <a href="https://instagram.com/theplanbeta" style="display: inline-block; margin: 0 10px; color: #6b7280; text-decoration: none; font-size: 13px;">Instagram</a>
        <span style="color: #d1d5db;">•</span>
        <a href="https://youtube.com/@planbeta00" style="display: inline-block; margin: 0 10px; color: #6b7280; text-decoration: none; font-size: 13px;">YouTube</a>
        <span style="color: #d1d5db;">•</span>
        <a href="https://www.linkedin.com/company/planbeta/" style="display: inline-block; margin: 0 10px; color: #6b7280; text-decoration: none; font-size: 13px;">LinkedIn</a>
      </div>
    </div>

    <div style="text-align: center; margin-top: 25px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #9ca3af; font-size: 11px; line-height: 1.6;">
        © ${new Date().getFullYear()} Plan Beta. All rights reserved.
      </p>
      <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 10px; line-height: 1.5;">
        This email was sent as part of your enrollment/employment with Plan Beta.<br>
        For questions, reply to this email or contact our support team.
      </p>
    </div>
  </div>
`

export type EmailTemplate =
  | 'student-welcome'
  | 'teacher-welcome'
  | 'teacher-setup-invite'
  | 'password-reset'
  | 'payment-received'
  | 'payment-reminder'
  | 'batch-start'
  | 'attendance-alert'
  | 'referral-payout'
  | 'month-complete'
  | 'teacher-hours-reminder'
  | 'student-absence-notice'

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

    'teacher-welcome': {
      subject: `Welcome to Plan Beta - Your Teacher Account`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          ${emailHeader}
          <div style="padding: 35px 30px;">
            <h1 style="color: #1f2937; margin: 0 0 10px 0; font-size: 26px;">Welcome to Plan Beta! 👋</h1>
            <p style="color: #6b7280; margin: 0 0 20px 0; font-size: 15px;">Dear ${data.teacherName},</p>
            <p style="color: #374151; font-size: 15px;">Your teacher account has been created successfully. We're excited to have you as part of our teaching team!</p>

          <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #3b82f6;">
            <p style="margin: 0 0 8px 0; color: #1e40af; font-size: 14px; font-weight: bold;">
              🚀 Get Started in One Click
            </p>
            <p style="margin: 0; color: #1e40af; font-size: 13px;">
              Click the button below to automatically log in and set up your password. No manual login required!
            </p>
          </div>

          <div style="margin: 30px 0; text-align: center;">
            <a href="${data.welcomeUrl}"
               style="background: #d2302c; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 18px; box-shadow: 0 4px 8px rgba(210, 48, 44, 0.3);">
              🔐 Access Your Account
            </a>
          </div>

          <div style="margin: 20px 0; text-align: center; padding: 15px; background: #f9fafb; border-radius: 6px;">
            <p style="margin: 0; color: #6b7280; font-size: 13px;">Or copy and paste this link into your browser:</p>
            <p style="margin: 8px 0 0 0;"><a href="${data.welcomeUrl}" style="color: #d2302c; text-decoration: none; font-size: 12px; word-break: break-all;">${data.welcomeUrl}</a></p>
          </div>

          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0 0 8px 0; color: #92400e; font-size: 14px; font-weight: bold;">
              ⏰ Link Expires in ${data.expiryHours} Hours
            </p>
            <p style="margin: 0; color: #92400e; font-size: 13px;">
              This secure link will automatically log you in and take you to set up your password. The link expires in ${data.expiryHours} hours for your security.
            </p>
          </div>

          <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px;"><strong>What you can do:</strong></p>
            <ul style="margin: 10px 0 0 0; font-size: 14px;">
              <li>View your assigned batches and students</li>
              <li>Mark attendance for your classes</li>
              <li>Log your teaching hours</li>
              <li>Track payment status</li>
              <li>Update your profile</li>
            </ul>
          </div>

          <p style="color: #374151; font-size: 15px; margin-top: 20px;"><strong>Next Steps:</strong></p>
          <ol style="color: #6b7280; font-size: 14px; line-height: 1.8;">
            <li>Click the "Access Your Account" button above</li>
            <li>You'll be automatically logged in</li>
            <li>Set your own secure password</li>
            <li>Complete your profile information</li>
            <li>Explore the dashboard and available features</li>
          </ol>

          <p style="color: #6b7280; font-size: 14px;">If you have any questions or need assistance, please reach out to our support team.</p>

          <p style="color: #374151; font-size: 15px; margin-top: 25px;">Best regards,<br><strong>The Plan Beta Team</strong></p>
          ${emailFooter}
          </div>
        </div>
      `,
    },

    'teacher-setup-invite': {
      subject: `Complete Your Plan Beta Teacher Account Setup`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          ${emailHeader}
          <div style="padding: 35px 30px;">
            <h1 style="color: #1f2937; margin: 0 0 10px 0; font-size: 26px;">Complete Your Account Setup 🎓</h1>
            <p style="color: #6b7280; margin: 0 0 25px 0; font-size: 15px;">Dear ${data.teacherName},</p>
          <p>A teacher account has been created for you at Plan Beta. Please complete your account setup to get started.</p>

          <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <h3 style="margin-top: 0; color: #1e40af;">Action Required</h3>
            <p style="margin: 0; font-size: 14px;">You need to set up your personal email and password to access your account.</p>
          </div>

          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Temporary Login Credentials:</h3>
            <p><strong>Email:</strong> <code style="background: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-size: 14px;">${data.email}</code></p>
            <p><strong>Temporary Password:</strong> <code style="background: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-size: 14px;">${data.password}</code></p>
            <p style="font-size: 13px; color: #6b7280; margin-top: 10px;">Use these credentials for your first login only.</p>
          </div>

          <div style="margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://plan-beta-dashboard.vercel.app'}/login"
               style="background: #d2302c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
              Complete Setup Now
            </a>
          </div>

          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px;"><strong>📝 Setup Process:</strong></p>
            <ol style="margin: 10px 0 0 0; font-size: 14px; padding-left: 20px;">
              <li>Click the button above or login with temporary credentials</li>
              <li>You'll be automatically redirected to the account setup page</li>
              <li>Enter your personal email address</li>
              <li>Create a new secure password</li>
              <li>Start using your dashboard!</li>
            </ol>
          </div>

          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px;"><strong>What you'll be able to do:</strong></p>
            <ul style="margin: 10px 0 0 0; font-size: 14px;">
              <li>View and manage your assigned batches</li>
              <li>Mark attendance for your classes</li>
              <li>Log your teaching hours</li>
              <li>Track payment status</li>
              <li>Update your profile anytime</li>
            </ul>
          </div>

          <p style="font-size: 13px; color: #6b7280; background: #f9fafb; padding: 12px; border-radius: 6px; border-left: 3px solid #d1d5db;">
            <strong>Note:</strong> This is a system-generated email. After you complete your setup, all future communications will be sent to your personal email address.
          </p>

          <p style="color: #6b7280; font-size: 14px;">If you have any questions or need assistance, please reach out to our support team.</p>

          <p style="color: #374151; font-size: 15px; margin-top: 25px;">Best regards,<br><strong>The Plan Beta Team</strong></p>
          ${emailFooter}
          </div>
        </div>
      `,
    },

    'password-reset': {
      subject: `Reset Your Password - Plan Beta`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          ${emailHeader}
          <div style="padding: 35px 30px;">
            <h1 style="color: #1f2937; margin: 0 0 10px 0; font-size: 26px;">Password Reset Request</h1>
            <p style="color: #6b7280; margin: 0 0 20px 0; font-size: 15px;">Hi ${data.userName},</p>

            <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
              We received a request to reset your password for your Plan Beta account. Click the button below to create a new password:
            </p>

            <div style="margin: 30px 0; text-align: center;">
              <a href="${data.resetUrl}"
                 style="background: #d2302c; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
                Reset Password
              </a>
            </div>

            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
              <p style="margin: 0 0 8px 0; color: #92400e; font-size: 14px; font-weight: bold;">
                This link expires in 1 hour
              </p>
              <p style="margin: 0; color: #92400e; font-size: 13px;">
                For security reasons, this password reset link will expire in 60 minutes.
              </p>
            </div>

            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0;">
              If you did not request this password reset, you can safely ignore this email. Your password will not be changed.
            </p>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; line-height: 1.6; margin: 0;">
                If the button does not work, copy and paste this link into your browser:<br>
                <a href="${data.resetUrl}" style="color: #d2302c; word-break: break-all;">${data.resetUrl}</a>
              </p>
            </div>

            <p style="color: #374151; font-size: 15px; margin-top: 25px;">Best regards,<br><strong>The Plan Beta Team</strong></p>
          ${emailFooter}
          </div>
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

    'teacher-hours-reminder': {
      subject: `Log Today's Teaching Hours - ${data.todayDate || 'Today'}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          ${emailHeader}
          <div style="padding: 35px 30px;">
            <h1 style="color: #1f2937; margin: 0 0 10px 0; font-size: 26px;">Don't Forget to Log Today's Hours! ⏰</h1>
            <p style="color: #6b7280; margin: 0 0 25px 0; font-size: 15px;">Hi ${data.teacherName},</p>

            <p style="color: #374151; font-size: 15px; line-height: 1.6;">
              We noticed you haven't logged your teaching hours for <strong>${data.todayDate || 'today'}</strong> yet.
            </p>

            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
              <h3 style="margin: 0 0 10px 0; color: #92400e;">📋 Quick Reminder</h3>
              <p style="margin: 0; font-size: 14px; color: #92400e;">
                Logging hours the same day helps you remember exactly what was covered in class and ensures accurate payroll processing.
              </p>
            </div>

            ${data.assignedBatches ? `
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; font-size: 14px;"><strong>Your Active Batches:</strong></p>
              <p style="margin: 0; font-size: 14px; color: #6b7280;">${data.assignedBatches}</p>
            </div>
            ` : ''}

            <div style="margin: 30px 0; text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://plan-beta-dashboard.vercel.app'}/dashboard/teacher-hours"
                 style="background: #d2302c; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
                Log Today's Hours
              </a>
            </div>

            <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; font-size: 14px;"><strong>It only takes 30 seconds:</strong></p>
              <ol style="margin: 0; font-size: 14px; padding-left: 20px; color: #1e40af;">
                <li>Click the button above</li>
                <li>Click "Log Hours"</li>
                <li>Select your batch, enter hours, add a brief note</li>
                <li>Done!</li>
              </ol>
            </div>

            <p style="color: #374151; font-size: 15px; margin-top: 25px;">Thank you!<br><strong>Plan Beta Team</strong></p>
          ${emailFooter}
          </div>
        </div>
      `,
    },

    'student-absence-notice': {
      subject: `Class Attendance Notice - ${data.classDate || 'Today'}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          ${emailHeader}
          <div style="padding: 35px 30px;">
            <h1 style="color: #1f2937; margin: 0 0 10px 0; font-size: 24px;">Class Attendance Notice</h1>
            <p style="color: #6b7280; margin: 0 0 25px 0; font-size: 15px;">Dear ${data.studentName},</p>

            <p style="color: #374151; font-size: 15px; line-height: 1.6;">
              We noticed that you were unable to attend your German class on <strong>${data.classDate || 'today'}</strong>
              for batch <strong>${data.batchCode}</strong> (${data.level}).
            </p>

            <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #3b82f6;">
              <h3 style="margin: 0 0 10px 0; color: #1e40af; font-size: 16px;">Recording Available</h3>
              <p style="margin: 0; font-size: 14px; color: #1e40af; line-height: 1.6;">
                To ensure you don't fall behind, please watch the class recording at your earliest convenience.
                Recordings are available in your student portal and remain accessible for the duration of your course.
              </p>
            </div>

            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h3 style="margin: 0 0 12px 0; color: #374151; font-size: 16px;">Your Responsibilities as a Student</h3>
              <p style="margin: 0 0 12px 0; font-size: 14px; color: #4b5563; line-height: 1.6;">
                As outlined in your enrollment agreement, regular class attendance is essential for your language learning success.
                When you are unable to attend a scheduled class, you are expected to:
              </p>
              <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #4b5563; line-height: 1.8;">
                <li>Watch the complete recording of the missed session</li>
                <li>Complete any assigned homework or exercises</li>
                <li>Review the material before your next class</li>
                <li>Reach out to your teacher if you have questions about the content</li>
              </ul>
            </div>

            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
              <h3 style="margin: 0 0 10px 0; color: #92400e; font-size: 15px;">Important Policy Reminder</h3>
              <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.6;">
                Please note that course fees are non-refundable for missed classes, as all sessions are recorded and made
                available to enrolled students. By enrolling in the course, you have acknowledged that it is your responsibility
                to either attend live sessions or review the recordings. The availability of recordings ensures you have
                continuous access to all course content regardless of attendance.
              </p>
            </div>

            <p style="color: #374151; font-size: 15px; line-height: 1.6; margin-top: 25px;">
              We understand that circumstances may sometimes prevent attendance. If you're facing any challenges that
              are affecting your ability to participate in classes, please don't hesitate to reach out to us.
              We're here to support your learning journey.
            </p>

            <div style="margin: 30px 0; text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://plan-beta-dashboard.vercel.app'}/dashboard"
                 style="background: #d2302c; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
                Access Class Recordings
              </a>
            </div>

            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
              If you have any questions or need assistance, please contact us at
              <a href="mailto:${process.env.SUPPORT_EMAIL || 'hello@planbeta.in'}" style="color: #d2302c;">${process.env.SUPPORT_EMAIL || 'hello@planbeta.in'}</a>.
            </p>

            <p style="color: #374151; font-size: 15px; margin-top: 25px;">
              Warm regards,<br><strong>Plan Beta Team</strong>
            </p>
          ${emailFooter}
          </div>
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

type BackupCounts = Record<string, number>

export async function sendBackupEmail({
  to,
  counts,
  backupJson,
  timestamp,
  filename,
}: {
  to?: string | string[]
  counts: BackupCounts
  backupJson: string
  timestamp: string
  filename?: string
}) {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'your-resend-api-key') {
    return { success: false, error: 'RESEND_API_KEY is not configured' }
  }

  if (!resend) {
    return { success: false, error: 'Email client not initialised' }
  }

  const recipientList = Array.isArray(to)
    ? to
    : [to || process.env.SUPPORT_EMAIL || 'hello@planbeta.in']

  const safeFilename =
    filename || `backup-${timestamp.replace(/[: ]/g, '-').replace(/\..+$/, '')}.json.gz`

  const summaryRows = Object.entries(counts)
    .map(([name, value]) => `<li><strong>${name}:</strong> ${value}</li>`)
    .join('')

  // Compress the backup JSON to reduce file size
  const compressed = gzipSync(Buffer.from(backupJson, 'utf-8'))
  const originalSize = Buffer.byteLength(backupJson, 'utf-8')
  const compressedSize = compressed.length
  const compressionRatio = Math.round(((originalSize - compressedSize) / originalSize) * 100)

  console.log(`📦 Backup compression: ${originalSize} bytes → ${compressedSize} bytes (${compressionRatio}% reduction)`)

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1d4ed8;">Plan Beta Database Backup</h2>
      <p><strong>Timestamp:</strong> ${timestamp}</p>
      <p>A compressed JSON backup (.gz) is attached.</p>
      <h3>Record counts</h3>
      <ul>
        ${summaryRows}
      </ul>
      <p style="font-size: 12px; color: #6b7280;">
        File size: ${Math.round(compressedSize / 1024)} KB (compressed from ${Math.round(originalSize / 1024)} KB)<br>
        Extract with: <code>gunzip ${safeFilename}</code>
      </p>
      <p style="font-size: 12px; color: #6b7280;">
        This email was generated automatically by the dashboard backup service.
      </p>
    </div>
  `

  try {
    console.log('📧 Sending backup email to:', recipientList)
    console.log('📧 Using Resend API key:', process.env.RESEND_API_KEY ? '✓ Configured' : '✗ Missing')

    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Plan Beta Backups <noreply@planbeta.in>',
      to: recipientList,
      subject: `Database Backup - ${timestamp}`,
      html,
      attachments: [
        {
          filename: safeFilename,
          content: compressed.toString('base64'),
        },
      ],
    })

    console.log('✅ Email sent successfully:', result)
    return { success: true, data: result }
  } catch (error) {
    console.error('❌ Failed to send backup email:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    return { success: false, error }
  }
}
