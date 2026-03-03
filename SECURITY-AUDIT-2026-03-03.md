# Security Audit Report — Plan Beta Dashboard

**Date:** 2026-03-03
**Tool:** Shannon AI Pentester (static code analysis + partial active recon)
**Target:** Plan Beta Dashboard (Next.js 15 / Prisma / Vercel)
**Cost:** ~$10-15 Anthropic API credits
**Duration:** ~1 hour (pre-recon complete, recon partially completed)

---

## Executive Summary

Shannon ran 6 specialized agents across 480+ turns analyzing the entire codebase. The static analysis phase completed fully, producing 190KB of deliverables. The active exploitation phase (Playwright-based browser testing) had difficulties but the code-level findings are definitive.

**Total findings: 26 vulnerabilities**
- Critical: 5
- High: 5
- Medium: 8
- Low: 4
- Missing Controls: 4 categories

---

## CRITICAL (Fix This Week)

### CRIT-01: Stored XSS via innerHTML in Invoice Generator
- **File:** `lib/invoice-generator.ts:418`
- **Endpoint:** Client-side, called from `/dashboard/payments/[id]`, `/dashboard/students/[id]`
- **Description:** Invoice JPG generator uses `innerHTML` to render HTML with unsanitized database values (`studentName`, `studentAddress`, item descriptions). A stored XSS payload in any of these fields executes in the admin's browser during invoice generation.
- **Sink:** `invoicePreview.innerHTML = \`...${data.studentName}...${data.studentAddress}...\``
- **Data flow:** DB Student record → API fetch → client component state → `generateInvoiceJPG(data)` → innerHTML
- **Test:** Store student name as `<img src=x onerror=alert(document.cookie)>` then generate invoice JPG
- **Impact:** Full XSS in admin browser. Can steal session tokens, modify dashboard data, or pivot to other admin actions.
- **Fix:** HTML-escape all interpolated values before innerHTML, or use DOM APIs (`textContent`).

### CRIT-02: Stored XSS via innerHTML in Receipt Generator
- **File:** `lib/receipt-generator.ts:477`
- **Endpoint:** Client-side, called from `/dashboard/payments/[id]`, `/dashboard/students/[id]`
- **Description:** Receipt JPG generator uses `innerHTML` with unsanitized database values (`studentName`, `studentAddress`, `transactionReference`, `paymentMethod`). Same stored XSS vector as CRIT-01.
- **Sink:** `receiptPreview.innerHTML = \`...${data.studentName}...${data.studentAddress}...\``
- **Fix:** Same as CRIT-01 — escape all interpolated values.

### CRIT-03: SSRF via Job Scraper — Arbitrary URL Fetch
- **File:** `lib/job-scraper.ts:37, 210-232, 244-258`
- **Endpoint:** `POST /api/jobs/sources` (create) → `POST /api/jobs/scrape` (trigger)
- **Auth:** FOUNDER role required
- **Description:** Admin creates job sources with arbitrary URLs stored in DB, then fetched server-side when scraping is triggered. Only `z.string().url()` format validation — no scheme, domain, or IP range restrictions.
- **Exploitation:** Create job source with URL `http://169.254.169.254/latest/meta-data/` (cloud metadata), internal services, or localhost ports.
- **Data flow:** `POST /api/jobs/sources (url)` → DB → `POST /api/jobs/scrape` → `fetchHtml(url)` → `fetch(url)`
- **Fix:** Add URL allowlist (only allow `https://` scheme, block private IP ranges `10.x`, `172.16-31.x`, `192.168.x`, `169.254.x`, `127.x`).

### CRIT-04: Math.random() for Password Generation (Not Cryptographically Secure)
- **File:** `lib/password-utils.ts` — `generateSecurePassword()`
- **Description:** Uses `Math.random()` for character selection instead of `crypto.randomBytes()`. Passwords are predictable.
- **Fix:** Replace with `crypto.randomInt()` or `crypto.randomBytes()` for each character selection.

### CRIT-05: Full Database Backup Sent via Unencrypted Email
- **File:** `app/api/cron/backup/route.ts`
- **Description:** Complete DB dump including **password hashes**, all student PII, payment records sent as gzip email attachment via Resend. Also triggers on every login (`lib/auth.ts:52-79`).
- **Fix:** Use encrypted cloud storage (S3 + server-side encryption), remove password hashes from backup data, stop triggering on login.

