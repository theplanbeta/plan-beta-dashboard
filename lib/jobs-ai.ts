// lib/jobs-ai.ts
/**
 * AI orchestrator for Plan Beta Day Zero.
 * - scoreJobDeep(): Claude Haiku — detailed match scoring
 * - generateCVContent(): Claude Sonnet — tailored CV content
 * - generateAnschreiben(): Claude Sonnet — German cover letter
 */

import Anthropic from "@anthropic-ai/sdk"

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured")
  return new Anthropic({ apiKey })
}

// ── Types ──────────────────────────────────────────────────────────────

export interface DeepScoreResult {
  overallScore: number // 0-100
  dimensions: {
    name: string
    score: number // 0-100
    explanation: string
  }[]
  summary: string // "Why you match" paragraph
  gaps: string[]  // "Gaps to address" list
}

export interface CVContentResult {
  professionalSummary: string
  coreCompetencies: string[] // 6-8 keyword phrases
  workExperience: {
    title: string
    company: string
    startDate: string
    endDate: string
    bullets: string[]
  }[]
  education: {
    degree: string
    institution: string
    year: string
  }[]
  skills: {
    technical: string[]
    languages: string[]
  }
  certifications: { name: string; year: string }[]
  keywordsUsed: string[]
  keywordCoverage: number // 0-100 percentage of JD keywords included
}

// ── Deep Scoring (Claude Haiku) ────────────────────────────────────────

export async function scoreJobDeep(
  profile: {
    germanLevel: string | null
    profession: string | null
    currentJobTitle: string | null
    yearsOfExperience: number | null
    skills: any
    workExperience: any
    education: any
    targetLocations: string[]
    salaryMin: number | null
    salaryMax: number | null
    visaStatus: string | null
  },
  job: {
    title: string
    company: string
    location: string | null
    description: string | null
    germanLevel: string | null
    profession: string | null
    jobType: string | null
    salaryMin: number | null
    salaryMax: number | null
    requirements: string[]
  }
): Promise<DeepScoreResult> {
  const client = getClient()

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: `You are a job matching expert for the German job market. Score how well a candidate matches a job posting. Return valid JSON only, no markdown.`,
    messages: [
      {
        role: "user",
        content: `Score this candidate against this job posting.

CANDIDATE PROFILE:
- German Level: ${profile.germanLevel || "Not specified"}
- Profession: ${profile.profession || "Not specified"}
- Current Title: ${profile.currentJobTitle || "Not specified"}
- Years of Experience: ${profile.yearsOfExperience ?? "Not specified"}
- Skills: ${JSON.stringify(profile.skills || {})}
- Target Locations: ${profile.targetLocations.join(", ") || "Any"}
- Salary Expectation: ${profile.salaryMin ? `${profile.salaryMin}-${profile.salaryMax} EUR` : "Not specified"}
- Visa Status: ${profile.visaStatus || "Not specified"}
- Work Experience: ${JSON.stringify(profile.workExperience || [])}

JOB POSTING:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location || "Not specified"}
- German Level Required: ${job.germanLevel || "None"}
- Type: ${job.jobType || "Not specified"}
- Salary: ${job.salaryMin ? `${job.salaryMin}-${job.salaryMax} EUR` : "Not specified"}
- Requirements: ${job.requirements.join(", ") || "None listed"}
- Description: ${(job.description || "").slice(0, 2000)}

Return JSON with this exact structure:
{
  "overallScore": <0-100>,
  "dimensions": [
    {"name": "German Language", "score": <0-100>, "explanation": "<1 sentence>"},
    {"name": "Skills Match", "score": <0-100>, "explanation": "<1 sentence>"},
    {"name": "Experience Level", "score": <0-100>, "explanation": "<1 sentence>"},
    {"name": "Location Fit", "score": <0-100>, "explanation": "<1 sentence>"},
    {"name": "Salary Alignment", "score": <0-100>, "explanation": "<1 sentence>"},
    {"name": "Visa Feasibility", "score": <0-100>, "explanation": "<1 sentence>"}
  ],
  "summary": "<2-3 sentences on why this candidate matches>",
  "gaps": ["<gap 1>", "<gap 2>"]
}`,
      },
    ],
  })

  const text = response.content.find((c) => c.type === "text")
  if (!text || text.type !== "text") {
    throw new Error("No text response from Claude")
  }

  return JSON.parse(text.text) as DeepScoreResult
}

// ── CV Content Generation (Claude Sonnet) ──────────────────────────────

