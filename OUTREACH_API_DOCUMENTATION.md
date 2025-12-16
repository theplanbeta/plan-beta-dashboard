# Outreach System API Documentation

## Overview
This document provides comprehensive documentation for the Founder Outreach System API endpoints. All endpoints require FOUNDER role authentication.

## Database Schema

### OutreachCall Model
```prisma
model OutreachCall {
  id                String            @id @default(cuid())
  studentId         String
  scheduledDate     DateTime          @db.Date
  priority          OutreachPriority  @default(MEDIUM)
  status            OutreachStatus    @default(PENDING)
  callType          OutreachCallType
  purpose           String
  preCallNotes      String?
  completedAt       DateTime?
  duration          Int?
  callNotes         String?
  journeyUpdates    Json?
  sentiment         OutreachSentiment?
  nextCallDate      DateTime?         @db.Date
  snoozedUntil      DateTime?         @db.Date
  snoozeReason      String?
  attemptCount      Int               @default(0)
  createdBy         String
  createdByName     String
  completedBy       String?
  completedByName   String?
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  student           Student           @relation("StudentOutreachCalls")
}
```

### StudentConnection Model
```prisma
model StudentConnection {
  id                String   @id @default(cuid())
  studentId         String
  connectedStudentId String
  reason            String
  introducedAt      DateTime @default(now())
  introducedBy      String
  introducedByName  String
  status            ConnectionStatus @default(INTRODUCED)
  notes             String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  student           Student  @relation("StudentConnections")
  connectedStudent  Student  @relation("ConnectedWith")
}
```

### Student Model Extensions
Added fields:
- `lastOutreachCall`: DateTime? - Last time the student was called
- `relationshipDepth`: Int - Number of completed outreach calls
- `outreachCalls`: OutreachCall[] - All outreach calls for the student
- `communityConnections`: StudentConnection[] - Students they're connected to
- `connectedWith`: StudentConnection[] - Students connected to them

### Enums
```prisma
enum OutreachPriority {
  LOW
  MEDIUM
  HIGH
}

enum OutreachStatus {
  PENDING
  COMPLETED
  SNOOZED
  CANCELLED
}

enum OutreachCallType {
  ONBOARDING
  CHECK_IN
  MILESTONE
  SUPPORT
  FEEDBACK
  COMMUNITY
  RETENTION
  OTHER
}

enum OutreachSentiment {
  VERY_POSITIVE
  POSITIVE
  NEUTRAL
  NEGATIVE
  VERY_NEGATIVE
}

enum ConnectionStatus {
  INTRODUCED
  CONNECTED
  ACTIVE
  INACTIVE
}
```

## Database Indexes

The following indexes have been created for optimal performance:

### OutreachCall Indexes
- `studentId` - Fast lookup of calls by student
- `scheduledDate` - Fast filtering by date
- `status` - Fast filtering by call status
- `priority` - Priority-based sorting
- `callType` - Filtering by call type
- `createdBy` - Track calls by creator

### StudentConnection Indexes
- `studentId` - Fast lookup of connections
- `connectedStudentId` - Reverse lookup
- `status` - Filter by connection status
- `introducedAt` - Date-based filtering

## API Endpoints

---

## 1. GET /api/outreach/scheduled

Get today's scheduled calls with full student context.

### Authentication
Requires FOUNDER role with 'outreach' read permission.

### Query Parameters
- `date` (optional): YYYY-MM-DD format. Defaults to today.

