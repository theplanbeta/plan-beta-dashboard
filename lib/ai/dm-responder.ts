/**
 * Instagram DM Auto-Responder using Google Gemini AI
 * Generates intelligent responses based on conversation context and knowledge base
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { KnowledgeBase } from './knowledge-base'
import {
  getKnowledgeBase,
  findBatchesByLevel,
  findPricingByLevel,
  findLevelInfo,
  searchFAQs,
  formatBatchesForLevel,
} from './knowledge-base'
import type { ConversationContext } from './conversation-context'
import {
  formatConversationForAI,
  shouldHandoffToHuman,
  generateHandoffMessage,
  detectLanguage,
  getResponseTone,
  detectRepetitiveQuestion,
} from './conversation-context'
import { parseDMMessage } from '../dm-parser'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

export interface DMResponse {
  message: string
  shouldSend: boolean
  shouldHandoffToHuman: boolean
  handoffReason?: string
  suggestedLeadScore: number
  extractedData: {
    name?: string
    phone?: string
    email?: string
    interestedLevel?: string
    intent?: string
  }
}

/**
 * Generate AI response for Instagram DM
 */
export async function generateDMResponse(
  userMessage: string,
  context: ConversationContext
): Promise<DMResponse> {
  try {
    // Check if should handoff to human
    const handoffCheck = shouldHandoffToHuman(userMessage, context)
    if (handoffCheck.shouldHandoff) {
      return {
        message: generateHandoffMessage(handoffCheck.reason || 'general'),
        shouldSend: true,
        shouldHandoffToHuman: true,
        handoffReason: handoffCheck.reason,
        suggestedLeadScore: context.leadData?.leadScore || 50,
        extractedData: {},
      }
    }

    // Check for repetitive questions
    if (detectRepetitiveQuestion(userMessage, context)) {
      return {
        message: "I notice you've asked about this before. Let me connect you with our team member who can provide more detailed assistance. They'll contact you shortly.\n\nYou can also WhatsApp us for immediate help!",
        shouldSend: true,
        shouldHandoffToHuman: true,
        handoffReason: 'repetitive_question',
        suggestedLeadScore: context.leadData?.leadScore || 40,
        extractedData: {},
      }
    }

    // Load knowledge base
    const kb = await getKnowledgeBase()

    // Parse user message for intent and data
    const parsed = parseDMMessage(userMessage)

    // Detect language
    const language = detectLanguage(userMessage)

    // Get response tone
    const tone = getResponseTone(context)

    // Generate AI response
    const aiResponse = await generateAIResponse(
      userMessage,
      context,
      kb,
      parsed,
      language,
      tone
    )

    return {
      message: aiResponse.message,
      shouldSend: aiResponse.message.length > 0,
      shouldHandoffToHuman: false,
      suggestedLeadScore: Math.max(parsed.leadScore, context.leadData?.leadScore || 0),
      extractedData: {
        name: parsed.contactInfo.name,
        phone: parsed.contactInfo.phone,
        email: parsed.contactInfo.email,
        interestedLevel: parsed.level,
        intent: parsed.intent,
      },
    }
  } catch (error) {
    console.error('Error generating DM response:', error)

    // Fallback response
    return {
      message: "Thanks for your message! I'm having a brief technical issue. Our team will get back to you shortly. You can also WhatsApp us for immediate assistance!",
      shouldSend: true,
      shouldHandoffToHuman: true,
      handoffReason: 'technical_error',
      suggestedLeadScore: context.leadData?.leadScore || 0,
      extractedData: {},
    }
  }
}

/**
 * Generate response using Gemini AI
 */
