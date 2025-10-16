/**
 * Instagram DM Message Parser
 * Extracts lead information from Instagram direct messages
 */

export interface ParsedDMContent {
  intent: 'inquiry' | 'pricing' | 'schedule' | 'level_info' | 'enrollment' | 'general'
  level?: string // A1, A2, B1, B2, C1, C2
  contactInfo: {
    name?: string
    email?: string
    phone?: string
  }
  keywords: string[]
  leadScore: number // 0-100
  sentiment: 'positive' | 'neutral' | 'negative'
  urgency: 'high' | 'medium' | 'low'
}

/**
 * Parse Instagram DM message and extract lead information
 */
export function parseDMMessage(message: string): ParsedDMContent {
  const lowerMessage = message.toLowerCase()

  // Extract intent
  const intent = detectIntent(lowerMessage)

  // Extract level
  const level = extractLevel(lowerMessage)

  // Extract contact information
  const contactInfo = extractContactInfo(message)

  // Extract keywords
  const keywords = extractKeywords(lowerMessage)

  // Calculate lead score
  const leadScore = calculateLeadScore({
    intent,
    level,
    hasContactInfo: !!(contactInfo.email || contactInfo.phone),
    keywords,
    messageLength: message.length,
  })

  // Detect sentiment
  const sentiment = detectSentiment(lowerMessage)

  // Detect urgency
  const urgency = detectUrgency(lowerMessage)

  return {
    intent,
    level,
    contactInfo,
    keywords,
    leadScore,
    sentiment,
    urgency,
  }
}

/**
 * Detect user intent from message
 */
function detectIntent(message: string): ParsedDMContent['intent'] {
  const intentPatterns = {
    enrollment: [
      'enroll',
      'join',
      'register',
      'sign up',
      'admission',
      'want to join',
      'how to enroll',
    ],
    pricing: [
      'price',
      'cost',
      'fee',
      'fees',
      'charges',
      'payment',
      'how much',
      'affordable',
      'discount',
    ],
    schedule: [
      'schedule',
      'timing',
      'time',
      'when',
      'start date',
      'batch',
      'class timing',
      'next batch',
      'upcoming',
    ],
    level_info: [
      'level',
      'beginner',
      'intermediate',
      'advanced',
      'a1',
      'a2',
      'b1',
      'b2',
      'c1',
      'c2',
      'which level',
    ],
    inquiry: [
      'interested',
      'information',
      'details',
      'know more',
      'tell me',
      'learn',
      'course',
      'german',
    ],
  }

  for (const [intent, patterns] of Object.entries(intentPatterns)) {
    if (patterns.some(pattern => message.includes(pattern))) {
      return intent as ParsedDMContent['intent']
    }
  }

  return 'general'
}

/**
 * Extract German language level from message
 */
function extractLevel(message: string): string | undefined {
  const levelPatterns = [
    /\ba1\b/i,
    /\ba2\b/i,
    /\bb1\b/i,
    /\bb2\b/i,
    /\bc1\b/i,
    /\bc2\b/i,
    /beginner/i,
    /intermediate/i,
    /advanced/i,
  ]

  for (const pattern of levelPatterns) {
    const match = message.match(pattern)
    if (match) {
      const level = match[0].toUpperCase()
      // Map beginner/intermediate/advanced to levels
      if (level === 'BEGINNER') return 'A1'
      if (level === 'INTERMEDIATE') return 'B1'
      if (level === 'ADVANCED') return 'C1'
      return level
    }
  }

  return undefined
}

/**
 * Extract contact information from message
 */