export async function generateCVContent(
  profile: {
    firstName: string | null
    lastName: string | null
    email: string
    phone: string | null
    currentJobTitle: string | null
    yearsOfExperience: number | null
    germanLevel: string | null
    englishLevel: string | null
    skills: any
    workExperience: any
    education: any
    certifications: any
    visaStatus: string | null
  },
  job: {
    title: string
    company: string
    description: string | null
    requirements: string[]
    germanLevel: string | null
  },
  language: "en" | "de" = "en"
): Promise<CVContentResult> {
  const client = getClient()

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: `You are an expert ATS CV writer for the German job market, adapted from the career-ops methodology. You generate tailored, keyword-optimized CVs following a strict 10-step pipeline.

ABSOLUTE RULES:
- NEVER fabricate experience, skills, or qualifications
- ONLY reformulate existing experience using job description vocabulary
- Example: "LLM workflows with retrieval" → "RAG pipeline design and LLM orchestration workflows"
- Example: "Collaborated with team" → "Cross-functional stakeholder management across engineering and operations"
- Single-column layout, standard section headers ONLY (Professional Summary, Core Competencies, Work Experience, Education, Skills, Certifications)
- Top 5 keywords MUST appear in the Professional Summary
- All text must be UTF-8 selectable (no images of text)
- Use DD.MM.YYYY date format for German market

Return valid JSON only, no markdown or code fences.`,
    messages: [
      {
        role: "user",
        content: `Generate a tailored CV for this candidate. Output language: ${language === "de" ? "German" : "English"}.

CANDIDATE PROFILE:
- Name: ${profile.firstName || ""} ${profile.lastName || ""}
- Email: ${profile.email}
- Phone: ${profile.phone || "Not provided"}
- Current Title: ${profile.currentJobTitle || "Not specified"}
- Years of Experience: ${profile.yearsOfExperience ?? "Not specified"}
- German Level: ${profile.germanLevel || "Not specified"}
- English Level: ${profile.englishLevel || "Not specified"}
- Visa Status: ${profile.visaStatus || "Not specified"}
- Skills: ${JSON.stringify(profile.skills || {})}
- Work Experience: ${JSON.stringify(profile.workExperience || [])}
- Education: ${JSON.stringify(profile.education || [])}
- Certifications: ${JSON.stringify(profile.certifications || [])}

TARGET JOB:
- Title: ${job.title}
- Company: ${job.company}
- German Required: ${job.germanLevel || "None"}
- Requirements: ${job.requirements.join(", ") || "None listed"}
- Description: ${(job.description || "").slice(0, 3000)}

PIPELINE (execute in order):
1. KEYWORD EXTRACTION: Extract 15-20 relevant keywords/phrases from the job description
2. ROLE ARCHETYPE: Determine positioning strategy — how should this candidate's background be framed for this specific role?
3. EXIT NARRATIVE: If the candidate is transitioning industries/countries, write a bridge narrative showing how past experience applies to the German market and this role
4. PROFESSIONAL SUMMARY: Write 3-4 keyword-dense sentences. Include the top 5 JD keywords. Frame the candidate's experience as directly relevant to this role.
5. COMPETENCY GRID: Select 6-8 keyword phrases from the JD that the candidate can legitimately claim
6. EXPERIENCE REWRITE: Reorder work experience by relevance to this JD. Rewrite bullets using JD vocabulary. Prioritize quantified achievements.
7. PROJECT SELECTION: If projects exist, select the 2-3 most relevant
8. EDUCATION & CERTS: Include all, highlight German-relevant ones
9. SKILLS: Split into technical + languages. Include German level prominently.
10. KEYWORD COVERAGE: Report which keywords were used and coverage %

Return JSON:
{
  "professionalSummary": "<3-4 sentences with top 5 keywords>",
  "coreCompetencies": ["<phrase 1>", "<phrase 2>", ...6-8 total],
  "workExperience": [
    {
      "title": "<title>",
      "company": "<company>",
      "startDate": "<MM/YYYY>",
      "endDate": "<MM/YYYY or Present>",
      "bullets": ["<quantified achievement 1>", ...]
    }
  ],
  "education": [{"degree": "<>", "institution": "<>", "year": "<>"}],
  "skills": {"technical": ["<>"], "languages": ["German: ${profile.germanLevel || "A1"}", "English: ${profile.englishLevel || "B2"}", ...]},
  "certifications": [{"name": "<>", "year": "<>"}],
  "keywordsUsed": ["<keyword 1>", ...],
  "keywordCoverage": <percentage 0-100>
}`,
      },
    ],
  })

  const text = response.content.find((c) => c.type === "text")
  if (!text || text.type !== "text") {
    throw new Error("No text response from Claude")
  }

  return JSON.parse(text.text) as CVContentResult
}

// ── Anschreiben (Cover Letter) Generation (Claude Sonnet) ──────────────

export interface AnschreibenResult {
  senderBlock: string    // e.g. "Priya Sharma\nMusterstraße 1\n10115 Berlin"
  date: string           // e.g. "10. April 2026"
  recipientBlock: string // e.g. "Siemens AG\nPersonalabteilung\nMünchen"
  subject: string        // e.g. "Bewerbung als Software Engineer"
  salutation: string     // e.g. "Sehr geehrte Damen und Herren,"
  paragraphs: string[]   // 3-4 paragraphs of body text
  closing: string        // e.g. "Mit freundlichen Grüßen"
  signature: string      // e.g. "Priya Sharma"
}

