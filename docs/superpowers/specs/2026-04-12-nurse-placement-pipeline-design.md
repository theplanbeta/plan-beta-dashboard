# Nurse Placement Pipeline — Design Spec

## Goal

Build a complete nurse-to-recruiter pipeline inside Day Zero: nurses fill a structured profile, upload documents, and Plan Beta shares per-recruiter dossier links that give recruiters everything they need to place a candidate. Replaces the current "rudimentary English CV over WhatsApp" handoff with a professional, trackable, scalable system.

## Scope

**In scope:** Nurse-specific placement pipeline only — profile builder, document upload, shareable dossier, recruiter model, candidate lifecycle, admin pipeline dashboard.

**Out of scope:** Non-nurse users (IT, engineering) keep the existing 2-field onboarding + self-serve app. No changes to the existing job matching, CV generation, or Anschreiben features for non-nurse flows.

## Business Context

- Plan Beta is a German language school in Kerala, India
- Recruiter partnership: nurses learn German → Plan Beta sends profile to recruiter → recruiter places nurse in German hospital/Pflegeheim → Plan Beta receives €1,000/placement
- 17 nurses placed as of April 2026
- **Bottleneck:** single recruiter with limited positions
- **Goal:** package nurses professionally enough to onboard multiple recruiters
- **Current handoff:** rudimentary English CV sent to recruiter, who contacts the nurse directly. Plan Beta has the brand credibility; nurses don't know the recruiter.

## Architecture Overview

```
Nurse fills profile → uploads documents → Deepak reviews + verifies
                                                    ↓
                                    Deepak shares per-recruiter dossier link
                                                    ↓
                              Recruiter sees summary dossier (qualifications only)
                                                    ↓
                              Recruiter interested → nurse approves full access
                                                    ↓
                              Recruiter gets full dossier + one-click PDF export
                                                    ↓
                              Recruiter places nurse → Deepak confirms → €1,000
```

## Data Model

### New models

**Recruiter**
```
model Recruiter {
  id              String   @id @default(cuid())
  name            String
  company         String
  email           String?
  phone           String?
  notes           String?
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  shares          DossierShare[]
}
```

**DossierShare** (junction: candidate × recruiter)
```
model DossierShare {
  id              String   @id @default(cuid())
  seekerId        String
  seeker          JobSeeker @relation(...)
  recruiterId     String
  recruiter       Recruiter @relation(...)

  token           String   @unique  // 128-bit URL-safe token
  status          DossierShareStatus @default(SHARED)
  tier            DossierTier @default(SUMMARY)

  // Nurse consent for full access
  fullAccessApprovedAt  DateTime?
  fullAccessApprovedBy  String?  // "nurse" or "admin"

  // Tracking
  viewCount       Int      @default(0)
  lastViewedAt    DateTime?
  lastViewedIp    String?

  // Exclusivity
  lockedEmployer  String?  // hospital name this recruiter submitted to
  lockedUntil     DateTime?

  expiresAt       DateTime?
  sharedAt        DateTime @default(now())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([seekerId, recruiterId])
  @@index([token])
}

enum DossierShareStatus {
  SHARED
  VIEWED
  INTERESTED
  INTERVIEWING
  PLACED
  WITHDRAWN
  EXPIRED
}

enum DossierTier {
  SUMMARY
  FULL
}
```

### Schema additions to existing JobSeekerProfile

```prisma
// Nurse-specific fields (conditional on profession = "Nursing" / "Healthcare")
nursingSpecialization  String?   // "ICU", "Geriatric", "Surgical", "Pediatric", "Psychiatric", "General", "Emergency"
anerkennungStatus      String?   // "not_started", "applied", "defizitbescheid", "anpassung", "kenntnis", "recognized"
anerkennungLandesamt   String?   // which authority is processing
anerkennungAppliedAt   DateTime? // when they applied
defizitDetails         String?   // what deficits were identified
availableFrom          DateTime? // earliest start date in Germany
photoUrl               String?   // Vercel Blob URL (proxied, never direct)
relocationReadiness    String?   // "ready", "visa_pending", "exploring"
drivingLicense         Boolean   @default(false)
familyStatus           String?   // "single", "married_solo", "married_with_family"
```

### Schema additions to existing JobSeeker

```prisma
candidateStatus   CandidateStatus @default(INCOMPLETE)

enum CandidateStatus {
  INCOMPLETE    // profile not filled
  READY         // profile complete, verified
  SHARED        // shared with at least one recruiter
  INTERVIEWING  // at least one recruiter interviewing
  PLACED        // successfully placed
  WITHDRAWN     // candidate withdrew
}
```

