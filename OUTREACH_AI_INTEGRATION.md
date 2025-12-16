# AI-Powered Founder Outreach System - Integration Guide

## Overview

The Outreach AI system provides three core intelligent features to help founders have more meaningful, personal calls with students:

1. **Pre-Call Brief Generator** - Warm, personalized briefs that remind you of the student's journey
2. **Connection Matching System** - Suggests meaningful student-to-student connections based on deep similarities
3. **Call Notes Enhancer** - Structures quick notes into organized format with action items

## Architecture

### Files Created

```
lib/
├── gemini-client.ts           # Google Gemini API client with error handling & rate limiting
├── outreach-ai.ts             # Core AI functions for outreach
└── outreach-ai-examples.ts    # Example outputs, usage, and cost estimates
```

### Technology Stack

- **AI Model**: Google Gemini 1.5 Flash (fast, cost-effective)
- **SDK**: `@google/generative-ai` (v0.24.1 - already installed)
- **Database**: Prisma with PostgreSQL
- **Environment Variable**: `GEMINI_API_KEY` (already configured in `.env`)

## Quick Start

### 1. Verify API Key

Your `.env` file already has `GEMINI_API_KEY` configured. The system will also check for `GOOGLE_GEMINI_API_KEY` as a fallback.

### 2. Import and Use

```typescript
import { generateCallBrief, findMeaningfulConnections, enhanceCallNotes } from '@/lib/outreach-ai'

// Before a call
const brief = await generateCallBrief(studentId)

// For community building
const matches = await findMeaningfulConnections(studentId)

// After a call
const enhanced = await enhanceCallNotes(rawNotes, studentContext)
```

## Feature Details

### 1. Pre-Call Brief Generator

**Purpose**: Generate a warm, personalized brief before calling a student.

**Function**: `generateCallBrief(studentId: string): Promise<CallBrief>`

**What It Returns**:
```typescript
{
  success: true,
  studentName: "Priya Sharma",

  // AI-generated insights
  journeySummary: "2-line warm summary of their journey",
  sinceLastCall: ["Change 1", "Change 2", "Change 3"],
  conversationStarters: [
    "Natural conversation topic 1",
    "Natural conversation topic 2",
    "Natural conversation topic 3"
  ],
  personalDetail: "Something personal to remember",

  // Context data
  enrollmentDate: Date,
  daysSinceEnrollment: 21,
  attendanceRate: 95,
  churnRisk: "LOW",
  // ... more context
}
```

**Example Usage**:
```typescript
// In a page or API route
export async function getCallBriefForStudent(studentId: string) {
  const brief = await generateCallBrief(studentId)

  if (brief.success) {
    // Display to founder before call
    return {
      journey: brief.journeySummary,
      topics: brief.conversationStarters,
      remember: brief.personalDetail,
      context: {
        attendance: brief.attendanceRate,
        risk: brief.churnRisk
      }
    }
  } else {
    // Graceful degradation - still shows basic info
    return {
      journey: brief.journeySummary,
      error: brief.error
    }
  }
}
```

**Key Features**:
- Fetches full student context (interactions, payments, attendance)
- Analyzes changes since last contact
- Generates natural conversation starters
- Identifies personal details to mention
- Works even if AI is unavailable (graceful degradation)

**Cost**: ~$0.0002 per call (~0.02 cents)

---

### 2. Connection Matching System

**Purpose**: Find meaningful peer connections to build community.

**Function**: `findMeaningfulConnections(studentId: string): Promise<ConnectionMatches>`

**What It Returns**:
```typescript
{
  success: true,
  studentName: "Ananya Iyer",
  topMatches: [
    {
      studentName: "Sneha Nair",
      connectionReason: "Both nurses preparing for B2 medical licensing exam",
      commonalities: [
        "Healthcare professionals",
        "Same exam timeline",
        "Similar study challenges"
      ],
      suggestedIntro: "Draft introduction message from founder",
      confidenceScore: 95
    }
    // ... up to 3 matches
  ]
}
```

**Example Usage**:
```typescript
// Find study buddy matches
export async function suggestStudyBuddies(studentId: string) {
  const matches = await findMeaningfulConnections(studentId)

  if (matches.success && matches.topMatches.length > 0) {
    // Show founder the suggested connections
    for (const match of matches.topMatches) {
      console.log(`${match.studentName} - ${match.confidenceScore}% match`)
      console.log(`Why: ${match.connectionReason}`)
      console.log(`Introduction: ${match.suggestedIntro}`)
    }
  }
}

// Create WhatsApp group introduction
export async function createStudyGroup(student1Id: string, student2Id: string) {
  // Use suggestedIntro as template for WhatsApp message
  const matches = await findMeaningfulConnections(student1Id)
  const match = matches.topMatches.find(m => m.studentId === student2Id)

  if (match) {
    // Send match.suggestedIntro via WhatsApp to both students
    return match.suggestedIntro
  }
}
```