export async function generateAnschreiben(
  profile: {
    firstName: string | null
    lastName: string | null
    email: string
    phone: string | null
    currentJobTitle: string | null
    yearsOfExperience: number | null
    germanLevel: string | null
    englishLevel: string | null
    skills: any
    workExperience: any
    education: any
    certifications: any
    visaStatus: string | null
  },
  job: {
    title: string
    company: string
    description: string | null
    requirements: string[]
    germanLevel: string | null
    location: string | null
  },
  language: "en" | "de" = "en"
): Promise<AnschreibenResult> {
  const client = getClient()

  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "Candidate"

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: `You are an expert German Anschreiben (cover letter) writer for international candidates applying to German companies. You write formal, culturally-appropriate cover letters that strictly follow German business correspondence conventions (DIN 5008-inspired).

GERMAN ANSCHREIBEN STRUCTURE (mandatory):
1. Sender block (Absender): candidate's name, contact info — top-right in the final PDF
2. Date (Datum): current date in German or English format depending on output language
3. Recipient block (Empfänger): company name, department (Personalabteilung if unknown), city
4. Subject line (Betreff): "Bewerbung als <Job Title>" in German / "Application for <Job Title>" in English — bold, no "Betreff:" label
5. Salutation (Anrede): "Sehr geehrte Damen und Herren," (German) or "Dear Hiring Manager," (English) if no named contact
6. Body (Hauptteil): 3-4 paragraphs
7. Closing (Grußformel): "Mit freundlichen Grüßen" (German) or "Sincerely" (English)
8. Signature: candidate's full name

BODY PARAGRAPH RULES:
- Paragraph 1 — Why this company and role: Show research about the company. Reference something specific about their work, values, or the role. Open with enthusiasm but remain formal (German cover letters are NOT casual).
- Paragraph 2 — Relevant experience: Connect 2-3 concrete experiences directly to the job description keywords and requirements. Use measurable achievements where possible. Never fabricate — only reformulate what the candidate has already done.
- Paragraph 3 — Why Germany / relocation motivation: Critical for international applicants. Explain motivation to live and work in Germany, German language commitment (mention current level), cultural interest, long-term career vision in the German market. Show visa readiness if relevant.
- Paragraph 4 — Closing: Availability / earliest start date, salary expectation only if provided, polite forward-looking statement ("Über die Gelegenheit zu einem persönlichen Gespräch würde ich mich sehr freuen" / "I would welcome the opportunity to discuss my application in a personal interview").

ABSOLUTE RULES:
- NEVER fabricate experience, skills, employers, projects, or qualifications
- ONLY reformulate existing experience using the job description's vocabulary
- Match the output language exactly: if "de", write everything in formal German (Sie-form, never "du"). If "en", write in formal professional English.
- Tone: formal, confident, respectful — not salesy, not casual, not overly humble
- Avoid clichés like "I am a team player" — prove claims with specific evidence
- Keep each paragraph focused; total body should be ~250-350 words
- Do NOT include placeholder text like "[Your Address]" — omit address fields that aren't provided

OUTPUT FORMAT:
Return VALID JSON ONLY, no markdown, no code fences, no commentary. Exact structure:
{
  "senderBlock": "<name only if no address available, else name + address lines separated by \\n>",
  "date": "<today's date in language-appropriate format>",
  "recipientBlock": "<company>\\n<department>\\n<city>",
  "subject": "<Bewerbung als ... | Application for ...>",
  "salutation": "<Sehr geehrte Damen und Herren, | Dear Hiring Manager,>",
  "paragraphs": ["<para 1>", "<para 2>", "<para 3>", "<para 4>"],
  "closing": "<Mit freundlichen Grüßen | Sincerely>",
  "signature": "<full name>"
}`,
    messages: [
      {
        role: "user",
        content: `Write a German Anschreiben (cover letter) for this candidate and job. Output language: ${language === "de" ? "German (Deutsch)" : "English"}.

TODAY'S DATE: ${new Date().toLocaleDateString(language === "de" ? "de-DE" : "en-GB", { year: "numeric", month: "long", day: "numeric" })}

CANDIDATE PROFILE:
- Full Name: ${fullName}
- Email: ${profile.email}
- Phone: ${profile.phone || "Not provided"}
- Current Title: ${profile.currentJobTitle || "Not specified"}
- Years of Experience: ${profile.yearsOfExperience ?? "Not specified"}
- German Level: ${profile.germanLevel || "Not specified"}
- English Level: ${profile.englishLevel || "Not specified"}
- Visa Status: ${profile.visaStatus || "Not specified"}
- Skills: ${JSON.stringify(profile.skills || {})}
- Work Experience: ${JSON.stringify(profile.workExperience || [])}
- Education: ${JSON.stringify(profile.education || [])}
- Certifications: ${JSON.stringify(profile.certifications || [])}

TARGET JOB:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location || "Germany"}
- German Required: ${job.germanLevel || "None specified"}
- Requirements: ${job.requirements.join(", ") || "None listed"}
- Description: ${(job.description || "").slice(0, 3000)}

Generate the Anschreiben now. Return JSON only.`,
      },
    ],
  })

  const text = response.content.find((c) => c.type === "text")
  if (!text || text.type !== "text") {
    throw new Error("No text response from Claude")
  }

  // Strip any accidental markdown code fences before parsing
  const raw = text.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "")
  return JSON.parse(raw) as AnschreibenResult
}
