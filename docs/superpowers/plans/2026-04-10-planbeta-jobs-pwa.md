# PlanBeta Jobs PWA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an AI career companion PWA at `jobs.planbeta.app` with profile building, job matching, CV generation, application tracking, and interview prep.

**Architecture:** Same Next.js app, new `app/jobs-app/` route group served via middleware domain rewrite. Evolves existing portal JWT auth to support passwords + Google OAuth against a new `JobSeeker` model. Shares `JobPosting`/`JobSource` tables; adds new models for profiles, documents, applications, CVs. AI features via Claude API (Haiku for scoring, Sonnet for generation). PDF via `@react-pdf/renderer`.

**Tech Stack:** Next.js 15, Prisma (Neon PostgreSQL), Claude API (`@anthropic-ai/sdk`), `@react-pdf/renderer`, jose JWT, Stripe + Razorpay, Vercel Blob, Tailwind CSS, HeadlessUI, Zod.

**Spec:** `docs/superpowers/specs/2026-04-10-planbeta-jobs-pwa-design.md`

---

## File Structure

### New Files

```
# Prisma (modify existing)
prisma/schema.prisma                          # Add 7 new models at end

# Auth (evolve existing)
lib/jobs-portal-auth.ts                       # Add password hashing, Google OAuth, JobSeeker model support

# Core lib
lib/jobs-ai.ts                                # AI orchestrator (scoring, CV gen, interview prep, extraction)
lib/cv-template.tsx                           # @react-pdf/renderer CV template component
lib/heuristic-scorer.ts                       # Fast field-matching scorer (no AI cost)
lib/jobs-app-auth.ts                          # Evolved auth: password + OAuth + magic link for JobSeeker

# App shell
app/jobs-app/layout.tsx                       # PWA shell, auth provider, light theme, bottom nav
app/jobs-app/page.tsx                         # Home dashboard

# Onboarding
app/jobs-app/onboarding/page.tsx              # Quick start (3 fields) + progressive enrichment

# Profile
app/jobs-app/profile/page.tsx                 # Edit profile, manage documents

# Jobs
app/jobs-app/jobs/page.tsx                    # Job feed with match scores
app/jobs-app/job/[slug]/page.tsx              # Job detail (ISR, SEO-indexable)

# CV
app/jobs-app/cvs/page.tsx                     # Generated CV history

# Applications
app/jobs-app/applications/page.tsx            # Application tracker (Kanban)

# Interview
app/jobs-app/interview/[id]/page.tsx          # Interview prep for specific application

# Settings
app/jobs-app/settings/page.tsx                # Account, subscription, notifications

# Tools
app/jobs-app/tools/page.tsx                   # Blue Card checker, visa estimator hub
app/jobs-app/tools/blue-card/page.tsx         # Blue Card eligibility checker

# API routes
app/api/jobs-app/auth/register/route.ts       # Email+password signup
app/api/jobs-app/auth/login/route.ts          # Email+password login
app/api/jobs-app/auth/google/route.ts         # Google OAuth
app/api/jobs-app/auth/magic-link/route.ts     # Magic link send + verify
app/api/jobs-app/auth/logout/route.ts         # Clear session

app/api/jobs-app/profile/route.ts             # GET + PUT profile
app/api/jobs-app/profile/extract/route.ts     # AI extraction from docs

app/api/jobs-app/documents/route.ts           # POST + GET documents
app/api/jobs-app/documents/[id]/route.ts      # DELETE document

app/api/jobs-app/jobs/route.ts                # GET jobs with heuristic scores
app/api/jobs-app/jobs/[slug]/route.ts         # GET job detail + AI deep score
app/api/jobs-app/jobs/recommendations/route.ts # GET daily top matches

app/api/jobs-app/cv/generate/route.ts         # POST generate CV
app/api/jobs-app/cv/route.ts                  # GET list CVs
app/api/jobs-app/cv/[id]/route.ts             # GET + DELETE CV

app/api/jobs-app/applications/route.ts        # GET + POST applications
app/api/jobs-app/applications/[id]/route.ts   # PUT + DELETE application

app/api/jobs-app/interview-prep/[id]/route.ts # POST generate + GET existing prep

app/api/jobs-app/story-bank/route.ts          # GET + POST story bank

app/api/jobs-app/subscribe/checkout/route.ts  # Stripe/Razorpay checkout
app/api/jobs-app/subscribe/portal/route.ts    # Billing portal

app/api/jobs-app/stats/route.ts               # Dashboard stats

# Components
components/jobs-app/BottomNav.tsx              # 5-tab bottom navigation
components/jobs-app/MatchBadge.tsx             # Score label component (Excellent/Strong/Good/etc)
components/jobs-app/JobCard.tsx                # Job card with match score
components/jobs-app/ProfileCompleteness.tsx    # Progress bar + next action
components/jobs-app/ApplicationCard.tsx        # Kanban card for tracker
components/jobs-app/CVPreview.tsx              # In-app PDF preview
components/jobs-app/GenerateButton.tsx         # CV generate with progress animation
components/jobs-app/AuthProvider.tsx           # Auth context for jobs-app
components/jobs-app/PremiumGate.tsx            # Feature gating for jobs-app
components/jobs-app/OnboardingForm.tsx         # 3-field quick start form

# PWA assets
public/jobs-manifest.json                     # Separate manifest for jobs-app
public/jobs-sw.js                             # Service worker for jobs-app routes

# Middleware
middleware.ts                                 # Add jobs.planbeta.app domain routing
```

### Modified Files

```
prisma/schema.prisma           # Add new models (append at end)
middleware.ts                  # Add jobs.planbeta.app routing block
package.json                   # Add @react-pdf/renderer, pdf-parse, bcryptjs
app/layout.tsx                 # Conditional manifest based on hostname
vercel.json                    # Add new cron jobs
```

