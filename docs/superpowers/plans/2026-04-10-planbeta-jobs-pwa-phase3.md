# PlanBeta Jobs PWA — Phase 3: Application Tracker & Anschreiben

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Kanban application tracker, AI Anschreiben (German cover letter) generator, Application Kit (CV + cover letter + email draft), and WhatsApp screenshot ingestion for passive status tracking.

**Architecture:** Enhanced Model C — we GENERATE applications (CV + Anschreiben), user DELIVERS them (portal or email), we TRACK outcomes passively (WhatsApp screenshots, manual updates, smart nudges). We never send application emails from PlanBeta domains.

**Tech Stack:** Claude Sonnet (Anschreiben generation), Claude Haiku Vision (WhatsApp screenshot parsing), @react-pdf/renderer (cover letter PDF), existing WhatsApp webhook infra, Prisma (JobApplication model from Phase 1).

**Depends on:** Phase 1+2 complete on `feat/planbeta-jobs-pwa` branch.

---

## File Structure

### New Files

```
lib/anschreiben-ai.ts                              # AI Anschreiben (cover letter) generator
lib/anschreiben-template.tsx                        # @react-pdf/renderer cover letter template
lib/application-classifier.ts                       # AI email/screenshot classifier for status tracking
app/api/jobs-app/anschreiben/generate/route.ts      # POST: generate cover letter
app/api/jobs-app/applications/route.ts              # GET + POST applications
app/api/jobs-app/applications/[id]/route.ts         # PUT + DELETE application
app/api/jobs-app/applications/[id]/kit/route.ts     # GET: download application kit (CV + Anschreiben)
app/api/jobs-app/track/screenshot/route.ts          # POST: WhatsApp screenshot → classify → update
app/jobs-app/applications/page.tsx                  # Kanban tracker page
components/jobs-app/ApplicationCard.tsx              # Kanban card component
components/jobs-app/ApplicationKitModal.tsx          # Modal showing generated materials + copy/download
components/jobs-app/StageSelector.tsx                # Stage change dropdown
```

### Modified Files

```
app/jobs-app/job/[slug]/page.tsx                    # Add "Generate Application Kit" flow
lib/jobs-ai.ts                                      # Add generateAnschreiben() function
```

---

## Task 1: Anschreiben (Cover Letter) AI Generator

**Files:**
- Modify: `lib/jobs-ai.ts` (add generateAnschreiben function)
- Create: `lib/anschreiben-template.tsx`
- Create: `app/api/jobs-app/anschreiben/generate/route.ts`

The Anschreiben generator adds a `generateAnschreiben()` function to `lib/jobs-ai.ts` that produces a formal German-style cover letter. The template renders it as a PDF via @react-pdf/renderer.

**AI prompt must encode German Anschreiben conventions:**
- Formal structure: sender address → date → recipient → subject line → Sehr geehrte Damen und Herren → body (3-4 paragraphs) → Mit freundlichen Grüßen
- Paragraph 1: Why this company and role (show research)
- Paragraph 2: Relevant experience and skills (keyword-aligned to JD)
- Paragraph 3: Why Germany / relocation motivation (critical for international applicants)
- Paragraph 4: Availability, salary expectation, closing
- Language: German if germanLevel >= B1, English otherwise
- NEVER fabricate — only reformulate existing experience
- Return structured JSON: { senderBlock, date, recipientBlock, subject, salutation, paragraphs[], closing, signature }

**Anschreiben template (lib/anschreiben-template.tsx):**
- A4, formal letter format, same font as CV (Helvetica)
- Sender info top-right, recipient top-left, date below sender
- Subject line bold, body paragraphs with proper spacing
- "Generated with PlanBeta Jobs" watermark for free tier

**API route:** POST with `{ jobPostingId, language }`, requires premium, generates Anschreiben PDF, stores in Vercel Blob, returns URL.

---

## Task 2: Application Tracker API

**Files:**
- Create: `app/api/jobs-app/applications/route.ts`
- Create: `app/api/jobs-app/applications/[id]/route.ts`

**GET /api/jobs-app/applications:**
- Returns all applications for the authenticated user
- Ordered by `updatedAt desc`
- Includes generated CV and Anschreiben URLs if they exist

**POST /api/jobs-app/applications:**
- Creates a new application from a job posting
- Body: `{ jobPostingId, stage?, notes? }`
- Denormalizes job title, company, location from JobPosting
- Default stage: `SAVED`
- If jobPostingId already tracked, return 409

**PUT /api/jobs-app/applications/[id]:**
- Updates stage, notes, interviewDate, outcome, salaryOffered
- Records `lastStageChange` timestamp when stage changes
- Only owner can update

**DELETE /api/jobs-app/applications/[id]:**
- Soft conceptual delete (actually deletes the record)
- Only owner can delete

