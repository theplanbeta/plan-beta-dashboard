# PlanBeta Jobs PWA — Phase 5: Billing & Monetization

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Ship revenue. Add Stripe (EU) + Razorpay (India) subscriptions, free tier gating (CV limit / AI deep score limit), student bundling, and a settings page for billing management.

**Architecture:** Two payment providers, one JobSeeker table. Geo-detect on checkout; store `billingProvider`, `subscriptionStatus`, `tier`, `currentPeriodEnd` on JobSeeker. Free tier gates enforced at API layer (already partially done in CV generate route). Student bundling via `planBetaStudentId` field that auto-grants premium.

**Tech Stack:** Stripe SDK (already installed), Razorpay SDK (`lib/razorpay.ts` already exists), JobSeeker model, Die Bewerbungsmappe design system.

**Depends on:** Phases 1-4 complete on `feat/planbeta-jobs-pwa` branch.

---

## Tasks

### Task 1: Checkout API routes (Stripe + Razorpay)

**Files:**
- Create: `app/api/jobs-app/subscribe/checkout/route.ts`
- Create: `app/api/jobs-app/subscribe/razorpay/route.ts`
- Create: `app/api/jobs-app/subscribe/status/route.ts`

Stripe checkout route: accepts `{ plan: "monthly" | "annual" }`, creates Stripe Checkout session with the appropriate Price ID, returns URL. User is inferred from auth.

Razorpay route: creates an order via existing `createOrder()` in `lib/razorpay.ts`, returns the order details for the client to call Razorpay Checkout.

Status route: GET, returns `{ tier, subscriptionStatus, currentPeriodEnd, billingProvider }` for the authenticated seeker.

Env vars needed (use placeholders if not set, graceful fallback):
- `STRIPE_PREMIUM_PRICE_MONTHLY_EU` — Price ID for EUR 4.99/mo
- `STRIPE_PREMIUM_PRICE_ANNUAL_EU` — Price ID for EUR 49.99/yr
- Razorpay uses existing env vars

---

### Task 2: Webhook handlers

**Files:**
- Create: `app/api/jobs-app/webhooks/stripe/route.ts`
- Create: `app/api/jobs-app/webhooks/razorpay/route.ts`

**Stripe webhook:** verify signature with `STRIPE_WEBHOOK_SECRET`. Handle events:
- `checkout.session.completed` → upsert JobSeeker with `tier: PREMIUM`, `subscriptionStatus: "active"`, `billingProvider: "stripe"`, `stripeCustomerId`, `subscriptionId`, `currentPeriodEnd`
- `customer.subscription.updated` → update `currentPeriodEnd` + `subscriptionStatus`
- `customer.subscription.deleted` → set `subscriptionStatus: "canceled"`
- `invoice.payment_failed` → set `subscriptionStatus: "past_due"`

**Razorpay webhook:** verify HMAC signature via existing `verifyWebhookSignature()`. Handle:
- `subscription.activated` → set premium
- `subscription.charged` → extend currentPeriodEnd
- `subscription.cancelled` → downgrade

---

### Task 3: Free tier gating (harden existing limits)

**Files:**
- Modify: `app/api/jobs-app/cv/generate/route.ts` (already has 5/month premium limit — add free-tier = 0 block)
- Modify: `app/api/jobs-app/anschreiben/generate/route.ts` (same)
- Modify: `app/api/jobs-app/jobs/[slug]/route.ts` (only premium gets AI deep score — already correct)

CV routes already check `isPremium(seeker)` — verify this still works after billing updates JobSeeker fields.

Add to `lib/jobs-app-auth.ts` helper: `canGenerateCV(seeker): { allowed, remaining, reason }` that counts this month's CVs and returns a structured decision.

---

### Task 4: Student linking API

**Files:**
- Create: `app/api/jobs-app/student/link/route.ts`

POST route: accepts `{ email }` or `{ studentId }`, looks up the existing `Student` model by those fields, if found sets `JobSeeker.planBetaStudentId`. `isPremium()` already returns true when `planBetaStudentId` is set → student gets bundled premium.

Security: only link if the logged-in seeker's email matches the Student's email (prevent hijacking).

---

### Task 5: Settings / Billing page (skeuomorphic)

**Files:**
- Create: `app/jobs-app/settings/page.tsx`
- Create: `components/jobs-app/BillingCard.tsx`

"My Folder · Settings" page with sections:

**Subscription card** (uses .amtlich-card):
- Shows current `tier` as rubber stamp (Free = INK, Premium = GREEN, Student = TEAL)
- Shows `currentPeriodEnd` if applicable, formatted en-IN
- If free: two `.amtlich-btn--primary` CTAs — "Subscribe monthly" / "Subscribe annually" with pricing (auto-detect region: EUR or INR)
- If premium: "Manage subscription" button (opens Stripe customer portal or Razorpay portal)
- "Cancel subscription" destructive link

**Student link card** (.amtlich-card):
- "Are you a Plan Beta student?" prompt
- Input for student email, POST to `/api/jobs-app/student/link`
- On success: green stamp "Verified · Premium bundled"

**Account card:**
- Email, name, logout button

---

### Task 6: Update AuthProvider + isPremium

**Files:**
- Modify: `components/jobs-app/AuthProvider.tsx`

The provider currently fetches `/api/jobs-app/profile`. Update to also read `subscriptionStatus` and `currentPeriodEnd` from the response so `isPremium` is accurate after webhook updates. The server-side `isPremium()` helper in `lib/jobs-app-auth.ts` is the source of truth.

---

### Task 7: Settings link in BottomNav or Profile

Add a way to reach `/jobs-app/settings`. The `Profile` tab in BottomNav goes to `/jobs-app/profile` — simplest path is to create a Profile page that links to Settings, or just route Profile to Settings for v1.

**Decision:** Make the `Profile` tab route to `/jobs-app/settings` directly for v1. Rename the tab label to "Account" in BottomNav.

---

### Task 8: Type check + commit + push
