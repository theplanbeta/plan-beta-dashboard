/**
 * Conversation Context Manager
 * Manages conversation history and context for AI responses
 */

import { prisma } from '@/lib/prisma'

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface ConversationContext {
  instagramHandle: string
  conversationId: string
  messages: ConversationMessage[]
  leadData: {
    id?: string
    name?: string
    level?: string
    leadScore: number
    status?: string
    hasContactInfo: boolean
  } | null
  metadata: {
    totalMessages: number
    firstMessageAt: Date
    lastMessageAt: Date
    leadCreated: boolean
  }
}

/**
 * Load conversation history from database
 */
export async function getConversationContext(
  conversationId: string,
  instagramHandle: string
): Promise<ConversationContext> {
  try {
    // Load messages from database
    const messages = await prisma.instagramMessage.findMany({
      where: { conversationId },
      orderBy: { sentAt: 'asc' },
      take: 20, // Last 20 messages for context
    })

    // Load lead data if exists
    const lead = await prisma.lead.findFirst({
      where: { instagramHandle },
      select: {
        id: true,
        name: true,
        interestedLevel: true,
        leadScore: true,
        status: true,
        email: true,
        phone: true,
        whatsapp: true,
      },
    })

    // Format messages for AI
    const formattedMessages: ConversationMessage[] = messages.map(msg => ({
      role: msg.direction === 'INCOMING' ? 'user' : 'assistant',
      content: msg.content,
      timestamp: msg.sentAt,
    }))

    return {
      instagramHandle,
      conversationId,
      messages: formattedMessages,
      leadData: lead ? {
        id: lead.id,
        name: lead.name,
        level: lead.interestedLevel || undefined,
        leadScore: lead.leadScore,
        status: lead.status,
        hasContactInfo: !!(lead.email || lead.phone || lead.whatsapp),
      } : null,
      metadata: {
        totalMessages: messages.length,
        firstMessageAt: messages[0]?.sentAt || new Date(),
        lastMessageAt: messages[messages.length - 1]?.sentAt || new Date(),
        leadCreated: !!lead,
      },
    }
  } catch (error) {
    console.error('Error loading conversation context:', error)

    // Return empty context on error
    return {
      instagramHandle,
      conversationId,
      messages: [],
      leadData: null,
      metadata: {
        totalMessages: 0,
        firstMessageAt: new Date(),
        lastMessageAt: new Date(),
        leadCreated: false,
      },
    }
  }
}

/**
 * Format conversation history for AI prompt
 */
export function formatConversationForAI(context: ConversationContext, maxMessages: number = 10): string {
  if (context.messages.length === 0) {
    return 'This is the first message from this user.'
  }

  const recentMessages = context.messages.slice(-maxMessages)

  const formatted = recentMessages.map(msg => {
    const role = msg.role === 'user' ? 'Student' : 'You (Assistant)'
    return `${role}: ${msg.content}`
  }).join('\n')

  return `Conversation History:\n${formatted}`
}

/**
 * Detect if conversation should be handed off to human
 */
export function shouldHandoffToHuman(
  userMessage: string,
  context: ConversationContext
): { shouldHandoff: boolean; reason?: string } {
  const lowerMessage = userMessage.toLowerCase()

  // Complex payment issues
  if (lowerMessage.includes('refund') || lowerMessage.includes('payment issue') || lowerMessage.includes('not received')) {
    return { shouldHandoff: true, reason: 'payment_issue' }
  }

  // Complaints or negative sentiment
  if (lowerMessage.includes('complaint') || lowerMessage.includes('disappointed') || lowerMessage.includes('poor')) {
    return { shouldHandoff: true, reason: 'complaint' }
  }

  // Technical issues
  if (lowerMessage.includes('zoom not working') || lowerMessage.includes('cannot join') || lowerMessage.includes('technical problem')) {
    return { shouldHandoff: true, reason: 'technical_issue' }
  }

  // Specific teacher requests
  if (lowerMessage.includes('speak to teacher') || lowerMessage.includes('talk to instructor')) {
    return { shouldHandoff: true, reason: 'teacher_request' }
  }

  // Too many back-and-forth messages without resolution
  if (context.metadata.totalMessages > 10 && !context.metadata.leadCreated) {
    return { shouldHandoff: true, reason: 'conversation_too_long' }
  }

  // User explicitly asks for human
  if (lowerMessage.includes('talk to human') || lowerMessage.includes('speak to person') || lowerMessage.includes('real person')) {
    return { shouldHandoff: true, reason: 'explicit_request' }
  }

  return { shouldHandoff: false }
}

/**
 * Generate handoff message
 */
export function generateHandoffMessage(reason: string): string {
  const baseMessage = "I'll connect you with our team member who can help you better."

  const reasonMessages: Record<string, string> = {
    payment_issue: "I'll connect you with our admin team to resolve this payment issue. They'll get back to you within 2 hours.",
    complaint: "I'm sorry to hear about your experience. Let me connect you with our manager who can address your concerns personally.",
    technical_issue: "I'll connect you with our technical support team to help resolve this issue right away.",
    teacher_request: "I'll connect you with one of our teachers. They'll be in touch shortly.",
    conversation_too_long: "Let me connect you with our team member who can provide more detailed assistance. They'll contact you soon.",
    explicit_request: "Of course! I'll connect you with our team member. They'll reach out to you shortly.",
  }

  const specificMessage = reasonMessages[reason] || baseMessage

  return `${specificMessage}\n\nIn the meantime, you can also WhatsApp us at ${process.env.SUPPORT_WHATSAPP || 'our support number'} or email hello@planbeta.in for immediate assistance.`
}

/**
 * Detect language (basic heuristic for Malayalam vs English)
 */
export function detectLanguage(text: string): 'en' | 'ml' | 'mixed' {
  // Malayalam Unicode range: 0D00-0D7F
  const malayalamChars = text.match(/[\u0D00-\u0D7F]/g)
  const malayalamCount = malayalamChars ? malayalamChars.length : 0

  const totalChars = text.replace(/\s/g, '').length

  if (totalChars === 0) return 'en'

  const malayalamPercentage = (malayalamCount / totalChars) * 100

  if (malayalamPercentage > 70) return 'ml'
  if (malayalamPercentage > 20) return 'mixed'
  return 'en'
}

/**
 * Get response tone based on context
 */
export function getResponseTone(context: ConversationContext): 'formal' | 'friendly' | 'enthusiastic' {
  // First message - be enthusiastic
  if (context.metadata.totalMessages === 0) {
    return 'enthusiastic'
  }

  // Lead exists and has high score - be professional but friendly
  if (context.leadData && context.leadData.leadScore > 60) {
    return 'formal'
  }

  // Default friendly tone
  return 'friendly'
}

/**
 * Check if user is asking the same question repeatedly
 */
export function detectRepetitiveQuestion(
  currentMessage: string,
  context: ConversationContext
): boolean {
  if (context.messages.length < 2) return false

  const currentLower = currentMessage.toLowerCase().trim()

  // Check if similar to any of the last 3 user messages
  const recentUserMessages = context.messages
    .filter(m => m.role === 'user')
    .slice(-3)
    .map(m => m.content.toLowerCase().trim())

  return recentUserMessages.some(msg => {
    // Simple similarity check - if 70% of words match
    const currentWords = new Set(currentLower.split(/\s+/))
    const msgWords = new Set(msg.split(/\s+/))

    const intersection = new Set([...currentWords].filter(x => msgWords.has(x)))
    const similarity = (intersection.size / Math.max(currentWords.size, msgWords.size)) * 100

    return similarity > 70
  })
}