function extractContactInfo(message: string): ParsedDMContent['contactInfo'] {
  const contactInfo: ParsedDMContent['contactInfo'] = {}

  // Extract email
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/
  const emailMatch = message.match(emailPattern)
  if (emailMatch) {
    contactInfo.email = emailMatch[0]
  }

  // Extract phone (Indian format)
  const phonePatterns = [
    /\b(\+91[\s-]?)?[6-9]\d{9}\b/, // Indian mobile
    /\b\d{10}\b/, // 10 digit number
  ]
  for (const pattern of phonePatterns) {
    const phoneMatch = message.match(pattern)
    if (phoneMatch) {
      contactInfo.phone = phoneMatch[0].replace(/[\s-]/g, '')
      break
    }
  }

  // Extract name (basic heuristic - capitalized words at start)
  const namePattern = /^(my name is|i am|i'm)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i
  const nameMatch = message.match(namePattern)
  if (nameMatch) {
    contactInfo.name = nameMatch[2]
  }

  return contactInfo
}

/**
 * Extract relevant keywords from message
 */
function extractKeywords(message: string): string[] {
  const keywords: string[] = []

  const keywordPatterns = {
    course_type: ['german', 'course', 'class', 'lesson', 'training'],
    learning_mode: ['online', 'offline', 'hybrid', 'zoom', 'physical'],
    timing: ['morning', 'evening', 'weekend', 'weekday', 'flexible'],
    duration: ['month', 'weeks', 'intensive', 'regular', 'crash course'],
    certification: ['certificate', 'goethe', 'exam', 'certification'],
  }

  for (const [category, patterns] of Object.entries(keywordPatterns)) {
    for (const pattern of patterns) {
      if (message.includes(pattern)) {
        keywords.push(pattern)
      }
    }
  }

  return keywords
}

/**
 * Calculate lead score based on message content
 */
function calculateLeadScore(data: {
  intent: ParsedDMContent['intent']
  level?: string
  hasContactInfo: boolean
  keywords: string[]
  messageLength: number
}): number {
  let score = 0

  // Intent score (0-40 points)
  const intentScores = {
    enrollment: 40,
    pricing: 30,
    schedule: 25,
    level_info: 20,
    inquiry: 15,
    general: 5,
  }
  score += intentScores[data.intent] || 0

  // Level mentioned (10 points)
  if (data.level) {
    score += 10
  }

  // Contact info provided (30 points)
  if (data.hasContactInfo) {
    score += 30
  }

  // Keywords relevance (0-15 points)
  score += Math.min(data.keywords.length * 3, 15)

  // Message length indicates engagement (0-5 points)
  if (data.messageLength > 50) {
    score += 5
  }

  return Math.min(score, 100)
}

/**
 * Detect sentiment from message
 */
function detectSentiment(message: string): ParsedDMContent['sentiment'] {
  const positiveWords = [
    'interested',
    'excited',
    'great',
    'perfect',
    'amazing',
    'love',
    'yes',
    'definitely',
    'thanks',
    'thank you',
  ]

  const negativeWords = [
    'expensive',
    'costly',
    'not sure',
    'doubt',
    'confused',
    'problem',
    'issue',
  ]

  const positiveCount = positiveWords.filter(word => message.includes(word)).length
  const negativeCount = negativeWords.filter(word => message.includes(word)).length

  if (positiveCount > negativeCount) return 'positive'
  if (negativeCount > positiveCount) return 'negative'
  return 'neutral'
}

/**
 * Detect urgency from message
 */
function detectUrgency(message: string): ParsedDMContent['urgency'] {
  const highUrgencyWords = [
    'urgent',
    'asap',
    'immediately',
    'today',
    'right now',
    'this week',
    'starting soon',
  ]

  const mediumUrgencyWords = ['soon', 'this month', 'next week', 'quickly']

  if (highUrgencyWords.some(word => message.includes(word))) {
    return 'high'
  }

  if (mediumUrgencyWords.some(word => message.includes(word))) {
    return 'medium'
  }

  return 'low'
}

/**
 * Check if message should trigger auto-lead creation
 */
export function shouldCreateLead(parsedContent: ParsedDMContent): boolean {
  // Create lead if:
  // 1. Lead score is above 25
  // 2. OR contact info is provided
  // 3. OR intent is enrollment/pricing/schedule
  return (
    parsedContent.leadScore >= 25 ||
    !!(parsedContent.contactInfo.email || parsedContent.contactInfo.phone) ||
    ['enrollment', 'pricing', 'schedule'].includes(parsedContent.intent)
  )
}

/**
 * Generate notes for lead from DM content
 */
export function generateLeadNotes(
  instagramHandle: string,
  messages: string[],
  parsedContent: ParsedDMContent
): string {
  const notes = []

  notes.push(`🔹 Source: Instagram DM (@${instagramHandle})`)
  notes.push(`🔹 Intent: ${parsedContent.intent.replace('_', ' ').toUpperCase()}`)

  if (parsedContent.level) {
    notes.push(`🔹 Level Interest: ${parsedContent.level}`)
  }

  if (parsedContent.urgency !== 'low') {
    notes.push(`🔹 Urgency: ${parsedContent.urgency.toUpperCase()}`)
  }

  if (parsedContent.keywords.length > 0) {
    notes.push(`🔹 Keywords: ${parsedContent.keywords.join(', ')}`)
  }

  notes.push(`\n📱 Latest Message:\n"${messages[messages.length - 1].substring(0, 200)}..."`)

  return notes.join('\n')
}
