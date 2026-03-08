/**
 * Job Alert Multi-Channel Delivery
 * Sends alerts via email (Resend), WhatsApp, and Web Push
 */

import { sendJobAlertEmail } from "./job-alert-email"

interface AlertJob {
  title: string
  company: string
  location?: string
  salaryMin?: number
  salaryMax?: number
  germanLevel?: string
  applyUrl?: string
  slug?: string | null
}

interface AlertRecipient {
  email: string
  name?: string
  whatsapp?: string
  whatsappAlerts: boolean
  pushAlerts: boolean
  pushEndpoint?: string | null
}

interface AlertResult {
  email: boolean
  whatsapp: boolean
  push: boolean
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://theplanbeta.com"

/**
 * Send job alerts via all enabled channels
 */
export async function sendMultiChannelAlert(
  recipient: AlertRecipient,
  jobs: AlertJob[],
  alertType: "daily" | "saved-search" = "daily",
  searchName?: string
): Promise<AlertResult> {
  const result: AlertResult = { email: false, whatsapp: false, push: false }

  if (jobs.length === 0) return result

  // 1. Email (always sent)
  try {
    const emailResult = await sendJobAlertEmail({
      to: recipient.email,
      name: recipient.name,
      jobs: jobs.map((j) => ({
        title: j.title,
        company: j.company,
        location: j.location,
        salaryMin: j.salaryMin,
        salaryMax: j.salaryMax,
        germanLevel: j.germanLevel,
        applyUrl: j.applyUrl || (j.slug ? `${APP_URL}/jobs/student-jobs/job/${j.slug}` : undefined),
      })),
      portalEmail: recipient.email,
    })
    result.email = emailResult.success
  } catch (error) {
    console.error(`[AlertChannels] Email failed for ${recipient.email}:`, error)
  }

  // 2. WhatsApp (if enabled and configured)
  if (recipient.whatsappAlerts && recipient.whatsapp) {
    try {
      const { sendText: sendWhatsAppMessage } = await import("./whatsapp")
      const topJobs = jobs.slice(0, 5)
      const subject = alertType === "saved-search"
        ? `New jobs matching "${searchName}"`
        : `${jobs.length} new student jobs today`

      const jobLines = topJobs.map((j) => {
        const salary = j.salaryMin ? ` | EUR ${j.salaryMin}${j.salaryMax ? `–${j.salaryMax}` : "+"}` : ""
        return `• ${j.title} at ${j.company}${j.location ? ` (${j.location})` : ""}${salary}`
      })

      const message = [
        `*${subject}*`,
        "",
        ...jobLines,
        jobs.length > 5 ? `\n...and ${jobs.length - 5} more` : "",
        "",
        `View all: ${APP_URL}/jobs/student-jobs`,
      ].join("\n")

      await sendWhatsAppMessage(recipient.whatsapp, message)
      result.whatsapp = true
    } catch (error) {
      console.error(`[AlertChannels] WhatsApp failed for ${recipient.email}:`, error)
    }
  }

  // 3. Web Push (if enabled and endpoint exists)
  if (recipient.pushAlerts && recipient.pushEndpoint) {
    try {
      const { sendBroadcastPush } = await import("./web-push")
      await sendBroadcastPush({
        title: alertType === "saved-search"
          ? `${jobs.length} new jobs matching "${searchName}"`
          : `${jobs.length} new student jobs`,
        body: jobs[0]
          ? `${jobs[0].title} at ${jobs[0].company}${jobs.length > 1 ? ` and ${jobs.length - 1} more` : ""}`
          : "Check out new opportunities",
        url: `${APP_URL}/jobs/student-jobs`,
      })
      result.push = true
    } catch (error) {
      console.error(`[AlertChannels] Push failed for ${recipient.email}:`, error)
    }
  }

  return result
}
