# Plan Beta Dashboard - Progressive Web App (PWA) Developer Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Authentication & Authorization](#authentication--authorization)
7. [PWA Configuration](#pwa-configuration)
8. [Mobile-Optimized Features](#mobile-optimized-features)
9. [Deployment](#deployment)
10. [Environment Variables](#environment-variables)
11. [Cron Jobs & Background Tasks](#cron-jobs--background-tasks)
12. [Business Logic](#business-logic)

---

## Project Overview

**Plan Beta Dashboard** is a comprehensive school management system built as a Progressive Web App (PWA) for managing:
- Lead tracking and conversion
- Student enrollment and management
- Batch scheduling and capacity management
- Payment processing (multi-currency: EUR/INR)
- Teacher management with per-level hourly rates
- Invoice generation with mobile sharing capabilities
- Attendance tracking
- Referral program management
- Analytics and insights

### Key Features
- ✅ Installable PWA with offline support
- ✅ Mobile-first responsive design
- ✅ Multi-currency support (EUR/INR with exchange rates)
- ✅ Role-based access control (Admin, Teacher, Marketing)
- ✅ Real-time notifications
- ✅ Mobile invoice generation with image export
- ✅ Follow-up tracking with urgency indicators
- ✅ Batch capacity management
- ✅ Payment tracking with partial payments
- ✅ Automated cron jobs for reminders

---

## Technology Stack

### Frontend
- **Framework**: Next.js 15.5.4 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **State Management**: React Hooks + Server Components
- **PWA**: @ducanh2912/next-pwa
- **Authentication**: NextAuth.js v5 (Auth.js)
- **UI Components**: Custom components with Tailwind

### Backend
- **Runtime**: Node.js
- **Framework**: Next.js API Routes (Server Actions)
- **Database**: PostgreSQL (via Neon)
- **ORM**: Prisma 6.16.3
- **Authentication**: NextAuth.js with credentials provider
- **Password Hashing**: bcryptjs

### DevOps & Deployment
- **Hosting**: Vercel
- **Database**: Neon PostgreSQL (serverless)
- **Version Control**: Git/GitHub
- **CI/CD**: Vercel automatic deployments

### External Services
- **Cron Jobs**: Vercel Cron (automatic triggers)
- **File Storage**: Local/Vercel (for generated files)

---

## Architecture

### Directory Structure

```
plan-beta-dashboard/
├── app/
│   ├── api/                      # API routes
│   │   ├── auth/
│   │   │   └── [...nextauth]/    # NextAuth configuration
│   │   ├── leads/                # Lead management endpoints
│   │   ├── students/             # Student management endpoints
│   │   ├── batches/              # Batch management endpoints
│   │   ├── teachers/             # Teacher management endpoints
│   │   ├── payments/             # Payment endpoints
│   │   ├── invoices/             # Invoice generation
│   │   ├── attendance/           # Attendance tracking
│   │   ├── referrals/            # Referral program
│   │   ├── analytics/            # Analytics endpoints
│   │   ├── teacher-hours/        # Teacher hours tracking
│   │   ├── feedback/             # Student feedback
│   │   ├── cron/                 # Cron job endpoints
│   │   │   ├── payment-reminders/
│   │   │   ├── attendance-alerts/
│   │   │   └── month-completion/
│   │   └── system/               # System utilities
│   ├── dashboard/                # Dashboard pages
│   │   ├── leads/
│   │   ├── students/
│   │   ├── batches/
│   │   ├── teachers/
│   │   ├── payments/
│   │   ├── attendance/
│   │   ├── referrals/
│   │   ├── insights/
│   │   ├── activity/
│   │   ├── profile/
│   │   └── help/
│   ├── login/                    # Login page
│   ├── offline/                  # PWA offline fallback
│   └── layout.tsx                # Root layout with PWA meta
├── components/                   # Reusable React components
│   ├── GenerateInvoiceButton.tsx
│   └── Providers.tsx
├── lib/                          # Utility libraries
│   ├── auth.ts                   # Auth configuration
│   ├── db.ts                     # Database client
│   ├── utils.ts                  # Utility functions
│   └── session.ts                # Session management
├── prisma/
│   └── schema.prisma             # Database schema
├── public/
│   ├── manifest.json             # PWA manifest
│   ├── icon-192.png              # PWA icons
│   ├── icon-512.png
│   ├── apple-touch-icon.png
│   ├── sw.js                     # Service worker (generated)
│   └── workbox-*.js              # Workbox files (generated)
├── next.config.ts                # Next.js + PWA config
├── tailwind.config.ts            # Tailwind configuration
└── .env                          # Environment variables
```

### Data Flow

```
User Request
    ↓
Next.js Middleware (Auth Check)
    ↓
Page/API Route
    ↓
Server Component/API Handler
    ↓
Prisma ORM
    ↓
PostgreSQL Database
    ↓
Response to Client
    ↓
Client-Side Rendering/Update
```

---

## Database Schema

### Core Models

#### User
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String
  password      String    // bcrypt hashed
  role          Role      @default(ADMIN)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

enum Role {
  ADMIN
  TEACHER
  MARKETING
}
```

#### Lead
```prisma
model Lead {
  id                    String    @id @default(cuid())
  name                  String
  whatsapp              String
  email                 String?
  phone                 String?
  source                LeadSource
  status                LeadStatus  @default(NEW)
  quality               LeadQuality @default(WARM)
  interestedLevel       String?     // A1, A2, B1, B2
  interestedType        String?     // ONLINE, OFFLINE
  converted             Boolean     @default(false)
  convertedDate         DateTime?
  interestedBatchId     String?
  interestedBatch       Batch?      @relation(fields: [interestedBatchId], references: [id])
  assignedToId          String?
  assignedTo            User?       @relation(fields: [assignedToId], references: [id])
  convertedToStudentId  String?     @unique
  convertedToStudent    Student?    @relation(fields: [convertedToStudentId], references: [id])
  firstContactDate      DateTime    @default(now())
  lastContactDate       DateTime?
  followUpDate          DateTime?
  contactAttempts       Int         @default(0)
  notes                 String?
  createdAt             DateTime    @default(now())
  updatedAt             DateTime    @updatedAt
}

enum LeadSource {
  META_ADS
  INSTAGRAM
  GOOGLE
  ORGANIC
  REFERRAL
  OTHER
}

enum LeadStatus {
  NEW
  CONTACTED
  INTERESTED
  TRIAL_SCHEDULED
  TRIAL_ATTENDED
  CONVERTED
  LOST
}

enum LeadQuality {
  HOT
  WARM
  COLD
}
```

#### Student
```prisma
model Student {
  id                  String    @id @default(cuid())
  studentId           String    @unique  // Auto-generated (e.g., PB2025001)
  name                String
  whatsapp            String
  email               String?
  dateOfBirth         DateTime?
  nationality         String?
  currentLevel        String
  enrollmentType      EnrollmentType
  enrollmentDate      DateTime    @default(now())
  paymentStatus       PaymentStatus @default(PENDING)

  // Pricing
  pbTarif             Decimal?    // Base price from PB Tarif
  discountPercent     Decimal?    // Discount percentage
  discountAmount      Decimal?    // Calculated discount
  finalPrice          Decimal     // Final price after discount
  amountPaid          Decimal     @default(0)
  balance             Decimal     // Remaining balance
  currency            String      @default("EUR")
  eurToInrRate        Decimal?    // Exchange rate used

  // Batch assignment
  batchId             String?
  batch               Batch?      @relation(fields: [batchId], references: [id])

  // Status
  completionStatus    CompletionStatus @default(ACTIVE)

  // Relations
  leadId              String?     @unique
  lead                Lead?       @relation("StudentToLead")
  payments            Payment[]
  attendance          Attendance[]
  feedback            Feedback[]
  referrals           Referral[]  @relation("StudentReferrals")
  referredBy          Referral?   @relation("ReferredStudent")

  // Email preferences
  marketingEmailsEnabled  Boolean @default(true)

  createdAt           DateTime    @default(now())
  updatedAt           DateTime    @updatedAt
}

enum EnrollmentType {
  FULL_COURSE
  TRIAL
  MONTHLY
}

enum PaymentStatus {
  PAID
  PENDING
  PARTIAL
  OVERDUE
}

enum CompletionStatus {
  ACTIVE
  COMPLETED
  DROPPED
  ON_HOLD
}
```

#### Batch
```prisma
model Batch {
  id              String    @id @default(cuid())
  batchCode       String    @unique  // e.g., A1-JAN-2025
  level           String    // A1, A2, B1, B2
  totalSeats      Int
  enrolledCount   Int       @default(0)
  fillRate        Decimal   @default(0)  // Percentage
  status          BatchStatus @default(PLANNING)
  startDate       DateTime?
  endDate         DateTime?

  // Teacher assignment
  teacherId       String?
  teacher         Teacher?  @relation(fields: [teacherId], references: [id])

  // Financial
  revenueTarget   Decimal   @default(0)
  revenueActual   Decimal   @default(0)
  teacherCost     Decimal   @default(0)
  profit          Decimal   @default(0)

  // Relations
  students        Student[]
  interestedLeads Lead[]
  attendance      Attendance[]
  teacherHours    TeacherHours[]

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

enum BatchStatus {
  PLANNING
  FILLING
  FULL
  RUNNING
  COMPLETED
  POSTPONED
  CANCELLED
}
```

#### Teacher
```prisma
model Teacher {
  id                String    @id @default(cuid())
  name              String
  email             String    @unique
  phone             String
  expertise         String[]  // Array of levels: ["A1", "A2", "B1", "B2"]

  // Hourly rates per level
  hourlyRateA1      Decimal?
  hourlyRateA2      Decimal?
  hourlyRateB1      Decimal?
  hourlyRateB2      Decimal?

  status            TeacherStatus @default(ACTIVE)

  // Relations
  batches           Batch[]
  teacherHours      TeacherHours[]

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

enum TeacherStatus {
  ACTIVE
  INACTIVE
  ON_LEAVE
}
```

#### Payment
```prisma
model Payment {
  id              String    @id @default(cuid())
  studentId       String
  student         Student   @relation(fields: [studentId], references: [id])
  amount          Decimal
  currency        String    @default("EUR")
  eurToInrRate    Decimal?
  paymentMethod   PaymentMethod
  paymentDate     DateTime  @default(now())
  notes           String?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

enum PaymentMethod {
  CASH
  BANK_TRANSFER
  CARD
  UPI
  OTHER
}
```

#### Attendance
```prisma
model Attendance {
  id              String    @id @default(cuid())
  studentId       String
  student         Student   @relation(fields: [studentId], references: [id])
  batchId         String
  batch           Batch     @relation(fields: [batchId], references: [id])
  date            DateTime
  status          AttendanceStatus
  notes           String?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@unique([studentId, batchId, date])
}

enum AttendanceStatus {
  PRESENT
  ABSENT
  LATE
  EXCUSED
}
```

#### TeacherHours
```prisma
model TeacherHours {
  id              String    @id @default(cuid())
  teacherId       String
  teacher         Teacher   @relation(fields: [teacherId], references: [id])
  batchId         String?
  batch           Batch?    @relation(fields: [batchId], references: [id])
  date            DateTime
  hoursWorked     Decimal
  level           String    // A1, A2, B1, B2
  hourlyRate      Decimal
  totalPay        Decimal
  notes           String?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

#### Referral
```prisma
model Referral {
  id              String    @id @default(cuid())
  referrerId      String
  referrer        Student   @relation("StudentReferrals", fields: [referrerId], references: [id])
  referredStudentId String? @unique
  referredStudent Student?  @relation("ReferredStudent", fields: [referredStudentId], references: [id])
  referredName    String
  referredContact String
  status          ReferralStatus @default(PENDING)
  rewardAmount    Decimal?
  rewardPaid      Boolean   @default(false)
  notes           String?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

enum ReferralStatus {
  PENDING
  CONTACTED
  ENROLLED
  REJECTED
}
```

#### Feedback
```prisma
model Feedback {
  id              String    @id @default(cuid())
  studentId       String
  student         Student   @relation(fields: [studentId], references: [id])
  rating          Int       // 1-5
  comments        String?
  category        FeedbackCategory

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

enum FeedbackCategory {
  TEACHER
  COURSE
  PLATFORM
  SUPPORT
  OTHER
}
```

#### AuditLog
```prisma
model AuditLog {
  id              String    @id @default(cuid())
  userId          String?
  action          String
  entityType      String
  entityId        String?
  details         Json?
  ipAddress       String?

  createdAt       DateTime  @default(now())
}
```

---

## API Endpoints

### Base URL
- **Development**: `http://localhost:3000`
- **Production**: `https://your-domain.vercel.app`

### Authentication

#### POST `/api/auth/signin`
**Description**: User login

**Request Body**:
```json
{
  "email": "admin@planbeta.com",
  "password": "yourpassword"
}
```

**Response**:
```json
{
  "user": {
    "id": "clx123...",
    "email": "admin@planbeta.com",
    "name": "Admin User",
    "role": "ADMIN"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### POST `/api/auth/signout`
**Description**: User logout

---

### Leads API

#### GET `/api/leads`
**Description**: Get all leads with optional filters

**Query Parameters**:
- `search` (string): Search by name, phone, email
- `status` (LeadStatus): Filter by status
- `quality` (LeadQuality): Filter by quality
- `source` (LeadSource): Filter by source
- `converted` (boolean): Filter by conversion status

**Response**:
```json
[
  {
    "id": "clx123...",
    "name": "John Doe",
    "whatsapp": "+1234567890",
    "email": "john@example.com",
    "phone": "+1234567890",
    "source": "META_ADS",
    "status": "INTERESTED",
    "quality": "HOT",
    "interestedLevel": "A1",
    "interestedType": "ONLINE",
    "converted": false,
    "convertedDate": null,
    "interestedBatch": {
      "id": "batch123",
      "batchCode": "A1-JAN-2025",
      "level": "A1",
      "enrolledCount": 8,
      "totalSeats": 12
    },
    "assignedTo": {
      "name": "Marketing Manager",
      "email": "marketing@planbeta.com"
    },
    "convertedToStudent": null,
    "firstContactDate": "2025-01-15T10:30:00Z",
    "lastContactDate": "2025-01-20T14:20:00Z",
    "followUpDate": "2025-01-25T09:00:00Z",
    "contactAttempts": 3,
    "createdAt": "2025-01-15T10:30:00Z"
  }
]
```

#### GET `/api/leads/[id]`
**Description**: Get single lead by ID

**Response**: Same as single lead object above

#### POST `/api/leads`
**Description**: Create new lead

**Request Body**:
```json
{
  "name": "John Doe",
  "whatsapp": "+1234567890",
  "email": "john@example.com",
  "phone": "+1234567890",
  "source": "META_ADS",
  "status": "NEW",
  "quality": "WARM",
  "interestedLevel": "A1",
  "interestedType": "ONLINE",
  "interestedBatchId": "batch123",
  "assignedToId": "user123",
  "followUpDate": "2025-01-25T09:00:00Z",
  "notes": "Interested in weekend batches"
}
```

**Response**: Created lead object

#### PATCH `/api/leads/[id]`
**Description**: Update lead

**Request Body**: Same as POST (partial updates allowed)

**Response**: Updated lead object

#### DELETE `/api/leads/[id]`
**Description**: Delete lead

**Response**:
```json
{
  "message": "Lead deleted successfully"
}
```

#### POST `/api/leads/[id]/convert`
**Description**: Convert lead to student

**Request Body**:
```json
{
  "enrollmentType": "FULL_COURSE",
  "currentLevel": "A1",
  "batchId": "batch123",
  "pbTarif": 500,
  "discountPercent": 10,
  "currency": "EUR",
  "eurToInrRate": 88.5
}
```

**Response**:
```json
{
  "student": {
    "id": "student123",
    "studentId": "PB2025001",
    "name": "John Doe",
    ...
  },
  "lead": {
    "id": "lead123",
    "converted": true,
    "convertedDate": "2025-01-25T10:00:00Z",
    ...
  }
}
```

#### POST `/api/leads/parse`
**Description**: Parse lead data from text (WhatsApp messages, etc.)

**Request Body**:
```json
{
  "text": "Name: John Doe\nPhone: +1234567890\nInterested in A1"
}
```

**Response**:
```json
{
  "parsed": {
    "name": "John Doe",
    "phone": "+1234567890",
    "interestedLevel": "A1"
  }
}
```

#### POST `/api/leads/[id]/invoice`
**Description**: Generate invoice for lead (for trial payments)

**Request Body**:
```json
{
  "amount": 50,
  "currency": "EUR",
  "description": "Trial Class Payment"
}
```

**Response**: Invoice object with PDF/image data

---

### Students API

#### GET `/api/students`
**Description**: Get all students with optional filters

**Query Parameters**:
- `search` (string): Search by name, email, phone, studentId
- `level` (string): Filter by current level
- `status` (CompletionStatus): Filter by completion status
- `batchId` (string): Filter by batch
- `paymentStatus` (PaymentStatus): Filter by payment status

**Response**:
```json
[
  {
    "id": "student123",
    "studentId": "PB2025001",
    "name": "John Doe",
    "whatsapp": "+1234567890",
    "email": "john@example.com",
    "dateOfBirth": "1995-06-15T00:00:00Z",
    "nationality": "USA",
    "currentLevel": "A1",
    "enrollmentType": "FULL_COURSE",
    "enrollmentDate": "2025-01-25T10:00:00Z",
    "paymentStatus": "PARTIAL",
    "pbTarif": 500,
    "discountPercent": 10,
    "discountAmount": 50,
    "finalPrice": 450,
    "amountPaid": 200,
    "balance": 250,
    "currency": "EUR",
    "eurToInrRate": 88.5,
    "batch": {
      "id": "batch123",
      "batchCode": "A1-JAN-2025"
    },
    "completionStatus": "ACTIVE",
    "marketingEmailsEnabled": true,
    "createdAt": "2025-01-25T10:00:00Z"
  }
]
```

#### GET `/api/students/[id]`
**Description**: Get single student by ID

**Response**: Single student object with full details including payments, attendance

#### POST `/api/students`
**Description**: Create new student (direct enrollment without lead)

**Request Body**:
```json
{
  "name": "Jane Smith",
  "whatsapp": "+1234567891",
  "email": "jane@example.com",
  "dateOfBirth": "1998-03-20",
  "nationality": "UK",
  "currentLevel": "B1",
  "enrollmentType": "FULL_COURSE",
  "batchId": "batch456",
  "pbTarif": 600,
  "discountPercent": 15,
  "currency": "EUR",
  "eurToInrRate": 88.5
}
```

**Response**: Created student object

#### PATCH `/api/students/[id]`
**Description**: Update student

**Request Body**: Partial student object

**Response**: Updated student object

#### DELETE `/api/students/[id]`
**Description**: Delete student

**Response**:
```json
{
  "message": "Student deleted successfully"
}
```

#### PATCH `/api/students/[id]/email-preferences`
**Description**: Update email preferences

**Request Body**:
```json
{
  "marketingEmailsEnabled": false
}
```

**Response**: Updated student object

#### POST `/api/students/parse`
**Description**: Parse student data from text

---

### Batches API

#### GET `/api/batches`
**Description**: Get all batches with optional filters

**Query Parameters**:
- `level` (string): Filter by level
- `status` (BatchStatus): Filter by status
- `teacherId` (string): Filter by teacher

**Response**:
```json
[
  {
    "id": "batch123",
    "batchCode": "A1-JAN-2025",
    "level": "A1",
    "totalSeats": 12,
    "enrolledCount": 8,
    "fillRate": 66.67,
    "status": "FILLING",
    "startDate": "2025-02-01T09:00:00Z",
    "endDate": "2025-05-31T18:00:00Z",
    "teacher": {
      "id": "teacher123",
      "name": "Maria Garcia"
    },
    "revenueTarget": 6000,
    "revenueActual": 3600,
    "teacherCost": 1200,
    "profit": 2400,
    "students": [
      {
        "id": "student123",
        "name": "John Doe"
      }
    ],
    "createdAt": "2025-01-10T10:00:00Z"
  }
]
```

#### GET `/api/batches/[id]`
**Description**: Get single batch by ID

**Response**: Single batch object with full student list

#### POST `/api/batches`
**Description**: Create new batch

**Request Body**:
```json
{
  "batchCode": "A2-FEB-2025",
  "level": "A2",
  "totalSeats": 15,
  "startDate": "2025-02-15T09:00:00Z",
  "endDate": "2025-06-15T18:00:00Z",
  "teacherId": "teacher456",
  "revenueTarget": 7500,
  "status": "PLANNING"
}
```

**Response**: Created batch object

#### PATCH `/api/batches/[id]`
**Description**: Update batch

**Request Body**: Partial batch object

**Response**: Updated batch object

#### DELETE `/api/batches/[id]`
**Description**: Delete batch

**Response**:
```json
{
  "message": "Batch deleted successfully"
}
```

---

### Teachers API

#### GET `/api/teachers`
**Description**: Get all teachers

**Response**:
```json
[
  {
    "id": "teacher123",
    "name": "Maria Garcia",
    "email": "maria@planbeta.com",
    "phone": "+1234567892",
    "expertise": ["A1", "A2", "B1"],
    "hourlyRateA1": 25,
    "hourlyRateA2": 30,
    "hourlyRateB1": 35,
    "hourlyRateB2": null,
    "status": "ACTIVE",
    "batches": [
      {
        "id": "batch123",
        "batchCode": "A1-JAN-2025"
      }
    ],
    "createdAt": "2024-12-01T10:00:00Z"
  }
]
```

#### GET `/api/teachers/[id]`
**Description**: Get single teacher by ID

#### POST `/api/teachers`
**Description**: Create new teacher

**Request Body**:
```json
{
  "name": "Carlos Rodriguez",
  "email": "carlos@planbeta.com",
  "phone": "+1234567893",
  "expertise": ["B1", "B2"],
  "hourlyRateB1": 35,
  "hourlyRateB2": 40,
  "status": "ACTIVE"
}
```

**Response**: Created teacher object

#### PATCH `/api/teachers/[id]`
**Description**: Update teacher

#### DELETE `/api/teachers/[id]`
**Description**: Delete teacher

---

### Payments API

#### GET `/api/payments`
**Description**: Get all payments with optional filters

**Query Parameters**:
- `studentId` (string): Filter by student
- `startDate` (ISO date): Filter by date range start
- `endDate` (ISO date): Filter by date range end
- `method` (PaymentMethod): Filter by payment method

**Response**:
```json
[
  {
    "id": "payment123",
    "student": {
      "id": "student123",
      "studentId": "PB2025001",
      "name": "John Doe"
    },
    "amount": 200,
    "currency": "EUR",
    "eurToInrRate": 88.5,
    "paymentMethod": "BANK_TRANSFER",
    "paymentDate": "2025-01-25T10:00:00Z",
    "notes": "First installment",
    "createdAt": "2025-01-25T10:00:00Z"
  }
]
```

#### GET `/api/payments/[id]`
**Description**: Get single payment by ID

#### POST `/api/payments`
**Description**: Record new payment

**Request Body**:
```json
{
  "studentId": "student123",
  "amount": 250,
  "currency": "EUR",
  "eurToInrRate": 88.5,
  "paymentMethod": "CARD",
  "paymentDate": "2025-02-01T10:00:00Z",
  "notes": "Second installment"
}
```

**Response**: Created payment object + updated student balance

#### PATCH `/api/payments/[id]`
**Description**: Update payment

#### DELETE `/api/payments/[id]`
**Description**: Delete payment (also updates student balance)

---

### Invoices API

#### POST `/api/invoices/generate`
**Description**: Generate invoice for student

**Request Body**:
```json
{
  "studentId": "student123",
  "format": "pdf" | "image"
}
```

**Response**:
```json
{
  "invoiceId": "inv123",
  "pdfUrl": "data:application/pdf;base64,...",
  "imageUrl": "data:image/png;base64,...",
  "downloadUrl": "/invoices/inv123.pdf"
}
```

#### POST `/api/invoices/[id]/pay-and-convert`
**Description**: Process payment and convert lead to student (used for trial payments)

**Request Body**:
```json
{
  "leadId": "lead123",
  "amount": 50,
  "currency": "EUR",
  "paymentMethod": "CARD"
}
```

**Response**: Created student + payment objects

---

### Attendance API

#### GET `/api/attendance`
**Description**: Get attendance records

**Query Parameters**:
- `studentId` (string): Filter by student
- `batchId` (string): Filter by batch
- `date` (ISO date): Filter by specific date
- `startDate` (ISO date): Date range start
- `endDate` (ISO date): Date range end

**Response**:
```json
[
  {
    "id": "attendance123",
    "student": {
      "id": "student123",
      "studentId": "PB2025001",
      "name": "John Doe"
    },
    "batch": {
      "id": "batch123",
      "batchCode": "A1-JAN-2025"
    },
    "date": "2025-02-01T09:00:00Z",
    "status": "PRESENT",
    "notes": null,
    "createdAt": "2025-02-01T09:05:00Z"
  }
]
```

#### POST `/api/attendance`
**Description**: Mark attendance (single or bulk)

**Request Body (Single)**:
```json
{
  "studentId": "student123",
  "batchId": "batch123",
  "date": "2025-02-01",
  "status": "PRESENT",
  "notes": "On time"
}
```

**Request Body (Bulk)**:
```json
{
  "batchId": "batch123",
  "date": "2025-02-01",
  "attendance": [
    {
      "studentId": "student123",
      "status": "PRESENT"
    },
    {
      "studentId": "student456",
      "status": "ABSENT",
      "notes": "Sick"
    }
  ]
}
```

**Response**: Created attendance record(s)

#### PATCH `/api/attendance/[id]`
**Description**: Update attendance

#### DELETE `/api/attendance/[id]`
**Description**: Delete attendance record

---

### Teacher Hours API

#### GET `/api/teacher-hours`
**Description**: Get teacher hours records

**Query Parameters**:
- `teacherId` (string): Filter by teacher
- `batchId` (string): Filter by batch
- `startDate` (ISO date): Date range start
- `endDate` (ISO date): Date range end

**Response**:
```json
[
  {
    "id": "hours123",
    "teacher": {
      "id": "teacher123",
      "name": "Maria Garcia"
    },
    "batch": {
      "id": "batch123",
      "batchCode": "A1-JAN-2025"
    },
    "date": "2025-02-01T09:00:00Z",
    "hoursWorked": 2.5,
    "level": "A1",
    "hourlyRate": 25,
    "totalPay": 62.50,
    "notes": "Regular class",
    "createdAt": "2025-02-01T11:30:00Z"
  }
]
```

#### GET `/api/teacher-hours/summary`
**Description**: Get summary of teacher hours and pay

**Query Parameters**:
- `teacherId` (string): Filter by teacher
- `startDate` (ISO date): Date range start
- `endDate` (ISO date): Date range end

**Response**:
```json
{
  "totalHours": 40,
  "totalPay": 1200,
  "breakdown": {
    "A1": { "hours": 20, "pay": 500 },
    "A2": { "hours": 15, "pay": 450 },
    "B1": { "hours": 5, "pay": 175 }
  }
}
```

#### POST `/api/teacher-hours`
**Description**: Record teacher hours

**Request Body**:
```json
{
  "teacherId": "teacher123",
  "batchId": "batch123",
  "date": "2025-02-01",
  "hoursWorked": 2.5,
  "level": "A1",
  "notes": "Regular class"
}
```

**Response**: Created teacher hours record (hourlyRate and totalPay auto-calculated)

#### PATCH `/api/teacher-hours/[id]`
**Description**: Update teacher hours

#### DELETE `/api/teacher-hours/[id]`
**Description**: Delete teacher hours record

---

### Referrals API

#### GET `/api/referrals`
**Description**: Get all referrals

**Query Parameters**:
- `referrerId` (string): Filter by referrer student
- `status` (ReferralStatus): Filter by status

**Response**:
```json
[
  {
    "id": "referral123",
    "referrer": {
      "id": "student123",
      "studentId": "PB2025001",
      "name": "John Doe"
    },
    "referredStudent": {
      "id": "student789",
      "studentId": "PB2025015",
      "name": "Jane Smith"
    },
    "referredName": "Jane Smith",
    "referredContact": "+1234567899",
    "status": "ENROLLED",
    "rewardAmount": 50,
    "rewardPaid": true,
    "notes": "Friend from college",
    "createdAt": "2025-01-20T10:00:00Z"
  }
]
```

#### POST `/api/referrals`
**Description**: Create new referral

**Request Body**:
```json
{
  "referrerId": "student123",
  "referredName": "Jane Smith",
  "referredContact": "+1234567899",
  "notes": "Friend from college"
}
```

**Response**: Created referral object

#### PATCH `/api/referrals/[id]`
**Description**: Update referral (change status, link to enrolled student, mark reward as paid)

**Request Body**:
```json
{
  "status": "ENROLLED",
  "referredStudentId": "student789",
  "rewardAmount": 50,
  "rewardPaid": true
}
```

**Response**: Updated referral object

---

### Feedback API

#### GET `/api/feedback`
**Description**: Get all feedback

**Query Parameters**:
- `studentId` (string): Filter by student
- `category` (FeedbackCategory): Filter by category
- `minRating` (number): Filter by minimum rating

**Response**:
```json
[
  {
    "id": "feedback123",
    "student": {
      "id": "student123",
      "studentId": "PB2025001",
      "name": "John Doe"
    },
    "rating": 5,
    "comments": "Excellent teacher and course materials!",
    "category": "TEACHER",
    "createdAt": "2025-02-10T14:00:00Z"
  }
]
```

#### POST `/api/feedback`
**Description**: Submit feedback

**Request Body**:
```json
{
  "studentId": "student123",
  "rating": 5,
  "comments": "Great experience!",
  "category": "COURSE"
}
```

**Response**: Created feedback object

---

### Analytics API

#### GET `/api/analytics/dashboard`
**Description**: Get dashboard analytics

**Response**:
```json
{
  "leads": {
    "total": 150,
    "new": 25,
    "converted": 45,
    "conversionRate": 30
  },
  "students": {
    "total": 120,
    "active": 100,
    "completed": 15,
    "dropped": 5
  },
  "batches": {
    "total": 12,
    "planning": 2,
    "filling": 4,
    "running": 5,
    "completed": 1
  },
  "revenue": {
    "total": 54000,
    "thisMonth": 8500,
    "lastMonth": 7200,
    "growth": 18.06
  },
  "payments": {
    "collected": 48000,
    "pending": 6000,
    "overdue": 2000
  }
}
```

#### GET `/api/analytics/insights`
**Description**: Get detailed insights

**Query Parameters**:
- `startDate` (ISO date): Date range start
- `endDate` (ISO date): Date range end

**Response**:
```json
{
  "leadsBySource": {
    "META_ADS": 60,
    "INSTAGRAM": 40,
    "GOOGLE": 25,
    "REFERRAL": 15,
    "ORGANIC": 10
  },
  "studentsByLevel": {
    "A1": 45,
    "A2": 35,
    "B1": 25,
    "B2": 15
  },
  "revenueByMonth": [
    { "month": "2025-01", "revenue": 7200 },
    { "month": "2025-02", "revenue": 8500 }
  ],
  "batchFillRates": [
    { "batchCode": "A1-JAN-2025", "fillRate": 83.33 },
    { "batchCode": "A2-JAN-2025", "fillRate": 66.67 }
  ],
  "topTeachers": [
    { "name": "Maria Garcia", "totalHours": 120, "rating": 4.8 }
  ]
}
```

---

### Cron Jobs API

#### POST `/api/cron/payment-reminders`
**Description**: Send payment reminders to students with pending/overdue balances

**Headers**:
```
Authorization: Bearer <CRON_SECRET>
```

**Trigger**: Daily at 9:00 AM

**Logic**:
1. Find students with `balance > 0`
2. Filter by `paymentStatus = PENDING` or `OVERDUE`
3. Send email/WhatsApp reminder
4. Log audit trail

**Response**:
```json
{
  "success": true,
  "remindersSent": 15,
  "errors": []
}
```

#### POST `/api/cron/attendance-alerts`
**Description**: Alert about low attendance

**Trigger**: Weekly on Monday at 8:00 AM

**Logic**:
1. Calculate attendance rate for each student (last 30 days)
2. Find students with < 75% attendance
3. Send alerts to admins and teachers
4. Log audit trail

**Response**:
```json
{
  "success": true,
  "alertsSent": 8,
  "studentsBelow75": [
    {
      "studentId": "PB2025001",
      "name": "John Doe",
      "attendanceRate": 65.5
    }
  ]
}
```

#### POST `/api/cron/month-completion`
**Description**: Handle month-end tasks

**Trigger**: First day of each month at 1:00 AM

**Logic**:
1. Calculate monthly revenue
2. Calculate teacher payments
3. Update batch statuses
4. Archive completed batches
5. Generate monthly reports
6. Send summary to admins

**Response**:
```json
{
  "success": true,
  "monthlyRevenue": 8500,
  "teacherPayments": 3200,
  "batchesCompleted": 2,
  "reportsGenerated": true
}
```

---

### System API

#### GET `/api/system/health`
**Description**: Health check endpoint

**Response**:
```json
{
  "status": "healthy",
  "database": "connected",
  "uptime": 123456,
  "version": "1.0.0"
}
```

#### GET `/api/system/audit-logs`
**Description**: Get audit logs

**Query Parameters**:
- `userId` (string): Filter by user
- `action` (string): Filter by action
- `entityType` (string): Filter by entity type
- `startDate` (ISO date): Date range start
- `endDate` (ISO date): Date range end
- `limit` (number): Limit results (default 100)

**Response**:
```json
[
  {
    "id": "log123",
    "userId": "user123",
    "action": "CREATE_STUDENT",
    "entityType": "Student",
    "entityId": "student123",
    "details": {
      "name": "John Doe",
      "level": "A1"
    },
    "ipAddress": "192.168.1.1",
    "createdAt": "2025-01-25T10:00:00Z"
  }
]
```

#### POST `/api/warmup`
**Description**: Warm up serverless functions (prevents cold starts)

**Response**:
```json
{
  "status": "warmed",
  "timestamp": "2025-02-10T10:00:00Z"
}
```

---

## Authentication & Authorization

### NextAuth.js Configuration

**File**: `/lib/auth.ts`

```typescript
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.role = token.role
      }
      return session
    },
  },
})
```

### Role-Based Access Control

**Roles**:
- `ADMIN`: Full access to all features
- `TEACHER`: Access to assigned batches, attendance, students
- `MARKETING`: Access to leads, student info (limited)

**Middleware Protection** (`middleware.ts`):
```typescript
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const user = req.auth?.user

  // Public routes
  if (pathname === "/login" || pathname === "/offline") {
    return NextResponse.next()
  }

  // Require authentication
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // Role-based access
  if (pathname.startsWith("/dashboard/teachers") && user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
}
```

### Session Management

**Getting Session in Server Components**:
```typescript
import { auth } from "@/lib/auth"

export default async function Page() {
  const session = await auth()
  const user = session?.user

  return <div>Hello {user?.name}</div>
}
```

**Getting Session in API Routes**:
```typescript
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()

  if (!session) {
    return new Response("Unauthorized", { status: 401 })
  }

  // Use session.user.id, session.user.role, etc.
}
```

---

## PWA Configuration

### Manifest (`/public/manifest.json`)

```json
{
  "name": "Plan Beta School Management",
  "short_name": "Plan Beta",
  "description": "Comprehensive school management system for Plan Beta",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/apple-touch-icon.png",
      "sizes": "180x180",
      "type": "image/png"
    }
  ],
  "categories": ["education", "business", "productivity"],
  "screenshots": []
}
```

### Next.js PWA Config (`/next.config.ts`)

```typescript
import withPWA from "@ducanh2912/next-pwa"

const nextConfig = {
  // Your Next.js config
}

export default withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  sw: "sw.js",
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /^https?:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "images",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          },
        },
      },
      {
        urlPattern: /\/api\/.*$/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "apis",
          networkTimeoutSeconds: 10,
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 24 * 60 * 60, // 24 hours
          },
        },
      },
      {
        urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts",
          expiration: {
            maxEntries: 20,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
          },
        },
      },
      {
        urlPattern: /\.(?:js|css)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-resources",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
          },
        },
      },
    ],
  },
})(nextConfig)
```

### Offline Fallback (`/app/offline/page.tsx`)

```typescript
"use client"

