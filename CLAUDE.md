# Plan Beta Dashboard

A comprehensive school management platform for Plan Beta, a German language school serving students primarily from India who want to learn German (A1, A2, B1, B2 levels) before relocating to Germany.

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Database**: PostgreSQL (Neon) with Prisma ORM
- **Authentication**: NextAuth.js with role-based access (FOUNDER, MARKETING, TEACHER)
- **Styling**: Tailwind CSS 4 with HeadlessUI components
- **Animations**: Framer Motion (marketing site)
- **Email**: Resend API
- **State**: Zustand + React Query
- **Analytics**: Vercel Analytics + Speed Insights (consent-gated), Meta Pixel + GA4 (optional via env vars)
- **Deployment**: Vercel

## Common Commands

```bash
npm run dev          # Start development server (localhost:3000)
npm run build        # Build for production (runs prisma generate first)
npm run lint         # Run ESLint
npm run db:seed      # Seed database with initial data
npm run backup       # Backup database to JSON
npm run restore      # Restore database from backup
npm run import       # Bulk import data
npx prisma studio    # Open Prisma Studio GUI
npx prisma migrate dev   # Run database migrations
npx prisma db push   # Push schema changes without migration
```

## Project Structure

```
app/
  api/                    # API routes
    auth/                 # NextAuth endpoints
    batches/              # Batch management
    cron/                 # Scheduled tasks (backup, reminders)
    students/             # Student CRUD
    teachers/             # Teacher management
    payments/             # Payment processing
    leads/                # Lead management
      public/             # Unauthenticated lead intake from website
    analytics/
      marketing/          # Marketing analytics with UTM/campaign breakdowns
  site/                   # Public marketing website (planbeta.in/site)
    layout.tsx            # Nav + footer + WhatsApp button + chatbot + cookie consent
    page.tsx              # Homepage (8 section components)
    courses/              # Course catalog
    about/                # About page with timeline
    opportunities/        # Germany opportunities
    blog/                 # Blog listing
    contact/              # Contact form (creates leads via /api/leads/public)
    sitemap.ts            # Dynamic sitemap generation
    robots.ts             # Robots.txt
  dashboard/              # Main dashboard pages (auth required)
    batches/              # Batch management UI
    students/             # Student management UI
    teachers/             # Teacher management UI
    payments/             # Payment tracking
    marketing/            # Marketing dashboard
    content-lab/          # Content ideas from Reddit
    instagram/            # Instagram integration

components/
  marketing/              # Marketing site components
    sections/             # Homepage sections (HeroSection, CTASection, etc.)
    SEOStructuredData.tsx  # JSON-LD structured data (Organization, Course, FAQ, etc.)
    CookieConsent.tsx     # GDPR cookie consent banner
    ConsentAnalytics.tsx  # Consent-gated Vercel Analytics
    TrackingProvider.tsx  # UTM capture + Meta Pixel + GA4 injection
    AIChatbot.tsx         # AI-powered chatbot
    AnimateInView.tsx     # Scroll animation wrapper (framer-motion)
  ui/                     # Shared UI components

lib/
  prisma.ts              # Prisma client instance
  email.ts               # Email templates and sending
  api-permissions.ts     # Role-based API access control
  auth.ts                # NextAuth configuration
  seo.ts                 # SEO utilities (generatePageMetadata, TARGET_KEYWORDS)
  tracking.ts            # Client-side tracking (UTM capture, visitor ID, event tracking)
  marketing-data.ts      # Marketing site content (testimonials, FAQs, stats)
  attribution-tracking.ts # Content → Lead → Enrollment attribution

prisma/
  schema.prisma          # Database schema
  seed.ts                # Database seeding script

scripts/                 # Utility scripts
  backup-database.ts     # Database backup
  restore-database.ts    # Database restore
```

## Key Conventions

### API Routes
- Use `checkPermission()` from `lib/api-permissions.ts` at the start of each **authenticated** route
- Public endpoints (e.g., `/api/leads/public`) skip auth but must include rate limiting
- Return `NextResponse.json()` for all responses
- Handle Next.js 15 async params: `{ params }: { params: Promise<{ id: string }> }`

### Database
- Use `prisma` singleton from `lib/prisma.ts`
- Currency fields default to "EUR", use `currency` field when working with payments
- Always include relevant `@index` decorators for frequently queried fields

### Currency Handling
- Students may pay in EUR or INR
- Store `currency`, `eurEquivalent`, and `exchangeRateUsed` for non-EUR payments
- Outstanding balance calculations must compare same currencies

### User Roles
- **FOUNDER**: Full access to all features
- **MARKETING**: Access to leads, content, marketing dashboard
- **TEACHER**: Access to batches, student attendance, hours logging

### Batch Status Flow
```
PLANNING -> FILLING -> FULL -> RUNNING -> COMPLETED
                   \-> POSTPONED / CANCELLED
```

