/**
 * Example outputs and usage demonstrations for Outreach AI
 * This file shows what each function returns with sample data
 */

// ============================================================================
// Example 1: Call Brief Generation
// ============================================================================

export const EXAMPLE_CALL_BRIEF = {
  success: true,
  studentId: 'cm4abc123xyz',
  studentName: 'Priya Sharma',
  generatedAt: new Date('2024-12-16T10:30:00Z'),

  // AI-Generated Content
  journeySummary:
    "Priya joined Plan Beta 3 weeks ago for A1 level and has been incredibly engaged, attending every class. She's motivated by her upcoming move to Berlin for work and is making steady progress with German grammar.",

  sinceLastCall: [
    "Completed her first 8 classes with 100% attendance",
    "Made first payment of 200 EUR (full course fee paid)",
    "Asked teacher about conversation practice opportunities",
    "Mentioned struggling with German articles (der/die/das) in last class",
  ],

  conversationStarters: [
    "I saw you've been crushing it with perfect attendance - how are you finding the pace?",
    "Your teacher mentioned you're curious about conversation practice. Want to connect you with a study buddy?",
    "How's the prep going for your Berlin move? Are the classes helping you feel more confident?",
    "I noticed the articles are giving you some trouble - that's totally normal! Want some extra resources?",
  ],

  personalDetail:
    "Moving to Berlin in February for a software engineering job at a fintech startup. She's excited but nervous about daily conversations and has a cat named Schnitzel (yes, really!).",

  suggestedConnections: [
    {
      studentId: 'cm4def456uvw',
      studentName: 'Rahul Menon',
      connectionReason:
        "Both are software engineers moving to Germany for work, similar timeline and professional background",
      commonalities: [
        "Working in tech (software engineering)",
        "Moving to Germany in Q1 2025",
        "Both taking A1 level",
        "Both mentioned anxiety about workplace conversations",
      ],
      suggestedIntro:
        "Hey Priya and Rahul! I thought you two should connect - you're both software engineers heading to Germany soon and tackling A1 together. Rahul is going to Munich, so you can share tips about settling in. Want me to create a WhatsApp group for you both?",
      confidenceScore: 92,
    },
  ],

  // Context Data
  enrollmentDate: new Date('2024-11-25T00:00:00Z'),
  currentLevel: 'A1',
  daysSinceEnrollment: 21,
  lastInteractionDate: new Date('2024-12-09T14:20:00Z'),
  daysSinceLastInteraction: 7,
  classesAttended: 8,
  totalClasses: 8,
  attendanceRate: 100,
  paymentStatus: 'PAID',
  churnRisk: 'LOW',

  // Metadata
  tokenCount: 1247,
}

// ============================================================================
// Example 2: Connection Matching
// ============================================================================

export const EXAMPLE_CONNECTION_MATCHES = {
  success: true,
  studentId: 'cm4ghi789rst',
  studentName: 'Ananya Iyer',
  generatedAt: new Date('2024-12-16T11:00:00Z'),

  topMatches: [
    {
      studentId: 'cm4jkl012mno',
      studentName: 'Sneha Nair',
      connectionReason:
        "Both are nurses preparing for German language exams for medical licensing, with similar exam timelines",
      commonalities: [
        "Healthcare professionals (both nurses)",
        "Preparing for B2 Goethe exam in March 2025",
        "Both mentioned medical terminology as a challenge",
        "Similar study schedules (evening batches)",
        "Both from Kerala, Malayalam speakers",
      ],
      suggestedIntro:
        "Ananya and Sneha - I had to introduce you two! You're both nurses prepping for the same B2 exam in March, dealing with medical German, and from Kerala. I think you'd be amazing study partners. Sneha already has a great system for medical vocab - maybe you can share notes? Shall I connect you on WhatsApp?",
      confidenceScore: 95,
    },
    {
      studentId: 'cm4pqr345stu',
      studentName: 'Arjun Das',
      connectionReason:
        "Both are perfectionists struggling with speaking confidence despite strong grammar skills",
      commonalities: [
        "Excellent attendance (>95%)",
        "Strong written skills but hesitant to speak",
        "Mentioned fear of making mistakes in conversation",
        "Both in B1 level",
        "Teachers noted they need confidence building",
      ],
      suggestedIntro:
        "Hey Ananya and Arjun! You're both doing brilliantly with grammar but I know you both mentioned feeling shy about speaking. What if you two practiced together? Sometimes it's easier with someone in the same boat. No judgment, just practice! Want to try a weekly 15-min chat?",
      confidenceScore: 87,
    },
    {
      studentId: 'cm4vwx678yza',
      studentName: 'Kavya Krishnan',
      connectionReason:
        "Both are learning German for Master's programs in Germany, similar academic interests in data science",
      commonalities: [
        "Applying for Master's programs in Germany",
        "Both interested in data science/analytics programs",
        "Similar timeline (applications due in April)",
        "Both in A2 level, preparing for B1",
        "Mentioned need for academic German (research papers, presentations)",
      ],
      suggestedIntro:
        "Ananya and Kavya - perfect match! You're both applying for Master's programs and dealing with academic German. Kavya just figured out a good system for understanding research papers. Maybe you can compare notes on universities too? Let me know if you want an intro!",
      confidenceScore: 89,
    },
  ],

  tokenCount: 1856,
}