async function generateAIResponse(
  userMessage: string,
  context: ConversationContext,
  kb: KnowledgeBase,
  parsed: any,
  language: string,
  tone: string
): Promise<{ message: string }> {
  // Build context for AI
  const conversationHistory = formatConversationForAI(context, 8)

  // Find relevant batches if level is mentioned
  let relevantBatches = ''
  if (parsed.level) {
    const batches = findBatchesByLevel(kb, parsed.level)
    if (batches.length > 0) {
      relevantBatches = `\n\nAvailable ${parsed.level} batches:\n${formatBatchesForLevel(kb, parsed.level)}`
    }
  }

  // Find pricing if asked
  let pricingInfo = ''
  if (parsed.intent === 'pricing' && parsed.level) {
    const pricing = findPricingByLevel(kb, parsed.level)
    if (pricing) {
      pricingInfo = `\n\nPricing for ${pricing.level}: ${pricing.currency} ${pricing.price} (${pricing.duration})`
    }
  }

  // Search FAQs
  const relevantFAQs = searchFAQs(kb, userMessage)
  const faqContext = relevantFAQs.length > 0
    ? `\n\nRelevant FAQs:\n${relevantFAQs.map(faq => `Q: ${faq.question}\nA: ${faq.answer}`).join('\n\n')}`
    : ''

  // Find level info if asked
  let levelDetails = ''
  if (parsed.intent === 'level_info' && parsed.level) {
    const levelInfo = findLevelInfo(kb, parsed.level)
    if (levelInfo) {
      levelDetails = `\n\n${levelInfo.code} (${levelInfo.name}):\n${levelInfo.description}\n\nTopics covered:\n${levelInfo.topics.map(t => `• ${t}`).join('\n')}`
    }
  }

  // Build system prompt
  const systemPrompt = `You are a friendly, helpful assistant for Plan Beta German Language School. Your role is to help prospective students with inquiries about German language courses.

**Your Personality:**
- ${tone === 'enthusiastic' ? 'Enthusiastic and welcoming' : tone === 'formal' ? 'Professional and informative' : 'Friendly and approachable'}
- Concise but informative (keep responses under 300 characters when possible)
- Use emojis appropriately (🇩🇪 📅 💺 🎓 ✅)
- ${language === 'ml' ? 'User speaks Malayalam - respond in English but be culturally aware' : 'Respond in English'}

**Your Knowledge:**
- We offer A1, A2, B1, B2 levels
- Free trial class available
- Online classes via Zoom
- Small batches (8-12 students)
- Certified teachers with Goethe certification

**Important Rules:**
1. Always mention FREE trial class when someone shows interest
2. For pricing queries, provide exact pricing from knowledge base
3. For schedule queries, list specific upcoming batches with dates
4. If unsure, admit it politely and offer to connect with team
5. Keep messages short and actionable
6. Use WhatsApp number for urgent queries: ${kb.generalInfo.whatsapp}

**Current Context:**
${conversationHistory}

**User's Intent:** ${parsed.intent}
**Urgency:** ${parsed.urgency}
**Lead Score:** ${parsed.leadScore}
${relevantBatches}${pricingInfo}${faqContext}${levelDetails}

**Now respond to:** "${userMessage}"

Remember: Keep it conversational, helpful, and concise. End with a clear call-to-action when appropriate.`

  // Generate response
  const result = await model.generateContent(systemPrompt)
  const response = await result.response
  let message = response.text().trim()

  // Post-processing: ensure message is not too long
  if (message.length > 600) {
    // Trim and add note about detailed info
    message = message.substring(0, 550) + "...\n\nI can share more details! What would you like to know specifically?"
  }

  // Add WhatsApp contact if high intent and not already mentioned
  if (parsed.leadScore > 60 && !message.toLowerCase().includes('whatsapp') && !message.toLowerCase().includes('contact')) {
    message += `\n\n💬 Quick help? WhatsApp us: ${kb.generalInfo.whatsapp}`
  }

  return { message }
}

/**
 * Quick response for common patterns (faster than AI)
 */
export function getQuickResponse(userMessage: string): string | null {
  const lower = userMessage.toLowerCase().trim()

  // Greetings
  if (/^(hi|hello|hey|hii|helo|namaste)$/i.test(lower)) {
    return "Hi! 👋 Welcome to Plan Beta German Language School!\n\nHow can I help you today?\n\n🟢 Learn about courses\n🟡 Check batch schedules\n🔵 Book FREE trial class\n🟣 Ask about pricing"
  }

  // Thanks
  if (/^(thanks|thank you|tysm|great|perfect)$/i.test(lower)) {
    return "You're welcome! 😊\n\nIs there anything else I can help you with?\n\nFeel free to ask about batches, pricing, or book your FREE trial class!"
  }

  // Yes/No alone
  if (/^(yes|yeah|ok|okay|sure)$/i.test(lower)) {
    return "Great! What would you like to know more about?\n\n📚 Course levels (A1, A2, B1, B2)\n📅 Upcoming batches\n💰 Pricing\n🎓 FREE trial class"
  }

  return null
}