---

## Phase 1: Foundation

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install new packages**

```bash
npm install @react-pdf/renderer pdf-parse bcryptjs @types/bcryptjs
```

- [ ] **Step 2: Verify installation**

```bash
node -e "require('@react-pdf/renderer'); console.log('react-pdf OK')"
node -e "require('pdf-parse'); console.log('pdf-parse OK')"
node -e "require('bcryptjs'); console.log('bcryptjs OK')"
```

Expected: All print OK without errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(jobs-app): install @react-pdf/renderer, pdf-parse, bcryptjs"
```

---

### Task 2: Add Prisma Models

**Files:**
- Modify: `prisma/schema.prisma` (append after line 1511, after SavedSearch model)

- [ ] **Step 1: Add new models to schema**

Append these models at the end of `prisma/schema.prisma`, before any trailing comments/models like `AnalyticsCache`:

```prisma
// ========================================
// PlanBeta Jobs App Models
// ========================================

model JobSeeker {
  id                String   @id @default(cuid())
  email             String   @unique
  passwordHash      String?
  name              String
  googleId          String?  @unique

  // Profile
  profile           JobSeekerProfile?
  documents         JobSeekerDocument[]
  applications      JobApplication[]
  generatedCVs      GeneratedCV[]
  storyBank         StoryBankEntry[]

  // Subscription
  stripeCustomerId      String?  @unique @map("seeker_stripe_customer_id")
  razorpayCustomerId    String?  @unique
  subscriptionId        String?  @unique @map("seeker_subscription_id")
  currentPeriodEnd      DateTime? @map("seeker_period_end")
  subscriptionStatus    String   @default("free")
  tier                  String   @default("free")
  billingProvider       String?

  // Linking
  planBetaStudentId String?

  // Notifications
  pushEndpoint      String?  @map("seeker_push_endpoint")
  emailAlerts       Boolean  @default(true)
  pushAlerts        Boolean  @default(false)
  whatsappAlerts    Boolean  @default(false)
  whatsapp          String?  @map("seeker_whatsapp")

  // Metadata
  lastLoginAt       DateTime?
  onboardingComplete Boolean @default(false)
  country           String?
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

  phone       String?
  nationality String?  @default("Indian")
  currentLocation String?
  targetLocations String[]
  visaStatus  String?

  currentTitle    String?
  yearsExperience Int?
  profession      String?
  targetRoles     String[]
  skills          Json?
  salaryMin       Int?
  salaryMax       Int?
  salaryCurrency  String   @default("EUR")

  education       Json?
  germanLevel     String?
  germanCertificate String?
  englishLevel    String?
  certifications  Json?
  workExperience  Json?

  profileCompleteness Int @default(0)
  extractedAt     DateTime?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model JobSeekerDocument {
  id        String   @id @default(cuid())
  seekerId  String
  seeker    JobSeeker @relation(fields: [seekerId], references: [id], onDelete: Cascade)

  type      String
  fileName  String
  fileUrl   String
  fileKey   String
  fileSize  Int
  mimeType  String

  extractedText String?
  extractedData Json?
  processedAt   DateTime?

  createdAt DateTime @default(now())

  @@index([seekerId])
  @@index([type])
}

model JobApplication {
  id        String   @id @default(cuid())
  seekerId  String
  seeker    JobSeeker @relation(fields: [seekerId], references: [id], onDelete: Cascade)

  jobPostingId  String
  jobTitle      String
  jobCompany    String
  jobLocation   String?

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

  applications  JobApplication[]

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
  id           String   @id @default(cuid())
  seekerId     String
  jobPostingId String

  heuristicScore Int
  aiScore        Int?
  aiBreakdown    Json?

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
  size      String?
  location  String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 2: Push schema to database**

```bash
npx prisma db push
```

Expected: "Your database is now in sync with your Prisma schema."

- [ ] **Step 3: Generate Prisma client**

```bash
npx prisma generate
```

Expected: "Generated Prisma Client"

- [ ] **Step 4: Verify models exist**

```bash
npx prisma studio
```

Check that `JobSeeker`, `JobSeekerProfile`, `JobSeekerDocument`, `JobApplication`, `GeneratedCV`, `StoryBankEntry`, `MatchScoreCache`, `Company` tables are visible. Close studio.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(jobs-app): add Prisma models for JobSeeker, profiles, applications, CVs, scoring"
```

---

### Task 3: Auth System — `lib/jobs-app-auth.ts`

**Files:**
- Create: `lib/jobs-app-auth.ts`

This evolves the pattern from `lib/jobs-portal-auth.ts` but adds password support and targets the `JobSeeker` model.

- [ ] **Step 1: Create the auth library**

```typescript
// lib/jobs-app-auth.ts
/**
 * PlanBeta Jobs App Auth
 * JWT-based auth for JobSeeker model with password + Google OAuth + magic link.
 * Evolves the pattern from lib/jobs-portal-auth.ts.
 */

import { SignJWT, jwtVerify } from "jose"
import bcrypt from "bcryptjs"
import prisma from "@/lib/prisma"

const SECRET_KEY = process.env.JOB_PORTAL_SECRET || process.env.NEXTAUTH_SECRET || ""

function getSecretKey() {
  if (!SECRET_KEY) throw new Error("JOB_PORTAL_SECRET not configured")
  return new TextEncoder().encode(SECRET_KEY)
}

// ── Types ──────────────────────────────────────────────────────────────

export interface JobsAppTokenPayload {
  seekerId: string
  email: string
  tier: string
}

// ── Password hashing ───────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ── JWT tokens ─────────────────────────────────────────────────────────

export async function signJobsAppToken(
  seekerId: string,
  email: string,
  tier = "free"
): Promise<string> {
  return new SignJWT({ seekerId, email, tier })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecretKey())
}

export async function verifyJobsAppToken(
  token: string
): Promise<JobsAppTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey())
    return {
      seekerId: payload.seekerId as string,
      email: payload.email as string,
      tier: (payload.tier as string) || "free",
    }
  } catch {
    return null
  }
}

