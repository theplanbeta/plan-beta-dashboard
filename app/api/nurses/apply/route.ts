import { NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

const QUALIFICATION_LABELS: Record<string, string> = {
  "bsc-nursing": "BSc Nursing",
  "gnm-nursing": "GNM Nursing",
}

const EXPERIENCE_LABELS: Record<string, string> = {
  fresher: "Fresher",
  "1-2-years": "1-2 years",
  "3-5-years": "3-5 years",
  "5-plus-years": "5+ years",
}

const GERMAN_LEVEL_LABELS: Record<string, string> = {
  none: "None",
  a1: "A1",
  a2: "A2",
  b1: "B1",
  b2: "B2",
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()

    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const phone = formData.get("phone") as string
    const qualification = formData.get("qualification") as string
    const experience = formData.get("experience") as string
    const germanLevel = formData.get("germanLevel") as string
    const message = formData.get("message") as string
    const cv = formData.get("cv") as File | null

    // Validate required fields
    if (!name || !email || !phone || !qualification || !experience || !germanLevel) {
      return NextResponse.json(
        { error: "All required fields must be filled" },
        { status: 400 }
      )
    }

    // Validate CV
    if (!cv) {
      return NextResponse.json(
        { error: "CV upload is required" },
        { status: 400 }
      )
    }

    if (!ALLOWED_TYPES.includes(cv.type)) {
      return NextResponse.json(
        { error: "CV must be a PDF, DOC, or DOCX file" },
        { status: 400 }
      )
    }

    if (cv.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "CV file size must be under 5MB" },
        { status: 400 }
      )
    }

    // Convert file to buffer for Resend attachment
    const arrayBuffer = await cv.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const qualificationLabel =
      QUALIFICATION_LABELS[qualification] || qualification
    const experienceLabel = EXPERIENCE_LABELS[experience] || experience
    const germanLevelLabel = GERMAN_LEVEL_LABELS[germanLevel] || germanLevel

    await resend.emails.send({
      from: "Plan Beta <noreply@theplanbeta.com>",
      to: "hello@planbeta.in",
      replyTo: email,
      subject: `New Nursing Application: ${name} (${qualificationLabel})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #d2302c 0%, #121212 100%); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">New Nursing Application</h1>
          </div>
          <div style="padding: 30px 20px; background: #ffffff;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151; width: 40%;">Name</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #4b5563;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Email</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #4b5563;"><a href="mailto:${email}">${email}</a></td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Phone / WhatsApp</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #4b5563;">${phone}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Qualification</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #4b5563;">${qualificationLabel}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Experience</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #4b5563;">${experienceLabel}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">German Level</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #4b5563;">${germanLevelLabel}</td>
              </tr>
              ${message ? `
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Message</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #4b5563;">${message}</td>
              </tr>
              ` : ""}
            </table>
            <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">CV is attached to this email.</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: cv.name,
          content: buffer,
        },
      ],
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Nurse application error:", error)
    return NextResponse.json(
      { error: "Failed to submit application. Please try again." },
      { status: 500 }
    )
  }
}
