# PlanBeta Jobs PWA — Design Spec (v2 — Post-Adversarial Review)

**Date:** 2026-04-10
**Status:** Final — ready for implementation planning
**Inspired by:** [santifer/career-ops](https://github.com/santifer/career-ops) (MIT license)
**Review:** Adversarial review by growth/finance/UX specialist completed. All CRITICAL and HIGH findings addressed.

---

## 1. Product Vision

**PlanBeta Jobs** is a standalone PWA at `jobs.planbeta.app` that transforms the passive job board into an active AI career companion for Indian professionals targeting Germany.

**One-liner:** See your match score on every German job in 60 seconds. Generate tailored CVs, track applications, and prep for interviews.

**Target users:**
- Plan Beta German course students (Premium bundled free with course enrollment)
- Any Indian professional targeting the German job market (EUR 4.99/mo Europe, INR 299/mo India)

**Relationship to existing portal:**
- Free portal at `theplanbeta.com/jobs` remains the SEO/acquisition engine (unchanged)
- PlanBeta Jobs PWA is the premium product that the free portal funnels into
- Shared database: same `JobPosting`, `JobSource` tables; new models for profiles, documents, applications
- Free portal auth (`JobSubscription`) will be migrated into PWA auth (`JobSeeker`) over time — consolidate to 2 auth systems, not 3

**The moat (what generic AI CV tools can't replicate):**
- German-market-specific job database with 1,000+ scraped/structured German jobs
- Plan Beta student network (captive audience, trust, brand)
- Domain knowledge features: Blue Card eligibility checker, qualification recognition tracker, German workplace culture guides, visa timeline estimator

---

## 2. Core Features

### 2.1 Onboarding & Profile Builder

**CRITICAL DESIGN DECISION: Value-first onboarding.** Users see match scores within 60 seconds. Document upload is a retention loop, not a gate.

**Quick Start Flow (60 seconds to first value):**
1. Sign up (email + password, or Google OAuth)
2. 3-field quick profile: **Name**, **German Level** (dropdown), **Profession** (dropdown)
3. Immediately redirect to Jobs Feed with match scores (heuristic scoring from 3 fields)
4. Profile completeness banner: "Upload your CV to improve match accuracy (currently 15%)"

**Progressive Profile Enrichment (retention loop):**
- After first session: "Add your work experience → unlock detailed match breakdowns"
- After 2nd session: "Upload your CV → get AI-powered match scores"
- After 3rd session: "Add certificates → qualify for more jobs"
- Each addition improves match score accuracy and unlocks features

**Document Upload Options (mobile-India-optimized):**
- "Import from Google Drive" (first-class, most Indian professionals store CVs there)
- "Upload from phone" (file picker)
- "Scan with camera" (document scanning with perspective correction)
- "Build manually" (6-8 form fields, always available as fallback)
- Upload progress animation with meaningful feedback
- If AI extraction fails → graceful fallback to manual form with partial data pre-filled

**AI Extraction Pipeline:**
- PDF → text extraction (`pdf-parse`)
- Text → Claude Sonnet structured extraction:
  ```
  {
    personalInfo: { name, email, phone, location, nationality, visaStatus },
    education: [{ degree, institution, field, year }],
    workExperience: [{ title, company, duration, description, skills[] }],
    skills: { technical: [], languages: [], soft: [] },
    germanLevel: "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
    certifications: [{ name, issuer, year }],
    targetRoles: [],
    salaryExpectation: { min, max, currency }
  }
  ```
- German-market-aware: recognizes Europass, Indian university formats, TestDaF, Goethe-Zertifikat
- Documents stored in Vercel Blob (existing infra, private access)

### 2.2 AI Job Matching & Scoring

**Two-tier scoring system (cost-optimized):**

**Tier 1 — Heuristic Score (instant, free, no AI cost):**
Runs on every job listing for all users. Pure field matching:

| Dimension | Weight | Logic |
|-----------|--------|-------|
| German Level Match | 25% | Exact/above = 100%, one below = 60%, two below = 20% |
| Profession Match | 20% | Exact = 100%, related = 50%, other = 0% |
| Location Fit | 20% | Preferred city = 100%, same state = 60%, other = 30% |
| Job Type Match | 15% | Matches preference = 100%, else 40% |
| Salary Fit | 10% | Within range = 100%, within 20% = 60%, else 30% |
| Visa Feasibility | 10% | Blue Card eligible = 100%, student visa ok = 70%, unclear = 50% |

Stored in a `MatchScoreCache` table. Recomputed when profile updates or new jobs are scraped.

**Tier 2 — AI Deep Score (on-demand, premium only):**
Runs when user clicks into a job detail. Claude Haiku call with profile + job posting → detailed breakdown including skills alignment, experience relevance, and gap analysis.

**Score display:**
- **Labels, not just numbers:** 90-100 = "Excellent Match" (green), 75-89 = "Strong Match" (blue), 60-74 = "Good Fit" (yellow), 40-59 = "Partial Match" (orange), <40 = "Low Match" (gray)
- Relative context: "Better match than 80% of jobs in this category"
- First-time tooltip: "This score reflects how well your profile matches this job"

**Recommendations engine:**
- Daily cron: for users active in last 7 days, heuristic-score new jobs → AI-score top 10 → push top 5 via notification
- Weekly digest email with top 10 matched jobs
- "Why this job?" expandable on each card (premium: AI breakdown, free: heuristic breakdown)

### 2.3 AI CV Generator

**Pipeline** (adapted from career-ops, using @react-pdf/renderer instead of Playwright):

1. User clicks "Generate CV" on a job
2. System reads: user profile + job posting details
3. Claude Sonnet call with structured prompt:
   - Extract 15-20 keywords from job description
   - Map user's experience to job requirements
   - Rewrite professional summary targeting this specific role
   - Reorder/emphasize relevant experience bullets
   - Generate competency grid from JD keywords
   - **Never fabricate** — only reformulate existing experience using JD vocabulary
4. Returns structured JSON with all CV sections
5. `@react-pdf/renderer` generates PDF directly from React components (2-3 seconds, no browser needed)
6. PDF uploaded to Vercel Blob
7. URL returned to user

**Loading experience (critical for mobile):**
- Step-by-step progress animation:
  - "Analyzing job requirements..." (1s)
  - "Matching your experience..." (1s)
  - "Writing professional summary..." (1s)
  - "Formatting your CV..." (1s)
- Text preview shown in ~3 seconds while PDF renders in background
- Push notification if user leaves app: "Your CV is ready!"

**Template system:**
- Single ATS-compliant template (single column, no graphics, standard headers)
- German market conventions: photo placeholder (optional), personal details section, reverse chronological
- Font: Inter (clean, professional)
- Sections: Personal Info → Professional Summary → Core Competencies → Work Experience → Education → Certifications → Skills → Languages
- A4 format, 0.6-inch margins
- "Lebenslauf" (DE) or "Curriculum Vitae" (EN) header

**Output:**
- PDF stored in Vercel Blob: `cvs/{userId}/{jobSlug}-{date}.pdf`
- CV history page with all generated CVs
- **Free tier: 0 CVs/month** (gated — this is the conversion trigger)
- **Premium: 5 CVs/month** (sufficient for serious job search, prevents abuse)
- **"Generated with PlanBeta Jobs" footer on free-tier CVs** (removable on paid — viral mechanic)

### 2.4 Application Tracker

**Pipeline view with stages:**
```
Interested → Applied → Interview → Offer → Accepted/Rejected
```

**Per application record:**
- Job posting (stored as `jobPostingId` string — no FK cascade, graceful handling if job delisted)
- Generated CV used (linked to stored PDF)
- Date applied, current stage, notes
- Next action + date (follow-up reminder)
- Interview date/time (if scheduled)
- Outcome (accepted/rejected/ghosted/withdrawn)
- Salary offered (if known — feeds into salary benchmarking data)

**Automation:**
- "Apply" button creates tracker entry + generates CV in one flow
- Follow-up reminders: push notification 7 days after application if no stage change
- "Did you hear back from {company}?" after 14 days
- When stage moves to "Accepted": prompt to confirm placement (feeds employer data)

**Free tier: 5 active applications.** Premium: unlimited.

### 2.5 Interview Prep Kit

**Triggered when:** User moves an application to "Interview" stage.

**Claude Sonnet generates** (profile + job + company context):

1. **Company Brief** — what they do, size, culture, recent context
2. **Role-Specific Questions** (8-10) — technical Qs based on job requirements vs. user's skills
3. **Behavioral Questions** (5-6) — STAR format with suggested answers using user's actual experience
4. **German Interview Culture Tips** — formality, punctuality, what to expect
5. **Questions to Ask** (3-4) — smart questions for this specific role/company

**STAR+R Story Bank** (adapted from career-ops):
- System generates 3-5 reusable stories from work experience on profile creation
- Each mapped to competencies (leadership, problem-solving, teamwork, conflict resolution)
- Stories grow as profile enriches

### 2.6 German Domain Knowledge Features (The Moat)

These are NOT AI features — they are structured content + simple logic that generic tools can't replicate:

1. **Blue Card Eligibility Checker** — input profession + salary → tells if Blue Card eligible, what salary threshold applies, processing time estimate
2. **Qualification Recognition Status Tracker** — step-by-step guide for Anerkennungsverfahren based on profession (nursing, engineering have different paths)
3. **Visa Timeline Estimator** — input current status → expected timeline to work permit
4. **German Workplace Culture Guide** — what to expect: Probezeit, Kündigungsfrist, 13. Monatsgehalt, Betriebsrat, etc.
5. **Skill Gap Analysis with Course Cross-sell** — "You'd qualify for 15 more jobs if you got B2 German. Enroll in Plan Beta's B2 batch →"

These features are free (they drive acquisition and course cross-sells) but only available in the PWA (not the free portal).

---

## 3. Data Architecture

### 3.1 New Prisma Models

```prisma
model JobSeeker {
  id                String   @id @default(cuid())
  email             String   @unique
  passwordHash      String?  // null if OAuth
  name              String
  googleId          String?  @unique

  // Profile
  profile           JobSeekerProfile?
  documents         Document[]
  applications      Application[]
  generatedCVs      GeneratedCV[]
  storyBank         StoryBankEntry[]

  // Subscription
  stripeCustomerId      String?  @unique
  razorpayCustomerId    String?  @unique  // for INR payments
  subscriptionId        String?  @unique  // Stripe or Razorpay
  currentPeriodEnd      DateTime?
  subscriptionStatus    String   @default("free") // free, trial, active, past_due, canceled
  tier                  String   @default("free")  // free, premium, student
  billingProvider       String?  // "stripe" or "razorpay"

  // Linking
  planBetaStudentId String?  // links to Student model if they're a course student

  // Notifications
  pushEndpoint      String?
  emailAlerts       Boolean  @default(true)
  pushAlerts        Boolean  @default(false)
  whatsappAlerts    Boolean  @default(false)
  whatsapp          String?

  // Metadata
  lastLoginAt       DateTime?
  onboardingComplete Boolean @default(false)
  country           String?  // for geo-pricing (detected at signup)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([subscriptionStatus])
  @@index([tier])
  @@index([lastLoginAt])
}

model JobSeekerProfile {
  id          String   @id @default(cuid())
  seekerId    String   @unique
  seeker      JobSeeker @relation(fields: [seekerId], references: [id], onDelete: Cascade)

  // Personal
  phone       String?
  nationality String?  @default("Indian")
  currentLocation String?
  targetLocations String[]
  visaStatus  String?

  // Professional
  currentTitle    String?
  yearsExperience Int?
  profession      String?
  targetRoles     String[]
  skills          Json?     // { technical: [], languages: [], soft: [] }
  salaryMin       Int?
  salaryMax       Int?
  salaryCurrency  String   @default("EUR")

  // Education
  education   Json?

  // Languages
  germanLevel String?
  germanCertificate String?
  englishLevel String?

  // Certifications & Experience
  certifications Json?
  workExperience Json?

  // AI-computed
  profileCompleteness Int @default(0)
  extractedAt DateTime?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Document {
  id        String   @id @default(cuid())
  seekerId  String
  seeker    JobSeeker @relation(fields: [seekerId], references: [id], onDelete: Cascade)

  type      String   // "cv", "certificate", "transcript", "german_cert", "other"
  fileName  String
  fileUrl   String   // Vercel Blob URL
  fileKey   String   // Blob storage key
  fileSize  Int
  mimeType  String

  extractedText String?
  extractedData Json?
  processedAt   DateTime?

  createdAt DateTime @default(now())

  @@index([seekerId])
  @@index([type])
}

model Application {
  id        String   @id @default(cuid())
  seekerId  String
  seeker    JobSeeker @relation(fields: [seekerId], references: [id], onDelete: Cascade)

  // NO FK to JobPosting — store ID as string to survive job deletions
  jobPostingId  String
  jobTitle      String   // denormalized — survives if job is delisted
  jobCompany    String   // denormalized
  jobLocation   String?  // denormalized

  stage     String   @default("interested")

  generatedCVId String?
  generatedCV   GeneratedCV? @relation(fields: [generatedCVId], references: [id])

  appliedAt     DateTime?
  interviewDate DateTime?
  notes         String?

  nextAction    String?
  nextActionDate DateTime?
  lastStageChange DateTime @default(now())

  interviewPrep Json?

  outcome       String?
  outcomeNotes  String?
  salaryOffered Int?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([seekerId, jobPostingId])
  @@index([seekerId])
  @@index([stage])
  @@index([seekerId, stage])
}

model GeneratedCV {
  id        String   @id @default(cuid())
  seekerId  String
  seeker    JobSeeker @relation(fields: [seekerId], references: [id], onDelete: Cascade)

  jobPostingId String

  fileUrl   String
  fileKey   String

  keywordsUsed  String[]
  matchScore    Int?
  templateUsed  String   @default("ats-standard")
  language      String   @default("en")

  applications  Application[]

  createdAt DateTime @default(now())

  @@index([seekerId])
  @@index([seekerId, createdAt])
}

model StoryBankEntry {
  id        String   @id @default(cuid())
  seekerId  String
  seeker    JobSeeker @relation(fields: [seekerId], references: [id], onDelete: Cascade)

  competency  String
  situation   String
  task        String
  action      String
  result      String
  reflection  String?

  sourceExperience String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([seekerId])
}

model MatchScoreCache {
  id         String   @id @default(cuid())
  seekerId   String
  jobPostingId String

  heuristicScore Int     // 0-100 from field matching
  aiScore        Int?    // 0-100 from Claude (null = not yet computed)
  aiBreakdown    Json?   // { dimensions: [...], gaps: [...], summary: "..." }

  computedAt DateTime @default(now())

  @@unique([seekerId, jobPostingId])
  @@index([seekerId, heuristicScore])
  @@index([seekerId, computedAt])
}

model Company {
  id        String   @id @default(cuid())
  name      String   @unique
  website   String?
  logoUrl   String?
  industry  String?
  size      String?  // "startup", "mid", "enterprise"
  location  String?  // HQ city

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 3.2 Modifications to Existing Models

**JobPosting:** Add optional `companyId` field (String, no FK constraint — populated from scraped data over time). No `Application[]` relation (applications reference jobs by ID without FK).

**No other existing model changes.** The `JobSubscription` model continues to serve the free portal. Migration path: offer existing subscribers a `JobSeeker` account with imported saved jobs.

---

## 4. Authentication Architecture

### 4.1 Strategy: Consolidate Portal + PWA Auth

Instead of a third auth system, **evolve the existing portal JWT auth into the PWA auth:**

- Keep the `lib/jobs-portal-auth.ts` JWT approach but upgrade it:
  - Add password hashing (bcrypt) for email/password signup
  - Add Google OAuth support
  - Use `JobSeeker` model instead of `JobSubscription` for identity
  - Same cookie name (`pb-jobs-token`) — existing portal users' tokens still work during migration
- Dashboard auth (NextAuth with `User` model) remains completely separate
- **Result: 2 auth systems, not 3**

### 4.2 Auth Flows

**Sign Up:**
1. Email + password → create `JobSeeker` → send verification email → redirect to quick start (3 fields)
2. Google OAuth → create `JobSeeker` with `googleId` → redirect to quick start

**Sign In:**
1. Email + password → verify → JWT → httpOnly cookie
2. Google OAuth → verify `googleId` → JWT → cookie
3. Magic link (recovery) → email with 1h token → verify → JWT → cookie

**Plan Beta Student Linking:**
- After signup, student enters Plan Beta email or student ID
- System verifies against `Student` model → links `planBetaStudentId`
- Linked students get `tier: "student"` (Premium bundled free)
- German level auto-populated from course enrollment

### 4.3 Subscription & Billing

**Tiers:**

| Tier | India (Razorpay) | Europe (Stripe) | How to get it |
|------|------------------|-----------------|---------------|
| Free | INR 0 | EUR 0 | Sign up |
| Premium | INR 299/mo or INR 2,999/yr | EUR 4.99/mo or EUR 49.99/yr | Subscribe |
| Student | Free (bundled) | Free (bundled) | Verify Plan Beta enrollment |

**Annual billing as default** (shown first in UI). Monthly as secondary option. Annual dramatically reduces Stripe fee % and improves retention.

**Stripe fees on annual:** EUR 49.99 → EUR 1.70 fee = 3.4% (vs 9.3% on monthly EUR 3.99).
**Razorpay fees on INR 299:** ~2% = INR 6 — far more efficient for Indian market.

**7-day free trial** for Premium (no card required for trial — reduce friction, card required to continue).

---

## 5. Technical Architecture

### 5.1 Deployment Strategy

**Same Next.js app, different route group:**

```
app/
  site/           # existing marketing site (theplanbeta.com)
  dashboard/      # existing admin dashboard (planbeta.app)
  jobs-app/       # NEW: PlanBeta Jobs PWA (jobs.planbeta.app)
    layout.tsx     # PWA shell, auth provider, light theme
    page.tsx       # Home dashboard
    onboarding/    # Quick start (3 fields) + progressive enrichment
    profile/       # Edit profile, manage documents
    jobs/          # Job listings with match scores
    job/[slug]/    # Job detail — SEO-indexable (ISR), score breakdown gated
    applications/  # Application tracker
    interview/[id]/ # Interview prep
    cvs/           # Generated CV history
    tools/         # Blue Card checker, visa estimator, culture guide
    settings/      # Account, subscription, notifications
```

**Domain routing via middleware:**
```typescript
if (hostname === 'jobs.planbeta.app') {
  return NextResponse.rewrite(new URL(`/jobs-app${pathname}`, request.url))
}
```

**SEO-indexable job pages on PWA domain:** Job detail pages (`/job/[slug]`) are server-rendered with ISR. Google can index them. The match score breakdown is gated behind auth. This gives the PWA domain its own SEO presence.

### 5.2 PWA Configuration

**Separate manifest:**
```json
{
  "name": "PlanBeta Jobs — AI Career Companion",
  "short_name": "PB Jobs",
  "id": "/jobs-app",
  "start_url": "/jobs-app",
  "scope": "/jobs-app",
  "display": "standalone",
  "theme_color": "#ffffff",
  "background_color": "#f8fafc"
}
```

**Offline support (critical for Indian market):**
- Cache all generated CVs locally for offline viewing
- Cache application list and interview prep kits
- Queue actions (stage changes, notes) for sync when back online
- "You're offline — showing cached data" banner
- Service worker: network-first for API, cache-first for static assets and generated content

### 5.3 AI Pipeline Architecture

**Orchestrator:** `lib/jobs-ai.ts`

```typescript
export async function extractProfile(documents: Document[]): Promise<ProfileData>
  // Model: Claude Sonnet — needs nuanced extraction

export async function scoreJobMatch(profile: JobSeekerProfile, job: JobPosting): Promise<MatchScore>
  // Model: Claude Haiku — structured scoring is fine for smaller model
  // Uses prompt caching for profile (same across calls)

export async function generateCV(profile: JobSeekerProfile, job: JobPosting): Promise<CVData>
  // Model: Claude Sonnet — needs quality writing

export async function generateInterviewPrep(profile: JobSeekerProfile, job: JobPosting): Promise<InterviewPrep>
  // Model: Claude Sonnet — needs depth

export async function generateStoryBank(profile: JobSeekerProfile): Promise<StoryBankEntry[]>
  // Model: Claude Sonnet — needs narrative quality
```

**Cost-optimization strategies:**
- Haiku for all scoring calls (10x cheaper than Sonnet)
- Prompt caching: user profile is the same across multiple scoring calls — cache it
- Heuristic pre-scoring eliminates 90% of AI scoring calls
- AI deep score only on job detail view (user-initiated, not batch)
- Daily cron uses heuristic scores for filtering, AI-scores only top 10 per active user

**Revised unit economics:**

| Item | Cost/User/Month |
|------|----------------|
| Claude Haiku (scoring, ~30 deep scores/mo) | EUR 0.08 |
| Claude Sonnet (3 CV gens + 1 interview prep + extraction) | EUR 0.35 |
| Vercel Blob storage | EUR 0.02 |
| Vercel compute | EUR 0.05 |
| Stripe fees (annual EUR 49.99 / 12) | EUR 0.14 |
| **Total cost (annual billing)** | **EUR 0.64** |
| **Revenue (Premium annual / 12)** | **EUR 4.17** |
| **Gross margin** | **85%** |

For Razorpay/INR users: INR 2,999/yr / 12 = INR 250/mo (EUR ~2.67). After INR 6 Razorpay fee + EUR 0.50 API costs = ~81% margin. Viable.

### 5.4 PDF Generation

**Using `@react-pdf/renderer`** (NOT Playwright):
- Generates PDFs directly from React components
- 2-3 seconds, no browser binary, no cold start overhead
- Works reliably on Vercel serverless
- Template is a React component with styled primitives

```typescript
// Conceptual: lib/cv-template.tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

export function CVTemplate({ data }: { data: CVData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>{data.name}</Text>
          {/* ... structured sections ... */}
        </View>
      </Page>
    </Document>
  )
}
```

**`maxDuration: 30`** for CV generation route (no Playwright = much faster).

---

## 6. UI/UX Architecture

### 6.1 App Shell

**Design language:**
- **Light-first** with dark mode toggle (Indian job platforms are all light-mode; light builds trust)
- Clean, professional aesthetic — blue/green accents (trust colors)
- Tailwind CSS (shared with existing app)
- HeadlessUI for accessible components
- **Mobile-first** (80%+ users on mobile — Indian market)
- **Bottom navigation: 5 tabs** — Home, Jobs, My CVs, Applications, Profile

### 6.2 Key Screens

**Home Dashboard:**
- Profile completeness card (if < 100%) with specific next action: "Add work experience to improve scores"
- "Top 5 matches today" horizontal scroll with match labels
- Application funnel: X interested → Y applied → Z interviews
- Quick actions: "Browse Jobs", "Track Applications"
- Weekly market pulse: "23 new jobs matched you this week"
- Skill gap insight: "You'd qualify for 12 more jobs with B2 German → View courses"

**Jobs Feed:**
- Each card: title, company, location, salary, German level, **Match Label** ("Strong Match" in green, etc.)
- Filter bar: profession, location, German level, salary, job type
- Sort: Match Score (default), Newest, Salary
- "Generate CV" quick action on each card (premium only)
- Pull-to-refresh on mobile

**Job Detail (SEO-indexable):**
- Full job description (visible to all, including Google)
- Match score breakdown by dimension (premium: AI-powered with gaps analysis, free: heuristic)
- "Why you match" / "Gaps to address" AI summary (premium)
- CTAs: "Generate CV & Apply" (premium), "Save" (all), "Not Interested"

**Application Tracker:**
- Kanban board (swipeable stages on mobile)
- Each card: company, job title, stage badge, days since last update
- Tap to expand: notes, CV used, interview prep link, next action
- Stage change via tap menu (mobile) or drag (desktop)

**CV Generator Flow:**
1. Review job + your profile summary
2. Choose language (EN/DE)
3. "Generate" → animated progress steps (3-4 seconds total)
4. Text preview shown immediately, PDF renders in background
5. Preview PDF in-app → Download or "Apply with this CV" (opens applyUrl)

**Interview Prep:**
- Company brief card
- Accordion: Technical Qs, Behavioral Qs, Culture Tips, Questions to Ask
- Each Q has "Show suggested answer" toggle
- Story bank section with STAR+R formatted stories

### 6.3 Onboarding (60 seconds to value)

**Step 1: Quick Start** (30 seconds)
- Name, German Level (dropdown), Profession (dropdown)
- "See your matches →" button

**Step 2: Jobs Feed** (immediate value)
- Heuristic match scores visible on all jobs
- Banner: "Your profile is 15% complete — add details for better matches"

**Progressive enrichment** (over next sessions):
- Prompt to add work experience, upload CV, add certificates
- Each addition: recalculate scores, show improvement ("Your scores improved by 12%!")

### 6.4 Viral & Growth Mechanics

1. **"Generated with PlanBeta Jobs"** subtle footer on free-tier CVs (removable on paid)
2. **Referral program:** Share referral link → both get 1 free CV generation
3. **Shareable match score cards:** "I'm a 92% match for Software Engineer at Siemens Munich!" — designed for WhatsApp/Instagram stories
4. **"Invite a friend" in-app:** prominent in profile/settings

---

## 7. API Routes

```
// Auth (evolve existing portal auth)
POST   /api/jobs-app/auth/register
POST   /api/jobs-app/auth/login
POST   /api/jobs-app/auth/google
POST   /api/jobs-app/auth/magic-link
GET    /api/jobs-app/auth/verify
POST   /api/jobs-app/auth/logout

// Profile
GET    /api/jobs-app/profile
PUT    /api/jobs-app/profile
POST   /api/jobs-app/profile/extract     // AI extraction from docs

// Documents
POST   /api/jobs-app/documents
GET    /api/jobs-app/documents
DELETE /api/jobs-app/documents/[id]

// Jobs (shared data, new scoring layer)
GET    /api/jobs-app/jobs                // list with heuristic scores
GET    /api/jobs-app/jobs/[slug]         // detail + AI deep score (premium)
GET    /api/jobs-app/jobs/recommendations // daily top matches

// CV Generation
POST   /api/jobs-app/cv/generate
GET    /api/jobs-app/cv
GET    /api/jobs-app/cv/[id]
DELETE /api/jobs-app/cv/[id]

// Applications
GET    /api/jobs-app/applications
POST   /api/jobs-app/applications
PUT    /api/jobs-app/applications/[id]
DELETE /api/jobs-app/applications/[id]

// Interview Prep
POST   /api/jobs-app/interview-prep/[applicationId]
GET    /api/jobs-app/interview-prep/[applicationId]

// Story Bank
GET    /api/jobs-app/story-bank
POST   /api/jobs-app/story-bank

// Billing
POST   /api/jobs-app/subscribe/checkout   // Stripe or Razorpay
POST   /api/jobs-app/subscribe/portal     // manage subscription
POST   /api/jobs-app/webhooks/stripe
POST   /api/jobs-app/webhooks/razorpay

// Tools (free, no auth required)
GET    /api/jobs-app/tools/blue-card-check
GET    /api/jobs-app/tools/visa-estimate

// Stats
GET    /api/jobs-app/stats

// Referrals
POST   /api/jobs-app/referral/generate
GET    /api/jobs-app/referral/redeem/[code]
```

**New cron:**
```
/api/cron/job-match-scores     # Nightly: heuristic scores for active users + new jobs
/api/cron/job-recommendations  # Daily: AI-score top 10 for users active in last 7 days
/api/cron/application-nudges   # Daily: follow-up reminders for stale applications
```

---

## 8. Pricing & Business Model

### 8.1 Subscription Tiers

| Feature | Free | Premium | Student |
|---------|------|---------|---------|
| **Price** | EUR 0 | EUR 4.99/mo or EUR 49.99/yr (India: INR 299/mo or INR 2,999/yr) | Free (bundled with Plan Beta course) |
| Profile builder | Yes | Yes | Yes |
| Document upload | 2 docs | 10 docs | 10 docs |
| Heuristic match scores | Unlimited | Unlimited | Unlimited |
| AI deep scores | No | Unlimited | Unlimited |
| CV generation | 0/month | 5/month | 5/month |
| Application tracker | 5 active | Unlimited | Unlimited |
| Interview prep | No | Yes | Yes |
| Story bank | No | Yes | Yes |
| Priority alerts | No | Yes | Yes |
| Job delay | 6 hours | Real-time | Real-time |
| Domain knowledge tools | Yes | Yes | Yes |
| CV watermark | N/A (can't generate) | No watermark | No watermark |

**Key gating decisions:**
- Heuristic scores are **free and unlimited** — this is the hook that gets users to browse
- AI deep scores are the first paywall trigger — "Upgrade to see why you're a 87% match"
- CV generation is the conversion trigger — 0 free CVs. The "Generate CV" button is always visible but opens upgrade modal for free users
- Domain knowledge tools (Blue Card checker, etc.) are **free** — they drive acquisition and course cross-sells

### 8.2 Revised Unit Economics (Post-Review)

**Premium (Annual, Stripe — best case):**

| Item | EUR/user/mo |
|------|-------------|
| Claude API (Haiku scoring + Sonnet gen) | 0.43 |
| Vercel Blob + compute | 0.07 |
| Stripe fee (annual EUR 49.99 / 12, amortized) | 0.14 |
| **Total cost** | **0.64** |
| **Revenue** | **4.17** |
| **Gross margin** | **85%** |

**Premium (Monthly, Stripe — worst case):**

| Item | EUR/user/mo |
|------|-------------|
| Claude API | 0.43 |
| Vercel Blob + compute | 0.07 |
| Stripe fee (EUR 4.99 monthly) | 0.39 |
| **Total cost** | **0.89** |
| **Revenue** | **4.99** |
| **Gross margin** | **82%** |

**India (Annual, Razorpay):**

| Item | EUR/user/mo |
|------|-------------|
| Claude API | 0.43 |
| Vercel + storage | 0.07 |
| Razorpay fee (~2% on INR 2,999/yr) | 0.05 |
| **Total cost** | **0.55** |
| **Revenue (INR 2,999/yr ÷ 12 ≈ EUR 2.67)** | **2.67** |
| **Gross margin** | **79%** |

### 8.3 Revenue Projections (With Churn)

Using 15% monthly churn (conservative for this market), cohort-based:

| Month | Free Users | Paid Subs (net of churn) | Student (bundled) | MRR |
|-------|-----------|-------------------------|-------------------|-----|
| 1 | 300 | 10 | 20 | EUR 50 |
| 3 | 1,500 | 45 | 50 | EUR 225 |
| 6 | 4,000 | 120 | 80 | EUR 600 |
| 12 | 8,000 | 300 | 150 | EUR 1,500 |

Students are bundled free (revenue is indirect — course retention, testimonials, word-of-mouth).

### 8.4 Future Revenue (Design for Now, Build Later)

- **Employer listings:** EUR 99-299/featured posting. `Company` model already in schema.
- **Placement fees:** EUR 500-1,000 per verified hire. Tracked via "Accepted" stage + salary data.
- **Career coaching:** EUR 29-49/session (Plan Beta teachers).
- **Enterprise API:** German recruiters pay for anonymized talent pool access.

---

## 9. Migration & Compatibility

### 9.1 Existing Portal Users

- Current `JobSubscription` users get migration email: "Upgrade to PlanBeta Jobs"
- They can continue on the basic portal OR create a `JobSeeker` account
- `SavedJob` records importable to `Application` (stage: "interested")
- Old portal auth tokens remain valid during transition period

### 9.2 Plan Beta Student Integration

- Students see "PlanBeta Jobs" in course dashboard
- One-click signup using student email → auto-links to `Student` model
- Premium access bundled free → `tier: "student"`
- German level auto-populated from enrollment
- Skill gap analysis drives course re-enrollment ("You need B2 for these jobs → Enroll")

---

## 10. Security Considerations

- **Document storage:** Vercel Blob with signed URLs (time-limited, per-user)
- **AI isolation:** Never include other users' data in prompts
- **Rate limiting:** Per-user limits on all AI endpoints (Zod + in-memory rate limiter)
- **GDPR:** Full data deletion on request (EU users)
- **Password hashing:** bcrypt, salt rounds ≥ 12
- **CSRF:** SameSite cookies + CSRF tokens
- **Input validation:** Zod schemas on all API inputs
- **Application data:** No FK cascade from JobPosting → Application (survives job deletion gracefully)

---

## 11. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- New Prisma models + `db push`
- Auth system (evolve portal JWT: add password, Google OAuth, magic link)
- Quick-start onboarding (3 fields → jobs feed)
- Middleware domain routing for `jobs.planbeta.app`
- PWA manifest + light-theme app shell + offline caching
- `Company` model populated from existing scraped job data

### Phase 2: Core AI Features (Week 3-4)
- Heuristic scoring engine + `MatchScoreCache`
- Job feed with match labels and sorting
- AI deep scoring on job detail (Haiku)
- CV generation pipeline (Sonnet → @react-pdf/renderer → Blob)
- CV history + download + "Generated with PlanBeta Jobs" watermark

### Phase 3: Tracking & Prep (Week 5-6)
- Application tracker (CRUD + Kanban UI + stage management)
- Interview prep generation (Sonnet)
- Story bank
- Follow-up reminder cron + push notifications
- Progressive profile enrichment prompts

### Phase 4: Billing & Growth (Week 7-8)
- Stripe subscription (EUR pricing, annual default)
- Razorpay subscription (INR pricing)
- Free tier gating (CV gen, AI scores, app tracker limits)
- Student linking + bundled access
- Referral system + shareable match cards
- Domain knowledge tools (Blue Card checker, visa estimator)

### Phase 5: Launch (Week 9)
- DNS setup for `jobs.planbeta.app`
- SEO: indexable job detail pages on PWA domain
- CTAs on free portal → PWA
- Email campaign to existing subscribers
- Student notification in course dashboard
- Migration path for `JobSubscription` users

---

## 12. Success Metrics

| Metric | Target (3 months) |
|--------|-------------------|
| Signups | 500+ |
| Quick-start completion (3 fields) | 80%+ of signups |
| Free → Premium conversion | 4%+ |
| CVs generated/month | 100+ |
| Applications tracked/user | 5+ avg |
| User retention (30-day) | 35%+ |
| MRR | EUR 225+ |
| Annual billing adoption | 40%+ of paid users |

---

## 13. Out of Scope (For Now)

- Employer-side dashboard (Company model exists for future use)
- Career coaching marketplace
- Multi-language UI (English only for v1)
- Automated job application submission (always human-in-the-loop)
- Video interview practice
- WhatsApp bot interface
- Automated application form filling