**Key Features**:
- Analyzes up to 20 active students for matching
- Looks for deep similarities (not surface level like "same batch")
- Generates ready-to-send introduction messages
- Confidence scoring (70-100, only suggests high-confidence matches)
- Considers professional background, goals, challenges, timezones

**Cost**: ~$0.0003 per match (~0.03 cents)

---

### 3. Call Notes Enhancer

**Purpose**: Transform quick, raw notes into structured, actionable format.

**Function**: `enhanceCallNotes(rawNotes: string, studentContext): Promise<EnhancedCallNotes>`

**What It Returns**:
```typescript
{
  success: true,

  summary: "Clear 1-2 sentence summary of the call",

  journeyUpdates: [
    "Progress update 1",
    "Challenge mentioned",
    "Breakthrough noted"
  ],

  personalNotes: [
    "Personal detail to remember",
    "Life event shared"
  ],

  actionItems: [
    {
      task: "Check weekend batch availability",
      priority: "high",
      deadline: "this week",
      assignedTo: "founder"
    }
  ],

  followUpTiming: {
    timing: "3 days",
    reason: "Need to confirm batch transfer",
    suggestedTopic: "Update on weekend batch"
  },

  moodTone: "stressed but committed"
}
```

**Example Usage**:
```typescript
// After a call, founder types quick notes
const rawNotes = `
Talked to Rajesh. Work is crazy, missed 2 classes.
Wants weekend batch. Wife wants to join too.
Dog keeps interrupting - funny moment.
Going to Germany in March for work.
`

// Enhance and save
export async function saveCallNotes(studentId: string, rawNotes: string) {
  const student = await getStudent(studentId)

  const enhanced = await enhanceCallNotes(rawNotes, {
    studentId: student.id,
    studentName: student.name,
    currentLevel: student.currentLevel,
    enrollmentDate: student.enrollmentDate
  })

  if (enhanced.success) {
    // Save to database
    await prisma.studentInteraction.create({
      data: {
        studentId,
        userId: founderId,
        userName: 'Founder',
        interactionType: 'PHONE_CALL',
        category: 'GENERAL_CHECK_IN',
        notes: enhanced.summary,
        outcome: enhanced.moodTone,
        followUpDate: calculateDate(enhanced.followUpTiming.timing),
        followUpNeeded: enhanced.actionItems.length > 0
      }
    })

    // Create tasks from action items
    for (const item of enhanced.actionItems) {
      await createTask({
        title: item.task,
        priority: item.priority,
        assignedTo: item.assignedTo,
        deadline: item.deadline
      })
    }

    return enhanced
  }
}
```

**Key Features**:
- Extracts action items even from casual mentions
- Categorizes notes into journey updates vs. personal details
- Suggests strategic follow-up timing
- Detects mood/tone of student
- Handles very short or incomplete notes gracefully

**Cost**: ~$0.00016 per enhancement (~0.016 cents)

## Integration Examples

### API Routes

Create API endpoints for frontend consumption:

```typescript
// app/api/students/[id]/call-brief/route.ts
import { generateCallBrief } from '@/lib/outreach-ai'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const brief = await generateCallBrief(params.id)
    return NextResponse.json(brief)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate call brief' },
      { status: 500 }
    )
  }
}
```

```typescript
// app/api/students/[id]/connections/route.ts
import { findMeaningfulConnections } from '@/lib/outreach-ai'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const matches = await findMeaningfulConnections(params.id)
    return NextResponse.json(matches)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to find connections' },
      { status: 500 }
    )
  }
}
```

```typescript
// app/api/students/[id]/enhance-notes/route.ts
import { enhanceCallNotes } from '@/lib/outreach-ai'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { rawNotes, studentContext } = await request.json()
    const enhanced = await enhanceCallNotes(rawNotes, studentContext)
    return NextResponse.json(enhanced)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to enhance notes' },
      { status: 500 }
    )
  }
}
```

### Frontend Components

Example React component for displaying call brief:

