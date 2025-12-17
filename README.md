# Plan Beta Dashboard - German Language School Management System

A **production-ready** comprehensive school management and growth platform built with Next.js 15, TypeScript, Prisma, and NextAuth featuring AI-powered outreach, community building, content management, and complete automation.

![Version](https://img.shields.io/badge/version-4.0-blue)
![Status](https://img.shields.io/badge/status-production--ready-green)
![AI](https://img.shields.io/badge/AI-powered-purple)

---

## 🌟 Key Features

### 🤖 AI-Powered Outreach & Retention
- **Journey-Based Outreach**: Automated student lifecycle management
- **AI Call Preparation**: Context-aware talking points and conversation history
- **Smart Scheduling**: 4 daily calls prioritized by student journey phase
- **Community Connections**: AI-suggested peer matching for retention

### 📱 Social Media & Lead Generation
- **Instagram Integration**: Auto-capture leads from comments and DMs
- **Content Lab**: Reddit scraping for content ideas
- **Content Wall**: Student-generated success stories and testimonials
- **AI Lead Scoring**: Multi-factor lead quality assessment

### 💼 Business Operations
- **Teacher Payroll**: Automated hourly tracking and bulk payments
- **Offer Letters**: Professional PDF generation for teachers
- **Custom Invoices**: Template-based invoice system
- **Analytics Dashboard**: Real-time insights and KPIs

### 🎓 Student Management
- **Demographics Tracking**: City, profession, age for targeted outreach
- **Germany Relocation**: Track visa status, timeline, and support needs
- **Attendance Alerts**: Automated intervention system
- **Payment Reminders**: Smart dunning workflows

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database (Neon recommended)
- npm or yarn
- Resend account for email functionality

### Setup Instructions

1. **Clone and install:**
```bash
git clone https://github.com/theplanbeta/plan-beta-dashboard.git
cd plan-beta-dashboard
npm install
```

2. **Set up environment variables:**

Create a `.env` file in the root directory with all required variables (see Environment Variables section below)

3. **Set up the database:**
```bash
# Push schema to database
npx prisma db push

# Generate Prisma Client
npx prisma generate

# Seed the database with default users
npm run db:seed
```

4. **Start the development server:**
```bash
npm run dev
```

5. **Login credentials:**

Open [http://localhost:3000](http://localhost:3000)

| Role | Email | Password |
|------|-------|----------|
| **Founder** (Full Access) | admin@planbeta.in | admin123 |
| **Marketing** | marketing@planbeta.in | marketing123 |
| **Teacher** | teacher@planbeta.in | teacher123 |

---

## 🔑 Environment Variables

### Required Variables

```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"

# Email (Resend)
RESEND_API_KEY="re_..."
EMAIL_FROM="noreply@yourdomain.com"
SUPPORT_EMAIL="hello@yourdomain.com"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
UPI_ID="yourUPI@bank"

# Cron Job Security
CRON_SECRET="your-cron-secret-here"

# AI Features (Gemini)
GEMINI_API_KEY="AIza..."

# Instagram Graph API
INSTAGRAM_APP_ID="your-app-id"
INSTAGRAM_APP_SECRET="your-app-secret"
INSTAGRAM_ACCESS_TOKEN="your-access-token"
INSTAGRAM_PAGE_ACCESS_TOKEN="your-page-token"
INSTAGRAM_BUSINESS_ACCOUNT_ID="your-account-id"
INSTAGRAM_WEBHOOK_VERIFY_TOKEN="your-verify-token"

# Tasker Webhook (for Instagram automation)
TASKER_WEBHOOK_SECRET="your-tasker-secret"

# WhatsApp Business Cloud API (Meta)
WHATSAPP_ACCESS_TOKEN="your-whatsapp-token"
WHATSAPP_PHONE_NUMBER_ID="your-phone-id"
WHATSAPP_BUSINESS_ACCOUNT_ID="your-account-id"
WHATSAPP_VERIFY_TOKEN="your-verify-token"

# WhatsApp Message Templates
WHATSAPP_TEMPLATE_TIER1="tier1_absence_alert"
WHATSAPP_TEMPLATE_TIER2="tier2_high_risk_alert"
WHATSAPP_TEMPLATE_TIER3="tier3_urgent_retention"

# n8n Integration
N8N_API_KEY="your-n8n-api-key"
N8N_WEBHOOK_URL="http://localhost:5678/webhook"
```

---

## 🤖 AI-Powered Founder Outreach System

### Overview
Revolutionary student retention system using AI and journey-based scheduling. Automatically schedules and prepares personalized outreach calls based on student lifecycle stage.

### Journey Phases

**WELCOME** (Days 1-7)
- Calls on day 2-3 and day 7
- Focus: Onboarding, first impressions, setting expectations

**SETTLING_IN** (Days 8-21)
- Calls on day 14 and day 21
- Focus: Integration, early challenges, routine building

**ACTIVE_LEARNING** (Days 22+)
- Every 14 days
- Focus: Progress tracking, motivation, consistency

**PRE_COMPLETION** (5-7 days before course end)
- Every 2 days (urgent)
- Focus: Upsell opportunities, next level planning

**POST_COURSE**
- Every 35 days
- Focus: Alumni engagement, testimonials, referrals

### Features

**AI Call Preparation** 🤖
- Fetch previous call history with full context
- Generate personalized talking points based on:
  - Journey phase
  - Goals and challenges from previous calls
  - Wins and achievements
  - Personal notes and preferences
- AI references previous conversations: "Last time you mentioned..."

**Smart Scheduling** 📅
- Max 4 calls per day for quality over quantity
- December 2025+ students only (configurable)
- Priority: PRE_COMPLETION > WELCOME > SETTLING_IN > ACTIVE_LEARNING > POST_COURSE
- Automatic next-call calculation

**Call Tracking**
- Status: PENDING, COMPLETED, SNOOZED, SKIPPED
- Sentiment tracking: POSITIVE, NEUTRAL, NEGATIVE, VERY_NEGATIVE
- Journey updates: goals, challenges, wins, personal notes
- Full conversation history preserved

### API Endpoints

```bash
GET  /api/outreach/scheduled      # Get scheduled calls for a date
POST /api/outreach/complete       # Mark call as complete with journey data
POST /api/outreach/snooze         # Snooze a call
GET  /api/outreach/calls          # Get prioritized calls (today/week/all)
GET  /api/outreach/stats          # Get outreach statistics
GET  /api/outreach/[id]           # Get call details with AI preparation
```

### Dashboard Pages

- `/dashboard/outreach` - Main outreach dashboard with scheduled calls
- `/dashboard/outreach/community` - Student connection suggestions

### Usage

```typescript
// Schedule daily calls (run via cron or manually)
import { scheduleDailyCalls } from '@/lib/outreach-scheduler'

const calls = await scheduleDailyCalls(new Date(), 4) // 4 calls max
```

---

## 👥 Community Features

### Student Connections
AI-powered peer matching system to build community and improve retention.

**Matching Criteria:**
- Same or adjacent learning levels
- Similar attendance patterns
- Same enrollment cohort (within 30 days)
- Common referral source
- Cross-batch connections for diversity

**Scoring System:**
- Same level: +10 points
- Similar attendance (within 10%): +5 points
- Same enrollment month: +8 points
- Same referral source: +3 points
- Different timing (morning vs evening): +4 points

**API:**
```bash
GET /api/outreach/connections/suggest?studentId=xxx&limit=5
POST /api/outreach/connections/create
```

---

## 📱 Instagram Lead Generation

### Features
- **Comment Monitoring**: Auto-capture leads from Instagram comments
- **DM Integration**: Track and respond to direct messages
- **Intent Detection**: AI-powered lead quality assessment
- **Auto-Labeling**: Organize leads by priority
- **Webhook Integration**: Real-time updates from Instagram

### Setup

1. **Facebook App Configuration**
   - Create Facebook app at developers.facebook.com
   - Add Instagram Graph API product
   - Configure webhooks for comments and messages

2. **Environment Variables**
   - Set Instagram credentials in `.env`
   - Configure webhook verify token

3. **Webhook Endpoint**
   ```
   POST /api/webhooks/instagram
   ```

4. **Tasker Integration** (optional)
   - Automated screenshot capture
   - Manual lead import from mobile
   ```
   POST /api/webhooks/tasker-instagram
   ```

### API Endpoints

```bash
GET  /api/instagram/comments          # Fetch recent comments
GET  /api/instagram/messages          # Fetch DMs
POST /api/instagram/sync              # Manual sync
POST /api/instagram/fetch-labeled-leads # Get labeled leads
```

---

## 📝 Content Lab & Reddit Integration

### Content Lab
AI-powered content idea generation from Reddit discussions.

**Features:**
- Reddit post scraping from German language subreddits
- AI analysis for content relevance
- Save ideas for future content
- Track performance of published content

**Subreddits Monitored:**
- r/German
- r/German_Lernen
- r/Germany (filtered for language topics)

### API Endpoints

```bash
GET  /api/reddit/fetch         # Fetch recent posts
POST /api/reddit/analyze       # AI analysis of post
GET  /api/content-ideas        # Get saved ideas
POST /api/subreddits           # Manage tracked subreddits
```

### Content Performance Tracking

```bash
POST /api/content              # Create content entry
GET  /api/content-performance  # View metrics
```

---

## 🎨 Content Wall

Student-generated content platform for testimonials and success stories.

### Features
- **Post Types**: SUCCESS_STORY, TIP, QUESTION, ACHIEVEMENT, MILESTONE
- **Reactions**: Like, comment system
- **Moderation**: Draft/published status
- **Featured Content**: Highlight best posts
- **Level-Based Filtering**: View content by learning level

### API Endpoints

```bash
GET    /api/content-wall           # Get published posts
POST   /api/content-wall           # Create post
GET    /api/content-wall/[id]      # Get post details
PUT    /api/content-wall/[id]      # Update post
POST   /api/content-wall/[id]/like # Like a post
POST   /api/content-wall/[id]/comment # Comment on post
```

### Dashboard
```
/dashboard/content-wall  # Browse and manage content
```

---

## 💼 Teacher Management

### Offer Letters
Professional PDF offer letter generation for teacher onboarding.

**Features:**
- Template-based generation
- Customizable terms and conditions
- Multiple status tracking: DRAFT, SENT, ACCEPTED, REJECTED
- Email delivery integration

**API:**
```bash
GET  /api/offers                    # List all offers
POST /api/offers                    # Create offer
GET  /api/offers/[id]               # Get offer details
POST /api/offers/[id]/generate      # Generate PDF
POST /api/offers/[id]/send-email    # Email to teacher
```

### Teacher Payroll

**Hourly Tracking:**
- Automatic or manual hour logging
- Rate per hour configuration (supports multiple currencies)
- Status: PENDING, APPROVED, PAID
- Bulk payment confirmation

**Features:**
- Monthly payroll summary
- Per-teacher reports
- Batch-based hour tracking
- Payment history

**API:**
```bash
GET  /api/teacher-hours              # List hours
POST /api/teacher-hours              # Log hours
GET  /api/teacher-hours/summary      # Monthly summary
GET  /api/teacher-hours/monthly-payroll # Payroll report
POST /api/teacher-hours/bulk-mark-paid  # Bulk payments
```

**Dashboard:**
```
/dashboard/teacher-hours  # Full payroll management
```

---

## 📊 Analytics & Insights

### Admin Dashboard
Real-time KPIs and business metrics at `/dashboard/insights`

**Metrics Tracked:**
- Revenue breakdown (monthly, by level, by batch)
- Student acquisition and retention
- Payment collection rates
- Teacher performance
- Attendance patterns
- Churn risk analysis

**Currency Support:**
- Multi-currency handling (EUR, INR, USD)
- Accurate conversion and reporting
- Currency-aware charts

### API Endpoints

```bash
GET /api/analytics/dashboard    # Overview metrics
GET /api/analytics/insights     # Detailed insights
GET /api/analytics/marketing    # Marketing metrics
```

---

## 📧 Email System - FULLY OPERATIONAL

### Active Email Features

**1. Student Welcome Emails** 🎉
- Trigger: New student enrollment
- Includes: Student ID, level, batch info, portal link

**2. Payment Confirmation** ✅
- Trigger: Payment marked as COMPLETED
- Includes: Amount, method, transaction ID, balance

**3. Payment Reminders** 💰
- Trigger: Automated cron for OVERDUE students
- Includes: Outstanding balance, payment options

**4. Attendance Alerts** ⚠️
- Trigger: Students <50% attendance
- Includes: Current rate, classes attended/total

**5. Consecutive Absence Alerts** 🚨
- Trigger: 2+ consecutive absences
- Recipients: Teachers (all), Admins (high-risk only)
- Risk levels: 2 absences = MEDIUM, 3+ = HIGH

**6. Month Completion** 🎊
- Trigger: 30+ days, ≥50% attendance
- Includes: Progress stats, referral payout notification

**7. Batch Start Notifications** 🚀
- Trigger: Batch status → RUNNING
- Includes: Schedule, instructor, start date

**8. Referral Payouts** 💸
- Trigger: Payout status → PAID
- Includes: Amount, referee name, payment date

**9. Database Backups** 💾
- Trigger: Manual or daily automated (2 AM UTC)
- Format: Gzip-compressed JSON
- Sent to: hello@planbeta.in

### Email Preferences
Students control notifications via database flags:
```typescript
emailNotifications: true  // Master toggle
emailWelcome: true        // Welcome emails
emailPayment: true        // Payment emails
emailAttendance: true     // Attendance alerts
emailBatch: true          // Batch notifications
emailReferral: true       // Referral payouts
```

---

## 📡 Complete API Reference

### Students
```bash
GET    /api/students              # List students (with filters)
POST   /api/students              # Create student (sends welcome email)
GET    /api/students/[id]         # Get details
PUT    /api/students/[id]         # Update student
DELETE /api/students/[id]         # Delete student
POST   /api/students/[id]/suspend # Suspend student
POST   /api/students/[id]/reactivate # Reactivate
POST   /api/students/[id]/acknowledge-churn # Acknowledge churn risk
GET    /api/students/[id]/interactions # Interaction history
POST   /api/students/[id]/interactions # Log interaction
GET    /api/students/[id]/refunds # Refund history
GET    /api/students/[id]/reviews # Teacher reviews
POST   /api/students/parse        # AI parse from text
```

### Leads
```bash
GET    /api/leads              # List leads
POST   /api/leads              # Create lead
POST   /api/leads/quick        # Quick lead (mobile)
POST   /api/leads/parse        # Smart Paste AI parsing
GET    /api/leads/[id]         # Get details
PUT    /api/leads/[id]         # Update lead
DELETE /api/leads/[id]         # Delete lead
POST   /api/leads/[id]/convert # Convert to student
POST   /api/leads/[id]/invoice # Generate invoice
```

### Payments & Invoices
```bash
GET    /api/payments              # List payments
POST   /api/payments              # Record payment
GET    /api/payments/[id]         # Get details
PUT    /api/payments/[id]         # Update payment
GET    /api/invoices              # List invoices
POST   /api/invoices/generate     # Generate invoice
POST   /api/invoices/[id]/pay-and-convert # Pay & convert lead
GET    /api/receipts              # List receipts
GET    /api/receipts/[id]/download # Download PDF
POST   /api/custom-invoice/generate # Custom invoice
```

### Outreach & Community
```bash
GET  /api/outreach/scheduled      # Scheduled calls
POST /api/outreach/complete       # Complete call
POST /api/outreach/snooze         # Snooze call
GET  /api/outreach/calls          # Prioritized calls
GET  /api/outreach/stats          # Statistics
GET  /api/outreach/[id]           # Call details with AI prep
GET  /api/outreach/connections/suggest # Student matches
POST /api/outreach/connections/create  # Create connection
```

### Content & Social
```bash
GET    /api/content-wall           # Published posts
POST   /api/content-wall           # Create post
POST   /api/content-wall/[id]/like # Like post
POST   /api/content-wall/[id]/comment # Comment
GET    /api/reddit/fetch           # Fetch Reddit posts
POST   /api/reddit/analyze         # AI analysis
GET    /api/instagram/comments     # Instagram comments
GET    /api/instagram/messages     # Instagram DMs
POST   /api/instagram/sync         # Sync Instagram
```

### Teachers & Payroll
```bash
GET  /api/teachers                  # List teachers
POST /api/teachers                  # Create teacher
POST /api/teachers/send-welcome-email # Send welcome
GET  /api/teacher-hours             # List hours
POST /api/teacher-hours             # Log hours
GET  /api/teacher-hours/summary     # Monthly summary
GET  /api/teacher-hours/monthly-payroll # Payroll report
POST /api/teacher-hours/bulk-mark-paid  # Bulk payments
GET  /api/offers                    # List offers
POST /api/offers                    # Create offer
POST /api/offers/[id]/generate      # Generate PDF
```

### System & Automation
```bash
GET  /api/system/health             # Health check
GET  /api/system/audit-logs         # Audit logs
POST /api/cron/payment-reminders    # Send reminders
POST /api/cron/attendance-alerts    # Send alerts
POST /api/cron/consecutive-absence-alerts # Absence alerts
POST /api/cron/month-completion     # Process completions
POST /api/cron/backup               # Database backup
POST /api/webhooks/instagram        # Instagram webhooks
POST /api/webhooks/tasker-instagram # Tasker integration
```

---

## 💾 Backup & Restore System

### Manual Backup (Founder Only)
- **Location:** "Save Backup" button in sidebar
- **Cooldown:** 10 minutes
- **Format:** Gzip-compressed JSON (`.json.gz`)
- **Compression:** 70-80% size reduction
- **Email:** Sent to hello@planbeta.in

### Automated Daily Backups
- **Schedule:** 2:00 AM UTC daily
- **Provider:** GitHub Actions (free)
- **Workflow:** `.github/workflows/daily-backup.yml`

### Scripts
```bash
npm run backup    # Local backup to file
npm run restore   # Restore from backup
npm run import    # Bulk import students/leads
npx tsx check-db.ts # Verify database state
```

---

## 📦 Tech Stack

### Core
- **Framework:** Next.js 15.5.9 (App Router)
- **Language:** TypeScript 5
- **Database:** PostgreSQL (Prisma ORM 6.16.3)
- **Auth:** NextAuth.js v4 (JWT strategy)
- **Styling:** Tailwind CSS 4
- **UI:** React 19.1.0

### Integrations
- **Email:** Resend API
- **AI:** Google Gemini API
- **Social:** Instagram Graph API, Reddit API
- **Automation:** n8n, Twilio (optional)
- **Recording:** Puppeteer for Google Meet
- **PDF:** jsPDF + jspdf-autotable

### Features
- **PWA:** @ducanh2912/next-pwa
- **Forms:** React Hook Form + Zod
- **State:** Zustand + React Query
- **Monitoring:** Sentry

---

## 🗂️ Project Structure

```
plan-beta-dashboard/
├── app/
│   ├── api/                          # API routes
│   │   ├── students/                 # Student CRUD
│   │   ├── leads/                    # Lead management
│   │   ├── payments/                 # Payment processing
│   │   ├── batches/                  # Batch management
│   │   ├── outreach/                 # Outreach system
│   │   │   ├── scheduled/            # Scheduled calls
│   │   │   ├── complete/             # Complete call
│   │   │   ├── calls/                # Prioritized calls
│   │   │   ├── connections/          # Community matching
│   │   │   └── stats/                # Statistics
│   │   ├── content-wall/             # Content platform
│   │   ├── instagram/                # Instagram integration
│   │   ├── reddit/                   # Reddit scraping
│   │   ├── teacher-hours/            # Payroll system
│   │   ├── offers/                   # Offer letters
│   │   ├── custom-invoice/           # Custom invoices
│   │   ├── analytics/                # Analytics APIs
│   │   ├── recordings/               # Google Meet recording
│   │   ├── cron/                     # Automated jobs
│   │   └── webhooks/                 # External webhooks
│   ├── dashboard/                    # Protected pages
│   │   ├── students/                 # Student management
│   │   ├── leads/                    # Lead management
│   │   ├── outreach/                 # Outreach dashboard
│   │   │   └── community/            # Student connections
│   │   ├── content-wall/             # Content platform
│   │   ├── content-lab/              # Content ideas
│   │   ├── instagram/                # Instagram leads
│   │   ├── teacher-hours/            # Payroll UI
│   │   ├── insights/                 # Analytics dashboard
│   │   └── calendar/                 # Calendar view
│   └── layout.tsx                    # Root layout
├── lib/                              # Utilities
│   ├── outreach-scheduler.ts         # Journey scheduling
│   ├── outreach-ai.ts                # AI call preparation
│   ├── outreach-validation.ts        # Input validation
│   ├── email.ts                      # Email templates
│   ├── gemini-client.ts              # AI client
│   ├── instagram-api.ts              # Instagram SDK
│   ├── reddit-api.ts                 # Reddit API
│   ├── offer-letter-generator.ts     # PDF generation
│   ├── invoice-generator.ts          # Invoice PDFs
│   ├── currency.ts                   # Multi-currency
│   └── ai/                           # AI modules
│       ├── conversation-context.ts   # Call context
│       ├── dm-responder.ts           # Auto-responses
│       └── knowledge-base.ts         # AI training data
├── prisma/
│   ├── schema.prisma                 # Database schema
│   └── seed.ts                       # Seed data
├── scripts/
│   ├── backup-database.ts            # Backup script
│   ├── restore-database.ts           # Restore script
│   ├── bulk-import.ts                # Bulk import
│   ├── google-meet-recorder.ts       # Recording automation
│   └── setup-instagram.ts            # Instagram setup
├── components/
│   ├── calendar/                     # Calendar components
│   └── PWAInstallPrompt.tsx          # PWA prompt
└── public/
    ├── manifest.json                 # PWA manifest
    └── icons/                        # App icons
```

---

## 🔐 User Roles & Permissions

### FOUNDER (Full Access)
- All features unlocked
- Outreach system management
- Teacher payroll & offers
- Analytics & insights
- System configuration
- Backup access

### MARKETING
- Lead management & conversion
- Invoice generation
- Quick lead entry with Smart Paste
- Instagram lead import
- Content Lab access

### TEACHER
- View assigned batches
- Mark attendance
- View student contact info (names, phone)
- Receive absence alerts
- **Restricted from:**
  - Financial information
  - Student payments/invoices
  - Detailed student records

---

## 📋 Recent Updates

### Latest (December 2024) - AI-Powered Outreach & Demographics 🤖

✅ **Journey-Based Outreach System**
- Five lifecycle phases with intelligent scheduling
- AI call preparation with conversation history
- Maximum 4 calls per day (quality over quantity)
- December 2025+ students only
- Deprecated tier-based system (PLATINUM/GOLD/etc.)

✅ **Community Building Features**
- AI-powered student matching algorithm
- Cross-batch connection suggestions
- Peer support system for retention

✅ **Demographics & Relocation Tracking**
- City, profession, age tracking
- Germany relocation support
- Visa status and timeline tracking
- Support needs (housing, job search, bureaucracy)

✅ **Content & Social Integration**
- Instagram lead generation from comments/DMs
- Content Lab with Reddit scraping
- Content Wall for student testimonials
- AI-powered content analysis

✅ **Teacher Management Enhancements**
- Automated payroll with hourly tracking
- Professional offer letter generation
- Multi-currency support
- Bulk payment processing

✅ **Analytics & Insights**
- Real-time KPI dashboard
- Revenue breakdown by multiple dimensions
- Currency-aware reporting
- Teacher performance metrics

### Previous (October 2024)

✅ **Email & Backup Infrastructure**
- Complete email system rebuild
- Gzip-compressed backups (70-80% reduction)
- GitHub Actions automation
- Consecutive absence alert system

---

## 🚀 Production Deployment Checklist

### Pre-Deployment
- [ ] Configure all environment variables
- [ ] Change default passwords
- [ ] Test all email flows
- [ ] Verify domain configurations
- [ ] Test Instagram webhook
- [ ] Test backup system
- [ ] Review user permissions

### Vercel Setup
1. Connect GitHub repository
2. Set all environment variables in Vercel dashboard
3. Configure domain (optional)
4. Set up deployment protection token
5. Configure GitHub Actions secrets for backups

### Post-Deployment
- [ ] Test login all roles
- [ ] Create test student (verify emails)
- [ ] Test outreach system
- [ ] Test Instagram integration
- [ ] Verify backup emails
- [ ] Monitor Vercel logs
- [ ] Set up uptime monitoring

---

## 🛠️ Development

### Available Scripts
```bash
npm run dev              # Start dev server
npm run build            # Production build
npm start                # Start production

# Database
npx prisma db push       # Push schema
npx prisma generate      # Generate client
npx prisma studio        # Open GUI
npm run db:seed          # Seed database

# Backup & Restore
npm run backup           # Create backup
npm run restore          # Restore from backup
npm run import           # Bulk import

# Social Media
npm run setup-instagram  # Instagram setup
npm run test-instagram   # Test Instagram API
npm run debug-facebook   # Debug Facebook app
```

---

## 📈 Roadmap

### In Progress
- [ ] WhatsApp automated messaging (Meta Business API configured)
- [ ] n8n workflow automation (API configured)
- [ ] Student portal (self-service dashboard)

### Planned
- [ ] Advanced AI features (GPT-4 integration)
- [ ] Mobile app (React Native)
- [ ] Certificate generation
- [ ] Video testimonials
- [ ] Parent portal

### Recently Completed
- ✅ AI-powered outreach system (Dec 2024)
- ✅ Community features (Dec 2024)
- ✅ Demographics tracking (Dec 2024)
- ✅ Content Wall (Nov 2024)
- ✅ Instagram integration (Oct 2024)

---

## 🏆 Credits

**Built with:**
- Next.js (React framework)
- Prisma (Database ORM)
- NextAuth.js (Authentication)
- Google Gemini (AI)
- Resend (Email service)
- Instagram Graph API
- Neon (PostgreSQL)
- Vercel (Deployment)
- Claude Code (AI-assisted development)

**Developed by:** Plan Beta Team
**Last Updated:** December 17, 2024
**Version:** 4.0 (AI-Powered Outreach & Community)
**Status:** 🟢 Production Ready

---

**Built with ❤️ using Next.js, Prisma, AI, and Claude Code**
