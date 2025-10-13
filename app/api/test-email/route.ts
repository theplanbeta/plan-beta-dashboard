import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('🧪 Testing email without attachment...')
    console.log('📧 API Key:', process.env.RESEND_API_KEY ? 'Configured' : 'Missing')
    console.log('📧 From:', process.env.EMAIL_FROM)
    console.log('📧 To:', process.env.SUPPORT_EMAIL)

    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Plan Beta <noreply@planbeta.in>',
      to: process.env.SUPPORT_EMAIL || 'hello@planbeta.in',
      subject: 'Test Email - No Attachment',
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Test Email</h2>
          <p>This is a test email sent at ${new Date().toISOString()}</p>
          <p><strong>No attachment included.</strong></p>
        </div>
      `,
    })

    console.log('✅ Email sent result:', JSON.stringify(result, null, 2))

    return NextResponse.json({
      success: true,
      result,
      message: 'Email sent successfully'
    })
  } catch (error) {
    console.error('❌ Email failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        details: error
      },
      { status: 500 }
    )
  }
}