// ============================================================================
// Example 3: Enhanced Call Notes
// ============================================================================

export const EXAMPLE_RAW_NOTES = `
Called Rajesh today. He sounded a bit stressed but overall positive.
Says work has been crazy, missed last 2 classes because of deadlines.
Wants to continue but might need to switch to weekend batch.
His wife is also interested in learning, asked about couple discount.
Mentioned he's struggling with homework, takes him 2+ hours.
Really likes his teacher (Sarah) but timing not working anymore.
Plans to visit Germany in March for work trip, wants to be conversational by then.
Has a dog named Bruno who keeps interrupting Zoom classes (we both laughed).
`

export const EXAMPLE_ENHANCED_NOTES = {
  success: true,

  summary:
    "Rajesh is committed to continuing but needs batch change to weekends due to work pressure. He's stressed about homework time and wants his wife to join. March Germany trip is his motivation.",

  journeyUpdates: [
    "Missed last 2 classes due to work deadlines",
    "Finding homework takes 2+ hours, feeling overwhelmed",
    "March work trip to Germany is creating urgency for conversational fluency",
  ],

  personalNotes: [
    "Wife is interested in joining - asked about couple discount",
    "Has a dog named Bruno who interrupts Zoom classes (light-hearted about it)",
    "Works in demanding job with tight deadlines",
  ],

  actionItems: [
    {
      task: "Check weekend batch availability for Rajesh",
      priority: "high",
      deadline: "this week",
      assignedTo: "founder",
    },
    {
      task: "Send couple discount information to Rajesh",
      priority: "high",
      deadline: "this week",
      assignedTo: "founder",
    },
    {
      task: "Share homework optimization tips or lighter homework alternatives with teacher Sarah",
      priority: "medium",
      deadline: "before next class",
      assignedTo: "teacher",
    },
    {
      task: "Create conversation-focused practice plan for March trip preparation",
      priority: "medium",
      deadline: "2 weeks",
      assignedTo: "teacher",
    },
  ],

  followUpTiming: {
    timing: "3 days",
    reason: "Need to confirm weekend batch transfer before he misses more classes",
    suggestedTopic:
      "Update on weekend batch availability and wife's enrollment. Check how first weekend class went.",
  },

  moodTone: "stressed but committed",

  rawNotes: EXAMPLE_RAW_NOTES,
  enhancedAt: new Date('2024-12-16T15:45:00Z'),
  tokenCount: 892,
}

// ============================================================================
// Usage Examples
// ============================================================================

export const USAGE_EXAMPLES = `
// Example 1: Generate Call Brief Before Outreach
import { generateCallBrief } from '@/lib/outreach-ai'

async function prepareForCall(studentId: string) {
  const brief = await generateCallBrief(studentId)

  if (brief.success) {
    console.log('Journey:', brief.journeySummary)
    console.log('Talk about:', brief.conversationStarters)
    console.log('Remember:', brief.personalDetail)
  } else {
    // Graceful degradation - still get basic info
    console.log('Basic brief:', brief.journeySummary)
  }
}

// Example 2: Find Student Connections for Community Building
import { findMeaningfulConnections } from '@/lib/outreach-ai'

async function suggestStudyBuddies(studentId: string) {
  const matches = await findMeaningfulConnections(studentId)

  if (matches.success && matches.topMatches.length > 0) {
    for (const match of matches.topMatches) {
      console.log(\`Match: \${match.studentName} (\${match.confidenceScore}% confidence)\`)
      console.log(\`Because: \${match.connectionReason}\`)
      console.log(\`Intro: \${match.suggestedIntro}\`)
    }
  }
}

// Example 3: Enhance Call Notes After Call
import { enhanceCallNotes } from '@/lib/outreach-ai'

async function saveCallNotes(rawNotes: string, studentContext: any) {
  const enhanced = await enhanceCallNotes(rawNotes, studentContext)

  if (enhanced.success) {
    // Save structured data to database
    await saveStudentInteraction({
      studentId: studentContext.studentId,
      notes: enhanced.summary,
      actionItems: enhanced.actionItems,
      followUpDate: calculateFollowUpDate(enhanced.followUpTiming.timing),
      moodTone: enhanced.moodTone,
    })

    // Create action items in task system
    for (const item of enhanced.actionItems) {
      await createTask(item)
    }
  }
}

// Example 4: API Route for Frontend
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
`

