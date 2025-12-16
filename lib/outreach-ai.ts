/**
 * AI-Powered Founder Outreach System
 * Generates personalized call briefs, finds meaningful student connections,
 * and enhances call notes using Google Gemini
 */

import { generateContent, isGeminiAvailable } from './gemini-client'
import { prisma } from './prisma'
import { formatDistanceToNow, format } from 'date-fns'

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface CallBrief {
  success: boolean
  studentId: string
  studentName: string
  generatedAt: Date

  // Core brief content
  journeySummary: string // 2-line summary of student's journey
  sinceLastCall: string[] // What's changed since last interaction
  conversationStarters: string[] // 3-4 natural conversation topics
  personalDetail: string // Something personal to remember/mention
  suggestedConnections: StudentConnection[] // Potential peer connections

  // Context data
  enrollmentDate: Date
  currentLevel: string
  daysSinceEnrollment: number
  lastInteractionDate?: Date
  daysSinceLastInteraction?: number
  classesAttended: number
  attendanceRate: number
  paymentStatus: string
  churnRisk: string

  // Metadata
  tokenCount?: number
  error?: string
}

export interface StudentConnection {
  studentId: string
  studentName: string
  connectionReason: string // Why they'd be good to connect
  commonalities: string[] // Specific shared interests/experiences
  suggestedIntro: string // Draft introduction message
  confidenceScore: number // 0-100, how strong the match is
}

export interface ConnectionMatches {
  success: boolean
  studentId: string
  studentName: string
  topMatches: StudentConnection[]
  generatedAt: Date
  tokenCount?: number
  error?: string
}

export interface EnhancedCallNotes {
  success: boolean

  // Structured output
  summary: string // Clear summary of the call
  journeyUpdates: string[] // Key updates to student's journey
  personalNotes: string[] // Personal details shared
  actionItems: ActionItem[]
  followUpTiming: FollowUpSuggestion
  moodTone: string // How the student felt (e.g., "enthusiastic", "concerned")

  // Metadata
  rawNotes: string
  enhancedAt: Date
  tokenCount?: number
  error?: string
}

export interface ActionItem {
  task: string
  priority: 'high' | 'medium' | 'low'
  deadline?: string // Natural language like "this week", "before next class"
  assignedTo?: string // "founder", "teacher", "support team"
}