### Existing model — no changes needed

**JobSeekerDocument** — already has the right schema:
- Types: CV, COVER_LETTER, CERTIFICATE, TRANSCRIPT, REFERENCE, OTHER
- Fields: fileName, fileUrl, fileKey, fileSize, mimeType
- Add: `OTHER` covers passport and Defizitbescheid scans

## Pages & Routes

### Nurse Profile Builder

**Page:** `app/jobs-app/profile/page.tsx`

**Access:** Authenticated nurses only (`profession === "Nursing" || "Healthcare"`)

**UX:** Single page with 4 expandable card sections matching Die Bewerbungsmappe aesthetic. Each section shows completion status. Progressive — minimum viable fields highlighted, rest optional.

**Section 1 — Personal Details**
- Name (pre-filled from JobSeeker)
- Date of birth
- Nationality (default: Indian)
- Phone / WhatsApp
- Photo upload (with crop)
- Current location
- Target cities in Germany (multi-select)
- Family status
- Driving license toggle

**Section 2 — Nursing Qualifications**
- Nursing specialization (dropdown: ICU, Geriatric, Surgical, Pediatric, Psychiatric, General, Emergency)
- Highest nursing degree (BSc Nursing, GNM, MSc Nursing, other)
- University + graduation year
- Years of clinical experience
- Work experience entries (hospital name, department/ward, dates, bed count, responsibilities)
- Current job title

**Section 3 — German & Recognition**
- German level (pre-filled from onboarding)
- Certificate name + date (Goethe B1, telc B2, etc.)
- English level
- Berufsanerkennung status (dropdown: Not started, Applied, Defizitbescheid received, In Anpassungslehrgang, Kenntnisprüfung scheduled, Recognized)
- If applied: which Landesamt, application date
- If Defizitbescheid: deficit details (free text)
- Availability date (date picker — "When can you start in Germany?")
- Relocation readiness

**Section 4 — Documents**
- Upload zones for: Passport copy, Nursing degree, German language certificate, Defizitbescheid (if applicable), Work references, Other certificates
- Each upload maps to `JobSeekerDocument` with appropriate type
- Shows upload status, file name, size
- Max 10MB per file, accepted: PDF, JPG, PNG
- Photo uploads stripped of EXIF metadata

**Profile completeness** recalculated on every save. Minimum viable profile (MVP): name, German level+cert, specialization, years, Berufsanerkennung status, availability = 6 fields.

**API:** `PUT /api/jobs-app/profile` (existing route, extended with new fields)
**Document API:** `POST /api/jobs-app/documents` (new), `DELETE /api/jobs-app/documents/[id]` (new)

### Shareable Candidate Dossier

**Public page:** `app/dossier/[token]/page.tsx`

This is NOT inside `/jobs-app/` — it's a standalone public page that recruiters access without authentication. The token in the URL maps to a `DossierShare` record.

**Summary tier (default):**
- Candidate photo + name
- "Verified by Plan Beta" badge (if admin-toggled)
- German level + certificate name
- Nursing specialization + years of experience
- Berufsanerkennung status
- Availability date
- Relocation readiness
- NO contact details, NO passport, NO document downloads
- "Request full access" button (sends notification to Plan Beta admin who then either approves directly or asks the nurse via WhatsApp)
- Die Bewerbungsmappe aesthetic — professional, paper-textured, distinctive

**Full tier (after nurse/admin approval):**
- Everything in summary
- Contact details (email, phone, WhatsApp)
- Full work history with ward names, bed counts, dates
- Education details
- All uploaded documents (streamed through proxy API, not direct Blob URLs)
- One-click "Download PDF Package" — generates a 3-4 page PDF containing: CV-style summary, qualifications, experience, document list with thumbnails
- Salary expectation (if provided)
- Family status, driving license

**Security:**
- Token: 128-bit, URL-safe (`crypto.randomBytes(16).toString('base64url')`)
- All document downloads proxied through `/api/dossier/[token]/documents/[docId]` — checks token validity, share status, tier, expiry
- `<meta name="robots" content="noindex, nofollow">` on all dossier pages
- Access logged: timestamp, IP, user-agent per view
- Link expiry: configurable, default 90 days
- Nurse can revoke via their profile dashboard

**API routes:**
- `GET /api/dossier/[token]` — returns dossier data (respects tier)
- `GET /api/dossier/[token]/documents/[docId]` — streams document (full tier only)
- `GET /api/dossier/[token]/pdf` — generates and returns the PDF package

### Admin Pipeline Dashboard

**Page:** `app/dashboard/nurse-pipeline/page.tsx`