import { useEffect, useState } from "react"

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    window.addEventListener("online", handleOnline)
    return () => window.removeEventListener("online", handleOnline)
  }, [])

  useEffect(() => {
    if (isOnline) {
      window.location.reload()
    }
  }, [isOnline])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          You're Offline
        </h1>
        <p className="text-gray-600 mb-6">
          Please check your internet connection. The app will automatically reload when you're back online.
        </p>
        <div className="animate-pulse">
          <div className="h-2 bg-primary rounded-full w-full"></div>
        </div>
      </div>
    </div>
  )
}
```

### Service Worker Strategy

**Caching Strategies**:
1. **Network First** (API calls): Try network first, fallback to cache if offline
2. **Cache First** (Images, fonts): Serve from cache immediately, update in background
3. **Stale While Revalidate** (JS/CSS): Serve from cache, fetch update in background

---

## Mobile-Optimized Features

### Responsive Design

**Breakpoints** (Tailwind):
- `sm`: 640px
- `md`: 768px (primary mobile/desktop split)
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

**Mobile-First Approach**:
- Base styles for mobile (<768px)
- Use `md:` prefix for desktop styles
- Cards replace tables on mobile
- Larger touch targets (min 44px)
- Optimized spacing and typography

### Mobile Invoice Generation

**Endpoint**: `POST /api/invoices/generate`

**Features**:
- Generate PDF invoices
- Convert to PNG image for sharing
- WhatsApp/social media sharing integration
- QR code for payment links

**Implementation**:
```typescript
// Generate invoice button component
<GenerateInvoiceButton
  studentId={student.id}
  variant="primary"
  showPreview={true}