export interface FollowUpSuggestion {
  timing: string // "3 days", "1 week", "after next class"
  reason: string // Why follow up at this time
  suggestedTopic: string // What to discuss in follow-up
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Generate personalized pre-call brief for a student
 */
export async function generateCallBrief(studentId: string): Promise<CallBrief> {
  try {
    // Check if Gemini is available
    if (!isGeminiAvailable()) {
      return gracefulDegradation_CallBrief(studentId, 'Gemini API not available')
    }

    // Fetch comprehensive student data
    const studentData = await fetchStudentWithContext(studentId)

    if (!studentData) {
      return {
        success: false,
        studentId,
        studentName: 'Unknown',
        generatedAt: new Date(),
        journeySummary: '',
        sinceLastCall: [],
        conversationStarters: [],
        personalDetail: '',
        suggestedConnections: [],
        enrollmentDate: new Date(),
        currentLevel: '',
        daysSinceEnrollment: 0,
        classesAttended: 0,
        attendanceRate: 0,
        paymentStatus: '',
        churnRisk: '',
        error: 'Student not found',
      }
    }

    // Build context-rich prompt
    const prompt = buildCallBriefPrompt(studentData)

    // Generate AI response
    const result = await generateContent(prompt, 'gemini-1.5-flash')

    if (!result.success) {
      return gracefulDegradation_CallBrief(studentId, result.error || 'AI generation failed')
    }

    // Parse AI response
    const parsed = parseCallBriefResponse(result.content || '', studentData)

    return {
      success: true,
      studentId: studentData.id,
      studentName: studentData.name,
      generatedAt: new Date(),
      journeySummary: parsed.journeySummary,
      sinceLastCall: parsed.sinceLastCall,
      conversationStarters: parsed.conversationStarters,
      personalDetail: parsed.personalDetail,
      suggestedConnections: [], // Will be populated separately if needed
      enrollmentDate: studentData.enrollmentDate,
      currentLevel: studentData.currentLevel,
      daysSinceEnrollment: studentData.daysSinceEnrollment,
      lastInteractionDate: studentData.lastInteractionDate,
      daysSinceLastInteraction: studentData.daysSinceLastInteraction,
      classesAttended: studentData.classesAttended,
      attendanceRate: Number(studentData.attendanceRate),
      paymentStatus: studentData.paymentStatus,
      churnRisk: studentData.churnRisk,
      tokenCount: result.tokenCount,
    }
  } catch (error) {
    console.error('[Outreach AI] Error generating call brief:', error)
    return gracefulDegradation_CallBrief(studentId, (error as Error).message)
  }
}

/**
 * Find meaningful student-to-student connections
 */
export async function findMeaningfulConnections(studentId: string): Promise<ConnectionMatches> {
  try {
    // Check if Gemini is available
    if (!isGeminiAvailable()) {
      return {
        success: false,
        studentId,
        studentName: 'Unknown',
        topMatches: [],
        generatedAt: new Date(),
        error: 'Gemini API not available',
      }
    }

    // Fetch target student data
    const targetStudent = await fetchStudentProfile(studentId)
    if (!targetStudent) {
      return {
        success: false,
        studentId,
        studentName: 'Unknown',
        topMatches: [],
        generatedAt: new Date(),
        error: 'Student not found',
      }
    }

    // Fetch all active students (excluding target)
    const candidateStudents = await fetchActiveStudentsForMatching(studentId)

    if (candidateStudents.length === 0) {
      return {
        success: true,
        studentId: targetStudent.id,
        studentName: targetStudent.name,
        topMatches: [],
        generatedAt: new Date(),
        error: 'No other active students found',
      }
    }

    // Build matching prompt
    const prompt = buildConnectionMatchingPrompt(targetStudent, candidateStudents)

    // Generate AI response
    const result = await generateContent(prompt, 'gemini-1.5-flash')

    if (!result.success) {
      return {
        success: false,
        studentId: targetStudent.id,
        studentName: targetStudent.name,
        topMatches: [],
        generatedAt: new Date(),
        error: result.error,
      }
    }

    // Parse AI response
    const matches = parseConnectionMatchesResponse(result.content || '', candidateStudents)

    return {
      success: true,
      studentId: targetStudent.id,
      studentName: targetStudent.name,
      topMatches: matches.slice(0, 3), // Top 3 matches
      generatedAt: new Date(),
      tokenCount: result.tokenCount,
    }
  } catch (error) {
    console.error('[Outreach AI] Error finding connections:', error)
    return {
      success: false,
      studentId,
      studentName: 'Unknown',
      topMatches: [],
      generatedAt: new Date(),
      error: (error as Error).message,
    }
  }
}

/**
 * Enhance raw call notes with structure and insights
 */
export async function enhanceCallNotes(
  rawNotes: string,
  studentContext: {
    studentId: string
    studentName: string
    currentLevel: string
    enrollmentDate: Date
  }
): Promise<EnhancedCallNotes> {
  try {
    // Check if Gemini is available
    if (!isGeminiAvailable()) {
      return gracefulDegradation_CallNotes(rawNotes, 'Gemini API not available')
    }

    // Validate input
    if (!rawNotes || rawNotes.trim().length < 10) {
      return {
        success: false,
        summary: '',
        journeyUpdates: [],
        personalNotes: [],
        actionItems: [],
        followUpTiming: {
          timing: 'unknown',
          reason: 'Insufficient notes provided',
          suggestedTopic: '',
        },
        moodTone: 'neutral',
        rawNotes,
        enhancedAt: new Date(),
        error: 'Notes too short or empty',
      }
    }

    // Build enhancement prompt
    const prompt = buildNotesEnhancementPrompt(rawNotes, studentContext)

    // Generate AI response
    const result = await generateContent(prompt, 'gemini-1.5-flash')

    if (!result.success) {
      return gracefulDegradation_CallNotes(rawNotes, result.error || 'AI generation failed')
    }

    // Parse AI response
    const parsed = parseEnhancedNotesResponse(result.content || '')

    return {
      success: true,
      summary: parsed.summary,
      journeyUpdates: parsed.journeyUpdates,
      personalNotes: parsed.personalNotes,
      actionItems: parsed.actionItems,
      followUpTiming: parsed.followUpTiming,
      moodTone: parsed.moodTone,
      rawNotes,
      enhancedAt: new Date(),
      tokenCount: result.tokenCount,
    }
  } catch (error) {
    console.error('[Outreach AI] Error enhancing notes:', error)
    return gracefulDegradation_CallNotes(rawNotes, (error as Error).message)
  }
}

// ============================================================================
// Data Fetching Functions
// ============================================================================

/**
 * Fetch student with full context for call brief
 */
async function fetchStudentWithContext(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      batch: {
        include: {
          teacher: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      interactions: {
        orderBy: { createdAt: 'desc' },
        take: 5, // Last 5 interactions
        select: {
          interactionType: true,
          category: true,
          notes: true,
          outcome: true,
          createdAt: true,
          userName: true,
        },
      },
      payments: {
        orderBy: { paymentDate: 'desc' },
        take: 3,
        select: {
          amount: true,
          paymentDate: true,
          method: true,
          status: true,
        },
      },
      attendance: {
        orderBy: { date: 'desc' },
        take: 10,
        select: {
          date: true,
          status: true,
        },
      },
    },
  })

