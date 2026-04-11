/**
 * Application Classifier — uses Claude Haiku Vision to extract job application
 * status from a screenshot of an email (German or English).
 *
 * Used by the Jobs App screenshot tracker endpoint so a JobSeeker can snap a
 * photo of a recruiter email and automatically update their application board.
 */

import Anthropic from "@anthropic-ai/sdk"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClassificationResult {
  company: string
  role: string
  status: "APPLIED" | "SCREENING" | "INTERVIEW" | "OFFER" | "REJECTED" | "WITHDRAWN"
  confidence: number // 0-1
  interviewDate?: string // ISO date if detected
  details?: string // brief summary
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured")
  return new Anthropic({ apiKey })
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an assistant that classifies screenshots of job application emails for a German-market job seeker.

You will be shown a screenshot of ONE email related to a job application. The email may be in German or English. Identify:
1. The company that sent the email (the employer).
2. The role / position title being discussed.
3. The current status of the application, mapped to exactly one of these enum values:
   - APPLIED      — an application was just received/acknowledged by the employer
   - SCREENING    — the employer is reviewing, asking for more info, scheduling, or in early screening
   - INTERVIEW    — an interview has been scheduled or invited
   - OFFER        — a job offer / contract has been extended
   - REJECTED     — the application was rejected
   - WITHDRAWN    — the candidate withdrew (rare, usually not in inbound emails)
4. Your confidence in this classification as a number between 0 and 1.
5. If an interview date is mentioned, return it in ISO 8601 format (YYYY-MM-DD or full ISO datetime).
6. A brief (one-sentence) human-readable summary of the email in "details".

German HR phrases to recognize:
- "Absage" / "leider können wir Ihnen keine Zusage" / "Ihre Bewerbung wurde abgelehnt" → REJECTED
- "Einladung zum Vorstellungsgespräch" / "Gesprächstermin" / "Interview-Einladung" → INTERVIEW
- "Zusage" / "Angebot" / "Arbeitsvertrag" / "freuen uns, Ihnen anzubieten" → OFFER
- "Eingangsbestätigung" / "Ihre Bewerbung ist bei uns eingegangen" / "Bewerbungseingang" → APPLIED
- "Nächste Schritte" / "Vorstellungsgespräch terminieren" / "Auswahlverfahren" → SCREENING

English HR phrases to recognize:
- "rejection" / "unfortunately" / "not moving forward" / "other candidates" → REJECTED
- "interview invitation" / "schedule an interview" / "would like to invite you" → INTERVIEW
- "job offer" / "pleased to offer" / "offer letter" / "employment contract" → OFFER
- "application confirmation" / "we have received your application" / "thank you for applying" → APPLIED
- "next steps" / "phone screen" / "initial screening" / "reviewing your application" → SCREENING

IMPORTANT:
- Return VALID JSON ONLY. No markdown, no code fences, no prose.
- The JSON must match exactly: {"company": string, "role": string, "status": enum, "confidence": number, "interviewDate"?: string, "details"?: string}
- If a field is unknown, use an empty string for strings or 0.3 for confidence — never invent data.
- If the screenshot is not a job application email, set confidence to 0.1 and make a best guess.`

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strip any markdown code fences / leading prose and parse JSON.
 * Claude sometimes wraps JSON in ```json ... ``` despite instructions.
 */
function parseClassificationJson(raw: string): ClassificationResult {
  let text = raw.trim()

  // Remove leading/trailing code fences
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "")
    text = text.trim()
  }

  // Find the first { and last } to handle any stray prose
  const firstBrace = text.indexOf("{")
  const lastBrace = text.lastIndexOf("}")
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1)
  }

  const parsed = JSON.parse(text) as Partial<ClassificationResult>

  // Normalize
  const status = (parsed.status ?? "APPLIED") as ClassificationResult["status"]
  const validStatuses: ClassificationResult["status"][] = [
    "APPLIED",
    "SCREENING",
    "INTERVIEW",
    "OFFER",
    "REJECTED",
    "WITHDRAWN",
  ]
  const normalizedStatus = validStatuses.includes(status) ? status : "APPLIED"

  const rawConfidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.3
  const confidence = Math.max(0, Math.min(1, rawConfidence))

  return {
    company: (parsed.company ?? "").toString().trim(),
    role: (parsed.role ?? "").toString().trim(),
    status: normalizedStatus,
    confidence,
    interviewDate: parsed.interviewDate ? String(parsed.interviewDate) : undefined,
    details: parsed.details ? String(parsed.details) : undefined,
  }
}

// ---------------------------------------------------------------------------
// Main API
// ---------------------------------------------------------------------------

/**
 * Classify a screenshot of a job application email using Claude Vision.
 * Recognizes German and English HR terminology.
 *
 * @param imageBase64 — the base64-encoded image data (no data: prefix)
 * @param mimeType    — MIME type (defaults to image/jpeg)
 */
export async function classifyScreenshot(
  imageBase64: string,
  mimeType: string = "image/jpeg"
): Promise<ClassificationResult> {
  const client = getClient()

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: "Extract the job application status from this email screenshot. Return JSON: {company, role, status, confidence, interviewDate?, details?}",
          },
        ],
      },
    ],
  })

  // Pull text content out of the response
  const textBlock = response.content.find((block) => block.type === "text")
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude Vision returned no text content")
  }

  try {
    return parseClassificationJson(textBlock.text)
  } catch (err) {
    throw new Error(
      `Failed to parse classification JSON: ${(err as Error).message}. Raw: ${textBlock.text.slice(0, 200)}`
    )
  }
}
