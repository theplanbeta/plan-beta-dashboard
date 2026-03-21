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
npx prisma studio    # Open Prisma Studio GUI
npx prisma db push   # Push schema changes (NOT migrate dev — history is out of sync)
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
Add new templates in `lib/email.ts` in the `EMAIL_TEMPLATES` object.

## Security

- **Middleware** (`middleware.ts`): Applies CSP, X-Frame-Options, Permissions-Policy to all matched routes
- **CSP**: Allows `self`, Vercel Analytics/Scripts domains, Meta Pixel + GA4 domains (when configured)
- **next.config.ts**: Global HSTS, X-DNS-Prefetch-Control, X-Content-Type-Options, Referrer-Policy headers
- `unsafe-eval` is required by Next.js at runtime — do NOT remove it

## Coding Gotchas

1. **Multi-currency**: Always store EUR equivalent for reporting. Use `lib/pricing.ts` and `lib/currency.ts`.
2. **Marketing Site metadata**: Site layout is `"use client"` — use a `layout.tsx` server wrapper for `generatePageMetadata()`.
3. **Cookie Consent**: All analytics (Vercel, Meta, GA4) are consent-gated. Never load tracking scripts before consent.
4. **Teacher Hours**: 30-day past logging limit. Bulk approve/reject via `/api/teacher-hours/bulk-approve`. Costs auto-feed into Insights P&L.
5. **Charts**: All chart components (`components/charts/`) limit decimal display to 2 places. API responses for financial data should be rounded before returning.
6. **Notification Bell**: Dropdown uses fixed positioning on mobile (full-width below header) and `left-0` on desktop to avoid sidebar clipping.
7. **Job scraper**: `maxDuration = 300` on cron route. Kimi Claw sources are push-only (skipped by scraper). Location filter uses haversine against `lib/german-cities.ts`.
8. **Instagram embeds**: Use static thumbnails (`InstagramEmbed.tsx`), NOT iframes or embed.js. Thumbnails in `public/instagram/`.
9. **Blog content**: Uses `.blog-content` CSS class in `globals.css` for dark-theme rendering. No Tailwind Typography plugin.
