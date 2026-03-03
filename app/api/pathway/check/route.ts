import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { generateContent } from "@/lib/gemini-client"

const pathwaySchema = z.object({
  country: z.string().min(1),
  age: z.number().int().min(16).max(70),
  qualification: z.string().min(1),
  profession: z.string().min(1),
  experience: z.string().min(1),
  germanLevel: z.string().min(1),
  name: z.string().min(1),
  whatsapp: z.string().min(1),
})

// Rate limiting: track requests by IP
const requestMap = new Map<string, number[]>()
const RATE_LIMIT = 5 // requests per 10 minutes
const RATE_WINDOW = 10 * 60 * 1000

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const requests = requestMap.get(ip) || []
  const recent = requests.filter((t) => now - t < RATE_WINDOW)
  requestMap.set(ip, recent)
  if (recent.length >= RATE_LIMIT) return false
  recent.push(now)
  return true
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for") || "unknown"
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again in a few minutes." },
        { status: 429 }
      )
    }

    const body = await request.json()
    const validation = pathwaySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      )
    }

    const { country, age, qualification, profession, experience, germanLevel } = validation.data

    const prompt = `You are an expert immigration consultant specializing in India-to-Germany pathways. Analyze this profile and provide a personalized Germany pathway.

PROFILE:
- Country: ${country}
- Age: ${age}
- Highest Qualification: ${qualification}
- Profession/Field: ${profession}
- Years of Experience: ${experience}
- Current German Level: ${germanLevel}

RESPOND IN THIS EXACT JSON FORMAT (no markdown, no code blocks, just raw JSON):
{
  "eligibilityScore": <number 0-100>,
  "recommendedVisa": "<visa type>",
  "visaDescription": "<1-2 sentence description of the visa>",
  "requiredGermanLevel": "<level needed e.g. B1, B2>",
  "currentLevelAssessment": "<assessment of their current level vs what they need>",
  "timelineMonths": <estimated total months to be ready>,
  "timeline": [
    {"month": "Month 1-3", "action": "<what to do>"},
    {"month": "Month 4-6", "action": "<what to do>"},
    {"month": "Month 7-9", "action": "<what to do>"},
    {"month": "Month 10-12", "action": "<what to do>"}
  ],
  "salaryRange": {"min": <number in EUR>, "max": <number in EUR>},
  "keyRequirements": ["<requirement 1>", "<requirement 2>", "<requirement 3>", "<requirement 4>"],
  "strengths": ["<strength 1>", "<strength 2>"],
  "challenges": ["<challenge 1>", "<challenge 2>"],
  "alternativePathways": ["<alternative 1>", "<alternative 2>"],
  "professionSpecificNotes": "<specific notes about their profession in Germany>"
}

KNOWLEDGE BASE FOR ACCURACY:
- Blue Card (EU): For highly qualified workers with a university degree. Salary threshold ~€45,300/year (or €41,000 for shortage occupations like IT, engineering). Requires recognized degree + job offer.
- Skilled Worker Visa (Section 18a/18b): For vocational qualifications. Requires recognized German or equivalent qualification + job offer.
- Job Seeker Visa: 6-month visa to search for work in Germany. Requires recognized qualification + B1 German minimum + proof of funds (~€11,208).
- Ausbildung (Vocational Training): 2-3 year program combining classroom + on-the-job training. Great for younger applicants without degrees. Usually requires A2-B1 German.
- Nursing Pathway: Germany has massive shortage. Requires B1-B2 German, nursing qualification recognition takes 6-12 months. Salary: €2,800-€3,800/month gross.
- IT Professionals: Can get Blue Card without degree if they have 3+ years experience and salary above €41,000. B1 German recommended but not always required for initial visa.
- Engineering: Strong demand especially in mechanical, automotive, electrical. Blue Card route is most common. B1 minimum, B2 preferred.
- Hospitality: Ausbildung route popular. Hotels/restaurants actively recruit from India. A2-B1 German needed.
- Healthcare (non-nursing): Doctors need Approbation (full license), requires C1 German + state exams. Physiotherapists, lab techs need B2.
- Students: Can apply for student visa with university admission. Some programs in English. Limited work permit (120 full days/year).
- Age factor: Job Seeker Visa available up to age 45. Blue Card has no age limit but pension considerations exist for 50+.

Be encouraging but realistic. If eligibility is low, suggest concrete steps to improve it.`

    const result = await generateContent(prompt, "gemini-2.5-flash-lite", {
      retries: 2,
      timeout: 30000,
    })

    if (!result.success || !result.content) {
      return NextResponse.json(
        { error: "Failed to generate pathway. Please try again." },
        { status: 500 }
      )
    }

    // Parse JSON from response (handle potential markdown wrapping)
    let pathway
    try {
      let content = result.content.trim()
      // Remove markdown code blocks if present
      if (content.startsWith("```")) {
        content = content.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
      }
      pathway = JSON.parse(content)
    } catch {
      console.error("[Pathway] Failed to parse Gemini response:", result.content)
      return NextResponse.json(
        { error: "Failed to parse pathway results. Please try again." },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, pathway })
  } catch (error) {
    console.error("[Pathway] Error:", error)
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