---

## HIGH (Fix This Month)

### HIGH-01: Password Reset Tokens Stored Unhashed in Database
- **File:** `lib/password-utils.ts:74`
- **Description:** Reset tokens generated with `crypto.randomBytes(32)` (good) but stored as plaintext in `passwordResetToken` field. If DB is breached, attacker can reset any password.
- **Fix:** Hash tokens with SHA-256 before storing; compare hashed values during verification.

### HIGH-02: HTML Injection in All 12 Email Templates
- **File:** `lib/email.ts:80`
- **Description:** All email templates interpolate database values (`studentName`, `teacherName`, `batchCode`, amounts) into HTML without escaping. Stored XSS payloads in names render in emails.
- **Sink:** `<p>Dear ${data.studentName},</p>...<p><strong>Batch:</strong> ${data.batchCode}</p>`
- **Fix:** Create an `escapeHtml()` utility and apply to all interpolated values in email templates.

### HIGH-03: HTML Injection via Nurse Application Form (PUBLIC, No Auth)
- **File:** `app/api/nurses/apply/route.ts:90`
- **Description:** Publicly accessible form. User-supplied name, email, phone, message interpolated directly into HTML email sent to `hello@planbeta.in` without escaping.
- **Test:** Submit name as `<a href='https://evil.com'>Click here</a>`
- **Fix:** HTML-escape all form values before email template interpolation.

### HIGH-04: SSRF via Web Push Subscription Endpoint (PUBLIC, No Auth)
- **File:** `lib/web-push.ts:40-51`
- **Endpoint:** `POST /api/notifications/push/subscribe` (public, rate-limited)
- **Description:** Unauthenticated users register push subscriptions with arbitrary endpoint URLs. When admin sends broadcast push, server POSTs to all endpoints including attacker's. Blind SSRF.
- **Fix:** Validate push subscription endpoints against allowlist of known push service domains (`fcm.googleapis.com`, `updates.push.services.mozilla.com`, `*.notify.windows.com`).

### HIGH-05: IDOR — Teacher Can Read Any Student by ID
- **File:** `app/api/students/[id]/route.ts`
- **Description:** GET handler uses `checkPermission("students", "read")` but no ownership check. Teachers can read ANY student's full record (including financial data) by guessing CUIDs. The PUT route correctly checks batch ownership, but GET does not.
- **Fix:** Add teacher-batch ownership check to GET handler (same pattern as PUT handler lines 86-109).

---

## MEDIUM

### MED-01: Open Redirect via UTM Link Destinations
- **File:** `app/go/[slug]/route.ts:42`
- **Endpoint:** `GET /go/[slug]` (public)
- **Description:** Redirects to database-stored destination URLs. Any URL starting with `http` used as redirect target. Admin creates links, but public users follow them.
- **Sink:** `if (link.destination.startsWith('http')) { return NextResponse.redirect(link.destination, 302) }`
- **Fix:** Validate destination against domain allowlist, or restrict to same-domain paths.

### MED-02: WhatsApp Webhook Signature Bypass (Conditional)
- **File:** `app/api/whatsapp/webhook/route.ts:31-42`
- **Description:** If `WHATSAPP_APP_SECRET` env var is not set, HMAC signature verification is completely skipped. Any external party can send fabricated webhook events.
- **Fix:** Return 503 (Service Unavailable) if `WHATSAPP_APP_SECRET` is not configured instead of silently skipping verification.

### MED-03: Reddit API Path Injection via Subreddit Name
- **File:** `lib/reddit-api.ts:44, 124, 144, 189`
- **Description:** Subreddit name from user input injected directly into URL path. Only `r/` prefix stripping and `trim()` — no character validation. Could traverse Reddit API paths.
- **Fix:** Validate subreddit name with regex: `/^[a-zA-Z0-9_]{1,21}$/`

### MED-04: Timing-Unsafe Razorpay Signature Verification
- **File:** `lib/razorpay.ts:111`
- **Description:** `return expectedSignature === params.signature` — uses string equality instead of `crypto.timingSafeEqual()`.
- **Fix:** Use `crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual))`.

