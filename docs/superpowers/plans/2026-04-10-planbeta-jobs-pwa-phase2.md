# PlanBeta Jobs PWA — Phase 2: CV Generation & AI Scoring

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add AI-powered CV generation (Claude Sonnet → @react-pdf/renderer → Vercel Blob) and AI deep scoring (Claude Haiku) to the PlanBeta Jobs PWA.

**Architecture:** New `lib/jobs-ai.ts` orchestrates all Claude API calls. CV template is a React component using `@react-pdf/renderer`. Job detail page shows AI score breakdowns for premium users. CV history page lists all generated PDFs. All AI calls use `@anthropic-ai/sdk` (already installed), following the pattern from `app/api/cfo/chat/route.ts`.

**Tech Stack:** `@anthropic-ai/sdk` (Claude Haiku for scoring, Sonnet for CV gen), `@react-pdf/renderer` (PDF from React), `@vercel/blob` (PDF storage), Prisma (`GeneratedCV` model from Phase 1).

**Spec:** `docs/superpowers/specs/2026-04-10-planbeta-jobs-pwa-design.md` (sections 2.2, 2.3, 5.3, 5.4)

**Depends on:** Phase 1 complete on `feat/planbeta-jobs-pwa` branch.

---

## File Structure

### New Files

```
lib/jobs-ai.ts                                  # AI orchestrator — scoring + CV content generation
lib/cv-template.tsx                              # @react-pdf/renderer ATS CV template
app/api/jobs-app/cv/generate/route.ts            # POST: generate CV for a job
app/api/jobs-app/cv/route.ts                     # GET: list user's generated CVs
app/api/jobs-app/cv/[id]/route.ts                # GET + DELETE: single CV
app/api/jobs-app/jobs/[slug]/route.ts            # GET: job detail + AI deep score
app/jobs-app/job/[slug]/page.tsx                 # Job detail page (ISR for SEO)
app/jobs-app/cvs/page.tsx                        # CV history page
components/jobs-app/GenerateButton.tsx            # CV generate button with progress animation
components/jobs-app/CVPreview.tsx                 # In-app PDF preview/download
components/jobs-app/ScoreBreakdown.tsx            # AI score dimension breakdown display
```

### Modified Files

```
app/api/jobs-app/jobs/route.ts                   # Fix: prisma import (named export)
```

---

## Task 1: AI Orchestrator — `lib/jobs-ai.ts`

**Files:**
- Create: `lib/jobs-ai.ts`

- [ ] **Step 1: Create the AI orchestrator**

```typescript
// lib/jobs-ai.ts
/**
 * AI orchestrator for PlanBeta Jobs.
 * - scoreJobDeep(): Claude Haiku — detailed match scoring
 * - generateCVContent(): Claude Sonnet — tailored CV content
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
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit 2>&1 | grep "jobs-ai" | head -5
```

Expected: No errors (or only unrelated errors).

- [ ] **Step 3: Commit**

```bash
git add lib/jobs-ai.ts
git commit -m "feat(jobs-app): add AI orchestrator for deep scoring (Haiku) and CV generation (Sonnet)"
```

---

## Task 2: CV Template — `lib/cv-template.tsx`

**Files:**
- Create: `lib/cv-template.tsx`

- [ ] **Step 1: Create the @react-pdf/renderer CV template**

