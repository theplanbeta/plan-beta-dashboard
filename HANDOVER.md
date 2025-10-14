# Project Handover Document
**Date**: December 19, 2024
**Project**: Plan Beta Dashboard - Marketing Features & Attendance System

---

## 1. Primary Request and Intent

The user has requested implementation of two major features for marketing users:

### Feature 1: Horizontal Calendar Mode
Transform the current vertical month-based segregation into horizontal tabs for three pages:
- **Batches page**: Currently groups batches vertically by `startDate` month
- **Students page**: Add month grouping by `enrollmentDate`
- **Leads page**: Add month grouping by `createdAt`

**Requirements:**
- Horizontal scrollable month tabs at top
- Active months shown by default, expandable to show all
- Click month to filter to that period only
- "All" tab to show everything
- Month badges with counts (e.g., "Jan 2025 (12)")

### Feature 2: External Referrer System
Implement a new three-tier referral payout system:
- **Current Students** (in system): 2500 INR
- **Veteran Students** (graduated/not in system): 2000 INR
- **External Referrers** (non-students): 1800 INR

**Current state:** Only Student-to-Student referrals with fixed 2000 INR payout

**Additional context:** Earlier in session, user also requested (and I completed):
- Consecutive absence alert system for students missing 2+ classes
- Teacher access restrictions (hiding student financial info and detail pages)

---

## 2. Key Technical Concepts

- **Next.js 15** with App Router
- **React Server Components** and Client Components ("use client")
- **NextAuth.js** session management with `useSession()`
- **Role-Based Access Control (RBAC)**: FOUNDER, MARKETING, TEACHER roles
- **Prisma ORM** for database operations
- **PostgreSQL** database via Neon
- **TypeScript** for type safety
- **Tailwind CSS** with dark mode support
- **Vercel Cron Jobs** for scheduled tasks (defined in `vercel.json`)
- **Resend API** for email automation
- **Conditional Rendering** pattern: `{!isTeacher && (...)}`

---

## 3. Files and Code Sections

### Completed Work (Consecutive Absence System):

#### `/prisma/schema.prisma` (Lines 79-80)
**Why important**: Database foundation for tracking consecutive absences
**Changes**: Added two new fields to Student model
```prisma
consecutiveAbsences  Int              @default(0)
lastAbsenceDate      DateTime?
```

#### `/app/api/attendance/route.ts` (Lines 172-233)
**Why important**: Core logic for calculating and tracking consecutive absences
**Changes**: Enhanced `updateStudentAttendance()` function
```typescript
// Calculate consecutive absences (from most recent)
let consecutiveAbsences = 0
let lastAbsenceDate: Date | null = null

for (const record of attendanceRecords) {
  if (record.status === "ABSENT") {
    consecutiveAbsences++
    if (!lastAbsenceDate) {
      lastAbsenceDate = record.date
    }
  } else {
    // Stop counting when we hit a non-absent record
    break
  }
}

// Enhanced churn risk calculation
if (attendanceRate < 50 || consecutiveAbsences >= 3) {
  churnRisk = "HIGH"
} else if (attendanceRate < 75 || consecutiveAbsences >= 2) {
  churnRisk = "MEDIUM"
}
```

#### `/app/api/attendance/[id]/route.ts` (Lines 132-193)
**Why important**: Same consecutive absence logic for single attendance updates
**Changes**: Duplicate implementation to ensure consistency

#### `/app/api/cron/consecutive-absence-alerts/route.ts`
**Why important**: Automated daily alert system for at-risk students
**Changes**: Complete new file implementing three-tier notification system

**Key sections:**
- Lines 24-42: Query for students with 2+ consecutive absences
- Lines 78-93: Student alerts (currently **DISABLED/commented out**)
- Lines 95-165: Teacher alerts (**ACTIVE**)
- Lines 167-236: Admin alerts for high-risk cases only (**ACTIVE**)

```typescript
// Currently suppressed student alerts
// if (student.emailNotifications && student.emailAttendance && student.email) {
//   await resend.emails.send({...})
// }

// Active teacher alerts
if (student.batch?.teacher?.email) {
  await resend.emails.send({
    from: "Plan Beta <noreply@planb-edu.com>",
    to: student.batch.teacher.email,
    subject: `${isHighRisk ? "⚠️ Urgent" : "📊"} Student Attendance Alert: ${student.name}`,
    // ... detailed email template
  })
}
```