---

## Task 3: Application Kit API

**Files:**
- Create: `app/api/jobs-app/applications/[id]/kit/route.ts`

**GET /api/jobs-app/applications/[id]/kit:**
- Returns the full application kit for a tracked application:
  ```json
  {
    "cv": { "fileUrl": "...", "language": "en" },
    "anschreiben": { "fileUrl": "...", "language": "de" },
    "emailDraft": {
      "subject": "Bewerbung als Software Engineer — Priya Sharma",
      "body": "Sehr geehrte Damen und Herren,\n\nanbei sende ich Ihnen meine Bewerbungsunterlagen für die ausgeschriebene Stelle als Software Engineer.\n\nMit freundlichen Grüßen\nPriya Sharma",
      "attachments": ["Lebenslauf_Priya_Sharma.pdf", "Anschreiben_Priya_Sharma.pdf"]
    },
    "portalGuide": {
      "tip": "Copy your professional summary into the 'About' field. Upload both PDFs as attachments."
    }
  }
  ```
- Generates CV + Anschreiben if they don't exist yet
- The `emailDraft` is a pre-composed email the user can copy into their own email client
- `portalGuide` gives tips for common ATS portals

---

## Task 4: Kanban Application Tracker Page

**Files:**
- Create: `app/jobs-app/applications/page.tsx`
- Create: `components/jobs-app/ApplicationCard.tsx`
- Create: `components/jobs-app/StageSelector.tsx`

**Kanban layout:**
- Mobile: vertical list grouped by stage (expandable sections), not horizontal columns
- Desktop: horizontal columns (but mobile-first)
- Stages shown: Saved → Applied → Interviewing → Offer → Closed (Accepted/Rejected/Withdrawn)
- Each card: company name, job title, days since last update, stage badge
- Tap card → expand to show: notes, CV/Anschreiben download links, interview date, "Get Application Kit" button
- Stage change: tap stage badge → dropdown selector → PUT to API
- Empty state: "Start tracking your applications — save a job from the jobs feed"
- Stats bar at top: X saved, Y applied, Z interviewing, W offers

**StageSelector component:**
- Dropdown with stage options
- Color-coded badges: blue (Saved), yellow (Applied), purple (Interviewing), green (Offer), gray (Closed)
- On change: PUT to `/api/jobs-app/applications/[id]` with new stage

---

## Task 5: Application Kit Modal (Job Detail Integration)

**Files:**
- Create: `components/jobs-app/ApplicationKitModal.tsx`
- Modify: `app/jobs-app/job/[slug]/page.tsx` (add Application Kit flow)

**ApplicationKitModal:**
- Triggered from job detail page after CV generation
- Shows 3 tabs: "Your CV" (preview + download), "Cover Letter" (preview + download), "How to Apply" (email draft + portal tips)
- Email draft tab has "Copy to Clipboard" button for subject and body
- Portal tips tab shows generic guidance: "Upload both PDFs as attachments"
- "Mark as Applied" button at bottom → creates/updates JobApplication to APPLIED stage

**Job detail page changes:**
- Replace simple "Generate CV" button with "Generate Application Kit" flow
- After generation: show the ApplicationKitModal
- Add "Track This Job" button (saves to tracker at SAVED stage)

---

## Task 6: WhatsApp Screenshot Classifier

**Files:**
- Create: `lib/application-classifier.ts`
- Create: `app/api/jobs-app/track/screenshot/route.ts`

**Classifier (lib/application-classifier.ts):**
```typescript
export interface ClassificationResult {
  company: string
  role: string
  status: 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'OFFER' | 'REJECTED' | 'WITHDRAWN'
  confidence: number // 0-1
  interviewDate?: string // ISO date if detected
  details?: string
}

export async function classifyScreenshot(imageBase64: string): Promise<ClassificationResult>
// Uses Claude Haiku Vision
// Recognizes German HR phrases: Absage, Einladung zum Vorstellungsgespräch, Zusage/Angebot, Eingangsbestätigung
// Returns structured JSON
```

**API route (POST /api/jobs-app/track/screenshot):**
- Accepts multipart form with image file
- Requires auth
- Calls classifyScreenshot()
- Fuzzy-matches company+role to existing JobApplication records
- If match found: update stage, return confirmation
- If no match: create new application with parsed data, return for user confirmation
- Response: `{ matched: boolean, application: {...}, parsed: ClassificationResult }`

This endpoint will later be called from the WhatsApp webhook handler, but for now it's a standalone API that the PWA can call directly (user uploads screenshot in-app).

---

## Task 7: Final Type Check, Commit, Push

- Fix any type errors
- Commit all Phase 3 files
- Push to remote
- Update PR description