```typescript
// lib/cv-template.tsx
import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer"
import type { CVContentResult } from "./jobs-ai"

// ── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 45,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.5,
    color: "#1a1a1a",
  },
  header: {
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb",
    paddingBottom: 12,
  },
  name: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: "row",
    gap: 12,
    fontSize: 9,
    color: "#6b7280",
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#2563eb",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 3,
  },
  summary: {
    fontSize: 10,
    lineHeight: 1.6,
    color: "#374151",
    marginBottom: 4,
  },
  competenciesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  competencyTag: {
    backgroundColor: "#eff6ff",
    borderRadius: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 9,
    color: "#1d4ed8",
  },
  jobHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  jobTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  jobCompany: {
    fontSize: 10,
    color: "#6b7280",
  },
  jobDates: {
    fontSize: 9,
    color: "#9ca3af",
  },
  bullet: {
    flexDirection: "row",
    marginBottom: 2,
    paddingLeft: 8,
  },
  bulletDot: {
    width: 12,
    fontSize: 10,
    color: "#6b7280",
  },
  bulletText: {
    flex: 1,
    fontSize: 9.5,
    lineHeight: 1.5,
    color: "#374151",
  },
  eduRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  skillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 2,
  },
  skillTag: {
    fontSize: 9,
    color: "#374151",
  },
  watermark: {
    position: "absolute",
    bottom: 15,
    right: 45,
    fontSize: 7,
    color: "#d1d5db",
  },
})

// ── Component ──────────────────────────────────────────────────────────

interface CVTemplateProps {
  content: CVContentResult
  name: string
  email: string
  phone: string | null
  germanLevel: string | null
  visaStatus: string | null
  language: "en" | "de"
  showWatermark: boolean // true for free tier
}

export function CVTemplate({
  content,
  name,
  email,
  phone,
  germanLevel,
  visaStatus,
  language,
  showWatermark,
}: CVTemplateProps) {
  const headerLabel = language === "de" ? "Lebenslauf" : "Curriculum Vitae"
  const summaryLabel = language === "de" ? "PROFIL" : "PROFESSIONAL SUMMARY"
  const competenciesLabel = language === "de" ? "KERNKOMPETENZEN" : "CORE COMPETENCIES"
  const experienceLabel = language === "de" ? "BERUFSERFAHRUNG" : "WORK EXPERIENCE"
  const educationLabel = language === "de" ? "AUSBILDUNG" : "EDUCATION"
  const skillsLabel = language === "de" ? "FÄHIGKEITEN" : "SKILLS"
  const certLabel = language === "de" ? "ZERTIFIKATE" : "CERTIFICATIONS"

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{name}</Text>
          <View style={styles.contactRow}>
            <Text>{email}</Text>
            {phone && <Text>{phone}</Text>}
            {germanLevel && <Text>German: {germanLevel}</Text>}
            {visaStatus && <Text>{visaStatus}</Text>}
          </View>
        </View>

        {/* Professional Summary */}
        <Text style={styles.sectionTitle}>{summaryLabel}</Text>
        <Text style={styles.summary}>{content.professionalSummary}</Text>

        {/* Core Competencies */}
        <Text style={styles.sectionTitle}>{competenciesLabel}</Text>
        <View style={styles.competenciesRow}>
          {content.coreCompetencies.map((comp, i) => (
            <Text key={i} style={styles.competencyTag}>
              {comp}
            </Text>
          ))}
        </View>

        {/* Work Experience */}
        {content.workExperience.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{experienceLabel}</Text>
            {content.workExperience.map((exp, i) => (
              <View key={i} style={{ marginBottom: 8 }}>
                <View style={styles.jobHeader}>
                  <View>
                    <Text style={styles.jobTitle}>{exp.title}</Text>
                    <Text style={styles.jobCompany}>{exp.company}</Text>
                  </View>
                  <Text style={styles.jobDates}>
                    {exp.startDate} – {exp.endDate}
                  </Text>
                </View>
                {exp.bullets.map((bullet, j) => (
                  <View key={j} style={styles.bullet}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            ))}
          </>
        )}

        {/* Education */}
        {content.education.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{educationLabel}</Text>
            {content.education.map((edu, i) => (
              <View key={i} style={styles.eduRow}>
                <Text>
                  <Text style={{ fontFamily: "Helvetica-Bold" }}>
                    {edu.degree}
                  </Text>
                  {" — "}
                  {edu.institution}
                </Text>
                <Text style={styles.jobDates}>{edu.year}</Text>
              </View>
            ))}
          </>
        )}

        {/* Skills */}
        <Text style={styles.sectionTitle}>{skillsLabel}</Text>
        {content.skills.technical.length > 0 && (
          <View style={styles.skillsRow}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 9 }}>
              Technical:{" "}
            </Text>
            <Text style={styles.skillTag}>
              {content.skills.technical.join(" • ")}
            </Text>
          </View>
        )}
        {content.skills.languages.length > 0 && (
          <View style={styles.skillsRow}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 9 }}>
              Languages:{" "}
            </Text>
            <Text style={styles.skillTag}>
              {content.skills.languages.join(" • ")}
            </Text>
          </View>
        )}

        {/* Certifications */}
        {content.certifications.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{certLabel}</Text>
            {content.certifications.map((cert, i) => (
              <View key={i} style={styles.eduRow}>
                <Text>{cert.name}</Text>
                <Text style={styles.jobDates}>{cert.year}</Text>
              </View>
            ))}
          </>
        )}

        {/* Watermark for free tier */}
        {showWatermark && (
          <Text style={styles.watermark}>Generated with PlanBeta Jobs</Text>
        )}
      </Page>
    </Document>
  )
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit 2>&1 | grep "cv-template" | head -5
```