```typescript
// components/CallBriefCard.tsx
'use client'

import { useEffect, useState } from 'react'
import { CallBrief } from '@/lib/outreach-ai'

export function CallBriefCard({ studentId }: { studentId: string }) {
  const [brief, setBrief] = useState<CallBrief | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadBrief() {
      const response = await fetch(`/api/students/${studentId}/call-brief`)
      const data = await response.json()
      setBrief(data)
      setLoading(false)
    }
    loadBrief()
  }, [studentId])

  if (loading) return <div>Loading call brief...</div>
  if (!brief) return <div>Unable to load brief</div>

  return (
    <div className="space-y-4 p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold">Call Brief: {brief.studentName}</h2>

      <div>
        <h3 className="font-semibold">Journey Summary</h3>
        <p className="text-gray-700">{brief.journeySummary}</p>
      </div>

      <div>
        <h3 className="font-semibold">Since Last Call</h3>
        <ul className="list-disc pl-5 text-gray-700">
          {brief.sinceLastCall.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="font-semibold">Conversation Starters</h3>
        <ul className="list-disc pl-5 text-gray-700">
          {brief.conversationStarters.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="bg-yellow-50 p-4 rounded">
        <h3 className="font-semibold">Remember:</h3>
        <p className="text-gray-700">{brief.personalDetail}</p>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <span className="font-semibold">Attendance:</span> {brief.attendanceRate}%
        </div>
        <div>
          <span className="font-semibold">Payment:</span> {brief.paymentStatus}
        </div>
        <div>
          <span className="font-semibold">Churn Risk:</span> {brief.churnRisk}
        </div>
      </div>
    </div>
  )
}
```

## Error Handling & Graceful Degradation

All functions are designed to **never break**. Even if the AI API is down, you still get useful information:

```typescript
const brief = await generateCallBrief(studentId)

if (brief.success) {
  // AI-enhanced brief with rich insights
  console.log('AI Brief:', brief.journeySummary)
} else {
  // Basic brief with essential info (no AI)
  console.log('Basic Brief:', brief.journeySummary)
  console.log('Error:', brief.error) // "Gemini API not available"

  // You still get: name, level, attendance, payment status, etc.
}
```

**What happens when AI is unavailable:**
- Call Brief: Returns basic student info and metrics
- Connections: Returns empty array with success: false
- Notes Enhancement: Returns raw notes with single action item to review manually

## Rate Limiting

Built-in rate limiting to prevent API throttling:

- **Limit**: 15 requests per minute (conservative)
- **Behavior**: Automatic queuing with 5-second retries
- **Monitoring**: Use `getRateLimitStatus()` to check current usage

```typescript
import { getRateLimitStatus } from '@/lib/gemini-client'

const status = getRateLimitStatus()
console.log(`Requests in last minute: ${status.requestsInLastMinute}`)
console.log(`Remaining requests: ${status.remainingRequests}`)
console.log(`Reset in: ${status.resetIn}ms`)
```

## Cost Analysis

### Per-Call Costs (using Gemini 1.5 Flash)

| Function | Avg Tokens | Cost | Per 1000 Calls |
|----------|------------|------|----------------|
| Call Brief | 1,250 | $0.0002 | $0.20 |
| Connection Match | 1,850 | $0.0003 | $0.30 |
| Notes Enhancement | 900 | $0.00016 | $0.16 |

### Monthly Estimate

**Assumptions:**
- 200 students
- 150 call briefs/month
- 50 connection matches/month
- 150 notes enhancements/month

**Total Cost: ~$0.09/month** (less than 9 cents!)

### Optimization Tips

1. Using `gemini-1.5-flash` (fastest, cheapest) instead of `gemini-pro`
2. Rate limiting prevents unexpected costs from runaway requests
3. Limiting candidate pool to 20 students reduces token usage in matching
4. Concise prompts with specific output format minimize tokens
5. Token count tracking in responses helps monitor usage
6. Graceful degradation means you don't burn tokens retrying failed requests

## Monitoring & Debugging

### Check if Gemini is Available

```typescript
import { isGeminiAvailable } from '@/lib/gemini-client'

if (!isGeminiAvailable()) {
  console.log('Gemini API not configured. Check GEMINI_API_KEY.')
}
```

### Token Usage Tracking

Every response includes `tokenCount`:

```typescript
const brief = await generateCallBrief(studentId)
console.log(`Used ${brief.tokenCount} tokens`)
```

Track cumulative usage:

```typescript
let totalTokens = 0

const brief = await generateCallBrief(studentId)
totalTokens += brief.tokenCount || 0

console.log(`Total tokens used: ${totalTokens}`)
console.log(`Estimated cost: $${(totalTokens / 1000000) * 0.30}`)
```