export async function signMagicLinkToken(email: string): Promise<string> {
  return new SignJWT({ email, purpose: "jobs-app-magic-link" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(getSecretKey())
}

export async function verifyMagicLinkToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey())
    if (payload.purpose !== "jobs-app-magic-link") return null
    return payload.email as string
  } catch {
    return null
  }
}

// ── Auth helpers ───────────────────────────────────────────────────────

/**
 * Extract and verify the JobSeeker from a request's Authorization header or cookie.
 * Returns null if not authenticated.
 */
export async function getJobSeeker(request: Request) {
  // Try Authorization header first
  const authHeader = request.headers.get("authorization")
  let token: string | null = null

  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7)
  } else {
    // Try cookie
    const cookieHeader = request.headers.get("cookie") || ""
    const match = cookieHeader.match(/pb-jobs-app=([^;]+)/)
    token = match ? match[1] : null
  }

  if (!token) return null

  const payload = await verifyJobsAppToken(token)
  if (!payload) return null

  const seeker = await prisma.jobSeeker.findUnique({
    where: { id: payload.seekerId },
    include: { profile: true },
  })

  return seeker
}

/**
 * Require authentication — returns seeker or throws Response.
 */
export async function requireJobSeeker(request: Request) {
  const seeker = await getJobSeeker(request)
  if (!seeker) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }
  return seeker
}

/**
 * Check if seeker has premium access (premium tier or student tier).
 */