This lives in the **existing Plan Beta dashboard** (planbeta.app), NOT in the Day Zero PWA. Accessible to FOUNDER role only.

**Views:**
1. **Candidate list** — all nurses with candidateStatus, profile completeness %, German level, specialization, availability. Filterable by status. Sortable.
2. **Candidate detail** — full profile view + document list + share history (which recruiters, when, view counts)
3. **Recruiter list** — all recruiters, active/inactive, # candidates shared, # placements
4. **Share action** — select candidate → select recruiter → generates per-recruiter dossier link → copies to clipboard
5. **Batch share** — select multiple candidates → share with one recruiter (generates individual links)
6. **Status updates** — change candidate status, log placement confirmations
7. **Verified badge toggle** — mark candidate as verified after manual document review

**Recruiter CRUD:** `app/dashboard/nurse-pipeline/recruiters/page.tsx`
- Add/edit/deactivate recruiters
- View all candidates shared with a recruiter + their statuses

**API routes:**
- `GET/POST /api/nurse-pipeline/recruiters` — CRUD
- `POST /api/nurse-pipeline/share` — create DossierShare with per-recruiter token
- `PUT /api/nurse-pipeline/share/[id]` — update status, approve full access
- `GET /api/nurse-pipeline/candidates` — list with filters
- `PUT /api/nurse-pipeline/candidates/[id]/status` — update candidate status
- `PUT /api/nurse-pipeline/candidates/[id]/verify` — toggle verified badge

### BottomNav Change (Day Zero PWA)

Replace the "CVs" tab with "Profile" for nurse users:
- If `profession === "Nursing" || "Healthcare"` → tab shows "Profile" linking to `/jobs-app/profile`
- Otherwise → tab stays "CVs" linking to `/jobs-app/cvs`

## PDF Package Generation

The one-click PDF that recruiters download from the full dossier. Generated server-side via `@react-pdf/renderer` (already in the project).

**Contents (3-4 pages):**
1. **Header:** Photo + name + contact details + "Candidate Profile — Plan Beta Day Zero"
2. **Personal Details:** DOB, nationality, family status, driving license, availability
3. **Qualifications:** Nursing specialization, degree, graduation year, years of experience
4. **German & Recognition:** Level + certificate, Berufsanerkennung status + Landesamt + details
5. **Work Experience:** Reverse chronological — hospital, ward, dates, bed count, responsibilities
6. **Education:** Degrees, certifications
7. **Document Appendix:** List of attached documents (names + types, not embedded — recruiter downloads separately)

Format: A4, professional layout (not the AI-generated CV — this is a structured data sheet the recruiter can put in their ATS).

## GDPR Compliance

1. **Consent step** before profile creation: explicit checkbox covering data collection, sharing with recruiters, retention period. Stored as `consentedAt` + `consentVersion` on JobSeeker.
2. **Per-recruiter consent** for full dossier access: Plan Beta admin approves on the nurse's behalf (since the nurse trusts Plan Beta and doesn't know the recruiter). Admin clicks "Approve full access" in the pipeline dashboard. Future enhancement: nurse sees a list of recruiters with access in their profile page and can revoke.
3. **Deletion endpoint:** nukes all Prisma records + Blob files + generated PDFs for a candidate. Right to be forgotten.
4. **Data export:** JSON dump of all candidate data for right-of-access requests.
5. **Privacy policy page** on dayzero.xyz covering the placement pipeline.
6. **PII minimization in AI prompts:** DOB, phone, email, passport numbers NOT sent to Claude. Only work experience, qualifications, and German level go to the AI.

## What This Does NOT Change

- Existing job matching, CV generation, Anschreiben generation for all users (nurses and non-nurses)
- Existing authentication (JobSeeker model, JWT, httpOnly cookies)
- Existing onboarding (2-field quick start stays as the entry point, profile builder is the "complete your profile" step)
- The Die Bewerbungsmappe design system (dossier page reuses it)
- Non-nurse users see no change — their BottomNav stays the same, no profile builder, no dossier

## Success Criteria

1. A nurse can fill their profile in under 10 minutes (6 MVP fields in 2 minutes)
2. Deepak can share a candidate with a recruiter in under 30 seconds (select → share �� copy link)
3. A recruiter can review a summary dossier and request full access in under 2 minutes
4. The PDF package downloads in under 5 seconds
5. A recruiter says "send me 50 more like this" after seeing the dossier
6. Plan Beta can onboard a second recruiter within a week of launch
7. Candidate status is trackable — Deepak can answer "how many B2 ICU nurses are ready?" in 10 seconds