/>
```

### Mobile Card Layouts

**Leads Page** (`/app/dashboard/leads/page.tsx`):
- Cards with 16px padding, rounded corners
- Large name heading (18px)
- Status badges prominently displayed
- Contact info with icons
- Follow-up date with urgency indicators
- Full-width action buttons

**Students Page** (`/app/dashboard/students/page.tsx`):
- Student ID badge
- Payment status prominently shown
- Balance amount in large text
- Level and batch info in grid
- Quick action buttons

**Batches Page** (`/app/dashboard/batches/page.tsx`):
- Visual progress bars for capacity
- Teacher and schedule info
- Revenue metrics
- Single column on mobile, grid on desktop

---

## Deployment

### Vercel Deployment

1. **Connect GitHub Repository**:
   ```bash
   vercel link
   ```

2. **Configure Environment Variables** (Vercel Dashboard):
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
   - `CRON_SECRET`

3. **Deploy**:
   ```bash
   vercel --prod
   ```

### Database Migrations

**Run migrations on deploy**:
```bash
npm run db:migrate
```

**Generate Prisma Client**:
```bash
npx prisma generate
```

### Cron Jobs Setup (Vercel)

**File**: `vercel.json`
```json
{
  "crons": [
    {
      "path": "/api/cron/payment-reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/attendance-alerts",
      "schedule": "0 8 * * 1"
    },
    {
      "path": "/api/cron/month-completion",
      "schedule": "0 1 1 * *"
    }
  ]
}
```

---

## Environment Variables

### Required Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# NextAuth
NEXTAUTH_SECRET="your-super-secret-key-min-32-chars"
NEXTAUTH_URL="https://your-domain.vercel.app"

# Cron Security
CRON_SECRET="your-cron-secret-key"

# Optional: Email (for notifications)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="noreply@planbeta.com"
SMTP_PASSWORD="your-email-password"

# Optional: WhatsApp API (for notifications)
WHATSAPP_API_KEY="your-whatsapp-api-key"
WHATSAPP_PHONE_NUMBER="+1234567890"

# Optional: Analytics
NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX"
```