- [ ] **Step 3: Commit**

```bash
git add lib/cv-template.tsx
git commit -m "feat(jobs-app): add ATS-compliant CV template with @react-pdf/renderer"
```

---

## Task 3: CV Generation API

**Files:**
- Create: `app/api/jobs-app/cv/generate/route.ts`
- Create: `app/api/jobs-app/cv/route.ts`
- Create: `app/api/jobs-app/cv/[id]/route.ts`

- [ ] **Step 1: Create the CV generate endpoint**

```typescript
// app/api/jobs-app/cv/generate/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireJobSeeker, isPremium } from "@/lib/jobs-app-auth"
import { generateCVContent } from "@/lib/jobs-ai"
import { CVTemplate } from "@/lib/cv-template"
import { renderToBuffer } from "@react-pdf/renderer"
import { put } from "@vercel/blob"
import { z } from "zod"
import React from "react"

const generateSchema = z.object({
  jobPostingId: z.string().min(1),
  language: z.enum(["en", "de"]).default("en"),
})

export const maxDuration = 30

export async function POST(request: Request) {
  let seeker
  try {
    seeker = await requireJobSeeker(request)
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }

  const premium = isPremium(seeker)

  // Check CV generation limits: free = 0/mo, premium = 5/mo
  if (!premium) {
    return NextResponse.json(
      { error: "CV generation requires a Premium subscription" },
      { status: 403 }
    )
  }

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const cvCount = await prisma.generatedCV.count({
    where: {
      seekerId: seeker.id,
      createdAt: { gte: startOfMonth },
    },
  })

  if (cvCount >= 5) {
    return NextResponse.json(
      { error: "Monthly CV generation limit reached (5/month)" },
      { status: 429 }
    )
  }

  // Validate input
  const body = await request.json()
  const parsed = generateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { jobPostingId, language } = parsed.data

  // Fetch job posting
  const job = await prisma.jobPosting.findUnique({
    where: { id: jobPostingId },
  })

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  // Require profile
  if (!seeker.profile) {
    return NextResponse.json(
      { error: "Complete your profile before generating a CV" },
      { status: 400 }
    )
  }

  const profile = seeker.profile

  // Generate CV content via Claude Sonnet
  const cvContent = await generateCVContent(
    {
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: seeker.email,
      phone: profile.phone,
      currentJobTitle: profile.currentJobTitle,
      yearsOfExperience: profile.yearsOfExperience,
      germanLevel: profile.germanLevel,
      englishLevel: profile.englishLevel,
      skills: profile.skills,
      workExperience: profile.workExperience,
      education: profile.educationDetails,
      certifications: profile.certifications,
      visaStatus: profile.visaStatus,
    },
    {
      title: job.title,
      company: job.company,
      description: job.description,
      requirements: job.requirements,
      germanLevel: job.germanLevel,
    },
    language
  )

  // Render PDF
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || seeker.name || "Candidate"

  const pdfBuffer = await renderToBuffer(
    React.createElement(CVTemplate, {
      content: cvContent,
      name: fullName,
      email: seeker.email,
      phone: profile.phone,
      germanLevel: profile.germanLevel,
      visaStatus: profile.visaStatus,
      language,
      showWatermark: false, // premium users get no watermark
    })
  )

  // Upload to Vercel Blob
  const slug = job.slug || job.id
  const fileName = `cvs/${seeker.id}/${slug}-${Date.now()}.pdf`

  const blob = await put(fileName, pdfBuffer, {
    access: "public",
    contentType: "application/pdf",
  })

  // Save record
  const generatedCV = await prisma.generatedCV.create({
    data: {
      seekerId: seeker.id,
      jobPostingId: job.id,
      fileUrl: blob.url,
      fileKey: blob.pathname,
      keywordsUsed: cvContent.keywordsUsed,
      templateUsed: "ats-standard",
      language,
    },
  })

  return NextResponse.json({
    cv: {
      id: generatedCV.id,
      fileUrl: generatedCV.fileUrl,
      language: generatedCV.language,
      keywordsUsed: generatedCV.keywordsUsed,
      createdAt: generatedCV.createdAt,
    },
    remaining: 5 - cvCount - 1,
  })
}
```