### Example Request
```bash
# Get today's calls
curl -X GET "http://localhost:3000/api/outreach/scheduled" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"

# Get calls for specific date
curl -X GET "http://localhost:3000/api/outreach/scheduled?date=2025-01-15" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

### Response Structure
```json
{
  "date": "2025-01-15",
  "totalCalls": 5,
  "byPriority": {
    "HIGH": 2,
    "MEDIUM": 2,
    "LOW": 1
  },
  "calls": [
    {
      "id": "clxyz123",
      "studentId": "student123",
      "scheduledDate": "2025-01-15T00:00:00.000Z",
      "priority": "HIGH",
      "status": "PENDING",
      "callType": "RETENTION",
      "purpose": "Student hasn't attended last 3 classes",
      "preCallNotes": "Check on wellbeing, discuss challenges",
      "student": {
        "id": "student123",
        "name": "John Doe",
        "whatsapp": "+1234567890",
        "email": "john@example.com",
        "currentLevel": "A2",
        "churnRisk": "HIGH",
        "attendanceRate": "45.00",
        "balance": "500.00",
        "relationshipDepth": 3,
        "lastOutreachCall": "2024-12-15T10:30:00.000Z",
        "daysUntilNextPayment": 15,
        "recentAttendanceRate": 40,
        "lastInteractionDate": "2025-01-10T14:20:00.000Z",
        "batch": {
          "batchCode": "A2-M-JAN",
          "level": "A2",
          "timing": "MORNING",
          "teacher": {
            "name": "Sarah Smith",
            "email": "sarah@planbeta.com"
          }
        },
        "attendance": [...],
        "payments": [...],
        "interactions": [...]
      }
    }
  ]
}
```

### Features
- **Priority Sorting**: Calls are sorted by priority (HIGH > MEDIUM > LOW), then by scheduled date
- **Rich Student Context**: Includes batch, teacher, recent attendance, payments, interactions
- **Computed Fields**:
  - `daysUntilNextPayment`: Days until next payment is due
  - `recentAttendanceRate`: Attendance rate for last 5 classes
  - `lastInteractionDate`: Most recent interaction with student

### Use Cases
- Morning prep: Get all calls scheduled for today
- Planning: View calls for upcoming days
- Prioritization: See high-priority calls first

---

## 2. GET /api/outreach/[id]

Get full call details with comprehensive student context.

### Authentication
Requires FOUNDER role with 'outreach' read permission.

### Example Request
```bash
curl -X GET "http://localhost:3000/api/outreach/clxyz123" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

### Response Structure
```json
{
  "id": "clxyz123",
  "studentId": "student123",
  "scheduledDate": "2025-01-15T00:00:00.000Z",
  "priority": "HIGH",
  "status": "PENDING",
  "callType": "RETENTION",
  "purpose": "Student hasn't attended last 3 classes",
  "preCallNotes": "Check on wellbeing, discuss challenges",
  "student": {
    "id": "student123",
    "name": "John Doe",
    // Full student details
    "outreachCalls": [
      {
        "id": "prev_call_1",
        "scheduledDate": "2024-12-15",
        "completedAt": "2024-12-15T10:45:00.000Z",
        "callType": "CHECK_IN",
        "sentiment": "POSITIVE",
        "callNotes": "Student doing well, enjoying classes",
        "journeyUpdates": {
          "goals": "Complete A2 by March",
          "challenges": "Work schedule conflicts",
          "wins": "Having great conversations with German friends"
        }
      }
    ],
    "communityConnections": [
      {
        "id": "conn123",
        "reason": "Both studying A2, similar interests in tech",
        "introducedAt": "2024-12-01",
        "status": "ACTIVE",
        "connectedStudent": {
          "id": "student456",
          "name": "Jane Smith",
          "currentLevel": "A2"
        }
      }
    ]
  }
}
```

### Use Cases
- **Pre-call Prep**: Review student's full history before calling
- **Context Building**: See previous call notes and outcomes
- **Connection Tracking**: View student's community connections

---

## 3. PATCH /api/outreach/[id]

Update call details (reschedule, change priority, update notes).

### Authentication
Requires FOUNDER role with 'outreach' update permission.

### Request Body
```json
{
  "priority": "HIGH",
  "purpose": "Updated purpose",
  "preCallNotes": "Additional context",
  "scheduledDate": "2025-01-16T00:00:00.000Z",
  "status": "PENDING"
}
```

All fields are optional.

### Example Request
```bash
curl -X PATCH "http://localhost:3000/api/outreach/clxyz123" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "priority": "HIGH",
    "scheduledDate": "2025-01-16T00:00:00.000Z"
  }'
```

### Validation Rules
- Cannot update completed calls
- Priority must be LOW, MEDIUM, or HIGH
- Status must be PENDING, SNOOZED, or CANCELLED
- Dates must be valid ISO 8601 format

---

## 4. POST /api/outreach/complete

Mark a call as completed with rich notes and journey updates.

### Authentication
Requires FOUNDER role with 'outreach' update permission.

### Request Body
```json
{
  "callId": "clxyz123",
  "duration": 25,
  "callNotes": "Had a great conversation. Student is motivated but struggling with time management. Discussed strategies for consistent practice.",
  "journeyUpdates": {
    "goals": "Pass Goethe A2 exam by April",
    "challenges": "Busy work schedule, difficulty with grammar",
    "wins": "Successfully held 30-min conversation in German",
    "interests": "Travel to Germany this summer",
    "careerPlans": "Apply for jobs in Berlin"
  },
  "sentiment": "POSITIVE",
  "nextCallDate": "2025-02-15T00:00:00.000Z",
  "scheduleNextCall": true
}
```