### Generate Secrets

```bash
# NEXTAUTH_SECRET
openssl rand -base64 32

# CRON_SECRET
openssl rand -base64 32
```

---

## Cron Jobs & Background Tasks

### Payment Reminders

**Trigger**: Daily at 9:00 AM
**Endpoint**: `POST /api/cron/payment-reminders`

**Logic**:
```typescript
// Find students with outstanding balance
const studentsWithBalance = await db.student.findMany({
  where: {
    balance: { gt: 0 },
    OR: [
      { paymentStatus: "PENDING" },
      { paymentStatus: "OVERDUE" }
    ]
  },
  include: { batch: true }
})

// Send reminders
for (const student of studentsWithBalance) {
  await sendPaymentReminder(student)

  // Log audit
  await db.auditLog.create({
    data: {
      action: "PAYMENT_REMINDER_SENT",
      entityType: "Student",
      entityId: student.id,
    }
  })
}
```

### Attendance Alerts

**Trigger**: Weekly on Monday at 8:00 AM
**Endpoint**: `POST /api/cron/attendance-alerts`

**Logic**:
```typescript
// Calculate attendance for last 30 days
const thirtyDaysAgo = new Date()
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

const students = await db.student.findMany({
  where: { completionStatus: "ACTIVE" },
  include: {
    attendance: {
      where: {
        date: { gte: thirtyDaysAgo }
      }
    }
  }
})

// Find low attendance students
const lowAttendanceStudents = students.filter(student => {
  const totalClasses = student.attendance.length
  const present = student.attendance.filter(a => a.status === "PRESENT").length
  const rate = (present / totalClasses) * 100
  return rate < 75
})

// Send alerts
await sendLowAttendanceAlert(lowAttendanceStudents)
```