- [ ] **Step 2: Create the CV list endpoint**

```typescript
// app/api/jobs-app/cv/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireJobSeeker } from "@/lib/jobs-app-auth"

export async function GET(request: Request) {
  let seeker
  try {
    seeker = await requireJobSeeker(request)
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }

  const cvs = await prisma.generatedCV.findMany({
    where: { seekerId: seeker.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  // Enrich with job titles
  const jobIds = [...new Set(cvs.map((cv) => cv.jobPostingId))]
  const jobs = await prisma.jobPosting.findMany({
    where: { id: { in: jobIds } },
    select: { id: true, title: true, company: true, slug: true },
  })
  const jobMap = new Map(jobs.map((j) => [j.id, j]))

  const enriched = cvs.map((cv) => {
    const job = jobMap.get(cv.jobPostingId)
    return {
      id: cv.id,
      fileUrl: cv.fileUrl,
      language: cv.language,
      keywordsUsed: cv.keywordsUsed,
      templateUsed: cv.templateUsed,
      createdAt: cv.createdAt,
      job: job
        ? { title: job.title, company: job.company, slug: job.slug }
        : { title: "Unknown", company: "Unknown", slug: null },
    }
  })

  return NextResponse.json({ cvs: enriched })
}
```

- [ ] **Step 3: Create the single CV endpoint**

```typescript
// app/api/jobs-app/cv/[id]/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireJobSeeker } from "@/lib/jobs-app-auth"
import { del } from "@vercel/blob"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let seeker
  try {
    seeker = await requireJobSeeker(request)
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }

  const { id } = await params

  const cv = await prisma.generatedCV.findFirst({
    where: { id, seekerId: seeker.id },
  })

  if (!cv) {
    return NextResponse.json({ error: "CV not found" }, { status: 404 })
  }

  return NextResponse.json({ cv })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let seeker
  try {
    seeker = await requireJobSeeker(request)
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }

  const { id } = await params

  const cv = await prisma.generatedCV.findFirst({
    where: { id, seekerId: seeker.id },
  })

  if (!cv) {
    return NextResponse.json({ error: "CV not found" }, { status: 404 })
  }

  // Delete from blob storage
  try {
    await del(cv.fileKey)
  } catch {
    // Non-fatal — file may already be gone
  }

  await prisma.generatedCV.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 4: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | grep "jobs-app/cv" | head -10
```

- [ ] **Step 5: Commit**

```bash
git add app/api/jobs-app/cv/
git commit -m "feat(jobs-app): add CV generation API (generate, list, get, delete)"
```

---

## Task 4: Job Detail API with AI Deep Scoring

**Files:**
- Create: `app/api/jobs-app/jobs/[slug]/route.ts`

- [ ] **Step 1: Create the job detail API route**