### Field Descriptions
- `callId`: ID of the call to complete (required)
- `duration`: Call duration in minutes (1-300, optional)
- `callNotes`: Detailed notes from the call (10-5000 chars, required)
- `journeyUpdates`: Structured updates about student's journey (optional)
  - `goals`: Student's learning goals
  - `challenges`: Current challenges they're facing
  - `wins`: Recent achievements or breakthroughs
  - `interests`: Topics of interest
  - `careerPlans`: Career-related plans or motivations
- `sentiment`: Overall sentiment of the call (required)
- `nextCallDate`: When to schedule next call (optional)
- `scheduleNextCall`: Auto-schedule next call (default: true)

### Example Request
```bash
curl -X POST "http://localhost:3000/api/outreach/complete" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "callId": "clxyz123",
    "duration": 25,
    "callNotes": "Great conversation about student progress",
    "sentiment": "POSITIVE",
    "scheduleNextCall": true,
    "nextCallDate": "2025-02-15T00:00:00.000Z"
  }'
```

### Response
```json
{
  "success": true,
  "message": "Call completed successfully",
  "data": {
    "call": {
      "id": "clxyz123",
      "status": "COMPLETED",
      "completedAt": "2025-01-15T10:45:00.000Z",
      // ... call details
    },
    "student": {
      "id": "student123",
      "lastOutreachCall": "2025-01-15T10:45:00.000Z",
      "relationshipDepth": 4,
      // ... student details
    },
    "nextCall": {
      "id": "new_call_456",
      "scheduledDate": "2025-02-15T00:00:00.000Z",
      "priority": "MEDIUM",
      // ... next call details
    }
  }
}
```

### Automatic Actions
When completing a call:
1. Updates call status to COMPLETED
2. Records completion time and notes
3. Updates student's `lastOutreachCall` timestamp
4. Increments student's `relationshipDepth`
5. Optionally schedules next call with intelligent defaults:
   - **Priority**: Based on sentiment (negative = HIGH, positive = LOW)
   - **Call Type**: Based on relationship depth (early = ONBOARDING, milestones = MILESTONE)
   - **Purpose**: Auto-generated based on previous call type

### Use Cases
- Post-call documentation
- Journey tracking over time
- Automated follow-up scheduling

---

## 5. POST /api/outreach/snooze

Snooze a call to a later date.

### Authentication
Requires FOUNDER role with 'outreach' update permission.

### Request Body
```json
{
  "callId": "clxyz123",
  "snoozeUntil": "2025-01-20T00:00:00.000Z",
  "snoozeReason": "Student requested to be called next week",
  "notReachable": false
}
```

### Field Descriptions
- `callId`: ID of the call to snooze (required)
- `snoozeUntil`: New scheduled date (required, must be future date)
- `snoozeReason`: Reason for snoozing (5-500 chars, required)
- `notReachable`: If true, increments attempt counter (default: false)

### Example Request
```bash
curl -X POST "http://localhost:3000/api/outreach/snooze" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "callId": "clxyz123",
    "snoozeUntil": "2025-01-20T00:00:00.000Z",
    "snoozeReason": "Student on vacation, call back next week",
    "notReachable": false
  }'
```

### Response
```json
{
  "success": true,
  "message": "Call snoozed successfully",
  "data": {
    "id": "clxyz123",
    "status": "SNOOZED",
    "scheduledDate": "2025-01-20T00:00:00.000Z",
    "snoozedUntil": "2025-01-20T00:00:00.000Z",
    "snoozeReason": "Student on vacation, call back next week",
    "attemptCount": 0,
    "student": {
      // Student details
    }
  }
}
```

### Use Cases
- **Student Not Available**: Reschedule when student is unavailable
- **Student Request**: Honor student's preferred callback time
- **Not Reachable**: Track unsuccessful call attempts

---

## 6. GET /api/outreach/connections/suggest

Get AI-suggested connections for a student based on learning patterns.

### Authentication
Requires FOUNDER role with 'outreach' read permission.

### Query Parameters
- `studentId`: Student ID (required)
- `limit`: Number of suggestions (1-10, default: 5)