  if (!student) return null

  const daysSinceEnrollment = Math.floor(
    (new Date().getTime() - student.enrollmentDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  const lastInteraction = student.interactions[0]
  const daysSinceLastInteraction = lastInteraction
    ? Math.floor(
        (new Date().getTime() - lastInteraction.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      )
    : undefined

  return {
    ...student,
    daysSinceEnrollment,
    lastInteractionDate: lastInteraction?.createdAt,
    daysSinceLastInteraction,
  }
}

/**
 * Fetch student profile for connection matching
 */
async function fetchStudentProfile(studentId: string) {
  return await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      name: true,
      currentLevel: true,
      enrollmentDate: true,
      isCombo: true,
      comboLevels: true,
      notes: true,
      classesAttended: true,
      attendanceRate: true,
      churnRisk: true,
      batch: {
        select: {
          batchCode: true,
          level: true,
          timing: true,
        },
      },
      interactions: {
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
          notes: true,
          category: true,
        },
      },
    },
  })
}

/**
 * Fetch active students for matching (excluding target student)
 */
async function fetchActiveStudentsForMatching(excludeStudentId: string) {
  const students = await prisma.student.findMany({
    where: {
      id: { not: excludeStudentId },
      completionStatus: 'ACTIVE',
      churnRisk: { not: 'HIGH' }, // Exclude high churn risk students
    },
    select: {
      id: true,
      name: true,
      currentLevel: true,
      enrollmentDate: true,
      isCombo: true,
      comboLevels: true,
      notes: true,
      classesAttended: true,
      attendanceRate: true,
      batch: {
        select: {
          batchCode: true,
          level: true,
          timing: true,
        },
      },
      interactions: {
        orderBy: { createdAt: 'desc' },
        take: 2,
        select: {
          notes: true,
        },
      },
    },
    take: 20, // Limit to 20 candidates to control token usage
    orderBy: {
      enrollmentDate: 'desc', // Prefer recent students
    },
  })

  return students
}

// ============================================================================
// Prompt Building Functions
// ============================================================================

/**
 * Build prompt for call brief generation
 */