### MED-05: Timing-Unsafe CRON_SECRET Comparison
- **Files:** All cron routes (`app/api/cron/*/route.ts`)
- **Description:** `authHeader !== \`Bearer ${process.env.CRON_SECRET}\`` — direct string comparison.
- **Fix:** Use `crypto.timingSafeEqual()` for all secret comparisons.

### MED-06: No Rate Limiting on `/api/leads/public`
- **File:** `app/api/leads/public/route.ts`
- **Description:** Public endpoint with Zod validation but no rate limiter. Allows spam lead creation.
- **Fix:** Add `MODERATE` rate limiting (30 req/min).

### MED-07: Prompt Injection in Student Parse (No Sanitization)
- **File:** `app/api/students/parse/route.ts:30`
- **Description:** User text directly interpolated into Gemini prompt without sanitization (unlike `leads/parse` which has length limiting and control char stripping).
- **Fix:** Apply same sanitization as leads/parse: 5000 char limit, control character stripping.

### MED-08: Arbeitnow API URL Passthrough in Job Scraper
- **File:** `lib/job-scraper.ts:32-37`
- **Description:** If job source URL contains `/api/` substring, it's used as-is instead of hardcoded Arbeitnow API URL. Subset of CRIT-03 (SSRF).
- **Fix:** Fixed by CRIT-03 URL allowlist fix.

---

## LOW

### LOW-01: Error Messages May Leak Internal Details
- **Files:** `app/api/leads/route.ts:184`, `app/api/students/route.ts:347`
- **Description:** Prisma error details sometimes returned to clients: `{ error: "Failed to create lead", details: error.message }`
- **Fix:** Return generic error messages in production; log details server-side only.

### LOW-02: Razorpay Webhook Signature Not Timing-Safe
- **File:** `app/api/payments/razorpay/webhook/route.ts`
- **Description:** Same as MED-04 but for webhook signatures.
- **Fix:** Same — use `timingSafeEqual()`.

### LOW-03: Audit Log Stores IP Addresses Indefinitely
- **File:** `lib/audit.ts:73-83`, `prisma/schema.prisma:497-498`
- **Description:** IP addresses and user agents stored indefinitely. Under GDPR, IP addresses are personal data.
- **Fix:** Add retention policy (auto-delete after 90 days) or anonymize IPs after 30 days.

### LOW-04: Sentry Session Replay Captures Screen Content
- **File:** `sentry.client.config.ts`
- **Description:** `maskAllText: false, blockAllMedia: false` — Session Replay captures all visible text including PII.
- **Fix:** Set `maskAllText: true` to redact sensitive content in replays.

---

## Missing Security Controls

### Authentication
| Control | Status |
|---------|--------|
| Multi-Factor Authentication (MFA/2FA) | NOT IMPLEMENTED |
| Account lockout after failed logins | NOT IMPLEMENTED |
| Login attempt audit logging | ENUM EXISTS (`AuditAction.LOGIN`) but never used |
| CAPTCHA on login/public forms | NOT IMPLEMENTED |
| OAuth/SSO | NOT IMPLEMENTED |

### Session Management
| Control | Status |
|---------|--------|
| Session timeout/idle timeout | NOT CONFIGURED (30-day JWT default) |
| Session revocation (force logout) | NOT POSSIBLE (JWT-only, no server-side sessions) |
| Concurrent session limits | NOT IMPLEMENTED |

### Data Protection
| Control | Status |
|---------|--------|
| Field-level encryption for PII | NOT IMPLEMENTED (all PII in plaintext) |
| Data retention policies | NOT IMPLEMENTED (all data stored indefinitely) |
| GDPR data export (Art. 15/20) | NOT IMPLEMENTED |
| GDPR data deletion (Art. 17) | NOT IMPLEMENTED (only admin hard-delete) |
| Backup encryption | NOT IMPLEMENTED (gzip only, not encrypted) |

### Infrastructure
| Control | Status |
|---------|--------|
| Distributed rate limiting (Redis) | NOT IMPLEMENTED (in-memory, ineffective on serverless) |
| CORS policy | NOT CONFIGURED (relies on Next.js defaults) |
| IP blocking/allowlisting | NOT IMPLEMENTED |
| Secrets rotation policy | NO EVIDENCE of rotation |
| CSP report-uri for violation monitoring | NOT CONFIGURED |