#### `/app/dashboard/students/page.tsx`
**Why important**: Student list page with visual absence indicators and teacher restrictions
**Changes:**
1. Added absence tracking to Student type (lines 23-24)
2. Added `getAbsenceAlert()` helper (lines 91-108)
3. Visual badges in mobile view (lines 227-234)
4. Visual badges in desktop view (lines 373-383)
5. Removed Actions column for teachers (lines 323-327, 386-414)

```typescript
const getAbsenceAlert = (consecutiveAbsences: number) => {
  if (consecutiveAbsences >= 3) {
    return {
      show: true,
      color: "bg-error/10 text-error border-error/20",
      icon: "⚠️",
      text: `${consecutiveAbsences} Absences`,
    }
  } else if (consecutiveAbsences >= 2) {
    return {
      show: true,
      color: "bg-warning/10 text-warning border-warning/20",
      icon: "⚠️",
      text: `${consecutiveAbsences} Absences`,
    }
  }
  return { show: false, color: "", icon: "", text: "" }
}
```

#### `/app/dashboard/batches/[id]/page.tsx`
**Why important**: Student cards made non-clickable for teachers
**Changes**: Removed `onClick` handler for teachers, prevented navigation to student detail pages

#### `/vercel.json`
**Why important**: Schedules cron job execution
**Changes**: Added consecutive absence alert cron job
```json
{
  "crons": [
    {
      "path": "/api/cron/backup",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/consecutive-absence-alerts",
      "schedule": "0 22 * * *"
    }
  ]
}
```

### Research Files for Pending Work:

#### `/app/dashboard/batches/page.tsx` (Lines 92-113)
**Why important**: Current vertical month segregation pattern to be replaced
```typescript
// Group batches by month/year of start date
const batchesByMonth = batches.reduce((acc, batch) => {
  if (!batch.startDate) {
    if (!acc["Unscheduled"]) acc["Unscheduled"] = []
    acc["Unscheduled"].push(batch)
    return acc
  }
  const date = new Date(batch.startDate)
  const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  if (!acc[monthYear]) acc[monthYear] = []
  acc[monthYear].push(batch)
  return acc
}, {} as Record<string, Batch[]>)
```

#### `/app/dashboard/referrals/page.tsx`
**Why important**: Current referral system to be extended
- Currently only handles Student-to-Student referrals
- Fixed 2000 INR payout (line 195: `payoutAmount   Decimal      @default(2000)`)
- Relations only to Student model (lines 201-202)

#### `/prisma/schema.prisma` - Referral model (Lines 188-209)
**Why important**: Needs major restructuring for external referrers
```prisma
model Referral {
  id             String       @id @default(cuid())
  referralDate   DateTime     @default(now())
  referrerId     String       // Currently required, needs to be optional
  refereeId      String
  enrollmentDate DateTime?
  month1Complete Boolean      @default(false)
  payoutAmount   Decimal      @default(2000) @db.Decimal(10, 2)  // Needs to be dynamic
  payoutStatus   PayoutStatus @default(PENDING)
  payoutDate     DateTime?
  notes          String?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  referee        Student      @relation("RefereeStudent", fields: [refereeId], references: [id], onDelete: Cascade)
  referrer       Student      @relation("ReferrerStudent", fields: [referrerId], references: [id], onDelete: Cascade)  // Needs to be optional

  @@unique([referrerId, refereeId])
  @@index([referrerId])
  @@index([refereeId])
  @@index([payoutStatus])
  @@index([month1Complete])
}
```

---

## 4. Errors and Fixes

### Error 1: Migration drift when adding consecutive absence fields
**Error**: `prisma migrate dev` detected drift, tried to reset database
**Fix**: Used `npx prisma db push` instead to avoid migration issues
**User feedback**: None, resolved before user interaction

### Error 2: Initially showing "-" in Actions column for teachers
**User feedback**: "remove the actions heading then from the student list"
**Fix**: Changed from showing "-" to completely removing the `<th>` and `<td>` elements with conditional rendering
**Result**: Cleaner UI with proper colspan calculations

---

## 5. Problem Solving

### Solved Problems:

1. **Consecutive Absence Tracking Logic**
   - **Problem**: How to calculate consecutive absences from most recent attendance
   - **Solution**: Sort records by date DESC, iterate from newest, break on first non-absent
   - **Result**: Accurate tracking that resets when student attends