// ============================================================================
// Cost Estimates
// ============================================================================

export const COST_ESTIMATES = {
  model: 'gemini-1.5-flash',
  pricing: {
    input: '$0.075 per 1M tokens',
    output: '$0.30 per 1M tokens',
  },

  perCallBrief: {
    averageInputTokens: 800, // Student data + prompt
    averageOutputTokens: 450, // AI response
    totalTokens: 1250,
    costPerCall: '$0.000195', // ~0.02 cents
    costPer1000Calls: '$0.195', // ~20 cents per 1000 calls
  },

  perConnectionMatch: {
    averageInputTokens: 1200, // Multiple students data
    averageOutputTokens: 650,
    totalTokens: 1850,
    costPerCall: '$0.000285', // ~0.03 cents
    costPer1000Calls: '$0.285', // ~29 cents per 1000 calls
  },

  perNotesEnhancement: {
    averageInputTokens: 500, // Raw notes + context
    averageOutputTokens: 400,
    totalTokens: 900,
    costPerCall: '$0.000158', // ~0.016 cents
    costPer1000Calls: '$0.158', // ~16 cents per 1000 calls
  },

  monthlyEstimate: {
    assumptions: {
      students: 200,
      callBriefsPerMonth: 150, // Not every student every month
      connectionMatchesPerMonth: 50, // Periodic community building
      notesEnhancementsPerMonth: 150, // After most calls
    },
    totalCost: '$0.087', // Less than 9 cents per month!
  },

  optimization: {
    tips: [
      'Using gemini-1.5-flash (fastest, cheapest) instead of gemini-pro',
      'Rate limiting prevents API throttling and unexpected costs',
      'Limiting candidate pool to 20 students for matching reduces tokens',
      'Concise prompts with specific output format reduces token usage',
      'Graceful degradation provides value even when API is down',
      'Token count tracking helps monitor and optimize costs',
    ],
  },
}

// ============================================================================
// Response Quality & Consistency Notes
// ============================================================================

export const QUALITY_NOTES = {
  strengths: [
    'Warm, personal tone throughout - not corporate/robotic',
    'Specific, actionable insights rather than generic suggestions',
    'Context-aware responses that reference actual student data',
    'Graceful degradation ensures system never "breaks"',
    'JSON output format ensures consistent, parseable responses',
  ],

  potentialConcerns: [
    {
      concern: 'AI hallucination of facts',
      mitigation:
        'Prompts explicitly provide all factual data - AI only analyzes and formats, not creates facts',
    },
    {
      concern: 'Inconsistent JSON format',
      mitigation:
        'Strict JSON parsing with fallback values. Even malformed responses are handled gracefully.',
    },
    {
      concern: 'Generic/template-like responses',
      mitigation:
        'Prompts emphasize specific examples from student data. Temperature set to 0.7 for balanced creativity.',
    },
    {
      concern: 'API rate limits during peak usage',
      mitigation:
        'Built-in rate limiting (15 req/min), request queuing, and exponential backoff on retries.',
    },
    {
      concern: 'Cost spiraling with high usage',
      mitigation:
        'Token limits (2048 max output), cost tracking, and extremely low per-call costs (~0.02 cents).',
    },
  ],

  testing: {
    recommended: [
      'Test with actual student data from database',
      'Compare AI-generated briefs with founder expectations',
      'Validate connection matches make sense to founder',
      'Check enhanced notes capture all important details from raw notes',
      'Monitor token usage over first 100 calls to validate estimates',
      'Test graceful degradation by temporarily disabling API',
    ],
  },
}