export function isPremium(seeker: { tier: string; subscriptionStatus: string }): boolean {
  if (seeker.tier === "student") return true
  return seeker.tier === "premium" && seeker.subscriptionStatus === "active"
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit lib/jobs-app-auth.ts 2>&1 | head -20
```

If there are import resolution issues, verify with a broader check:
```bash
npx tsc --noEmit 2>&1 | grep "jobs-app-auth" | head -5
```

- [ ] **Step 3: Commit**

```bash
git add lib/jobs-app-auth.ts
git commit -m "feat(jobs-app): add auth library with password hashing, JWT, Google OAuth support"
```

---

### Task 4: Middleware — Domain Routing

**Files:**
- Modify: `middleware.ts` (add block after line 38, before dashboard auth)

- [ ] **Step 1: Add jobs.planbeta.app routing to middleware**

In `middleware.ts`, add this block after the `isPublicDomain` block (after line 38) and before the dashboard auth block (line 40):

```typescript
  // ─── PlanBeta Jobs App routing ──────────────────────────────────────
  const isJobsAppDomain = hostname.includes("jobs.planbeta.app") || hostname.includes("jobs.localhost")

  if (isJobsAppDomain) {
    // Block dashboard/login access on jobs app domain
    if (path.startsWith("/dashboard") || path === "/login") {
      return NextResponse.redirect(new URL("/", request.url))
    }

    // Skip paths that don't need rewriting
    const skipPrefixes = ["/api", "/_next", "/jobs-app"]
    const shouldSkip = skipPrefixes.some((p) => path === p || path.startsWith(p + "/"))

    if (!shouldSkip) {
      // Rewrite / to /jobs-app, /jobs to /jobs-app/jobs, etc.
      const rewritePath = path === "/" ? "/jobs-app" : "/jobs-app" + path
      return NextResponse.rewrite(new URL(rewritePath, request.url))
    }
  }
```

- [ ] **Step 2: Add `/jobs-app` to middleware matcher**

In the `config.matcher` array, add:

```typescript
    "/jobs-app/:path*",
```

- [ ] **Step 3: Test middleware locally**

```bash
npm run dev
```

Visit `http://localhost:3000/jobs-app` — should return 404 (no page yet, but no middleware crash).

- [ ] **Step 4: Commit**

```bash
git add middleware.ts
git commit -m "feat(jobs-app): add jobs.planbeta.app domain routing in middleware"
```

---

### Task 5: PWA Manifest & App Shell

**Files:**
- Create: `public/jobs-manifest.json`
- Create: `app/jobs-app/layout.tsx`
- Create: `components/jobs-app/BottomNav.tsx`
- Create: `components/jobs-app/AuthProvider.tsx`

- [ ] **Step 1: Create jobs PWA manifest**

```json
{
  "name": "PlanBeta Jobs — AI Career Companion",
  "short_name": "PB Jobs",
  "description": "AI-powered job matching, CV generation, and interview prep for the German job market",
  "id": "/jobs-app",
  "start_url": "/jobs-app",
  "scope": "/jobs-app",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#ffffff",
  "background_color": "#f8fafc",
  "categories": ["business", "productivity"],
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

- [ ] **Step 2: Create AuthProvider component**

```typescript
// components/jobs-app/AuthProvider.tsx
"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"

interface JobSeeker {
  id: string
  email: string
  name: string
  tier: string
  subscriptionStatus: string
  onboardingComplete: boolean
  profile: {
    germanLevel: string | null
    profession: string | null
    profileCompleteness: number
  } | null
}

interface AuthContextType {
  seeker: JobSeeker | null
  loading: boolean
  isPremium: boolean
  login: (token: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  seeker: null,
  loading: true,
  isPremium: false,
  login: () => {},
  logout: () => {},
})

export function useJobsAuth() {
  return useContext(AuthContext)
}

export function JobsAuthProvider({ children }: { children: ReactNode }) {
  const [seeker, setSeeker] = useState<JobSeeker | null>(null)
  const [loading, setLoading] = useState(true)

  const isPremium =
    seeker?.tier === "student" ||
    (seeker?.tier === "premium" && seeker?.subscriptionStatus === "active")

  useEffect(() => {
    const token = document.cookie
      .split("; ")
      .find((c) => c.startsWith("pb-jobs-app="))
      ?.split("=")[1]

    if (!token) {
      setLoading(false)
      return
    }

    fetch("/api/jobs-app/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.seeker) setSeeker(data.seeker)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function login(token: string) {
    document.cookie = `pb-jobs-app=${token}; path=/; max-age=${30 * 24 * 60 * 60}; samesite=lax`
    // Refetch profile
    fetch("/api/jobs-app/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.seeker) setSeeker(data.seeker)
      })
  }

  function logout() {
    document.cookie = "pb-jobs-app=; path=/; max-age=0"
    setSeeker(null)
  }

  return (
    <AuthContext.Provider value={{ seeker, loading, isPremium, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
```

- [ ] **Step 3: Create BottomNav component**

```typescript
// components/jobs-app/BottomNav.tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Briefcase,
  FileText,
  KanbanSquare,
  User,
} from "lucide-react"

const tabs = [
  { href: "/jobs-app", icon: Home, label: "Home" },
  { href: "/jobs-app/jobs", icon: Briefcase, label: "Jobs" },
  { href: "/jobs-app/cvs", icon: FileText, label: "My CVs" },
  { href: "/jobs-app/applications", icon: KanbanSquare, label: "Applications" },
  { href: "/jobs-app/profile", icon: User, label: "Profile" },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white pb-safe">
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {tabs.map(({ href, icon: Icon, label }) => {
          const isActive =
            href === "/jobs-app"
              ? pathname === "/jobs-app"
              : pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
                isActive
                  ? "text-blue-600 font-medium"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

- [ ] **Step 4: Create app shell layout**

```typescript
// app/jobs-app/layout.tsx
import type { Metadata, Viewport } from "next"
import { JobsAuthProvider } from "@/components/jobs-app/AuthProvider"
import { BottomNav } from "@/components/jobs-app/BottomNav"

export const metadata: Metadata = {
  title: {
    default: "PlanBeta Jobs — AI Career Companion",
    template: "%s | PlanBeta Jobs",
  },
  description:
    "AI-powered job matching, CV generation, and interview prep for Indians targeting Germany",
  manifest: "/jobs-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PB Jobs",
  },
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function JobsAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <JobsAuthProvider>
      <div className="min-h-screen bg-gray-50 text-gray-900 pb-16">
        <main className="mx-auto max-w-lg px-4 py-4">{children}</main>
        <BottomNav />
      </div>
    </JobsAuthProvider>
  )
}
```

- [ ] **Step 5: Create placeholder home page**

```typescript
// app/jobs-app/page.tsx
import Link from "next/link"

export default function JobsAppHome() {
  return (
    <div className="space-y-6 pt-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">PlanBeta Jobs</h1>
        <p className="mt-1 text-gray-600">
          Your AI career companion for the German job market
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-gray-500">
          Welcome! This app is under construction. Core features coming soon.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/jobs-app/jobs"
          className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm hover:border-blue-300"
        >
          <span className="text-2xl">🔍</span>
          <p className="mt-1 text-sm font-medium">Browse Jobs</p>
        </Link>
        <Link
          href="/jobs-app/onboarding"
          className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm hover:border-blue-300"
        >
          <span className="text-2xl">👤</span>
          <p className="mt-1 text-sm font-medium">Setup Profile</p>
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Verify the app shell loads**

```bash
npm run dev
```

Visit `http://localhost:3000/jobs-app` — should see the home page with bottom nav.

- [ ] **Step 7: Commit**

```bash
git add public/jobs-manifest.json components/jobs-app/ app/jobs-app/
git commit -m "feat(jobs-app): add PWA manifest, app shell layout, bottom nav, auth provider"
```

---

### Task 6: Auth API Routes — Register + Login

**Files:**
- Create: `app/api/jobs-app/auth/register/route.ts`
- Create: `app/api/jobs-app/auth/login/route.ts`
- Create: `app/api/jobs-app/auth/logout/route.ts`

- [ ] **Step 1: Create register route**

```typescript
// app/api/jobs-app/auth/register/route.ts
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { hashPassword, signJobsAppToken } from "@/lib/jobs-app-auth"
import { z } from "zod"

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { email, password, name } = parsed.data

    // Check if email already exists
    const existing = await prisma.jobSeeker.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      )
    }

    const passwordHash = await hashPassword(password)

    const seeker = await prisma.jobSeeker.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name,
      },
    })

    const token = await signJobsAppToken(seeker.id, seeker.email, "free")

    const response = NextResponse.json({
      token,
      seeker: {
        id: seeker.id,
        email: seeker.email,
        name: seeker.name,
        tier: seeker.tier,
      },
    })

    response.cookies.set("pb-jobs-app", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Register error:", error)
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Create login route**

```typescript
// app/api/jobs-app/auth/login/route.ts
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { verifyPassword, signJobsAppToken } from "@/lib/jobs-app-auth"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 400 }
      )
    }

    const { email, password } = parsed.data

    const seeker = await prisma.jobSeeker.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!seeker || !seeker.passwordHash) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    const valid = await verifyPassword(password, seeker.passwordHash)
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // Update last login
    await prisma.jobSeeker.update({
      where: { id: seeker.id },
      data: { lastLoginAt: new Date() },
    })

    const token = await signJobsAppToken(seeker.id, seeker.email, seeker.tier)

    const response = NextResponse.json({
      token,
      seeker: {
        id: seeker.id,
        email: seeker.email,
        name: seeker.name,
        tier: seeker.tier,
        onboardingComplete: seeker.onboardingComplete,
      },
    })

    response.cookies.set("pb-jobs-app", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
```

- [ ] **Step 3: Create logout route**

```typescript
// app/api/jobs-app/auth/logout/route.ts
import { NextResponse } from "next/server"

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set("pb-jobs-app", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  })
  return response
}
```

- [ ] **Step 4: Test the auth flow**

```bash
# Register
curl -s -X POST http://localhost:3000/api/jobs-app/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123","name":"Test User"}' | head -c 200

# Login
curl -s -X POST http://localhost:3000/api/jobs-app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}' | head -c 200
```

Expected: Both return JSON with `token` and `seeker` fields.

- [ ] **Step 5: Commit**

```bash
git add app/api/jobs-app/auth/
git commit -m "feat(jobs-app): add register, login, logout API routes"
```

---

### Task 7: Profile API Route

**Files:**
- Create: `app/api/jobs-app/profile/route.ts`

- [ ] **Step 1: Create profile GET + PUT route**

```typescript
// app/api/jobs-app/profile/route.ts
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getJobSeeker, requireJobSeeker } from "@/lib/jobs-app-auth"
import { z } from "zod"

export async function GET(request: Request) {
  const seeker = await getJobSeeker(request)
  if (!seeker) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.json({
    seeker: {
      id: seeker.id,
      email: seeker.email,
      name: seeker.name,
      tier: seeker.tier,
      subscriptionStatus: seeker.subscriptionStatus,
      onboardingComplete: seeker.onboardingComplete,
      profile: seeker.profile,
    },
  })
}

const profileUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  germanLevel: z.string().optional(),
  profession: z.string().optional(),
  currentLocation: z.string().optional(),
  targetLocations: z.array(z.string()).optional(),
  visaStatus: z.string().optional(),
  currentTitle: z.string().optional(),
  yearsExperience: z.number().int().min(0).optional(),
  targetRoles: z.array(z.string()).optional(),
  skills: z.any().optional(),
  salaryMin: z.number().int().optional(),
  salaryMax: z.number().int().optional(),
  salaryCurrency: z.string().optional(),
  education: z.any().optional(),
  germanCertificate: z.string().optional(),
  englishLevel: z.string().optional(),
  certifications: z.any().optional(),
  workExperience: z.any().optional(),
})

export async function PUT(request: Request) {
  const seeker = await requireJobSeeker(request)

  const body = await request.json()
  const parsed = profileUpdateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const data = parsed.data
  const { name, ...profileFields } = data

  // Update name on JobSeeker if provided
  if (name) {
    await prisma.jobSeeker.update({
      where: { id: seeker.id },
      data: { name },
    })
  }

  // Calculate profile completeness
  const completenessFields = [
    profileFields.germanLevel,
    profileFields.profession,
    profileFields.currentTitle,
    profileFields.yearsExperience !== undefined,
    profileFields.workExperience,
    profileFields.education,
    profileFields.skills,
    profileFields.targetLocations?.length,
    profileFields.salaryMin,
    profileFields.visaStatus,
  ]
  const filled = completenessFields.filter(Boolean).length
  const profileCompleteness = Math.round((filled / completenessFields.length) * 100)

  // Upsert profile
  const profile = await prisma.jobSeekerProfile.upsert({
    where: { seekerId: seeker.id },
    create: {
      seekerId: seeker.id,
      ...profileFields,
      profileCompleteness,
    },
    update: {
      ...profileFields,
      profileCompleteness,
    },
  })

  // Mark onboarding complete if minimum fields are set
  if (profileFields.germanLevel && profileFields.profession) {
    await prisma.jobSeeker.update({
      where: { id: seeker.id },
      data: { onboardingComplete: true },
    })
  }

  return NextResponse.json({ profile })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/jobs-app/profile/
git commit -m "feat(jobs-app): add profile GET/PUT API with completeness scoring"
```

---

### Task 8: Onboarding Page (Quick Start)

**Files:**
- Create: `components/jobs-app/OnboardingForm.tsx`
- Create: `app/jobs-app/onboarding/page.tsx`

- [ ] **Step 1: Create OnboardingForm component**

```typescript
// components/jobs-app/OnboardingForm.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useJobsAuth } from "./AuthProvider"

const GERMAN_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"]
const PROFESSIONS = [
  "Nursing",
  "Engineering",
  "IT",
  "Healthcare",
  "Hospitality",
  "Accounting",
  "Teaching",
  "Other",
]

export function OnboardingForm() {
  const router = useRouter()
  const { seeker } = useJobsAuth()
  const [germanLevel, setGermanLevel] = useState("")
  const [profession, setProfession] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!germanLevel || !profession) return

    setSaving(true)
    try {
      const res = await fetch("/api/jobs-app/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ germanLevel, profession }),
      })

      if (res.ok) {
        router.push("/jobs-app/jobs")
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome{seeker?.name ? `, ${seeker.name.split(" ")[0]}` : ""}!
        </h1>
        <p className="mt-1 text-gray-600">
          Two quick questions and you'll see your job matches.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Your German Level
        </label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {GERMAN_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setGermanLevel(level)}
              className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                germanLevel === level
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Your Profession
        </label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {PROFESSIONS.map((prof) => (
            <button
              key={prof}
              type="button"
              onClick={() => setProfession(prof)}
              className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                profession === prof
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              {prof}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={!germanLevel || !profession || saving}
        className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {saving ? "Saving..." : "See Your Job Matches →"}
      </button>

      <p className="text-center text-xs text-gray-500">
        You can add more details later to improve your match accuracy
      </p>
    </form>
  )
}
```

- [ ] **Step 2: Create onboarding page**

```typescript
// app/jobs-app/onboarding/page.tsx
import { OnboardingForm } from "@/components/jobs-app/OnboardingForm"

export const metadata = {
  title: "Get Started",
}

export default function OnboardingPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-sm">
        <OnboardingForm />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify the onboarding page renders**

```bash
npm run dev
```

Visit `http://localhost:3000/jobs-app/onboarding` — should show the 2-field quick start form.

- [ ] **Step 4: Commit**

```bash
git add components/jobs-app/OnboardingForm.tsx app/jobs-app/onboarding/
git commit -m "feat(jobs-app): add quick-start onboarding (German level + profession → instant matches)"
```

---

### Task 9: Heuristic Scorer

**Files:**
- Create: `lib/heuristic-scorer.ts`

- [ ] **Step 1: Create the heuristic scoring engine**

```typescript
// lib/heuristic-scorer.ts
/**
 * Fast, zero-AI-cost job scoring based on field matching.
 * Runs on every job for every user. Cached in MatchScoreCache.
 */

interface ScorerProfile {
  germanLevel: string | null
  profession: string | null
  targetLocations: string[]
  salaryMin: number | null
  salaryMax: number | null
  visaStatus: string | null
  yearsExperience: number | null
}

interface ScorerJob {
  germanLevel: string | null
  profession: string | null
  location: string | null
  jobType: string | null
  salaryMin: number | null
  salaryMax: number | null
}

const GERMAN_LEVEL_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"]

function germanLevelScore(userLevel: string | null, jobLevel: string | null): number {
  if (!jobLevel || jobLevel === "None") return 100 // No requirement = full match
  if (!userLevel) return 20
  const userIdx = GERMAN_LEVEL_ORDER.indexOf(userLevel)
  const jobIdx = GERMAN_LEVEL_ORDER.indexOf(jobLevel)
  if (userIdx < 0 || jobIdx < 0) return 50
  if (userIdx >= jobIdx) return 100 // Meets or exceeds
  if (userIdx === jobIdx - 1) return 60 // One level below
  return 20 // Two+ levels below
}

function professionScore(userProf: string | null, jobProf: string | null): number {
  if (!jobProf || !userProf) return 50
  if (userProf.toLowerCase() === jobProf.toLowerCase()) return 100
  // Related professions
  const related: Record<string, string[]> = {
    nursing: ["healthcare"],
    healthcare: ["nursing"],
    it: ["engineering"],
    engineering: ["it"],
  }
  const userRelated = related[userProf.toLowerCase()] || []
  if (userRelated.includes(jobProf.toLowerCase())) return 60
  return 20
}

function locationScore(targetLocations: string[], jobLocation: string | null): number {
  if (!jobLocation || targetLocations.length === 0) return 50
  const jobLoc = jobLocation.toLowerCase()
  for (const target of targetLocations) {
    if (jobLoc.includes(target.toLowerCase())) return 100
  }
  // Check if same general region
  const germanRegions: Record<string, string[]> = {
    north: ["hamburg", "bremen", "hannover", "kiel"],
    south: ["munich", "stuttgart", "nuremberg", "augsburg"],
    west: ["cologne", "düsseldorf", "dortmund", "essen", "bonn", "frankfurt"],
    east: ["berlin", "leipzig", "dresden"],
  }
  for (const target of targetLocations) {
    for (const [, cities] of Object.entries(germanRegions)) {
      const targetInRegion = cities.some((c) => target.toLowerCase().includes(c))
      const jobInRegion = cities.some((c) => jobLoc.includes(c))
      if (targetInRegion && jobInRegion) return 70
    }
  }
  return 30
}

function salaryScore(
  userMin: number | null,
  userMax: number | null,
  jobMin: number | null,
  jobMax: number | null
): number {
  if (!jobMin && !jobMax) return 50 // No salary info
  if (!userMin && !userMax) return 50 // No preference
  const jobMid = ((jobMin || 0) + (jobMax || jobMin || 0)) / 2
  const userMid = ((userMin || 0) + (userMax || userMin || 0)) / 2
  if (!userMid || !jobMid) return 50
  const ratio = jobMid / userMid
  if (ratio >= 1) return 100 // Job pays at or above expectation
  if (ratio >= 0.8) return 60 // Within 20%
  return 30
}

function jobTypeScore(jobType: string | null): number {
  // Default: neutral — we don't have jobType preferences in quick start
  return jobType ? 70 : 50
}

function visaScore(visaStatus: string | null, jobType: string | null): number {
  if (!visaStatus) return 50
  // Blue Card eligible if full-time professional role
  if (visaStatus.toLowerCase().includes("blue card")) {
    if (jobType === "FULL_TIME") return 100
    if (jobType === "WORKING_STUDENT") return 40
    return 60
  }
  if (visaStatus.toLowerCase().includes("student")) {
    if (jobType === "WORKING_STUDENT" || jobType === "PART_TIME" || jobType === "INTERNSHIP") return 100
    if (jobType === "FULL_TIME") return 50
    return 60
  }
  return 50
}

export function computeHeuristicScore(profile: ScorerProfile, job: ScorerJob): number {
  const scores = {
    germanLevel: germanLevelScore(profile.germanLevel, job.germanLevel) * 0.25,
    profession: professionScore(profile.profession, job.profession) * 0.20,
    location: locationScore(profile.targetLocations, job.location) * 0.20,
    jobType: jobTypeScore(job.jobType) * 0.15,
    salary: salaryScore(profile.salaryMin, profile.salaryMax, job.salaryMin, job.salaryMax) * 0.10,
    visa: visaScore(profile.visaStatus, job.jobType) * 0.10,
  }

  return Math.round(
    scores.germanLevel +
    scores.profession +
    scores.location +
    scores.jobType +
    scores.salary +
    scores.visa
  )
}

export function getMatchLabel(score: number): {
  label: string
  color: string
  bgColor: string
} {
  if (score >= 90) return { label: "Excellent Match", color: "text-emerald-700", bgColor: "bg-emerald-50" }
  if (score >= 75) return { label: "Strong Match", color: "text-blue-700", bgColor: "bg-blue-50" }
  if (score >= 60) return { label: "Good Fit", color: "text-yellow-700", bgColor: "bg-yellow-50" }
  if (score >= 40) return { label: "Partial Match", color: "text-orange-700", bgColor: "bg-orange-50" }
  return { label: "Low Match", color: "text-gray-500", bgColor: "bg-gray-50" }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/heuristic-scorer.ts
git commit -m "feat(jobs-app): add heuristic job scoring engine (zero AI cost, instant)"
```

---

### Task 10: Jobs API with Scoring

**Files:**
- Create: `app/api/jobs-app/jobs/route.ts`
- Create: `components/jobs-app/MatchBadge.tsx`
- Create: `components/jobs-app/JobCard.tsx`

- [ ] **Step 1: Create jobs API route with heuristic scoring**

```typescript
// app/api/jobs-app/jobs/route.ts
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getJobSeeker } from "@/lib/jobs-app-auth"
import { computeHeuristicScore } from "@/lib/heuristic-scorer"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get("page") || "1")
  const limit = 20
  const skip = (page - 1) * limit
  const profession = searchParams.get("profession")
  const germanLevel = searchParams.get("germanLevel")
  const location = searchParams.get("location")
  const sort = searchParams.get("sort") || "match" // match, newest, salary

  // Build where clause
  const where: any = { active: true }
  if (profession) where.profession = profession
  if (germanLevel) where.germanLevel = germanLevel
  if (location) where.location = { contains: location, mode: "insensitive" }

  // Get jobs
  const [jobs, total] = await Promise.all([
    prisma.jobPosting.findMany({
      where,
      orderBy: sort === "newest" ? { createdAt: "desc" } : sort === "salary" ? { salaryMax: "desc" } : { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        slug: true,
        title: true,
        company: true,
        location: true,
        salaryMin: true,
        salaryMax: true,
        currency: true,
        germanLevel: true,
        profession: true,
        jobType: true,
        grade: true,
        createdAt: true,
      },
    }),
    prisma.jobPosting.count({ where }),
  ])

  // Get seeker profile for scoring (if authenticated)
  const seeker = await getJobSeeker(request)
  const profile = seeker?.profile

  // Compute heuristic scores
  const jobsWithScores = jobs.map((job) => {
    let matchScore = null
    let matchLabel = null

    if (profile) {
      const score = computeHeuristicScore(
        {
          germanLevel: profile.germanLevel,
          profession: profile.profession,
          targetLocations: profile.targetLocations,
          salaryMin: profile.salaryMin,
          salaryMax: profile.salaryMax,
          visaStatus: profile.visaStatus,
          yearsExperience: profile.yearsExperience,
        },
        {
          germanLevel: job.germanLevel,
          profession: job.profession,
          location: job.location,
          jobType: job.jobType,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
        }
      )
      matchScore = score
      // Import inline to avoid circular deps
      const { getMatchLabel } = require("@/lib/heuristic-scorer")
      matchLabel = getMatchLabel(score)
    }

    return { ...job, matchScore, matchLabel }
  })

  // Sort by match score if requested and scores available
  if (sort === "match" && profile) {
    jobsWithScores.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
  }

  return NextResponse.json({
    jobs: jobsWithScores,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  })
}
```

- [ ] **Step 2: Create MatchBadge component**

```typescript
// components/jobs-app/MatchBadge.tsx
interface MatchBadgeProps {
  score: number
  label: string
  color: string
  bgColor: string
  size?: "sm" | "md"
}

export function MatchBadge({ score, label, color, bgColor, size = "sm" }: MatchBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${color} ${bgColor} ${
        size === "sm" ? "text-xs" : "text-sm"
      }`}
    >
      <span className="font-bold">{score}</span>
      <span className="hidden sm:inline">— {label}</span>
    </span>
  )
}
```

- [ ] **Step 3: Create JobCard component**

```typescript
// components/jobs-app/JobCard.tsx
import Link from "next/link"
import { MapPin, Briefcase, Euro } from "lucide-react"
import { MatchBadge } from "./MatchBadge"

interface JobCardProps {
  job: {
    slug: string | null
    title: string
    company: string
    location: string | null
    salaryMin: number | null
    salaryMax: number | null
    currency: string
    germanLevel: string | null
    jobType: string | null
    matchScore: number | null
    matchLabel: { label: string; color: string; bgColor: string } | null
    createdAt: string
  }
}

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  WORKING_STUDENT: "Working Student",
  INTERNSHIP: "Internship",
  CONTRACT: "Contract",
}

