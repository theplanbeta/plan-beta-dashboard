# Plan Beta School Management System

A **production-ready** school management system built with Next.js 15, TypeScript, Prisma, and NextAuth with **complete observability** and **audit logging**.

![Version](https://img.shields.io/badge/version-2.0-blue)
![Status](https://img.shields.io/badge/status-production--ready-green)
![Monitoring](https://img.shields.io/badge/monitoring-enabled-brightgreen)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database (Neon recommended)
- npm or yarn

### Setup Instructions

1. **Install dependencies:**

```bash
npm install
```

2. **Set up environment variables:**

Create a `.env.local` file in the root directory:

```env
# Database (Get this from Neon.tech)
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Sentry (Production Error Tracking - Optional)
NEXT_PUBLIC_SENTRY_DSN="https://your-dsn@sentry.io/project-id"

# Email (Optional - for production)
RESEND_API_KEY="your-resend-api-key"
```

3. **Set up the database:**

```bash
# Push schema to database
npx prisma db push

# Generate Prisma Client
npx prisma generate

# Seed the database with test user
npm run db:seed
```

4. **Start the development server:**

```bash
npm run dev
```

5. **Login:**

Open [http://localhost:3000](http://localhost:3000) and login with:

- **Email:** admin@planbeta.in
- **Password:** admin123

6. **Access System Monitoring:**

- **Activity Dashboard:** [http://localhost:3000/dashboard/activity](http://localhost:3000/dashboard/activity) (Founders only)
- **System Health:** [http://localhost:3000/api/system/health](http://localhost:3000/api/system/health)
- **Audit Logs API:** [http://localhost:3000/api/system/audit-logs](http://localhost:3000/api/system/audit-logs)

---

## 📦 Tech Stack

### Core
- **Frontend:** Next.js 15.5.4, React 19, TypeScript 5
- **Backend:** Next.js API Routes with Server Actions
- **Database:** PostgreSQL (via Prisma ORM 6.16.3)
- **Auth:** NextAuth.js v5 (Role-based access control)
- **Styling:** Tailwind CSS 4

### Monitoring & Observability
- **Audit Logging:** Custom audit trail system (all actions tracked)
- **Error Tracking:** Sentry integration (@sentry/nextjs)
- **Health Monitoring:** Real-time system health checks
- **Activity Dashboard:** Live feed of all operations

### Additional
- **Form Validation:** Zod, React Hook Form
- **Multi-Currency:** EUR (€) and INR (₹) support
- **Invoice Generation:** Integrated with standalone invoice generator

---

## 🗂️ Project Structure

```
plan-beta-dashboard/
├── app/                           # Next.js app directory
│   ├── api/                       # API routes
│   │   ├── leads/                 # Lead management APIs
│   │   ├── students/              # Student management APIs
│   │   ├── invoices/              # Invoice APIs
│   │   ├── batches/               # Batch management APIs
│   │   └── system/                # System monitoring APIs ⭐ NEW
│   │       ├── audit-logs/        # Audit log access
│   │       └── health/            # Health check endpoint
│   ├── dashboard/                 # Dashboard pages
│   │   ├── students/              # Student management
│   │   ├── leads/                 # Lead management ⭐ NEW
│   │   ├── batches/               # Batch management
│   │   ├── marketing/             # Marketing dashboard ⭐ NEW
│   │   └── activity/              # System activity feed ⭐ NEW
│   ├── login/                     # Login page
│   ├── layout.tsx                 # Root layout
│   └── providers.tsx              # Client providers
├── lib/                           # Utility functions
│   ├── prisma.ts                  # Prisma client
│   ├── auth.ts                    # NextAuth configuration
│   ├── pricing.ts                 # Centralized pricing ⭐ NEW
│   ├── audit.ts                   # Audit logging system ⭐ NEW
│   └── utils.ts                   # Helper functions
├── prisma/                        # Database schema & migrations
│   ├── schema.prisma              # Complete database schema
│   └── seed.ts                    # Seed script
├── sentry.client.config.ts        # Sentry frontend config ⭐ NEW
├── sentry.server.config.ts        # Sentry backend config ⭐ NEW
├── PRODUCTION-MONITORING.md       # Monitoring guide ⭐ NEW
└── public/                        # Static assets
```

---

## 🔥 Features

### ✅ **Implemented Features**

#### **Foundation & Authentication**
- ✅ Next.js 15 with App Router
- ✅ TypeScript with strict mode
- ✅ Tailwind CSS with Plan Beta branding
- ✅ NextAuth.js role-based authentication
- ✅ Protected dashboard routes
- ✅ Login/logout functionality

#### **Student Management**
- ✅ Complete student CRUD operations
- ✅ Student enrollment tracking
- ✅ Multi-currency support (EUR/INR)
- ✅ Payment status tracking
- ✅ Batch assignment
- ✅ Student detail pages with full history

#### **Lead Management System** ⭐ NEW
- ✅ Lead CRUD operations
- ✅ Lead quality scoring (HOT/WARM/COLD)
- ✅ Lead status tracking (NEW → CONTACTED → CONVERTED)
- ✅ Trial class scheduling
- ✅ Follow-up tracking
- ✅ Lead-to-student conversion workflow
- ✅ Marketing dashboard with metrics

#### **Invoice & Payment System** ⭐ NEW
- ✅ Invoice generation for leads
- ✅ Multi-currency invoices (EUR/INR)
- ✅ Flexible batch selection (Month + Time)
- ✅ Payment tracking with partial payments
- ✅ Invoice status management (DRAFT/SENT/PAID/CANCELLED)
- ✅ One-click "Pay & Convert" (Invoice → Student)
- ✅ Integration with standalone invoice generator
- ✅ Centralized pricing configuration

#### **Batch Management**
- ✅ Batch CRUD operations
- ✅ Teacher assignment
- ✅ Enrollment tracking
- ✅ Capacity management
- ✅ Batch status workflow

#### **Production Monitoring & Observability** ⭐ NEW
- ✅ **Complete audit logging system**
  - Every action tracked with full context
  - User, IP address, timestamp tracking
  - Before/after state capture
  - 22+ action types monitored

- ✅ **Real-time Activity Dashboard** (`/dashboard/activity`)
  - Live feed of all operations
  - Auto-refresh every 10 seconds
  - Error filtering
  - 24-hour statistics
  - Top actions leaderboard

- ✅ **System Health Monitoring** (`/api/system/health`)
  - Database connection checks
  - Query performance monitoring
  - Error rate tracking
  - Recent activity metrics

- ✅ **Sentry Integration**
  - Automatic error capture
  - Session replay
  - Source maps
  - Performance monitoring

- ✅ **Critical Operation Tracking**
  - Invoice generation (success/failure)
  - Payment processing
  - Lead conversions
  - Database transactions

#### **Multi-Currency Support** ⭐ NEW
- ✅ EUR (€) and INR (₹) pricing
- ✅ Currency selection for students
- ✅ Currency-aware invoices
- ✅ Centralized pricing configuration
- ✅ Dynamic currency symbols

---

## 📊 Database Schema

The system includes **12 main tables** with complete audit trail:

### Core Entities
1. **User** - Authentication & roles (FOUNDER/MARKETING/TEACHER)
2. **Student** - Student information, enrollment, multi-currency
3. **Lead** - Lead management with conversion tracking ⭐ NEW
4. **Batch** - Course batches with teacher assignment
5. **Invoice** - Multi-currency invoices linked to leads ⭐ NEW

### Financial
6. **Payment** - Payment transactions with invoice tracking
7. **Referral** - Referral system with payouts
8. **Upsell** - Upsell tracking

### Operational
9. **Attendance** - Daily attendance tracking
10. **EmailQueue** - Email automation queue
11. **DailyMetrics** - Analytics & reporting

### Monitoring ⭐ NEW
12. **AuditLog** - Complete audit trail of all operations
    - Action tracking (22+ action types)
    - Severity levels (INFO/WARNING/ERROR/CRITICAL)
    - User context (who, when, from where)
    - Entity tracking (what was affected)
    - Error logging (stack traces, error messages)
    - Metadata (before/after states, transaction details)

---

## 🔐 Security & Compliance

### Authentication
- ✅ Role-based access control (FOUNDER/MARKETING/TEACHER)
- ✅ Protected API routes
- ✅ Session management via NextAuth
- ✅ Secure password hashing

### Audit Trail
- ✅ Every critical action logged
- ✅ IP address tracking
- ✅ User agent tracking
- ✅ Timestamp tracking
- ✅ Before/after state capture
- ✅ Financial transaction logging

### Data Protection
- ✅ Environment variable management
- ✅ Database connection encryption
- ✅ Sensitive data filtering in error logs
- ✅ GDPR-compliant data handling

---

## 🎯 Key Workflows

### 1. Lead → Student Conversion (Invoice-First)

**Traditional Flow (Manual):**
```
Lead → Convert → Re-enter pricing → Create Student
```

**New Streamlined Flow:**
```
Lead → Generate Invoice → Mark as Paid → Auto-create Student ✅
```

**Benefits:**
- ✅ No manual re-entry of pricing
- ✅ Complete audit trail
- ✅ Atomic database transaction
- ✅ Payment linked to invoice
- ✅ Batch enrollment auto-updated

### 2. Multi-Currency Pricing

**Lead Creation:**
```
Select Level (A1/A2/B1/B2) → Select Month → Select Time (Morning/Evening)
↓
Generate Invoice → Choose Currency (EUR/INR) → Enter Amount
↓
Invoice created with correct pricing and batch info
```

### 3. Real-Time Monitoring

**Activity Dashboard Updates:**
```
User Action → Audit Log Created → Activity Feed Updates (10s refresh)
                               ↓
                        Error? → Sentry Alert + Email
```

---

## 🛠️ Available Scripts

```bash
# Development
npm run dev              # Start development server (localhost:3000)
npm run build            # Build for production
npm start                # Start production server

# Database
npx prisma db push       # Push schema to database
npx prisma generate      # Generate Prisma Client
npx prisma studio        # Open Prisma Studio (GUI)
npm run db:seed          # Seed database with test data

# Code Quality
npm run lint             # Run ESLint
npm run type-check       # TypeScript type checking

# Testing
npm run test             # Run audit log tests
```

---

## 📡 API Endpoints

### Student Management
- `GET /api/students` - List all students
- `POST /api/students` - Create new student
- `GET /api/students/[id]` - Get student details
- `PUT /api/students/[id]` - Update student
- `DELETE /api/students/[id]` - Delete student

### Lead Management
- `GET /api/leads` - List all leads
- `POST /api/leads` - Create new lead
- `GET /api/leads/[id]` - Get lead details
- `PUT /api/leads/[id]` - Update lead
- `DELETE /api/leads/[id]` - Delete lead
- `POST /api/leads/[id]/invoice` - Generate invoice for lead ⭐ NEW

### Invoice & Payments
- `POST /api/invoices/[id]/pay-and-convert` - Mark paid & convert ⭐ NEW
- `GET /api/leads/[id]/invoice` - Get lead invoices ⭐ NEW

### System Monitoring ⭐ NEW
- `GET /api/system/health` - System health check
- `GET /api/system/audit-logs?type=all&limit=50` - Get audit logs
- `GET /api/system/audit-logs?type=errors` - Get error logs only
- `GET /api/system/audit-logs?type=stats` - Get 24h statistics

### Batch Management
- `GET /api/batches` - List all batches
- `POST /api/batches` - Create new batch
- `PUT /api/batches/[id]` - Update batch
- `DELETE /api/batches/[id]` - Delete batch

---

## 🔍 Monitoring & Debugging

### Activity Dashboard (`/dashboard/activity`)

**Access:** Founder role only

**Features:**
- 📊 Real-time activity feed (auto-refresh)
- 🚨 Error filtering (all vs errors only)
- 📈 24-hour statistics dashboard
- 👥 User and IP tracking
- 🔝 Top actions leaderboard
- 🎨 Color-coded severity levels

**View Modes:**
- **All Activity** - Every logged action
- **Errors Only** - WARNING, ERROR, CRITICAL

### System Health Check

**Endpoint:** `GET /api/system/health`

**Checks:**
- ✅ Database connection
- ✅ Query performance (<1s threshold)
- ✅ Error rate in last hour
- ✅ System metrics (counts)
- ✅ Recent activity (24h conversions/payments)

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-06T12:00:00Z",
  "responseTime": "45ms",
  "checks": {
    "database": { "status": "healthy" },
    "databasePerformance": { "queryTime": "12ms" },
    "errorRate": { "errorRate": "0.5%", "errors": 2, "critical": 0 },
    "systemMetrics": { "students": 125, "leads": 340 },
    "recentActivity": { "conversions": 12, "payments": 18 }
  }
}
```

### Sentry Error Tracking

**Setup:**
1. Create account at [sentry.io](https://sentry.io)
2. Add `NEXT_PUBLIC_SENTRY_DSN` to `.env.local`
3. Errors automatically sent in production

**Features:**
- Automatic error capture
- Source maps for exact line numbers
- Session replay
- Performance monitoring
- User context tracking

---

## 📋 Tracked Actions (Audit Log)

### Authentication
- `LOGIN`, `LOGOUT`, `LOGIN_FAILED`

### Lead Management
- `LEAD_CREATED`, `LEAD_UPDATED`, `LEAD_DELETED`, `LEAD_CONVERTED`

### Invoice Management
- `INVOICE_GENERATED`, `INVOICE_SENT`, `INVOICE_UPDATED`, `INVOICE_CANCELLED`

### Payment & Conversion
- `PAYMENT_RECEIVED`, `STUDENT_CREATED`, `LEAD_TO_STUDENT_CONVERSION`

### Student Management
- `STUDENT_UPDATED`, `STUDENT_DELETED`

### Batch Management
- `BATCH_CREATED`, `BATCH_UPDATED`, `BATCH_DELETED`

### System Events
- `SYSTEM_ERROR`, `DATABASE_ERROR`, `API_ERROR`, `EMAIL_SENT`, `EMAIL_FAILED`

---

## 🔑 Default Login Credentials

- **Email:** admin@planbeta.in
- **Password:** admin123
- **Role:** FOUNDER (full access)

⚠️ **Important:** Change these credentials in production!

---

## 📖 Documentation

### Comprehensive Guides
- **[PRODUCTION-MONITORING.md](./PRODUCTION-MONITORING.md)** - Complete monitoring guide ⭐ NEW
  - Audit logging usage
  - Sentry setup
  - Health monitoring
  - Alert configuration
  - Troubleshooting

### Additional Documentation
- Quick Start Guide (this file)
- Prisma Schema Documentation
- API Documentation (see API Endpoints section)

---

## 🚀 Production Deployment

### Environment Variables (Production)

```env
# Database
DATABASE_URL="your-production-postgres-url"

# NextAuth
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="strong-random-secret"

# Sentry (Recommended)
NEXT_PUBLIC_SENTRY_DSN="https://your-dsn@sentry.io/project"

# Email
RESEND_API_KEY="your-resend-key"
```

### Deployment Checklist

- [ ] Set all environment variables
- [ ] Run `npx prisma db push` on production database
- [ ] Change default admin credentials
- [ ] Configure Sentry DSN
- [ ] Set up uptime monitoring for `/api/system/health`
- [ ] Configure email alerts for CRITICAL errors
- [ ] Test invoice generation flow
- [ ] Test lead-to-student conversion
- [ ] Verify Activity Dashboard access
- [ ] Review audit logs
- [ ] Set up backup strategy

### Recommended Monitoring

**Uptime Monitoring:**
- Ping `/api/system/health` every 5 minutes
- Alert if response status !== "healthy"

**Error Alerts:**
- Daily email digest of CRITICAL errors
- Slack/Discord webhook for immediate failures
- Sentry notifications for production errors

---

## 🎨 Branding

### Colors
- **Primary:** Custom brand color
- **Success:** Green (#10b981)
- **Error:** Red (#ef4444)
- **Warning:** Yellow (#f59e0b)
- **Info:** Blue (#3b82f6)

### Logo
- Located in `/public/` directory
- Accessible via dashboard sidebar

---

## 🤝 Support

### Contact
- **Email:** info@planbeta.in
- **Documentation:** See `PRODUCTION-MONITORING.md`

### Debugging
1. Check Activity Dashboard (`/dashboard/activity`)
2. Review System Health (`/api/system/health`)
3. Check Sentry dashboard (sentry.io)
4. Review audit logs via API

---

## 📈 Future Enhancements

### Planned Features
- [ ] Email automation system
- [ ] Advanced analytics dashboard
- [ ] Student portal
- [ ] Parent notifications
- [ ] Attendance tracking
- [ ] Automated upsell campaigns
- [ ] Referral tracking system
- [ ] Mobile app

---

## 🏆 Achievement Summary

### What Makes This Production-Ready

✅ **Complete Observability**
- Every action logged with full context
- Real-time activity monitoring
- System health checks
- Error tracking with Sentry

✅ **Financial Transaction Safety**
- Atomic database transactions
- Complete audit trail
- Payment tracking
- Invoice generation with history

✅ **Multi-Currency Support**
- EUR and INR pricing
- Centralized configuration
- Currency-aware invoices

✅ **Streamlined Workflows**
- Invoice-first lead conversion
- One-click payment processing
- Auto-batch enrollment

✅ **Security & Compliance**
- Role-based access control
- IP address tracking
- Audit logs for compliance
- Secure authentication

✅ **Developer Experience**
- TypeScript throughout
- Comprehensive error handling
- Detailed documentation
- Easy deployment

---

**Built with ❤️ using Next.js, Prisma, and Claude Code**

**Version:** 2.0 | **Status:** Production Ready | **Last Updated:** October 6, 2025