### Error Types

```typescript
import { parseGeminiError, GeminiErrorType } from '@/lib/gemini-client'

try {
  const brief = await generateCallBrief(studentId)
} catch (error) {
  const parsedError = parseGeminiError(error)

  switch (parsedError.type) {
    case GeminiErrorType.API_KEY_MISSING:
      // Handle missing API key
      break
    case GeminiErrorType.RATE_LIMIT:
      // Handle rate limit (auto-retry built in)
      break
    case GeminiErrorType.TIMEOUT:
      // Handle timeout (auto-retry built in)
      break
    // ... etc
  }
}
```

## Testing Recommendations

1. **Test with Real Data**: Use actual student IDs from your database
2. **Compare AI Output**: Check if briefs match founder's expectations
3. **Validate Connections**: Ensure suggested matches make sense
4. **Check Notes Enhancement**: Verify all important details are captured
5. **Monitor Token Usage**: Track first 100 calls to validate cost estimates
6. **Test Degradation**: Temporarily disable API to test fallback behavior

## Example Test Script

```typescript
// scripts/test-outreach-ai.ts
import { generateCallBrief, findMeaningfulConnections, enhanceCallNotes } from '@/lib/outreach-ai'
import { prisma } from '@/lib/prisma'

async function testOutreachAI() {
  // Get a random active student
  const student = await prisma.student.findFirst({
    where: { completionStatus: 'ACTIVE' }
  })

  if (!student) {
    console.log('No active students found')
    return
  }

  console.log(`Testing with student: ${student.name}`)

  // Test 1: Call Brief
  console.log('\n--- Test 1: Call Brief ---')
  const brief = await generateCallBrief(student.id)
  console.log('Success:', brief.success)
  console.log('Journey:', brief.journeySummary)
  console.log('Starters:', brief.conversationStarters)
  console.log('Tokens:', brief.tokenCount)

  // Test 2: Connections
  console.log('\n--- Test 2: Connections ---')
  const matches = await findMeaningfulConnections(student.id)
  console.log('Success:', matches.success)
  console.log('Matches found:', matches.topMatches.length)
  if (matches.topMatches.length > 0) {
    console.log('Top match:', matches.topMatches[0].studentName)
    console.log('Reason:', matches.topMatches[0].connectionReason)
  }
  console.log('Tokens:', matches.tokenCount)

  // Test 3: Notes Enhancement
  console.log('\n--- Test 3: Notes Enhancement ---')
  const rawNotes = 'Called student today. Doing well. Wants to switch batches. Wife interested in joining.'
  const enhanced = await enhanceCallNotes(rawNotes, {
    studentId: student.id,
    studentName: student.name,
    currentLevel: student.currentLevel,
    enrollmentDate: student.enrollmentDate
  })
  console.log('Success:', enhanced.success)
  console.log('Summary:', enhanced.summary)
  console.log('Action items:', enhanced.actionItems.length)
  console.log('Tokens:', enhanced.tokenCount)
}

testOutreachAI()
```

Run with: `tsx scripts/test-outreach-ai.ts`

## Next Steps

1. **Create API routes** for frontend consumption (examples above)
2. **Build UI components** to display call briefs and connections
3. **Integrate with call workflow**: Show brief before calling student
4. **Add to interaction form**: Use notes enhancement when saving call notes
5. **Build connection dashboard**: Show suggested student matches
6. **Monitor usage**: Track token usage and costs over first month
7. **Gather feedback**: See if founder finds AI suggestions helpful and adjust prompts

## Support & Troubleshooting

### Common Issues

**Issue**: "API key not found"
- **Solution**: Check `.env` has `GEMINI_API_KEY` set
- The system also checks for `GOOGLE_GEMINI_API_KEY` as fallback

**Issue**: Rate limit errors
- **Solution**: Built-in rate limiting handles this automatically
- Requests are queued and retried with exponential backoff

**Issue**: AI responses seem generic
- **Solution**: Check student data quality in database
- The AI can only work with the data it receives
- Add more detailed notes to student records for richer AI insights

**Issue**: Connection matches don't make sense
- **Solution**: Ensure student notes include relevant details
- The matching looks for information in notes, interactions, and student profile

## Conclusion

The Outreach AI system is production-ready with:
- Robust error handling and graceful degradation
- Rate limiting to prevent API abuse
- Extremely low cost (~9 cents/month)
- Type-safe TypeScript interfaces
- Easy integration with existing codebase

Start with one feature (call briefs) and expand to connections and notes enhancement as you validate the value.