2. **Churn Risk Enhancement**
   - **Problem**: Existing churn risk didn't account for consecutive absences
   - **Solution**: Added consecutive absence thresholds (2+ = MEDIUM, 3+ = HIGH)
   - **Result**: More accurate early warning system

3. **Teacher Access Restrictions**
   - **Problem**: Teachers could see all financial info and access student details
   - **Solution**: Systematic use of `{!isTeacher && (...)}` pattern across multiple components
   - **Result**: Complete financial information lockdown for teachers

4. **Alert Email Suppression**
   - **Problem**: User wanted only teacher/admin alerts, not student alerts
   - **Solution**: Commented out student email section, updated docs, kept logic for future re-enable
   - **Result**: Easy to toggle back on when needed

---

## 6. All User Messages

1. "is there a system baked in that would notify the admin and teacher that a particular student is missing more than 2 classes in a row? what are other meaningful and high impact insights and tools we could implement based on teacher input?"

2. "hide student info(revenue etc..) view button/option from students list"

3. "remove the actions heading then from the student list"

4. "suppress student alerts for now. teacher and admin alerts we will keep."

5. "for marketing user, we can do somethings. 1. Implement a horizontal calendar mode to show lists seggregated to calendar months, be it batches, leads, students, with the data from the active months shown as default(instead of the current seggregation vertically based on month). 2. add a new implementation for external referrers and in that 2 subgroups 1. veteran students who are not in our current lists 2. Ext. referrer. we will plan to pay veterans 2000 INR and external referrer 1800 INR. students in our lists currently and who gets added later, when they reffer, they will get 2500 INR as we planned before."

6. "update readme, create a handover document dated today that would help us to seemlessly start in a new session"

---

## 7. Pending Tasks

### Todo List Created (13 tasks total):

**External Referrer System (8 tasks):**
1. ⏳ Add ReferrerType enum and ExternalReferrer model to schema
2. ⏳ Update Referral model to support external referrers
3. ⏳ Run database migration for referrer changes
4. ⏳ Create API endpoints for external referrers
5. ⏳ Create External Referrers management pages
6. ⏳ Update referrals API to support all referrer types
7. ⏳ Update referrals UI for 3 referrer types
8. ⏳ Update navigation and permissions for external referrers

**Horizontal Calendar Mode (4 tasks):**
9. ⏳ Create MonthTabs reusable component
10. ⏳ Add horizontal calendar mode to Batches page
11. ⏳ Add horizontal calendar mode to Students page
12. ⏳ Add horizontal calendar mode to Leads page

**Final:**
13. ⏳ Test all features and commit changes

### Detailed Implementation Plan:

#### Feature 1: Horizontal Calendar Mode

**Create `/components/MonthTabs.tsx`** - Reusable component with:
- Horizontal scrollable month tabs
- "All" tab option
- Active month highlighting
- Count badges per month
- Smooth scroll for many months

**Modify three pages to use MonthTabs:**
- `/app/dashboard/batches/page.tsx` - Replace vertical sections
- `/app/dashboard/students/page.tsx` - Add month grouping by enrollmentDate
- `/app/dashboard/leads/page.tsx` - Add month grouping by createdAt

#### Feature 2: External Referrer System

**Database Schema Changes** (`/prisma/schema.prisma`):
```prisma
enum ReferrerType {
  CURRENT_STUDENT    // 2500 INR
  VETERAN_STUDENT    // 2000 INR
  EXTERNAL_REFERRER  // 1800 INR
}

model ExternalReferrer {
  id          String        @id @default(cuid())
  name        String
  whatsapp    String        @unique
  email       String?
  type        ReferrerType  // VETERAN_STUDENT or EXTERNAL_REFERRER
  notes       String?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  referrals   Referral[]    @relation("ExternalReferrerReferrals")

  @@index([whatsapp])
  @@index([type])
}

model Referral {
  // Add:
  referrerType       ReferrerType
  externalReferrerId String?
  externalReferrer   ExternalReferrer? @relation("ExternalReferrerReferrals", fields: [externalReferrerId], references: [id])

  // Make optional:
  referrerId  String?
  referrer    Student? @relation("ReferrerStudent", fields: [referrerId], references: [id], onDelete: Cascade)

  // Update unique constraint:
  @@unique([referrerId, refereeId, externalReferrerId])
}
```

