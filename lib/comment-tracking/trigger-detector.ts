/**
 * Comment Trigger Word Detector
 * Detects high-intent trigger words in Instagram comments
 */

export interface TriggerResult {
  hasTriggers: boolean
  triggerWords: string[]
  priority: 'critical' | 'high' | 'medium' | 'low'
  leadIntent: boolean
  shouldAutoReply: boolean
  suggestedReply?: string
  intent: 'enrollment' | 'pricing' | 'schedule' | 'trial' | 'level_info' | 'general'
  score: number // 0-100
}

/**
 * Critical trigger words that need immediate response
 */
const CRITICAL_TRIGGERS = [
  'interested',
  'want to join',
  'how to enroll',
  'enroll',
  'register',
  'admission',
  'sign up',
]

/**
 * High priority trigger words
 */
const HIGH_PRIORITY_TRIGGERS = [
  'price',
  'fee',
  'cost',
  'how much',
  'payment',
  'trial',
  'demo',
  'free class',
  'when start',
  'next batch',
  'timing',
  'schedule',
]

/**
 * Medium priority trigger words
 */
const MEDIUM_PRIORITY_TRIGGERS = [
  'info',
  'details',
  'information',
  'know more',
  'tell me',
  'a1',
  'a2',
  'b1',
  'b2',
  'level',
  'beginner',
  'duration',
  'german',
  'course',
]

/**
 * Question indicators
 */
const QUESTION_WORDS = ['?', 'how', 'when', 'where', 'what', 'why', 'can', 'will']

/**
 * Negative/spam indicators
 */
const SPAM_INDICATORS = [
  'dm for',
  'check dm',
  'follow me',
  'buy followers',
  'promotion',
  'click link',
  'visit my',
  '🔥🔥🔥',
  '👉👉👉',
]

/**
 * Auto-reply templates for common triggers
 */
const AUTO_REPLIES: Record<string, string> = {
  pricing: "Hi! Our German course fees are:\n• A1/A2: €350\n• B1: €400\n• B2: €450\n\nWe also offer combo packages! DM us for details 📚",
  schedule: "Hi! We start new batches every 2 weeks.\n\nFor the latest schedule, please DM us or check our story highlights! 📅",
  trial: "Hi! Yes, we offer a FREE trial class! 🎓\n\nDM us to book your slot. No payment required!",
  enrollment: "Hi! We'd love to have you! 🇩🇪\n\nPlease DM us to discuss batch options and complete enrollment. Our team is ready to help!",
  level_info: "Hi! We offer courses for all levels:\n• A1 - Beginner\n• A2 - Elementary\n• B1 - Intermediate\n• B2 - Advanced\n\nDM us to find the right level for you!",
}

/**
 * Detect trigger words in comment text
 */
