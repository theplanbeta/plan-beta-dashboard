# Plan Beta Dashboard - German Language School Management System

A **production-ready** school management system built with Next.js 15, TypeScript, Prisma, and NextAuth with complete email automation, dark mode, PWA support, and comprehensive backup system.

![Version](https://img.shields.io/badge/version-3.0-blue)
![Status](https://img.shields.io/badge/status-production--ready-green)
![Email](https://img.shields.io/badge/email-active-brightgreen)

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

Create a `.env` file in the root directory:

```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://neondb_owner:npg_rvf4a3DopMhW@ep-dark-shadow-agv0fe98.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&connection_limit=10&pool_timeout=20"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="oTmXOhyFKONW4OW/Wo6HqGsPkZ05YoUr0NmqRdnwlXI="

# Email (Resend) - ACTIVE & VERIFIED ✅
RESEND_API_KEY="re_FxkRNtvY_8APyQZGavwzk74dHFFnq3YNJ"
EMAIL_FROM="Plan Beta <noreply@planbeta.in>"
SUPPORT_EMAIL="hello@planbeta.in"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
UPI_ID="planbeta@paytm"

# Cron Job Security
CRON_SECRET="your-cron-secret-key-here"

# AI Features (Gemini for Smart Paste)
GEMINI_API_KEY="AIzaSyBzYmqDxD_f3n2Np3zoGVc4kmQTxkm5bqY"
```

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

## 🔑 Production Credentials & API Keys

### Database (Neon PostgreSQL)
- **Provider:** Neon.tech
- **Connection String:** `postgresql://neondb_owner:npg_rvf4a3DopMhW@ep-dark-shadow-agv0fe98.c-2.eu-central-1.aws.neon.tech/neondb`
- **Features:** Connection pooling (max 10), 20s timeout
- **Status:** ✅ Active

### Email Service (Resend)
- **Provider:** Resend
- **API Key:** `re_FxkRNtvY_8APyQZGavwzk74dHFFnq3YNJ`
- **Domain:** `planbeta.in` ✅ **VERIFIED**
- **From Address:** `Plan Beta <noreply@planbeta.in>`
- **Support Email:** `hello@planbeta.in`
- **Status:** ✅ Fully Operational
- **DNS Records Set:** TXT records on Hostinger
- **Features Active:**
  - Student welcome emails
  - Payment confirmations & reminders
  - Attendance alerts
  - Batch start notifications
  - Referral payout notifications
  - Month completion emails
  - Feedback notifications
  - Database backup emails

### AI Integration (Google Gemini)
- **Provider:** Google AI
- **API Key:** `AIzaSyBzYmqDxD_f3n2Np3zoGVc4kmQTxkm5bqY`
- **Usage:** Smart Paste feature for lead parsing
- **Status:** ✅ Active

### Authentication
- **Provider:** NextAuth.js v4
- **Secret:** `oTmXOhyFKONW4OW/Wo6HqGsPkZ05YoUr0NmqRdnwlXI=`
- **Strategy:** JWT with credentials provider
- **Password Hashing:** bcryptjs

### Deployment
- **Platform:** Vercel
- **Repository:** https://github.com/theplanbeta/plan-beta-dashboard
- **Production URL:** https://plan-beta-dashboard.vercel.app (configure in Vercel)
- **Branch:** main (auto-deploys on push)

---

## 📧 Email System - FULLY OPERATIONAL

### Active Email Features

**1. Student Welcome Emails** 🎉
- **Trigger:** New student enrollment
- **Template:** `student-welcome`
- **Includes:** Student ID, level, batch code, enrollment date, portal link
- **Location:** `app/api/students/route.ts:198-207`

**2. Payment Confirmation Emails** ✅
- **Trigger:** Payment marked as COMPLETED
- **Template:** `payment-received`
- **Includes:** Amount, method, transaction ID, remaining balance
- **Location:** `app/api/payments/route.ts:158-173`

**3. Payment Reminder Emails** 💰
- **Trigger:** Automated cron for OVERDUE students
- **Template:** `payment-reminder`
- **Includes:** Outstanding balance, days overdue, payment options
- **Location:** `app/api/cron/payment-reminders/route.ts`
- **Endpoint:** `POST /api/cron/payment-reminders` (requires CRON_SECRET)

**4. Attendance Alert Emails** ⚠️
- **Trigger:** Automated cron for students <50% attendance
- **Template:** `attendance-alert`
- **Includes:** Current attendance rate, classes attended/total
- **Location:** `app/api/cron/attendance-alerts/route.ts`
- **Endpoint:** `POST /api/cron/attendance-alerts` (requires CRON_SECRET)

**5. Month Completion Emails** 🎊
- **Trigger:** Student completes Month 1 (30+ days, ≥50% attendance)
- **Template:** `month-complete`
- **Includes:** Progress stats, referral payout notification
- **Location:** `app/api/cron/month-completion/route.ts`
- **Endpoint:** `POST /api/cron/month-completion` (requires CRON_SECRET)

**6. Batch Start Emails** 🚀
- **Trigger:** Batch start date set or status → RUNNING
- **Template:** `batch-start`
- **Includes:** Batch code, level, schedule, instructor, start date
- **Location:** `app/api/batches/[id]/route.ts:149-179`

**7. Referral Payout Emails** 💸
- **Trigger:** Referral payout status → PAID
- **Template:** `referral-payout`
- **Includes:** Payout amount, referee name, payment date
- **Location:** `app/api/referrals/[id]/route.ts:113-127`

**8. Feedback Notifications** 📣
- **Trigger:** User submits bug/feature/question feedback
- **Sends to:** Support team (hello@planbeta.in)
- **Includes:** Feedback type, description, page, priority, submitter
- **Location:** `app/api/feedback/route.ts:66-101`

**9. Database Backup Emails** 💾
- **Trigger:** User login (30min cooldown) or manual backup button
- **Sends to:** hello@planbeta.in
- **Attachment:** Complete database JSON backup
- **Location:** `app/api/cron/backup/route.ts`
- **Manual Trigger:** Backup button in sidebar (Founder only)

### Email Templates
All templates are defined in `lib/email.ts` with beautiful HTML formatting:
- Responsive design (max-width: 600px)
- Brand colors and styling
- Clear call-to-action buttons
- Professional formatting
- Dynamic content

### Email Preferences (Student-Level)
Students control their email notifications via database flags:
```typescript
emailNotifications: true  // Master toggle
emailWelcome: true        // Welcome emails
emailPayment: true        // Payment emails
emailAttendance: true     // Attendance alerts
emailBatch: true          // Batch notifications
emailReferral: true       // Referral payouts
```

All flags default to `true` in schema (prisma/schema.prisma:79-84).

### Testing Emails Locally
```bash
# Test by performing actions in the app:
1. Create a new student → Welcome email sent
2. Record a payment → Confirmation email sent
3. Submit feedback → Notification sent to support

# Test cron endpoints (requires CRON_SECRET header):
curl -X POST http://localhost:3000/api/cron/payment-reminders \
  -H "Authorization: Bearer your-cron-secret-key-here"

curl -X POST http://localhost:3000/api/cron/attendance-alerts \
  -H "Authorization: Bearer your-cron-secret-key-here"

curl -X POST http://localhost:3000/api/cron/month-completion \
  -H "Authorization: Bearer your-cron-secret-key-here"
```

---

## 📡 Complete API Reference

### Authentication
- `POST /api/auth/callback/credentials` - Login
- `POST /api/auth/signout` - Logout

### Students
- `GET /api/students` - List all students (with filters)
- `POST /api/students` - Create student (sends welcome email ✉️)
- `GET /api/students/[id]` - Get student details
- `PUT /api/students/[id]` - Update student
- `DELETE /api/students/[id]` - Delete student

### Leads
- `GET /api/leads` - List all leads
- `POST /api/leads` - Create lead
- `POST /api/leads/parse` - Smart Paste AI parsing
- `GET /api/leads/[id]` - Get lead details
- `PUT /api/leads/[id]` - Update lead
- `DELETE /api/leads/[id]` - Delete lead
- `POST /api/leads/[id]/invoice` - Generate invoice for lead

### Payments
- `GET /api/payments` - List all payments
- `POST /api/payments` - Record payment (sends confirmation email ✉️)

### Batches
- `GET /api/batches` - List all batches
- `POST /api/batches` - Create batch
- `GET /api/batches/[id]` - Get batch details
- `PUT /api/batches/[id]` - Update batch (sends batch-start emails ✉️)
- `DELETE /api/batches/[id]` - Delete batch

### Invoices
- `GET /api/invoices` - List all invoices
- `POST /api/invoices` - Create invoice
- `GET /api/invoices/[id]` - Get invoice details
- `PUT /api/invoices/[id]` - Update invoice
- `POST /api/invoices/[id]/pay-and-convert` - Pay invoice & convert lead to student

### Referrals
- `GET /api/referrals` - List all referrals
- `POST /api/referrals` - Create referral
- `GET /api/referrals/[id]` - Get referral details
- `PUT /api/referrals/[id]` - Update referral (sends payout email ✉️)
- `DELETE /api/referrals/[id]` - Delete referral

### Attendance
- `GET /api/attendance` - List attendance records
- `POST /api/attendance` - Mark attendance
- `PUT /api/attendance/[id]` - Update attendance

### Automated Cron Jobs ⏰
All require `Authorization: Bearer ${CRON_SECRET}` header

- `POST /api/cron/payment-reminders` - Send payment reminders ✉️
- `POST /api/cron/attendance-alerts` - Send attendance alerts ✉️
- `POST /api/cron/month-completion` - Process month completions ✉️
- `POST /api/cron/backup` - Backup database & email ✉️

### Feedback
- `POST /api/feedback` - Submit feedback (sends to support ✉️)
- `GET /api/feedback` - Get all feedback (Founder only)

### System Monitoring
- `GET /api/system/health` - System health check
- `GET /api/system/audit-logs` - Audit logs

---

## 💾 Backup & Restore System

### Automated Backups
**Trigger:** Every user login (with 30-minute cooldown)
**Location:** `lib/auth.ts:43-49`, `app/api/cron/backup/route.ts`
**Email:** Sent to `hello@planbeta.in` with JSON attachment
**Contains:** All students, leads, batches, payments, referrals, attendance, invoices, audit logs

### Manual Backup (Founder Only)
**Location:** Sidebar in dashboard layout
**Action:** Click "Backup Database" button
**Response:** "✓ Backup sent to email" or "Backup created recently"

### Backup Scripts
```bash
# Local backup to file
npm run backup
# Creates: backups/backup-TIMESTAMP.json

# Restore from backup
npx tsx scripts/restore-database.ts backup-TIMESTAMP.json

# Bulk import students/leads from template
npm run import
# Uses: import-data.json (auto-generated template)
```

### Database Verification
```bash
# Check database state
npx tsx check-db.ts
# Shows: Record counts and recent entries for all tables
```

---

## 🎨 UI Features

### Dark Mode 🌙
- **Toggle:** Available in mobile header and desktop sidebar
- **Persistence:** Saved to localStorage
- **Auto-detection:** Respects system preference on first load
- **Implementation:** React Context (`lib/ThemeContext.tsx`)
- **Classes:** Tailwind `dark:` classes throughout

### PWA Support 📱
- **Service Worker:** Auto-generated
- **Manifest:** `/public/manifest.json`
- **Install Prompt:** Component at `components/PWAInstallPrompt.tsx`
- **Offline:** Basic offline support
- **Icons:** 192x192 and 512x512 in `/public/`

### Mobile Optimization
- **Responsive:** Tailwind breakpoints (sm, md, lg, xl)
- **Bottom Navigation:** 5-button nav on mobile
- **Hamburger Menu:** Full menu overlay on mobile
- **Back Button:** Contextual back navigation
- **Large Touch Targets:** 44x44px minimum

### Smart Paste AI 🤖
- **Location:** Quick lead form (`/dashboard/leads/quick`)
- **Feature:** Parse contact info from pasted text
- **API:** Google Gemini AI
- **Extracts:** Name, WhatsApp, interest level
- **UI:** Collapsible textarea with parse button

---

## 📦 Tech Stack

### Core
- **Framework:** Next.js 15.5.4 (App Router)
- **Language:** TypeScript 5
- **Database:** PostgreSQL (Prisma ORM 6.16.3)
- **Auth:** NextAuth.js v4 (JWT strategy)
- **Styling:** Tailwind CSS 4
- **UI:** React 19.1.0

### Features
- **Email:** Resend API
- **AI:** Google Gemini API
- **PWA:** @ducanh2912/next-pwa
- **Forms:** React Hook Form + Zod validation
- **State:** Zustand + React Query
- **PDF:** jsPDF + jspdf-autotable
- **Date:** date-fns

### Deployment
- **Hosting:** Vercel
- **Database:** Neon (serverless Postgres)
- **Git:** GitHub
- **Domain:** planbeta.in (for emails)

---

## 🗂️ Project Structure

```
plan-beta-dashboard/
├── app/
│   ├── api/                      # API routes
│   │   ├── students/             # Student CRUD
│   │   ├── leads/                # Lead management + Smart Paste
│   │   ├── payments/             # Payment processing
│   │   ├── batches/              # Batch management
│   │   ├── invoices/             # Invoice generation
│   │   ├── referrals/            # Referral system
│   │   ├── attendance/           # Attendance tracking
│   │   ├── feedback/             # Feedback submission
│   │   ├── cron/                 # Automated jobs
│   │   │   ├── backup/           # Database backups
│   │   │   ├── payment-reminders/
│   │   │   ├── attendance-alerts/
│   │   │   └── month-completion/
│   │   └── system/               # Health & audit logs
│   ├── dashboard/                # Protected dashboard pages
│   │   ├── students/             # Student management UI
│   │   ├── leads/                # Lead management UI
│   │   │   ├── new/              # Full lead form
│   │   │   └── quick/            # Quick form with Smart Paste
│   │   ├── batches/              # Batch management UI
│   │   ├── payments/             # Payment records UI
│   │   ├── referrals/            # Referral tracking UI
│   │   ├── attendance/           # Attendance marking UI
│   │   ├── activity/             # System activity feed
│   │   └── layout.tsx            # Dashboard layout (sidebar, nav)
│   ├── login/                    # Login page
│   ├── layout.tsx                # Root layout (ThemeProvider)
│   └── page.tsx                  # Landing page
├── lib/                          # Utilities
│   ├── prisma.ts                 # Prisma client singleton
│   ├── auth.ts                   # NextAuth config + backup trigger
│   ├── email.ts                  # Email templates & sending
│   ├── ThemeContext.tsx          # Dark mode context
│   ├── permissions.ts            # Role-based permissions
│   ├── api-permissions.ts        # API route permissions
│   ├── pricing.ts                # Pricing configuration
│   ├── utils.ts                  # Helper functions
│   └── audit.ts                  # Audit logging
├── prisma/
│   ├── schema.prisma             # Database schema
│   └── seed.ts                   # Default users seeder
├── scripts/
│   ├── backup-database.ts        # Manual backup script
│   ├── restore-database.ts       # Restore from backup
│   └── bulk-import.ts            # Import students/leads
├── components/
│   └── PWAInstallPrompt.tsx      # PWA install prompt
├── public/
│   ├── manifest.json             # PWA manifest
│   ├── icon-192x192.png          # PWA icons
│   └── icon-512x512.png
├── .env                          # Environment variables
├── check-db.ts                   # Database verification
├── package.json                  # Dependencies & scripts
└── README.md                     # This file
```

---

## 🛠️ Available Scripts

```bash
# Development
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build
npm start                # Start production server

# Database
npx prisma db push       # Push schema changes to database
npx prisma generate      # Regenerate Prisma Client
npx prisma studio        # Open Prisma Studio GUI (localhost:5555)
npm run db:seed          # Seed database with default users

# Backup & Restore
npm run backup           # Create local backup (backups/ folder)
npm run restore          # Restore from backup file
npm run import           # Import students/leads from template
npx tsx check-db.ts      # Verify database state

# Code Quality
npm run lint             # Run ESLint
```

---

## 🔐 User Roles & Permissions

### FOUNDER (Full Access)
- All features unlocked
- Manage users, students, leads, batches, payments, referrals
- View system activity & audit logs
- Access backup functionality
- Configure settings

### MARKETING
- Create & manage leads
- Generate invoices for leads
- Quick lead entry with Smart Paste
- View marketing dashboard
- Convert leads to students (via invoice payment)

### TEACHER
- View assigned batches
- View students in their batches
- Mark attendance
- View class schedules
- Limited to own batches only

---

## 🚀 Production Deployment Checklist

### Pre-Deployment
- [ ] Review and update `.env` with production values
- [ ] Change default admin password
- [ ] Test all email flows
- [ ] Verify Resend domain (planbeta.in)
- [ ] Test backup system
- [ ] Review user roles and permissions
- [ ] Test invoice generation
- [ ] Test lead-to-student conversion

### Vercel Setup
1. Connect GitHub repository
2. Set environment variables in Vercel dashboard:
   ```
   DATABASE_URL=postgresql://...
   NEXTAUTH_URL=https://your-domain.vercel.app
   NEXTAUTH_SECRET=your-secret
   RESEND_API_KEY=re_...
   EMAIL_FROM=Plan Beta <noreply@planbeta.in>
   SUPPORT_EMAIL=hello@planbeta.in
   NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
   UPI_ID=planbeta@paytm
   CRON_SECRET=your-cron-secret
   GEMINI_API_KEY=AIza...
   ```
3. Deploy from `main` branch
4. Configure custom domain (optional)

### Post-Deployment
- [ ] Test login with all user roles
- [ ] Create test student (verify welcome email)
- [ ] Record test payment (verify confirmation email)
- [ ] Submit test feedback (verify support email)
- [ ] Test backup system (manual button)
- [ ] Monitor email delivery in Resend dashboard
- [ ] Check Vercel logs for errors
- [ ] Set up uptime monitoring

### Recommended Monitoring
- **Uptime Robot:** Ping `/api/system/health` every 5 minutes
- **Email Monitoring:** Check Resend dashboard daily
- **Backup Verification:** Check hello@planbeta.in for backup emails
- **Error Tracking:** Review Vercel logs weekly

---

## 🔧 Troubleshooting

### Email Issues
**Problem:** Emails not sending
**Solution:**
1. Verify Resend API key is correct
2. Check domain verification at resend.com/domains
3. Verify DNS records on Hostinger
4. Check student email preferences in database
5. Review Vercel logs for email errors

### Database Connection Issues
**Problem:** Database connection timeout
**Solution:**
1. Check DATABASE_URL is correct
2. Verify Neon project is active
3. Check connection pooling settings
4. Increase pool_timeout in connection string

### Build Failures
**Problem:** Vercel build fails
**Solution:**
1. Run `npm run build` locally first
2. Check for TypeScript errors
3. Verify all environment variables are set
4. Clear Vercel cache and rebuild

### Login Issues
**Problem:** Cannot login
**Solution:**
1. Verify NEXTAUTH_SECRET is set
2. Check NEXTAUTH_URL matches deployment URL
3. Run `npm run db:seed` to reset passwords
4. Clear browser cookies and try again

---

## 📞 Support

### Contacts
- **Email:** hello@planbeta.in
- **GitHub:** https://github.com/theplanbeta/plan-beta-dashboard
- **Issues:** https://github.com/theplanbeta/plan-beta-dashboard/issues

### Documentation
- This README.md (comprehensive guide)
- API documentation (see API Reference section)
- Email system documentation (see Email System section)
- Backup system documentation (see Backup & Restore section)

### Getting Help
1. Check this README first
2. Review relevant documentation section
3. Check GitHub issues for similar problems
4. Create new issue with detailed description
5. Contact support team at hello@planbeta.in

---

## 📋 Recent Updates

### Latest (October 2025) - Email System Restoration
✅ **Restored all email functionality**
- Student welcome emails
- Payment confirmations & reminders
- Attendance alerts
- Batch start notifications
- Referral payout notifications
- Month completion emails
- Feedback notifications to support
- Database backup emails

✅ **Email infrastructure verified**
- Domain: planbeta.in ✅ VERIFIED
- Resend API: ✅ OPERATIONAL
- All DNS records configured on Hostinger

### Previous Updates
✅ **Database backup system** (automated + manual)
✅ **Dark mode** (global theme with localStorage)
✅ **PWA support** (installable app)
✅ **Smart Paste AI** (lead parsing with Gemini)
✅ **Mobile optimization** (responsive dashboard)
✅ **Role-based permissions** (FOUNDER/MARKETING/TEACHER)

---

## 📈 Roadmap

### Planned Features
- [ ] Student portal (login & track progress)
- [ ] WhatsApp integration (automated messages)
- [ ] SMS notifications (Twilio integration)
- [ ] Advanced analytics dashboard
- [ ] Parent portal & notifications
- [ ] Certificate generation
- [ ] Automated upsell campaigns
- [ ] Mobile app (React Native)

### In Progress
- ✅ Email system (COMPLETED)
- ✅ Backup system (COMPLETED)
- ✅ Dark mode (COMPLETED)

---

## 🏆 Credits

**Built with:**
- Next.js (React framework)
- Prisma (Database ORM)
- NextAuth.js (Authentication)
- Resend (Email service)
- Neon (PostgreSQL hosting)
- Vercel (Deployment)
- Claude Code (AI-assisted development)

**Developed by:** Plan Beta Team
**Last Updated:** October 10, 2025
**Version:** 3.0 (Email System Active)
**Status:** 🟢 Production Ready

---

**Built with ❤️ using Next.js, Prisma, and Claude Code**