### Example Request
```bash
curl -X GET "http://localhost:3000/api/outreach/connections/suggest?studentId=student123&limit=5" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

### Response
```json
{
  "targetStudent": {
    "id": "student123",
    "name": "John Doe",
    "level": "A2"
  },
  "suggestions": [
    {
      "student": {
        "id": "student456",
        "name": "Jane Smith",
        "currentLevel": "A2",
        "attendanceRate": "85.00",
        "batch": {
          "batchCode": "A2-E-JAN",
          "level": "A2",
          "timing": "EVENING"
        }
      },
      "score": 32,
      "reason": "Jane Smith would be a great connection for John Doe. Both studying A2, similar attendance patterns, and started learning around the same time. They could share study tips and motivate each other.",
      "matchFactors": [
        "Both studying A2",
        "Similar attendance patterns",
        "Started learning around the same time",
        "Both discovered us through INSTAGRAM",
        "Can share experiences from different class timings"
      ]
    }
  ],
  "total": 5
}
```

### Matching Algorithm
Students are scored based on:
- **Same Level** (+10 points): Studying same level
- **Adjacent Level** (+5 points): One level apart
- **Similar Attendance** (+5 points): Attendance rates within 10%
- **Cohort Effect** (+8 points): Enrolled within 30 days of each other
- **Same Source** (+3 points): Same referral source
- **Different Timing** (+4 points): Morning vs Evening (can share different perspectives)

### Use Cases
- Build student community
- Peer learning partnerships
- Reduce isolation for online learners
- Cross-pollinate between batches

---

## 7. POST /api/outreach/connections/create

Create a connection between two students with introduction.

### Authentication
Requires FOUNDER role with 'outreach' create permission.

### Request Body
```json
{
  "studentId": "student123",
  "connectedStudentId": "student456",
  "reason": "Both students are at A2 level and share similar learning goals. John is strong in grammar while Jane excels at conversation - they can complement each other's learning.",
  "sendIntroduction": true,
  "notes": "Suggested they connect on WhatsApp for weekly practice sessions"
}
```

### Field Descriptions
- `studentId`: First student ID (required)
- `connectedStudentId`: Second student ID (required)
- `reason`: Why they should connect (20-1000 chars, required)
- `sendIntroduction`: Send intro email/WhatsApp (default: true)
- `notes`: Additional notes (optional)

### Example Request
```bash
curl -X POST "http://localhost:3000/api/outreach/connections/create" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "studentId": "student123",
    "connectedStudentId": "student456",
    "reason": "Both studying A2, complementary skills",
    "sendIntroduction": true
  }'
```

### Response
```json
{
  "success": true,
  "message": "Connection created successfully",
  "data": {
    "connection": {
      "id": "conn123",
      "studentId": "student123",
      "connectedStudentId": "student456",
      "reason": "Both studying A2, complementary skills",
      "status": "INTRODUCED",
      "introducedAt": "2025-01-15T10:45:00.000Z"
    },
    "students": {
      "student1": {
        "id": "student123",
        "name": "John Doe",
        "email": "john@example.com",
        "whatsapp": "+1234567890"
      },
      "student2": {
        "id": "student456",
        "name": "Jane Smith",
        "email": "jane@example.com",
        "whatsapp": "+9876543210"
      }
    },
    "introductionSent": true
  }
}
```

### Features
- **Bidirectional Connection**: Creates connection from both sides
- **Introduction Messages**: Sends email/WhatsApp introduction (placeholder)
- **Validation**: Prevents duplicate connections and self-connections

### Integration Points
You can integrate with your email/WhatsApp service by implementing:
- `sendIntroductionEmail(student1, student2, reason)`
- `sendWhatsAppIntroduction(student1, student2, reason)`

---

## 8. GET /api/outreach/stats

Get comprehensive outreach statistics and analytics.

### Authentication
Requires FOUNDER role with 'outreach' read permission.

### Query Parameters
- `startDate` (optional): YYYY-MM-DD format
- `endDate` (optional): YYYY-MM-DD format

Defaults to current month if not specified.

### Example Request
```bash
# Current month stats
curl -X GET "http://localhost:3000/api/outreach/stats" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"

# Custom date range
curl -X GET "http://localhost:3000/api/outreach/stats?startDate=2025-01-01&endDate=2025-01-31" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

### Response
```json
{
  "dateRange": {
    "startDate": "2025-01-01",
    "endDate": "2025-01-31"
  },
  "summary": {
    "callsThisWeek": 12,
    "callsThisMonth": 45,
    "totalCalls": 45,
    "upcomingCalls": 18,
    "connectionsMade": 8,
    "avgCallDuration": 23,
    "completionRate": 89
  },
  "sentiment": {
    "VERY_POSITIVE": 15,
    "POSITIVE": 20,
    "NEUTRAL": 8,
    "NEGATIVE": 2,
    "VERY_NEGATIVE": 0
  },
  "callsByType": {
    "ONBOARDING": 10,
    "CHECK_IN": 25,
    "MILESTONE": 5,
    "SUPPORT": 3,
    "RETENTION": 2
  },
  "callsByPriority": {
    "HIGH": 8,
    "MEDIUM": 25,
    "LOW": 12
  },
  "topPerformers": [
    {
      "student": {
        "id": "student123",
        "name": "John Doe",
        "currentLevel": "A2",
        "relationshipDepth": 8
      },
      "callCount": 8
    }
  ]
}
```