```typescript
// app/api/jobs-app/jobs/[slug]/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getJobSeeker, isPremium } from "@/lib/jobs-app-auth"
import { computeHeuristicScore, getMatchLabel } from "@/lib/heuristic-scorer"
import { scoreJobDeep } from "@/lib/jobs-ai"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const job = await prisma.jobPosting.findFirst({
    where: { slug, active: true },
  })

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  // Increment view count
  await prisma.jobPosting.update({
    where: { id: job.id },
    data: { viewCount: { increment: 1 } },
  })

  // Base response (available to all, including Google bots)
  const response: any = {
    job: {
      id: job.id,
      slug: job.slug,
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.description,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      currency: job.currency,
      germanLevel: job.germanLevel,
      profession: job.profession,
      jobType: job.jobType,
      requirements: job.requirements,
      applyUrl: job.applyUrl,
      postedAt: job.postedAt,
      createdAt: job.createdAt,
      viewCount: job.viewCount + 1,
    },
    matchScore: null,
    matchLabel: null,
    deepScore: null,
  }

  // If authenticated, add scoring
  const seeker = await getJobSeeker(request)
  if (seeker?.profile) {
    const p = seeker.profile
    const scorerProfile = {
      germanLevel: p.germanLevel ?? null,
      profession: p.profession ?? null,
      targetLocations: (p.targetLocations as string[]) ?? [],
      salaryMin: p.salaryMin ?? null,
      salaryMax: p.salaryMax ?? null,
      visaStatus: p.visaStatus ?? null,
      yearsOfExperience: p.yearsOfExperience ?? null,
    }

    const hScore = computeHeuristicScore(scorerProfile, {
      germanLevel: job.germanLevel,
      profession: job.profession,
      location: job.location,
      jobType: job.jobType,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
    })

    response.matchScore = hScore
    response.matchLabel = getMatchLabel(hScore)

    // AI deep score for premium users only
    if (isPremium(seeker)) {
      try {
        const deepScore = await scoreJobDeep(
          {
            germanLevel: p.germanLevel,
            profession: p.profession,
            currentJobTitle: p.currentJobTitle,
            yearsOfExperience: p.yearsOfExperience,
            skills: p.skills,
            workExperience: p.workExperience,
            education: p.educationDetails,
            targetLocations: (p.targetLocations as string[]) ?? [],
            salaryMin: p.salaryMin,
            salaryMax: p.salaryMax,
            visaStatus: p.visaStatus,
          },
          {
            title: job.title,
            company: job.company,
            location: job.location,
            description: job.description,
            germanLevel: job.germanLevel,
            profession: job.profession,
            jobType: job.jobType,
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
            requirements: job.requirements,
          }
        )
        response.deepScore = deepScore
      } catch (err) {
        console.error("AI deep scoring failed:", err)
        // Non-fatal — return heuristic score only
      }
    }
  }

  return NextResponse.json(response)
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/jobs-app/jobs/\[slug\]/
git commit -m "feat(jobs-app): add job detail API with AI deep scoring for premium users"
```

---

## Task 5: Job Detail Page + Score Breakdown Component

**Files:**
- Create: `components/jobs-app/ScoreBreakdown.tsx`
- Create: `app/jobs-app/job/[slug]/page.tsx`

- [ ] **Step 1: Create ScoreBreakdown component**

```typescript
// components/jobs-app/ScoreBreakdown.tsx
"use client"

import type { DeepScoreResult } from "@/lib/jobs-ai"
import { getMatchLabel } from "@/lib/heuristic-scorer"

interface ScoreBreakdownProps {
  deepScore: DeepScoreResult
}

export function ScoreBreakdown({ deepScore }: ScoreBreakdownProps) {
  const overall = getMatchLabel(deepScore.overallScore)

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
      {/* Overall score */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">AI Match Analysis</h3>
        <span className={`rounded-full px-3 py-1 text-sm font-bold ${overall.color} ${overall.bgColor}`}>
          {deepScore.overallScore} — {overall.label}
        </span>
      </div>

      {/* Summary */}
      <p className="text-sm text-gray-600">{deepScore.summary}</p>

      {/* Dimensions */}
      <div className="space-y-2">
        {deepScore.dimensions.map((dim) => (
          <div key={dim.name}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-gray-700">{dim.name}</span>
              <span className="text-gray-500">{dim.score}/100</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-gray-100">
              <div
                className={`h-2 rounded-full ${
                  dim.score >= 75 ? "bg-emerald-500" : dim.score >= 50 ? "bg-blue-500" : "bg-orange-400"
                }`}
                style={{ width: `${dim.score}%` }}
              />
            </div>
            <p className="mt-0.5 text-xs text-gray-500">{dim.explanation}</p>
          </div>
        ))}
      </div>

      {/* Gaps */}
      {deepScore.gaps.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-700">Gaps to Address</h4>
          <ul className="mt-1 list-disc pl-4 text-xs text-gray-500">
            {deepScore.gaps.map((gap, i) => (
              <li key={i}>{gap}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create job detail page**

```typescript
// app/jobs-app/job/[slug]/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  MapPin,
  Briefcase,
  Euro,
  ExternalLink,
  FileText,
  Loader2,
} from "lucide-react"
import MatchBadge from "@/components/jobs-app/MatchBadge"
import { ScoreBreakdown } from "@/components/jobs-app/ScoreBreakdown"
import { useJobsAuth } from "@/components/jobs-app/AuthProvider"
import type { MatchLabel } from "@/lib/heuristic-scorer"
import type { DeepScoreResult } from "@/lib/jobs-ai"

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  WORKING_STUDENT: "Working Student",
  INTERNSHIP: "Internship",
  CONTRACT: "Contract",
}

