import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

function escapeHtml(str: string | number | null | undefined): string {
  if (str == null) return ""
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

interface JobAlertJob {
  title: string
  company: string
  location?: string
  salaryMin?: number
  salaryMax?: number
  germanLevel?: string
  applyUrl?: string
}

export async function sendJobAlertEmail({
  to,
  name,
  jobs,
  portalEmail,
}: {
  to: string
  name?: string
  jobs: JobAlertJob[]
  portalEmail: string
}): Promise<{ success: boolean; error?: unknown }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://planbeta.app"
  const greeting = name ? `Hi ${escapeHtml(name)}` : "Hi"

  const jobRows = jobs
    .map((job) => {
      const salary =
        job.salaryMin && job.salaryMax
          ? `EUR ${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()}/mo`
          : job.salaryMin
            ? `From EUR ${job.salaryMin.toLocaleString()}/mo`
            : null

      return `
        <tr>
          <td style="padding: 16px; border-bottom: 1px solid #f3f4f6;">
            <div style="font-size: 16px; font-weight: 600; color: #1f2937; margin-bottom: 4px;">
              ${escapeHtml(job.title)}
            </div>
            <div style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">
              ${escapeHtml(job.company)}${job.location ? ` — ${escapeHtml(job.location)}` : ""}
            </div>
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
              ${salary ? `<span style="font-size: 13px; color: #059669; font-weight: 500;">${salary}</span>` : ""}
              ${job.germanLevel ? `<span style="font-size: 13px; color: #d2302c; font-weight: 500;">German: ${escapeHtml(job.germanLevel)}</span>` : ""}
            </div>
            ${
              job.applyUrl
                ? `<a href="${job.applyUrl}" style="display: inline-block; margin-top: 10px; font-size: 13px; color: #d2302c; text-decoration: none; font-weight: 500;">Apply &rarr;</a>`
                : ""
            }
          </td>
        </tr>`
    })
    .join("")

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <div style="background: linear-gradient(135deg, #d2302c 0%, #121212 100%); padding: 30px 20px; text-align: center;">
        <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">Plan Beta Jobs</h1>
        <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 13px; letter-spacing: 2px; text-transform: uppercase;">Daily Job Alerts</p>
      </div>

      <div style="padding: 30px;">
        <p style="color: #374151; font-size: 15px; margin: 0 0 8px 0;">${greeting},</p>
        <p style="color: #374151; font-size: 15px; margin: 0 0 24px 0;">
          We found <strong>${jobs.length} new job${jobs.length !== 1 ? "s" : ""}</strong> matching your profile:
        </p>

        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          ${jobRows}
        </table>

        <div style="margin-top: 30px; text-align: center;">
          <a href="${appUrl}/jobs/student-jobs"
             style="display: inline-block; background: #d2302c; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">
            View All Opportunities
          </a>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">
            You're receiving this because you subscribed to Plan Beta Job Alerts.
          </p>
          <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px;">
            <a href="${appUrl}/api/subscriptions/portal" style="color: #d2302c; text-decoration: none;">Manage subscription</a>
          </p>
        </div>
      </div>
    </div>
  `

  try {
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || "Plan Beta Jobs <noreply@planbeta.in>",
      to,
      subject: `${jobs.length} new job${jobs.length !== 1 ? "s" : ""} matching your profile — Plan Beta Jobs`,
      html,
    })

    return { success: true }
  } catch (error) {
    console.error("[JobAlertEmail] Send failed:", error)
    return { success: false, error }
  }
}