### Metrics Explained
- **callsThisWeek**: Completed calls since Sunday
- **callsThisMonth**: Completed calls this month
- **totalCalls**: Total in date range
- **upcomingCalls**: Pending/snoozed calls in next 7 days
- **connectionsMade**: Community connections created
- **avgCallDuration**: Average call length in minutes
- **completionRate**: % of scheduled calls completed
- **topPerformers**: Students with most completed calls

### Use Cases
- **Dashboard Metrics**: Display in outreach dashboard
- **Performance Tracking**: Monitor outreach effectiveness
- **Trend Analysis**: Identify patterns over time
- **Team Reporting**: Share metrics with stakeholders

---

## Error Responses

All endpoints return consistent error responses:

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden"
}
```

### 400 Bad Request
```json
{
  "error": "Invalid input",
  "details": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "undefined",
      "path": ["callId"],
      "message": "Required"
    }
  ]
}
```

### 404 Not Found
```json
{
  "error": "Call not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to fetch scheduled calls"
}
```

---

## Rate Limiting Recommendations

For production deployment, consider implementing:

1. **Per-User Rate Limits**: 100 requests/hour per user
2. **Endpoint-Specific Limits**:
   - GET endpoints: 60 requests/minute
   - POST/PATCH endpoints: 30 requests/minute
3. **Burst Protection**: Allow burst of 10 requests, then throttle
4. **IP-based Limits**: 1000 requests/hour per IP

Implementation using existing rate limit infrastructure:
```typescript
import { rateLimit } from '@/lib/rate-limit'

// In route handler
const limiter = rateLimit({
  uniqueTokenPerInterval: 500,
  interval: 60000, // 1 minute
})

try {
  await limiter.check(request, 60, 'OUTREACH_API')
} catch {
  return NextResponse.json(
    { error: 'Rate limit exceeded' },
    { status: 429 }
  )
}
```

---

## Caching Recommendations

To improve performance:

### 1. Scheduled Calls Cache
Cache today's scheduled calls for 5 minutes:
```typescript
const cacheKey = `outreach:scheduled:${dateString}`
const cached = await redis.get(cacheKey)
if (cached) return JSON.parse(cached)

// Fetch from DB
const calls = await prisma.outreachCall.findMany(...)

// Cache for 5 minutes
await redis.setex(cacheKey, 300, JSON.stringify(calls))
```

### 2. Stats Cache
Cache statistics for 1 hour:
```typescript
const cacheKey = `outreach:stats:${startDate}:${endDate}`
const TTL = 3600 // 1 hour
```

### 3. Connection Suggestions Cache
Cache suggestions for 15 minutes per student:
```typescript
const cacheKey = `outreach:suggestions:${studentId}`
const TTL = 900 // 15 minutes
```

---

## Migration Guide

To add this system to your database:

```bash
# 1. Update schema (already done)
# prisma/schema.prisma contains all models

# 2. Generate migration
npx prisma migrate dev --name add_outreach_system

# 3. Apply to production
npx prisma migrate deploy

# 4. Verify
npx prisma studio
```

---

## Testing Examples

### Test Scheduled Calls Endpoint
```bash
# Should return calls for today
curl -X GET "http://localhost:3000/api/outreach/scheduled"

# Should return 400 for invalid date
curl -X GET "http://localhost:3000/api/outreach/scheduled?date=invalid"
```

### Test Complete Call Endpoint
```bash
# Should complete successfully
curl -X POST "http://localhost:3000/api/outreach/complete" \
  -H "Content-Type: application/json" \
  -d '{
    "callId": "valid_call_id",
    "callNotes": "Great conversation",
    "sentiment": "POSITIVE"
  }'

# Should return 400 for short notes
curl -X POST "http://localhost:3000/api/outreach/complete" \
  -H "Content-Type: application/json" \
  -d '{
    "callId": "valid_call_id",
    "callNotes": "Short",
    "sentiment": "POSITIVE"
  }'
```

---

## Support

For questions or issues:
- Check API logs for detailed error messages
- Verify authentication and permissions
- Ensure Prisma Client is up to date: `npx prisma generate`
- Review validation schemas in `/lib/outreach-validation.ts`

---

**Last Updated**: 2025-01-15
**API Version**: 1.0.0