---

## Encryption & Hashing Assessment

### Password Hashing
| Location | Algorithm | Cost | Assessment |
|----------|-----------|------|------------|
| `lib/auth.ts:45` | bcryptjs `compare()` | N/A | OK |
| `app/api/auth/reset-password/route.ts:90` | bcryptjs `hash()` | 10 | ACCEPTABLE (12 preferred) |
| `prisma/seed.ts:8` | bcryptjs `hash()` | 12 | GOOD |

### Token Generation
| Token | Method | Quality |
|-------|--------|---------|
| Password Reset | `crypto.randomBytes(32).toString('hex')` | GOOD (256 bits) |
| Welcome Token | `crypto.randomBytes(48).toString('hex')` | GOOD (384 bits) |
| Temp Password | `crypto.randomBytes(32).toString('hex')` | GOOD |
| Generated Password | `Math.random()` | **INSECURE** |
| Visitor ID | `crypto.randomUUID()` | OK (for tracking) |

### HMAC Verification
| Use Case | Algorithm | Timing-Safe? |
|----------|-----------|-------------|
| Razorpay Payment Verify | HMAC-SHA256 | **No** (`===`) |
| Razorpay Webhook | HMAC-SHA256 | **No** (`===`) |
| WhatsApp Webhook | HMAC-SHA256 | **No** (`===`) |
| n8n API Key | `timingSafeEqual` | **Yes** |
| CRON_SECRET (all crons) | Direct comparison | **No** (`!==`) |

---

## Public (Unauthenticated) Endpoints

| Route | Method | Rate Limit | Notes |
|-------|--------|------------|-------|
| `/api/leads/public` | POST | **None** | Zod validation only |
| `/api/referrals/public` | POST | None | 5-min duplicate check |
| `/api/batches/public` | GET | LENIENT | OK |
| `/api/payments/razorpay` | POST | STRICT | Zod validation |
| `/api/payments/razorpay/verify` | POST | None | Signature verify |
| `/api/payments/razorpay/webhook` | POST | None | HMAC verify |
| `/api/whatsapp/webhook` | GET/POST | None | Token/HMAC (conditional) |
| `/api/notifications/push/subscribe` | POST | MODERATE | SSRF risk |
| `/api/analytics/pageview` | POST | **None** | Fire-and-forget |
| `/api/warmup` | GET | **None** | No protection |
| `/api/jobs` | GET | **None** | No protection |
| `/api/pathway/check` | POST | Custom (5/10min) | OK |
| `/api/nurses/apply` | POST | **None** | File upload, HTML injection |
| `/api/auth/forgot-password` | POST | STRICT | OK |
| `/api/auth/reset-password` | POST | STRICT | OK |
| `/api/auth/welcome-login` | POST | **None** | Token-based |

---

## Recommended Fix Priority

### Immediate (P0 — This Week)
1. Replace `Math.random()` with `crypto.randomInt()` in `generateSecurePassword()`
2. HTML-escape all values in `invoice-generator.ts` and `receipt-generator.ts` innerHTML
3. HTML-escape all values in `lib/email.ts` email templates
4. HTML-escape nurse application form values in `app/api/nurses/apply/route.ts`
5. Stop emailing full database backups — use encrypted cloud storage
6. Hash password reset tokens before DB storage

### Short-Term (P1 — This Month)
7. Add URL allowlist to job scraper (block private IPs, allow only HTTPS)
8. Validate push subscription endpoints against known push service domains
9. Add IDOR ownership check to `GET /api/students/[id]` for TEACHER role
10. Use `timingSafeEqual()` for all CRON_SECRET and Razorpay signature comparisons
11. Add rate limiting to `/api/leads/public`, `/api/nurses/apply`, `/api/jobs`, `/api/warmup`
12. Validate UTM link destinations against domain allowlist
13. Add subreddit name regex validation
14. Add sanitization to `/api/students/parse` (same as leads/parse)
15. Return 503 when WhatsApp webhook secret is not configured
16. Increase bcrypt cost factor from 10 to 12