export function detectTriggers(commentText: string): TriggerResult {
  const lowerText = commentText.toLowerCase().trim()

  // Check for spam first
  const isSpam = SPAM_INDICATORS.some(spam => lowerText.includes(spam))
  if (isSpam) {
    return {
      hasTriggers: false,
      triggerWords: [],
      priority: 'low',
      leadIntent: false,
      shouldAutoReply: false,
      intent: 'general',
      score: 0,
    }
  }

  const foundTriggers: string[] = []
  let score = 0
  let priority: TriggerResult['priority'] = 'low'
  let intent: TriggerResult['intent'] = 'general'

  // Check critical triggers
  for (const trigger of CRITICAL_TRIGGERS) {
    if (lowerText.includes(trigger)) {
      foundTriggers.push(trigger)
      score += 40
      priority = 'critical'
      intent = 'enrollment'
    }
  }

  // Check high priority triggers
  for (const trigger of HIGH_PRIORITY_TRIGGERS) {
    if (lowerText.includes(trigger)) {
      foundTriggers.push(trigger)
      score += 20
      if (priority !== 'critical') {
        priority = 'high'
      }

      // Determine intent (only if not already set to enrollment)
      if (intent !== 'enrollment') {
        if (trigger.includes('price') || trigger.includes('fee') || trigger.includes('cost')) {
          intent = 'pricing'
        } else if (trigger.includes('trial') || trigger.includes('demo') || trigger.includes('free class')) {
          intent = 'trial'
        } else if (trigger.includes('when') || trigger.includes('batch') || trigger.includes('timing') || trigger.includes('schedule')) {
          intent = 'schedule'
        }
      }
    }
  }

  // Check medium priority triggers
  for (const trigger of MEDIUM_PRIORITY_TRIGGERS) {
    if (lowerText.includes(trigger)) {
      foundTriggers.push(trigger)
      score += 10
      if (priority === 'low') {
        priority = 'medium'
      }

      // Determine intent (only if not already set to higher priority intent)
      if (intent === 'general' && ['a1', 'a2', 'b1', 'b2', 'level', 'beginner'].includes(trigger)) {
        intent = 'level_info'
      }
    }
  }

  // Boost score if it's a question
  const isQuestion = QUESTION_WORDS.some(word => lowerText.includes(word))
  if (isQuestion) {
    score += 15
    if (priority === 'low') {
      priority = 'medium'
    }
  }

  // Determine if should auto-reply
  const shouldAutoReply = (
    priority === 'critical' ||
    (priority === 'high' && intent !== 'general')
  ) && commentText.length < 100 // Don't auto-reply to very long comments

  const leadIntent = score >= 30 || priority === 'critical' || priority === 'high'

  // Get suggested reply
  const suggestedReply = shouldAutoReply ? AUTO_REPLIES[intent] : undefined

  return {
    hasTriggers: foundTriggers.length > 0,
    triggerWords: [...new Set(foundTriggers)], // Remove duplicates
    priority,
    leadIntent,
    shouldAutoReply,
    suggestedReply,
    intent,
    score: Math.min(score, 100),
  }
}

/**
 * Batch analyze multiple comments
 */
export function analyzeComments(comments: { text: string; username: string }[]): {
  highPriority: typeof comments[number][]
  leadIntents: typeof comments[number][]
  needsReply: typeof comments[number][]
  spam: typeof comments[number][]
} {
  const highPriority: typeof comments = []
  const leadIntents: typeof comments = []
  const needsReply: typeof comments = []
  const spam: typeof comments = []

  for (const comment of comments) {
    const result = detectTriggers(comment.text)

    if (result.score === 0) {
      spam.push(comment)
      continue
    }

    if (result.priority === 'critical' || result.priority === 'high') {
      highPriority.push(comment)
    }

    if (result.leadIntent) {
      leadIntents.push(comment)
    }

    if (result.shouldAutoReply) {
      needsReply.push(comment)
    }
  }

  return {
    highPriority,
    leadIntents,
    needsReply,
    spam,
  }
}

/**
 * Extract contact info from comment if present
 */
export function extractContactFromComment(commentText: string): {
  phone?: string
  email?: string
} {
  const contact: { phone?: string; email?: string } = {}

  // Extract email
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/
  const emailMatch = commentText.match(emailPattern)
  if (emailMatch) {
    contact.email = emailMatch[0]
  }

  // Extract phone (Indian format - handles spaces and dashes)
  const phonePatterns = [
    /\+91[\s-]?[6-9][\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d/,
    /\b[6-9]\d{9}\b/,
  ]
  for (const pattern of phonePatterns) {
    const phoneMatch = commentText.match(pattern)
    if (phoneMatch) {
      contact.phone = phoneMatch[0].replace(/[\s-]/g, '')
      break
    }
  }

  return contact
}

/**
 * Generate lead notes from comment
 */
export function generateNotesFromComment(
  username: string,
  commentText: string,
  mediaUrl?: string,
  triggerResult?: TriggerResult
): string {
  const notes: string[] = []

  notes.push(`🔹 Source: Instagram Comment (@${username})`)

  if (mediaUrl) {
    notes.push(`🔹 Post: ${mediaUrl}`)
  }

  if (triggerResult) {
    notes.push(`🔹 Intent: ${triggerResult.intent.toUpperCase()}`)
    notes.push(`🔹 Priority: ${triggerResult.priority.toUpperCase()}`)

    if (triggerResult.triggerWords.length > 0) {
      notes.push(`🔹 Trigger Words: ${triggerResult.triggerWords.join(', ')}`)
    }
  }

  notes.push(`\n💬 Comment:\n"${commentText}"`)

  return notes.join('\n')
}