### Marketing Site (`app/site/`)
- Layout is a `"use client"` component (nav, footer, WhatsApp, chatbot, cookies)
- Pages that need metadata use a `layout.tsx` wrapper (server component) for `generatePageMetadata()`
- All pages use `generatePageMetadata()` from `lib/seo.ts` for consistent OG/Twitter/canonical
- Structured data (JSON-LD) via components in `SEOStructuredData.tsx`
- Contact form POSTs to `/api/leads/public` (unauthenticated) — NOT `/api/leads`
- Cookie consent required before analytics activate (localStorage `pb-cookie-consent`)
- TrackingProvider captures UTM params on page load into sessionStorage `pb-tracking`

### Lead Attribution & Tracking
- `ReferralSource` enum: `META_ADS`, `INSTAGRAM`, `GOOGLE`, `ORGANIC`, `REFERRAL`, `OTHER`
- UTM params map to source: `utm_source=facebook` → `META_ADS`, `utm_source=instagram` → `INSTAGRAM`, etc.
- Lead model has dedicated UTM fields (`utmSource`, `utmMedium`, `utmCampaign`, etc.) + existing `contentInteractions` JSON
- `firstTouchpoint` stores the landing page URL
- `visitorId` is a persistent first-party UUID (localStorage `pb-visitor-id`)
- Event tracking fires to Meta Pixel (`fbq`) and GA4 (`gtag`) when configured + consented

### Email Templates
Add new templates in `lib/email.ts` in the `EMAIL_TEMPLATES` object. Templates include:
- `welcome`, `payment-received`, `payment-reminder`
- `teacher-hours-reminder`, `consecutive-absence-alert`

## Scheduled Tasks

### Vercel Crons (vercel.json)
- Daily backup: 2 AM UTC
- Consecutive absence alerts: 10 PM UTC

### GitHub Actions (.github/workflows/)
- Teacher hours reminder: 6 PM UTC (7 PM CET) weekdays

## Environment Variables

Required in `.env`:
```
DATABASE_URL=           # Neon PostgreSQL connection string
NEXTAUTH_SECRET=        # NextAuth secret key
NEXTAUTH_URL=           # App URL (http://localhost:3000 for dev)
RESEND_API_KEY=         # Resend API key for emails
CRON_SECRET=            # Secret for authenticating cron endpoints
```

Optional (tracking pixels — system works without these):
```
NEXT_PUBLIC_META_PIXEL_ID=        # Meta/Facebook Pixel ID
NEXT_PUBLIC_GA_MEASUREMENT_ID=    # Google Analytics 4 Measurement ID
```

## Database Models Overview

### Core Entities
- **User**: Staff accounts (founders, marketing, teachers)
- **Student**: Enrolled students with payment and attendance tracking
- **Batch**: Class groups (A1, A2, B1, B2) with teacher assignment
- **Lead**: Prospective students before enrollment

### Financial
- **Payment**: Payment records linked to students
- **Receipt**: Generated receipt documents
- **Invoice**: Invoices for leads and students
- **Refund**: Refund tracking

### Operations
- **Attendance**: Daily attendance records per student
- **TeacherHours**: Teacher work hours for payroll
- **Referral**: Student referral program tracking

### Content & Marketing
- **ContentPerformance**: Social media metrics
- **ContentIdea**: Generated content ideas from Reddit
- **RedditPost**: Saved Reddit posts for inspiration

### Tracking (on Lead model)
- UTM fields: `utmSource`, `utmMedium`, `utmCampaign`, `utmContent`, `utmTerm`
- Attribution: `firstTouchpoint`, `referrerUrl`, `landingPage`, `deviceType`, `visitorId`
- Instagram: `instagramHandle`, `sourceReelId`, `sourceReelUrl`, `socialEngagement` (JSON)
- Scoring: `leadScore`, `contentInteractions` (JSON)

## Security

- **Middleware** (`middleware.ts`): Applies CSP, X-Frame-Options, HSTS, Permissions-Policy to all matched routes
- **Matcher**: `/dashboard/:path*`, `/login`, `/site/:path*`, `/privacy`, `/terms`
- **CSP**: Allows `self`, Vercel Analytics/Scripts domains, Meta Pixel + GA4 domains (when configured)
- **next.config.ts**: Global HSTS, X-DNS-Prefetch-Control, X-Content-Type-Options, Referrer-Policy headers

## Important Notes

1. **Time Zones**: Classes run Mon-Fri at 7 AM and 5 PM CET (Central European Time)
2. **Google Meet**: Classes conducted via Google Meet with batch-specific links stored in `Batch.meetLink`
3. **Multi-currency**: Support EUR and INR; always store EUR equivalent for reporting
4. **Teacher Exclusions**: Founders who teach (like Aparna) are excluded from hour reminders via email exclusion list in cron routes
5. **Marketing Site**: Served at `/site` path. The site layout is a client component; use `layout.tsx` wrappers for server-side metadata
6. **Cookie Consent**: All analytics (Vercel, Meta, GA4) are consent-gated. Never load tracking scripts before consent