### Month Completion

**Trigger**: First day of each month at 1:00 AM
**Endpoint**: `POST /api/cron/month-completion`

**Logic**:
```typescript
const lastMonth = new Date()
lastMonth.setMonth(lastMonth.getMonth() - 1)

// Calculate monthly revenue
const monthlyRevenue = await db.payment.aggregate({
  where: {
    paymentDate: {
      gte: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
      lt: new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 1)
    }
  },
  _sum: { amount: true }
})

// Calculate teacher payments
const teacherPayments = await db.teacherHours.aggregate({
  where: {
    date: {
      gte: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
      lt: new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 1)
    }
  },
  _sum: { totalPay: true }
})

// Update batch statuses
await updateBatchStatuses()

// Generate and send monthly report
await generateMonthlyReport({
  revenue: monthlyRevenue._sum.amount,
  teacherCosts: teacherPayments._sum.totalPay,
  month: lastMonth
})
```

---

## Business Logic

### Lead Conversion Process

1. Marketing adds lead with details
2. Lead status tracked through pipeline:
   - NEW → CONTACTED → INTERESTED → TRIAL_SCHEDULED → TRIAL_ATTENDED
3. When ready to convert:
   - Marketing clicks "Convert to Student"
   - Form pre-filled with lead data
   - Select batch, pricing, discounts
   - Student created with auto-generated ID (PB2025XXX)
   - Lead marked as converted
   - Lead linked to student record