function buildCallBriefPrompt(studentData: any): string {
  const recentInteractions = studentData.interactions
    .map((i: any) => `- ${i.category}: ${i.notes} (${formatDistanceToNow(i.createdAt)} ago)`)
    .join('\n')

  const recentPayments = studentData.payments
    .map((p: any) => `- ${p.amount} EUR via ${p.method} on ${format(p.paymentDate, 'MMM dd')} (${p.status})`)
    .join('\n')

  const recentAttendance = studentData.attendance
    .map((a: any) => `${format(a.date, 'MMM dd')}: ${a.status}`)
    .join(', ')

  return `You are helping a founder prepare for a warm, personal call with a student in their German language school. Generate a helpful call brief.

**STUDENT PROFILE:**
Name: ${studentData.name}
Level: ${studentData.currentLevel}
Enrolled: ${formatDistanceToNow(studentData.enrollmentDate)} ago (${format(studentData.enrollmentDate, 'MMM dd, yyyy')})
Days since enrollment: ${studentData.daysSinceEnrollment}
Classes attended: ${studentData.classesAttended} / ${studentData.totalClasses}
Attendance rate: ${studentData.attendanceRate}%
Payment status: ${studentData.paymentStatus}
Churn risk: ${studentData.churnRisk}
Batch: ${studentData.batch?.batchCode || 'Not assigned'}
Teacher: ${studentData.batch?.teacher?.name || 'Not assigned'}

**RECENT INTERACTIONS:**
${recentInteractions || 'No recent interactions'}

**PAYMENT HISTORY:**
${recentPayments || 'No payments yet'}

**RECENT ATTENDANCE:**
${recentAttendance || 'No attendance records'}

**STUDENT NOTES:**
${studentData.notes || 'No notes'}

---

Please provide a warm, personal call brief in the following JSON format:

{
  "journeySummary": "A warm 2-line summary of their journey so far",
  "sinceLastCall": ["Change 1", "Change 2", "Change 3"],
  "conversationStarters": ["Natural topic 1", "Natural topic 2", "Natural topic 3", "Natural topic 4"],
  "personalDetail": "Something personal and meaningful to remember or mention"
}

**GUIDELINES:**
- Be warm and human, not robotic or corporate
- Focus on the student as a person, not just metrics
- Make conversation starters natural (not "How are your classes?" but "I noticed you've been crushing the attendance lately!")
- Personal detail should be genuinely personal (hobbies, aspirations, challenges mentioned before)
- If last call was long ago or never happened, acknowledge it naturally
- Keep it concise but meaningful

Return ONLY valid JSON, no additional text.`
}

/**
 * Build prompt for connection matching
 */
function buildConnectionMatchingPrompt(targetStudent: any, candidates: any[]): string {
  const candidatesList = candidates
    .map(
      (c, idx) => `
[${idx + 1}] ${c.name}
- Level: ${c.currentLevel}
- Enrolled: ${formatDistanceToNow(c.enrollmentDate)} ago
- Batch: ${c.batch?.batchCode || 'N/A'} (${c.batch?.timing || 'N/A'})
- Attendance: ${c.attendanceRate}%
- Notes: ${c.notes || 'None'}
- Recent context: ${c.interactions.map((i: any) => i.notes).join('; ') || 'None'}
`
    )
    .join('\n')

  return `You are helping a founder find meaningful peer connections for their students to build community.

**TARGET STUDENT:**
Name: ${targetStudent.name}
Level: ${targetStudent.currentLevel}
Enrolled: ${formatDistanceToNow(targetStudent.enrollmentDate)} ago
Batch: ${targetStudent.batch?.batchCode || 'N/A'} (${targetStudent.batch?.timing || 'N/A'})
Notes: ${targetStudent.notes || 'None'}
Recent context: ${targetStudent.interactions.map((i: any) => i.notes).join('; ') || 'None'}

**CANDIDATE STUDENTS:**
${candidatesList}

---

Find the TOP 3 most meaningful connections. Look for:
- Deep similarities (NOT just same level or batch)
- Shared challenges, goals, or backgrounds
- Complementary strengths (one excels where other struggles)
- Similar life situations or timezones
- Shared interests mentioned in notes

Return response in this JSON format:

{
  "matches": [
    {
      "candidateIndex": 1,
      "connectionReason": "Why they'd connect well (1 sentence)",
      "commonalities": ["Specific thing 1", "Specific thing 2"],
      "suggestedIntro": "Draft introduction message from founder to both students",
      "confidenceScore": 85
    }
  ]
}

**GUIDELINES:**
- Confidence score: 70-100 (only suggest high-confidence matches)
- Be specific in commonalities (not "both learning German" - that's everyone!)
- Introduction should feel personal, warm, from founder
- Max 3 matches, prioritize quality over quantity

Return ONLY valid JSON, no additional text.`
}