interface JobDetail {
  id: string
  slug: string
  title: string
  company: string
  location: string | null
  description: string | null
  salaryMin: number | null
  salaryMax: number | null
  currency: string
  germanLevel: string | null
  profession: string | null
  jobType: string | null
  requirements: string[]
  applyUrl: string | null
  viewCount: number
  createdAt: string
}

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { seeker, isPremium } = useJobsAuth()
  const [job, setJob] = useState<JobDetail | null>(null)
  const [matchScore, setMatchScore] = useState<number | null>(null)
  const [matchLabel, setMatchLabel] = useState<MatchLabel | null>(null)
  const [deepScore, setDeepScore] = useState<DeepScoreResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    const slug = params.slug as string
    if (!slug) return

    fetch(`/api/jobs-app/jobs/${slug}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setJob(data.job)
          setMatchScore(data.matchScore)
          setMatchLabel(data.matchLabel)
          setDeepScore(data.deepScore)
        }
      })
      .finally(() => setLoading(false))
  }, [params.slug])

  async function handleGenerateCV() {
    if (!job) return
    setGenerating(true)
    try {
      const res = await fetch("/api/jobs-app/cv/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobPostingId: job.id, language: "en" }),
      })
      const data = await res.json()
      if (res.ok && data.cv?.fileUrl) {
        window.open(data.cv.fileUrl, "_blank")
      } else {
        alert(data.error || "CV generation failed")
      }
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="py-12 text-center text-sm text-gray-500">
        Job not found.{" "}
        <Link href="/jobs-app/jobs" className="text-blue-600 underline">
          Browse all jobs
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4 pt-2">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{job.title}</h1>
            <p className="text-sm text-gray-600">{job.company}</p>
          </div>
          {matchScore !== null && matchLabel && (
            <MatchBadge
              score={matchScore}
              label={matchLabel.label}
              color={matchLabel.color}
              bgColor={matchLabel.bgColor}
              size="md"
            />
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
          {job.location && (
            <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1">
              <MapPin className="h-3 w-3" /> {job.location}
            </span>
          )}
          {job.jobType && (
            <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1">
              <Briefcase className="h-3 w-3" /> {JOB_TYPE_LABELS[job.jobType] || job.jobType}
            </span>
          )}
          {(job.salaryMin || job.salaryMax) && (
            <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1">
              <Euro className="h-3 w-3" />
              {job.salaryMin && job.salaryMax
                ? `${job.salaryMin.toLocaleString()} – ${job.salaryMax.toLocaleString()} EUR`
                : job.salaryMin
                ? `From ${job.salaryMin.toLocaleString()} EUR`
                : `Up to ${job.salaryMax?.toLocaleString()} EUR`}
            </span>
          )}
          {job.germanLevel && (
            <span className="rounded-full bg-gray-100 px-2.5 py-1">
              German: {job.germanLevel}
            </span>
          )}
        </div>
      </div>

      {/* AI Score Breakdown (premium only) */}
      {deepScore && <ScoreBreakdown deepScore={deepScore} />}

      {/* Actions */}
      <div className="flex gap-2">
        {isPremium ? (
          <button
            onClick={handleGenerateCV}
            disabled={generating}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:bg-blue-300"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Generating CV...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" /> Generate CV & Apply
              </>
            )}
          </button>
        ) : (
          <Link
            href="/jobs-app/settings"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            <FileText className="h-4 w-4" /> Upgrade to Generate CV
          </Link>
        )}

        {job.applyUrl && (
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ExternalLink className="h-4 w-4" /> Apply
          </a>
        )}
      </div>

      {/* Description */}
      {job.description && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-900">Description</h2>
          <div className="whitespace-pre-wrap text-sm text-gray-600">
            {job.description}
          </div>
        </div>
      )}

      {/* Requirements */}
      {job.requirements.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-900">Requirements</h2>
          <ul className="list-disc pl-4 text-sm text-gray-600">
            {job.requirements.map((req, i) => (
              <li key={i}>{req}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/jobs-app/ScoreBreakdown.tsx app/jobs-app/job/
git commit -m "feat(jobs-app): add job detail page with AI score breakdown and CV generation"
```

---

## Task 6: CV History Page

**Files:**
- Create: `app/jobs-app/cvs/page.tsx`

- [ ] **Step 1: Create the CV history page**

```typescript
// app/jobs-app/cvs/page.tsx
"use client"

import { useEffect, useState } from "react"
import { FileText, Download, Trash2, Loader2 } from "lucide-react"
import { useJobsAuth } from "@/components/jobs-app/AuthProvider"
import Link from "next/link"

interface CVEntry {
  id: string
  fileUrl: string
  language: string
  keywordsUsed: string[]
  templateUsed: string
  createdAt: string
  job: {
    title: string
    company: string
    slug: string | null
  }
}

export default function CVHistoryPage() {
  const { seeker, isPremium } = useJobsAuth()
  const [cvs, setCvs] = useState<CVEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!seeker) {
      setLoading(false)
      return
    }

    fetch("/api/jobs-app/cv")
      .then((res) => (res.ok ? res.json() : { cvs: [] }))
      .then((data) => setCvs(data.cvs || []))
      .finally(() => setLoading(false))
  }, [seeker])

  async function handleDelete(id: string) {
    if (!confirm("Delete this CV?")) return

    const res = await fetch(`/api/jobs-app/cv/${id}`, { method: "DELETE" })
    if (res.ok) {
      setCvs((prev) => prev.filter((cv) => cv.id !== id))
    }
  }

  if (!seeker) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-gray-500">
          <Link href="/jobs-app/onboarding" className="text-blue-600 underline">
            Sign up
          </Link>{" "}
          to generate and manage CVs
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 pt-2">
      <h1 className="text-xl font-bold text-gray-900">My CVs</h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        </div>
      ) : cvs.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <FileText className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">No CVs generated yet</p>
          <Link
            href="/jobs-app/jobs"
            className="mt-2 inline-block text-sm text-blue-600 underline"
          >
            Browse jobs to generate your first CV
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {cvs.map((cv) => (
            <div
              key={cv.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {cv.job.title}
                </p>
                <p className="text-xs text-gray-500">
                  {cv.job.company} · {cv.language.toUpperCase()} ·{" "}
                  {new Date(cv.createdAt).toLocaleDateString()}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {cv.keywordsUsed.slice(0, 5).map((kw, i) => (
                    <span
                      key={i}
                      className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500"
                    >
                      {kw}
                    </span>
                  ))}
                  {cv.keywordsUsed.length > 5 && (
                    <span className="text-xs text-gray-400">
                      +{cv.keywordsUsed.length - 5}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 pl-3">
                <a
                  href={cv.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </a>
                <button
                  onClick={() => handleDelete(cv.id)}
                  className="rounded-lg border border-gray-200 p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/jobs-app/cvs/
git commit -m "feat(jobs-app): add CV history page with download and delete"
```

---

## Task 7: Fix Prisma Import in Jobs API Route

**Files:**
- Modify: `app/api/jobs-app/jobs/route.ts:2`

- [ ] **Step 1: Fix the import**

The Phase 1 jobs route may have `import prisma from "@/lib/prisma"` (default import). Fix to named:

In `app/api/jobs-app/jobs/route.ts`, change line 2 from:
```typescript
import prisma from "@/lib/prisma"
```
to:
```typescript
import { prisma } from "@/lib/prisma"
```

(If it already uses the named import, skip this task.)

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit 2>&1 | grep "jobs-app" | head -10
```

- [ ] **Step 3: Commit (if changed)**

```bash
git add app/api/jobs-app/jobs/route.ts
git commit -m "fix(jobs-app): fix prisma import in jobs route"
```

---

## Task 8: Final Type Check & Verification

- [ ] **Step 1: Run full type check**

```bash
npx tsc --noEmit 2>&1 | grep -E "(jobs-app|jobs-ai|cv-template|heuristic)" | head -20
```

Expected: No errors from any jobs-app files.

- [ ] **Step 2: Verify the full commit log**

```bash
git log --oneline feat/planbeta-jobs-pwa --not main | head -25
```

Expected: Phase 1 commits + Phase 2 commits (AI orchestrator, CV template, CV API, job detail API, job detail page, CV history page).

- [ ] **Step 3: Push**

```bash
PAT=$(security find-generic-password -s github-pat-planbeta -w) && git push https://theplanbeta:${PAT}@github.com/theplanbeta/plan-beta-dashboard.git feat/planbeta-jobs-pwa
```