### Student Pricing Calculation

```typescript
// Formula
const pbTarif = 500 // Base price from PB Tarif
const discountPercent = 10
const discountAmount = (pbTarif * discountPercent) / 100 // 50
const finalPrice = pbTarif - discountAmount // 450
const balance = finalPrice - amountPaid
```

### Multi-Currency Support

**EUR to INR Conversion**:
```typescript
const student = {
  finalPrice: 450, // EUR
  currency: "EUR",
  eurToInrRate: 88.5
}

// Display in INR
const priceInINR = student.finalPrice * student.eurToInrRate // 39,825 INR
```

**Payment Recording**:
- Always store amount in original currency
- Store exchange rate at time of payment
- Can display in either currency

### Batch Capacity Management

**Auto-calculation**:
```typescript
const batch = await db.batch.update({
  where: { id: batchId },
  data: {
    enrolledCount: {
      increment: 1 // When student added
    }
  }
})

// Calculate fill rate
const fillRate = (batch.enrolledCount / batch.totalSeats) * 100

// Update status
let status = batch.status
if (fillRate >= 100) status = "FULL"
else if (fillRate >= 50) status = "FILLING"

await db.batch.update({
  where: { id: batchId },
  data: { fillRate, status }
})
```

### Teacher Cost Calculation

