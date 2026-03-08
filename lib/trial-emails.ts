import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

function escapeHtml(str: string | null | undefined): string {
  if (str == null) return ""
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://theplanbeta.com"
const FROM = process.env.EMAIL_FROM || "Plan Beta Jobs <noreply@planbeta.in>"

function wrapEmail(content: string, preheader: string): string {
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <span style="display:none;font-size:1px;color:#fff;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</span>
      <div style="background: linear-gradient(135deg, #d2302c 0%, #121212 100%); padding: 30px 20px; text-align: center;">
        <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">Plan Beta Jobs</h1>
      </div>
      <div style="padding: 30px;">
        ${content}
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">
            You're receiving this because you started a free trial on Plan Beta Jobs.
          </p>
        </div>
      </div>
    </div>
  `
}

function ctaButton(text: string, url: string): string {
  return `
    <div style="margin: 24px 0; text-align: center;">
      <a href="${url}" style="display: inline-block; background: #d2302c; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
        ${escapeHtml(text)}
      </a>
    </div>
  `
}

/**
 * Day 1: Welcome email — show what they unlocked
 */
export async function sendTrialDay1Email(to: string, name?: string): Promise<boolean> {
  const greeting = name ? `Hey ${escapeHtml(name)}` : "Hey"

  const html = wrapEmail(`
    <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
      ${greeting}! 👋
    </p>
    <p style="color: #374151; font-size: 15px; margin: 0 0 20px 0;">
      Welcome to <strong>Plan Beta Jobs Premium</strong>! Your 5-day free trial just started. Here's what you've unlocked:
    </p>

    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 10px 12px; font-size: 14px; color: #374151; border-bottom: 1px solid #f3f4f6;">⚡ <strong>English OK filter</strong> — find jobs that don't need German</td></tr>
      <tr><td style="padding: 10px 12px; font-size: 14px; color: #374151; border-bottom: 1px solid #f3f4f6;">💰 <strong>Salary filter & sort</strong> — find the best-paying jobs first</td></tr>
      <tr><td style="padding: 10px 12px; font-size: 14px; color: #374151; border-bottom: 1px solid #f3f4f6;">🔔 <strong>Instant alerts</strong> — new jobs sent to your email & WhatsApp</td></tr>
      <tr><td style="padding: 10px 12px; font-size: 14px; color: #374151; border-bottom: 1px solid #f3f4f6;">💾 <strong>Saved jobs</strong> — synced across all your devices</td></tr>
      <tr><td style="padding: 10px 12px; font-size: 14px; color: #374151; border-bottom: 1px solid #f3f4f6;">🕐 <strong>Early access</strong> — see new jobs 6 hours before everyone else</td></tr>
      <tr><td style="padding: 10px 12px; font-size: 14px; color: #374151;">📊 <strong>Salary insights</strong> — full breakdown by city, job type & level</td></tr>
    </table>

    ${ctaButton("Browse Jobs Now", `${APP_URL}/jobs/student-jobs`)}

    <p style="color: #6b7280; font-size: 13px; margin: 0; text-align: center;">
      Try saving a search to get notified when matching jobs appear.
    </p>
  `, "Welcome to Plan Beta Jobs Premium! Here's what you've unlocked.")

  try {
    await resend.emails.send({ from: FROM, to, subject: "Welcome to Premium! Here's what you unlocked 🎯", html })
    return true
  } catch (error) {
    console.error("[TrialEmail] Day 1 failed:", error)
    return false
  }
}

/**
 * Day 3: Engagement email — remind them of value
 */
export async function sendTrialDay3Email(to: string, name?: string, jobCount?: number): Promise<boolean> {
  const greeting = name ? `Hey ${escapeHtml(name)}` : "Hey"
  const jobsLine = jobCount
    ? `There are <strong>${jobCount} student jobs</strong> on the portal right now.`
    : `New student jobs are added every day.`

  const html = wrapEmail(`
    <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
      ${greeting}! 🎯
    </p>
    <p style="color: #374151; font-size: 15px; margin: 0 0 12px 0;">
      You're halfway through your free trial. ${jobsLine}
    </p>
    <p style="color: #374151; font-size: 15px; margin: 0 0 20px 0;">
      Have you tried these premium features yet?
    </p>

    <table style="width: 100%; border-collapse: collapse; margin: 16px 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <tr>
        <td style="padding: 16px; border-bottom: 1px solid #f3f4f6;">
          <strong style="color: #1f2937;">Save a search</strong>
          <div style="font-size: 13px; color: #6b7280; margin-top: 4px;">Filter by city + job type, then click "Save this search" to get alerts when new matches appear.</div>
        </td>
      </tr>
      <tr>
        <td style="padding: 16px; border-bottom: 1px solid #f3f4f6;">
          <strong style="color: #1f2937;">Check salary insights</strong>
          <div style="font-size: 13px; color: #6b7280; margin-top: 4px;">See what student jobs pay in Berlin vs Munich, by job type, and by German level.</div>
        </td>
      </tr>
      <tr>
        <td style="padding: 16px;">
          <strong style="color: #1f2937;">Use the work hours calculator</strong>
          <div style="font-size: 13px; color: #6b7280; margin-top: 4px;">Check how many hours you can legally work based on your visa type.</div>
        </td>
      </tr>
    </table>

    ${ctaButton("Explore Premium Features", `${APP_URL}/jobs/student-jobs`)}
  `, "You're halfway through your free trial. Have you tried these features?")

  try {
    await resend.emails.send({ from: FROM, to, subject: "Halfway through your trial — are you using these? ⚡", html })
    return true
  } catch (error) {
    console.error("[TrialEmail] Day 3 failed:", error)
    return false
  }
}

/**
 * Day 4: Trial ending reminder
 */
export async function sendTrialDay4Email(to: string, name?: string): Promise<boolean> {
  const greeting = name ? `Hey ${escapeHtml(name)}` : "Hey"

  const html = wrapEmail(`
    <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
      ${greeting},
    </p>
    <p style="color: #374151; font-size: 15px; margin: 0 0 12px 0;">
      Your free trial ends <strong>tomorrow</strong>. After that, your card will be charged <strong>EUR 1.99/month</strong> to keep your premium access.
    </p>
    <p style="color: #374151; font-size: 15px; margin: 0 0 20px 0;">
      With premium you'll continue getting:
    </p>
    <ul style="color: #374151; font-size: 14px; padding-left: 20px; margin: 0 0 20px 0; line-height: 1.8;">
      <li>New jobs 6 hours before free users</li>
      <li>Instant email & WhatsApp alerts</li>
      <li>Salary filter, English OK filter, and sort</li>
      <li>Saved jobs synced across devices</li>
      <li>Full salary insights dashboard</li>
    </ul>

    <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #92400e;">
        <strong>Don't want to continue?</strong> No problem — cancel anytime from your account. No questions asked.
      </p>
    </div>

    ${ctaButton("Manage Subscription", `${APP_URL}/jobs/student-jobs`)}

    <p style="color: #6b7280; font-size: 12px; margin: 0; text-align: center;">
      EUR 1.99/month — that's less than a coffee. Cancel anytime.
    </p>
  `, "Your free trial ends tomorrow. Here's what happens next.")

  try {
    await resend.emails.send({ from: FROM, to, subject: "Your trial ends tomorrow ⏰", html })
    return true
  } catch (error) {
    console.error("[TrialEmail] Day 4 failed:", error)
    return false
  }
}