export function JobCard({ job }: JobCardProps) {
  const href = job.slug ? `/jobs-app/job/${job.slug}` : "#"

  return (
    <Link
      href={href}
      className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-gray-900">
            {job.title}
          </h3>
          <p className="text-sm text-gray-600">{job.company}</p>
        </div>
        {job.matchScore !== null && job.matchLabel && (
          <MatchBadge
            score={job.matchScore}
            label={job.matchLabel.label}
            color={job.matchLabel.color}
            bgColor={job.matchLabel.bgColor}
          />
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
        {job.location && (
          <span className="flex items-center gap-0.5">
            <MapPin className="h-3 w-3" />
            {job.location}
          </span>
        )}
        {job.jobType && (
          <span className="flex items-center gap-0.5">
            <Briefcase className="h-3 w-3" />
            {JOB_TYPE_LABELS[job.jobType] || job.jobType}
          </span>
        )}
        {(job.salaryMin || job.salaryMax) && (
          <span className="flex items-center gap-0.5">
            <Euro className="h-3 w-3" />
            {job.salaryMin && job.salaryMax
              ? `${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()}`
              : job.salaryMin
              ? `From ${job.salaryMin.toLocaleString()}`
              : `Up to ${job.salaryMax?.toLocaleString()}`}
          </span>
        )}
        {job.germanLevel && (
          <span className="rounded bg-gray-100 px-1.5 py-0.5 font-medium">
            {job.germanLevel}
          </span>
        )}
      </div>
    </Link>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/jobs-app/jobs/ components/jobs-app/MatchBadge.tsx components/jobs-app/JobCard.tsx
git commit -m "feat(jobs-app): add jobs API with heuristic scoring, MatchBadge and JobCard components"
```

---

### Task 11: Jobs Feed Page

**Files:**
- Create: `app/jobs-app/jobs/page.tsx`

- [ ] **Step 1: Create the jobs feed page**

```typescript
// app/jobs-app/jobs/page.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react"
import { JobCard } from "@/components/jobs-app/JobCard"
import { useJobsAuth } from "@/components/jobs-app/AuthProvider"
import Link from "next/link"

const GERMAN_LEVELS = ["", "A1", "A2", "B1", "B2", "C1", "C2"]
const PROFESSIONS = ["", "Nursing", "Engineering", "IT", "Healthcare", "Hospitality", "Accounting", "Teaching", "Other"]

export default function JobsFeedPage() {
  const { seeker, loading: authLoading } = useJobsAuth()
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  // Filters
  const [germanLevel, setGermanLevel] = useState("")
  const [profession, setProfession] = useState("")
  const [sort, setSort] = useState("match")

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), sort })
    if (germanLevel) params.set("germanLevel", germanLevel)
    if (profession) params.set("profession", profession)

    try {
      const res = await fetch(`/api/jobs-app/jobs?${params}`)
      if (res.ok) {
        const data = await res.json()
        setJobs(data.jobs)
        setTotalPages(data.pagination.pages)
      }
    } finally {
      setLoading(false)
    }
  }, [page, germanLevel, profession, sort])

  useEffect(() => {
    if (!authLoading) fetchJobs()
  }, [fetchJobs, authLoading])

  return (
    <div className="space-y-4 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Jobs</h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </button>
      </div>

      {/* Profile banner */}
      {!seeker && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
          <p className="text-sm text-blue-800">
            <Link href="/jobs-app/onboarding" className="font-semibold underline">
              Create a profile
            </Link>{" "}
            to see personalized match scores on every job
          </p>
        </div>
      )}

      {seeker && !seeker.onboardingComplete && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
          <p className="text-sm text-blue-800">
            <Link href="/jobs-app/onboarding" className="font-semibold underline">
              Complete your profile
            </Link>{" "}
            to see match scores
          </p>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500">German Level</label>
              <select
                value={germanLevel}
                onChange={(e) => { setGermanLevel(e.target.value); setPage(1) }}
                className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
              >
                <option value="">All Levels</option>
                {GERMAN_LEVELS.filter(Boolean).map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Profession</label>
              <select
                value={profession}
                onChange={(e) => { setProfession(e.target.value); setPage(1) }}
                className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
              >
                <option value="">All</option>
                {PROFESSIONS.filter(Boolean).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Sort By</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
            >
              <option value="match">Best Match</option>
              <option value="newest">Newest</option>
              <option value="salary">Highest Salary</option>
            </select>
          </div>
        </div>
      )}

      {/* Jobs list */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200" />
          ))
        ) : jobs.length === 0 ? (
          <p className="text-center text-sm text-gray-500 py-8">No jobs found</p>
        ) : (
          jobs.map((job) => <JobCard key={job.id} job={job} />)
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 text-sm text-gray-600 disabled:text-gray-300"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 text-sm text-gray-600 disabled:text-gray-300"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify jobs page loads with real data**

```bash
npm run dev
```

Visit `http://localhost:3000/jobs-app/jobs` — should show job listings from the existing database. Without auth, no match scores are shown. With auth + profile, match scores appear.

- [ ] **Step 3: Commit**

```bash
git add app/jobs-app/jobs/
git commit -m "feat(jobs-app): add jobs feed page with filters, pagination, and match score display"
```

---

**NOTE: This plan covers Phase 1 (Foundation) — Tasks 1-11. Phase 2 (CV Generation, AI Deep Scoring), Phase 3 (Application Tracker, Interview Prep), and Phase 4 (Billing, Growth) should be separate plans written after Phase 1 ships and is validated with real users.**

The remaining phases are outlined but not fully specified here because:
1. Phase 1 must be validated before investing in Phase 2-4
2. The CV generation and billing architecture may change based on Phase 1 learnings
3. Each phase should be its own plan with its own spec review

**Phase 2 will cover:**
- `lib/jobs-ai.ts` (Claude API orchestrator)
- `lib/cv-template.tsx` (@react-pdf/renderer template)
- `app/api/jobs-app/cv/generate/route.ts`
- `app/api/jobs-app/jobs/[slug]/route.ts` (AI deep scoring)
- `app/jobs-app/job/[slug]/page.tsx` (job detail with score breakdown)
- `app/jobs-app/cvs/page.tsx` (CV history)

**Phase 3 will cover:**
- Application tracker CRUD + Kanban UI
- Interview prep generation
- Story bank
- Cron jobs for recommendations and nudges

**Phase 4 will cover:**
- Stripe + Razorpay subscription integration
- Free tier gating
- Student linking
- Referral system
- Domain knowledge tools (Blue Card checker, etc.)