**Per-Level Hourly Rates**:
```typescript
const teacher = {
  hourlyRateA1: 25,
  hourlyRateA2: 30,
  hourlyRateB1: 35,
  hourlyRateB2: 40
}

// When recording hours
const hoursWorked = 2.5
const level = "A1"
const hourlyRate = teacher[`hourlyRate${level}`] // 25
const totalPay = hoursWorked * hourlyRate // 62.50
```

### Payment Status Auto-Update

```typescript
async function updateStudentPaymentStatus(studentId: string) {
  const student = await db.student.findUnique({
    where: { id: studentId }
  })

  let paymentStatus: PaymentStatus

  if (student.balance <= 0) {
    paymentStatus = "PAID"
  } else if (student.amountPaid > 0) {
    paymentStatus = "PARTIAL"
  } else {
    // Check if payment overdue (30 days after enrollment)
    const daysSinceEnrollment = Math.floor(
      (Date.now() - student.enrollmentDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    paymentStatus = daysSinceEnrollment > 30 ? "OVERDUE" : "PENDING"
  }

  await db.student.update({
    where: { id: studentId },
    data: { paymentStatus }
  })
}
```

### Follow-Up Urgency System

**Urgency Calculation**:
```typescript
function getFollowUpUrgency(followUpDate: Date | null) {
  if (!followUpDate) return "none"

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const followUp = new Date(followUpDate)
  followUp.setHours(0, 0, 0, 0)

  const diffDays = Math.ceil(
    (followUp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (diffDays < 0) return "overdue" // 🔴 Past date
  if (diffDays === 0) return "today" // 🟡 Today
  if (diffDays <= 7) return "week"   // 🟢 This week
  return "future"                     // ⚪ Future
}
```