**API Endpoints to Create:**
- `POST /api/external-referrers` - Create veteran/external referrer
- `GET /api/external-referrers` - List all external referrers
- `GET /api/external-referrers/[id]` - Get referrer details
- Update `POST /api/referrals` - Support all 3 referrer types

**UI Pages to Create:**
- `/app/dashboard/external-referrers/page.tsx` - List view with tabs
- `/app/dashboard/external-referrers/new/page.tsx` - Create form
- Update `/app/dashboard/referrals/page.tsx` - Show referrer type badges
- Update `/app/dashboard/referrals/new/page.tsx` - Dropdown for referrer type selection

**Permissions Update** (`/lib/permissions.ts`):
- Add external-referrers resource for FOUNDER and MARKETING roles
- Add navigation item

---

## 8. Current Work

Immediately before this handover document request, I was:

**Task**: Creating a comprehensive implementation plan for two marketing features
**Status**: Plan approved by user, todo list created

**Last actions taken:**
1. Created ExitPlanMode plan document outlining both features
2. User approved the plan
3. Created todo list with 13 tasks using TodoWrite
4. Noted conversation length constraints and recommended approach

**User's exact request**: "update readme, create a handover document dated today that would help us to seemlessly start in a new session"

**My exact response**: "These are substantial features that deserve dedicated implementation time. I suggest we: 1. Continue in a fresh session where we can focus solely on implementing these features without context limits 2. Start with Feature 2 (External Referrers) since it has database dependencies 3. Then implement Feature 1 (Calendar Mode) which is more straightforward"

---

## 9. Next Steps (For New Session)

When resuming work, begin with:

### Step 1: Update database schema for external referrer system
- Add `ReferrerType` enum to `/prisma/schema.prisma`
- Create `ExternalReferrer` model
- Update `Referral` model to support all three referrer types
- Run `npx prisma db push` to apply changes

### Step 2: Create API endpoints for external referrers
- Implement CRUD operations in `/app/api/external-referrers/`
- Update `/app/api/referrals/route.ts` to handle new referrer types

### Step 3: Build UI for external referrer management
- Create list and form pages
- Update referrals UI with type selection

### Step 4: Implement horizontal calendar mode
- Create reusable MonthTabs component
- Apply to Batches, Students, and Leads pages

**Reasoning**: Starting with Feature 2 (External Referrers) because:
1. It has database dependencies that other work may depend on
2. More complex system requiring careful implementation
3. User specifically mentioned this first in their feature request

---

## Git Status

**Recent commits:**
- `a6b9eef` - Disable student absence alert emails
- `f864698` - Add consecutive absence alert system
- `b5e7943` - Remove Actions column from students table for teachers
- `0e661c6` - Hide student detail access for teachers

**Current branch**: main
**Uncommitted changes**: README.md and HANDOVER.md updates (in progress)

---

## Environment Notes

- Multiple dev servers running (various ports)
- Prisma Studio available on port 5555
- Database: PostgreSQL via Neon
- Email service: Resend API (fully operational)
- All tests passing for implemented features
- Cron jobs configured in `vercel.json`
- Daily automated backups via GitHub Actions (2 AM UTC)

---

## Important Implementation Notes

### For External Referrer System:
1. **Payout calculation logic**: Must dynamically determine payout based on `ReferrerType`
   - Current Student: 2500 INR
   - Veteran Student: 2000 INR
   - External Referrer: 1800 INR

2. **Unique constraint handling**: The unique constraint needs to handle three scenarios:
   - Student-to-Student: `(referrerId, refereeId)`
   - External-to-Student: `(externalReferrerId, refereeId)`
   - Need to ensure either referrerId OR externalReferrerId is set, not both

3. **Migration strategy**: Use `npx prisma db push` for development (to avoid migration conflicts)

### For Horizontal Calendar Mode:
1. **Active month detection**: Determine "active" months by checking if there are records from the current month or previous 2-3 months
2. **Month generation**: Generate month list dynamically based on actual data, not hardcoded
3. **Scroll behavior**: Use horizontal scroll with snap points for smooth navigation
4. **Count badges**: Real-time count of records per month
5. **State management**: Use URL query params to maintain selected month on page refresh

---

**End of Handover Document**

This document provides a complete context transfer for seamless continuation in a new session. All critical information, code references, and next steps are documented above.
