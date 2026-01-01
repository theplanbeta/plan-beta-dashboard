# Plan Beta Dashboard

A comprehensive school management platform for Plan Beta, a German language school serving students primarily from India who want to learn German (A1, A2, B1, B2 levels) before relocating to Germany.

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Database**: PostgreSQL (Neon) with Prisma ORM
- **Authentication**: NextAuth.js with role-based access (FOUNDER, MARKETING, TEACHER)
- **Styling**: Tailwind CSS 4 with HeadlessUI components
- **Email**: Resend API
- **State**: Zustand + React Query
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
  dashboard/              # Main dashboard pages
    batches/              # Batch management UI
    students/             # Student management UI
    teachers/             # Teacher management UI
    payments/             # Payment tracking
    marketing/            # Marketing dashboard
    content-lab/          # Content ideas from Reddit
    instagram/            # Instagram integration

components/               # Reusable React components
lib/
  prisma.ts              # Prisma client instance
  email.ts               # Email templates and sending
  api-permissions.ts     # Role-based API access control
  auth.ts                # NextAuth configuration

prisma/
  schema.prisma          # Database schema
  seed.ts                # Database seeding script

scripts/                 # Utility scripts
  backup-database.ts     # Database backup
  restore-database.ts    # Database restore
```

## Key Conventions

### API Routes
- Use `checkPermission()` from `lib/api-permissions.ts` at the start of each route
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

## Important Notes

1. **Time Zones**: Classes run Mon-Fri at 7 AM and 5 PM CET (Central European Time)
2. **Google Meet**: Classes conducted via Google Meet with batch-specific links stored in `Batch.meetLink`
3. **Multi-currency**: Support EUR and INR; always store EUR equivalent for reporting
4. **Teacher Exclusions**: Founders who teach (like Aparna) are excluded from hour reminders via email exclusion list in cron routes