### Student ID Generation

**Format**: `PB{YEAR}{SEQUENCE}`
- Example: `PB2025001`, `PB2025002`, etc.

**Implementation**:
```typescript
async function generateStudentId() {
  const year = new Date().getFullYear()

  // Find highest sequence number for current year
  const lastStudent = await db.student.findFirst({
    where: {
      studentId: {
        startsWith: `PB${year}`
      }
    },
    orderBy: {
      studentId: "desc"
    }
  })

  let sequence = 1
  if (lastStudent) {
    const lastSequence = parseInt(lastStudent.studentId.slice(-3))
    sequence = lastSequence + 1
  }

  return `PB${year}${sequence.toString().padStart(3, "0")}`
}
```

### Batch Revenue Tracking

**Auto-calculation on payment**:
```typescript
async function recordPayment(data: PaymentData) {
  const payment = await db.payment.create({ data })

  const student = await db.student.findUnique({
    where: { id: data.studentId },
    include: { batch: true }
  })

  if (student?.batch) {
    // Update batch revenue
    await db.batch.update({
      where: { id: student.batchId },
      data: {
        revenueActual: {
          increment: data.amount
        }
      }
    })

    // Recalculate profit
    const batch = await db.batch.findUnique({
      where: { id: student.batchId }
    })

    const profit = batch.revenueActual - batch.teacherCost

    await db.batch.update({
      where: { id: student.batchId },
      data: { profit }
    })
  }
}
```

---

## Testing

### API Testing with curl

**Login**:
```bash
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@planbeta.com",
    "password": "yourpassword"
  }'
```

**Create Lead**:
```bash
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{
    "name": "Test Lead",
    "whatsapp": "+1234567890",
    "source": "META_ADS",
    "quality": "HOT"
  }'
```

### Database Seeding

**File**: `/prisma/seed.ts`

```typescript
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 10)

  await prisma.user.upsert({
    where: { email: "admin@planbeta.com" },
    update: {},
    create: {
      email: "admin@planbeta.com",
      name: "Admin User",
      password: hashedPassword,
      role: "ADMIN"
    }
  })

  // Create teacher
  await prisma.teacher.create({
    data: {
      name: "Maria Garcia",
      email: "maria@planbeta.com",
      phone: "+1234567892",
      expertise: ["A1", "A2", "B1"],
      hourlyRateA1: 25,
      hourlyRateA2: 30,
      hourlyRateB1: 35,
      status: "ACTIVE"
    }
  })

  // Create sample batches
  await prisma.batch.create({
    data: {
      batchCode: "A1-JAN-2025",
      level: "A1",
      totalSeats: 12,
      startDate: new Date("2025-02-01"),
      endDate: new Date("2025-05-31"),
      revenueTarget: 6000,
      status: "FILLING"
    }
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

**Run seed**:
```bash
npx prisma db seed
```

---

## Performance Optimization

### Database Indexing

**Key indexes** (in Prisma schema):
```prisma
model Lead {
  @@index([status])
  @@index([quality])
  @@index([source])
  @@index([followUpDate])
  @@index([convertedDate])
}

model Student {
  @@index([studentId])
  @@index([batchId])
  @@index([paymentStatus])
  @@index([completionStatus])
  @@index([enrollmentDate])
}

model Batch {
  @@index([status])
  @@index([startDate])
  @@index([level])
}
```

### API Response Caching

**Cache API responses**:
```typescript
export const revalidate = 60 // Revalidate every 60 seconds

export async function GET() {
  const data = await db.lead.findMany()
  return Response.json(data)
}
```

### Image Optimization

- Use Next.js `<Image>` component
- Serve WebP format
- Lazy load images
- Compress PWA icons

---

## Security Best Practices

1. **Password Hashing**: Always use bcrypt with salt rounds ≥ 10
2. **SQL Injection**: Use Prisma ORM (parameterized queries)
3. **XSS Protection**: React auto-escapes by default
4. **CSRF Protection**: NextAuth handles CSRF tokens
5. **Rate Limiting**: Implement rate limiting on API routes
6. **Environment Variables**: Never commit `.env` to Git
7. **HTTPS Only**: Force HTTPS in production
8. **Session Security**: Use secure, httpOnly cookies
9. **Input Validation**: Validate all user inputs
10. **Audit Logging**: Log all critical actions

---

## Support & Maintenance

### Monitoring

- **Vercel Analytics**: Track performance metrics
- **Error Tracking**: Sentry integration (optional)
- **Database Monitoring**: Neon dashboard
- **Uptime Monitoring**: UptimeRobot (optional)

### Backup Strategy

- **Database**: Neon auto-backup (daily)
- **Manual Backup**:
  ```bash
  pg_dump $DATABASE_URL > backup.sql
  ```

### Updates

**Dependency Updates**:
```bash
npm update
npx prisma migrate deploy
```

**Database Migrations**:
```bash
npx prisma migrate dev --name your_migration_name
npx prisma migrate deploy
```

---

## Conclusion

This documentation provides a comprehensive overview of the Plan Beta Dashboard PWA. For additional support or questions:

- **GitHub**: [Repository URL]
- **Email**: dev@planbeta.com
- **Documentation**: [Docs URL]

**Built with ❤️ by the Plan Beta Team**