/**
 * Build prompt for call notes enhancement
 */
function buildNotesEnhancementPrompt(rawNotes: string, context: any): string {
  return `You are helping a founder organize their quick call notes into structured, actionable format.

**STUDENT CONTEXT:**
Name: ${context.studentName}
Level: ${context.currentLevel}
Enrolled: ${formatDistanceToNow(context.enrollmentDate)} ago

**RAW NOTES FROM CALL:**
${rawNotes}

---

Transform these notes into structured format in this JSON:

{
  "summary": "Clear 1-2 sentence summary of the call",
  "journeyUpdates": ["Update 1 about their learning journey", "Update 2"],
  "personalNotes": ["Personal detail 1 to remember", "Personal detail 2"],
  "actionItems": [
    {
      "task": "Specific action",
      "priority": "high|medium|low",
      "deadline": "this week",
      "assignedTo": "founder|teacher|support team"
    }
  ],
  "followUpTiming": {
    "timing": "3 days",
    "reason": "Why follow up at this time",
    "suggestedTopic": "What to discuss"
  },
  "moodTone": "enthusiastic|neutral|concerned|frustrated|excited"
}

**GUIDELINES:**
- Extract action items even from casual mentions ("I'll send them the link" = action item)
- Personal notes are things to remember (family, hobbies, life events)
- Journey updates are progress, challenges, breakthroughs in learning
- Follow-up timing should be strategic based on what was discussed
- Mood/tone helps founder understand how student is feeling
- Be concise but capture all important information

Return ONLY valid JSON, no additional text.`
}

// ============================================================================
// Response Parsing Functions
// ============================================================================

/**
 * Parse call brief AI response
 */
function parseCallBriefResponse(aiResponse: string, studentData: any) {
  try {
    // Extract JSON from response (in case AI added extra text)
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')

    const parsed = JSON.parse(jsonMatch[0])

    return {
      journeySummary: parsed.journeySummary || 'No summary available',
      sinceLastCall: Array.isArray(parsed.sinceLastCall) ? parsed.sinceLastCall : [],
      conversationStarters: Array.isArray(parsed.conversationStarters)
        ? parsed.conversationStarters
        : [],
      personalDetail: parsed.personalDetail || 'No personal details noted',
    }
  } catch (error) {
    console.error('[Outreach AI] Error parsing call brief response:', error)
    // Return fallback
    return {
      journeySummary: `${studentData.name} enrolled ${formatDistanceToNow(studentData.enrollmentDate)} ago and is in ${studentData.currentLevel}.`,
      sinceLastCall: ['Unable to generate detailed insights'],
      conversationStarters: [
        'How are your classes going?',
        'Any challenges with the current level?',
      ],
      personalDetail: 'Check notes for personal details',
    }
  }
}

/**
 * Parse connection matches AI response
 */
function parseConnectionMatchesResponse(aiResponse: string, candidates: any[]): StudentConnection[] {
  try {
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')

    const parsed = JSON.parse(jsonMatch[0])

    if (!Array.isArray(parsed.matches)) {
      return []
    }

    return parsed.matches.map((match: any) => {
      const candidate = candidates[match.candidateIndex - 1]
      if (!candidate) return null

      return {
        studentId: candidate.id,
        studentName: candidate.name,
        connectionReason: match.connectionReason || '',
        commonalities: Array.isArray(match.commonalities) ? match.commonalities : [],
        suggestedIntro: match.suggestedIntro || '',
        confidenceScore: match.confidenceScore || 50,
      }
    }).filter((m: any) => m !== null) as StudentConnection[]
  } catch (error) {
    console.error('[Outreach AI] Error parsing connection matches:', error)
    return []
  }
}

/**
 * Parse enhanced notes AI response
 */