### Medium-Term (P2 — This Quarter)
17. Implement data retention policies with automated cleanup
18. Add field-level encryption for high-sensitivity PII
19. Implement GDPR data export and deletion endpoints
20. Move to Redis-based distributed rate limiting
21. Enable Sentry Session Replay text masking (`maskAllText: true`)
22. Add generic error messages in production (no Prisma details)
23. Add login attempt audit logging
24. Add account lockout after failed attempts
25. Implement session blacklisting for immediate logout capability

---

## Data Flow Diagram

```
                                    EXTERNAL SERVICES
                                    +-------------------+
                                    | Meta CAPI (US)    |<-- SHA-256 hashed PII
                                    | Sentry (US)       |<-- Screen replays (PII visible)
                                    | Resend (US)       |<-- Email addresses + content
                                    | WhatsApp/Meta(US) |<-- Phone numbers + messages
                                    | Razorpay (IN)     |<-- Customer PII + payment data
                                    | Google Analytics   |<-- Measurement ID only
                                    | n8n (self-hosted?) |<-- Full student + teacher PII
                                    +-------------------+

    BROWSER                              SERVER                           DATABASE
    +----------+    HTTPS/TLS     +------------------+    SSL/TLS    +-------------------+
    |          |<---------------->| Next.js App      |<------------>| Neon PostgreSQL    |
    | Dashboard|   JWT Cookie     | (Vercel)         |  Prisma ORM  |                   |
    | (React)  |                  |                  |              | - Users (hashed   |
    |          |                  | - Auth (bcrypt)  |              |   passwords)      |
    |          |                  | - RBAC           |              | - Students (PII)  |
    |          |                  | - Rate Limiting  |              | - Leads (PII)     |
    |          |                  | - Audit Logging  |              | - Payments        |
    |          |                  | - Zod Validation |              | - WhatsApp logs   |
    +----------+                  +------------------+              +-------------------+
                                         |
                                         | Backup email (CRITICAL)
                                         v
                                  +-------------------+
                                  | Email Inbox       |
                                  | (Full DB dump as  |
                                  |  gzip attachment) |
                                  +-------------------+
```

---

## Positive Security Controls (What's Done Well)

1. **RBAC System** — Well-structured role-based permissions (`lib/permissions.ts`, `lib/api-permissions.ts`)
2. **Zod Validation** — Input validation on most API routes using Zod schemas
3. **bcrypt Password Hashing** — Passwords properly hashed before storage
4. **Security Headers** — CSP, HSTS, X-Frame-Options, X-Content-Type-Options all configured
5. **Audit Logging** — Comprehensive audit trail with sanitized metadata
6. **Rate Limiting** — Applied to auth and payment endpoints
7. **Meta CAPI PII Hashing** — SHA-256 hashing of PII before sending to Meta
8. **Anti-Enumeration** — Forgot-password returns generic message regardless of email existence
9. **Prisma ORM** — Parameterized queries prevent SQL injection (only 3 raw queries found, all `SELECT 1`)
10. **Timing-Safe n8n Auth** — `crypto.timingSafeEqual()` used for n8n API key verification
11. **Webhook Signatures** — Razorpay and WhatsApp webhooks have HMAC verification (even if not timing-safe)

---

## Appendix: Shannon Audit Metadata

- **Workflow ID:** `planbeta-audit-4_shannon-1772572087902`
- **Pre-recon phase:** 480 turns, 6 agents (Architecture Scanner, Entry Point Mapper, Security Pattern Hunter, XSS/Injection Sink Hunter, SSRF/External Request Tracer, Data Security Auditor) — all completed
- **Recon phase:** 3 attempts, partially completed (output validation errors due to large deliverable files)
- **Deliverables generated:** `recon.md`, `code_analysis_deliverable.md`, `xss_analysis_deliverable.md`, `xss_exploitation_queue.json`, `ssrf_analysis_deliverable.md`, `ssrf_exploitation_queue.json`
- **Raw logs:** `/tmp/shannon/audit-logs/planbeta-audit-4/`

---

*Report generated from Shannon AI Pentester static code analysis. Active exploitation testing was partially completed. All findings are based on source code review — no destructive actions were performed against the application.*