function parseEnhancedNotesResponse(aiResponse: string) {
  try {
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')

    const parsed = JSON.parse(jsonMatch[0])

    return {
      summary: parsed.summary || 'No summary available',
      journeyUpdates: Array.isArray(parsed.journeyUpdates) ? parsed.journeyUpdates : [],
      personalNotes: Array.isArray(parsed.personalNotes) ? parsed.personalNotes : [],
      actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
      followUpTiming: parsed.followUpTiming || {
        timing: 'unknown',
        reason: 'Not determined',
        suggestedTopic: 'General check-in',
      },
      moodTone: parsed.moodTone || 'neutral',
    }
  } catch (error) {
    console.error('[Outreach AI] Error parsing enhanced notes:', error)
    return {
      summary: 'Unable to parse notes',
      journeyUpdates: [],
      personalNotes: [],
      actionItems: [],
      followUpTiming: {
        timing: 'unknown',
        reason: 'Unable to determine',
        suggestedTopic: 'Follow-up needed',
      },
      moodTone: 'neutral',
    }
  }
}

// ============================================================================
// Graceful Degradation Functions
// ============================================================================

/**
 * Graceful degradation for call brief when AI is unavailable
 */
async function gracefulDegradation_CallBrief(
  studentId: string,
  errorReason: string
): Promise<CallBrief> {
  console.warn(`[Outreach AI] Graceful degradation for call brief: ${errorReason}`)

  // Fetch basic student data
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      interactions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!student) {
    return {
      success: false,
      studentId,
      studentName: 'Unknown',
      generatedAt: new Date(),
      journeySummary: '',
      sinceLastCall: [],
      conversationStarters: [],
      personalDetail: '',
      suggestedConnections: [],
      enrollmentDate: new Date(),
      currentLevel: '',
      daysSinceEnrollment: 0,
      classesAttended: 0,
      attendanceRate: 0,
      paymentStatus: '',
      churnRisk: '',
      error: errorReason,
    }
  }

  const daysSinceEnrollment = Math.floor(
    (new Date().getTime() - student.enrollmentDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  const lastInteraction = student.interactions[0]
  const daysSinceLastInteraction = lastInteraction
    ? Math.floor(
        (new Date().getTime() - lastInteraction.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      )
    : undefined

  return {
    success: false,
    studentId: student.id,
    studentName: student.name,
    generatedAt: new Date(),
    journeySummary: `${student.name} enrolled ${formatDistanceToNow(student.enrollmentDate)} ago and is currently in ${student.currentLevel}. They have ${student.attendanceRate}% attendance.`,
    sinceLastCall: lastInteraction
      ? [`Last contact: ${formatDistanceToNow(lastInteraction.createdAt)} ago`]
      : ['No previous interactions recorded'],
    conversationStarters: [
      `How are you finding ${student.currentLevel}?`,
      'Any challenges or questions about the course?',
      'How can we support you better?',
    ],
    personalDetail: student.notes || 'Check student notes for details',
    suggestedConnections: [],
    enrollmentDate: student.enrollmentDate,
    currentLevel: student.currentLevel,
    daysSinceEnrollment,
    lastInteractionDate: lastInteraction?.createdAt,
    daysSinceLastInteraction,
    classesAttended: student.classesAttended,
    attendanceRate: Number(student.attendanceRate),
    paymentStatus: student.paymentStatus,
    churnRisk: student.churnRisk,
    error: errorReason,
  }
}

/**
 * Graceful degradation for call notes when AI is unavailable
 */
function gracefulDegradation_CallNotes(
  rawNotes: string,
  errorReason: string
): EnhancedCallNotes {
  console.warn(`[Outreach AI] Graceful degradation for call notes: ${errorReason}`)

  return {
    success: false,
    summary: rawNotes.substring(0, 200),
    journeyUpdates: [],
    personalNotes: [],
    actionItems: [
      {
        task: 'Review and organize call notes manually',
        priority: 'medium',
        assignedTo: 'founder',
      },
    ],
    followUpTiming: {
      timing: '1 week',
      reason: 'Standard follow-up',
      suggestedTopic: 'General check-in',
    },
    moodTone: 'neutral',
    rawNotes,
    enhancedAt: new Date(),
    error: errorReason,
  }
}
