/**
 * Multi-Factor Lead Scoring System
 * Robust lead quality assessment based on multiple engagement signals
 * Enhanced with AI for multilingual (Malayalam + English) intent detection
 */

import { prisma } from '@/lib/prisma'
import { LeadQuality, LeadStatus } from '@prisma/client'
import { analyzeLeadWithAI, enhanceScoreWithAI } from './ai-lead-scorer'

export interface EngagementSignals {
  // DM Engagement
  dmCount: number
  dmRecency: Date | null // Last DM date
  dmResponseRate: number // % of DMs they replied to
  avgResponseTime: number // Hours to respond

  // Content Engagement
  reelsViewed: number
  reelsLiked: number
  reelsCommented: number
  reelsSaved: number

  // Intent Signals
  askedAboutPricing: boolean
  askedAboutSchedule: boolean
  askedAboutLevel: boolean
  mentionedEnrollment: boolean
  requestedTrialClass: boolean

  // Contact Info
  hasPhone: boolean
  hasEmail: boolean
  hasWhatsApp: boolean

  // Behavioral Signals
  viewedMultipleReels: boolean // Viewed 3+ reels
  engagedAcrossTime: boolean // Engaged on different days
  urgencyKeywords: boolean // Used "urgent", "soon", "asap"

  // Negative Signals
  hasComplaint: boolean
  hasNegativeSentiment: boolean
  unresponsiveAfterContact: boolean
}

export interface LeadScore {
  totalScore: number // 0-100
  quality: LeadQuality // HOT, WARM, COLD
  confidence: number // How confident we are in this score (0-1)
  breakdown: {
    engagementScore: number // 0-30
    intentScore: number // 0-40
    contactScore: number // 0-20
    behaviorScore: number // 0-10
  }
  signals: EngagementSignals
  recommendedAction: 'immediate_followup' | 'nurture' | 'low_priority' | 'disqualify'
  reasoning: string[]
}

/**
 * Calculate comprehensive lead score
 */
export async function calculateLeadScore(leadId: string): Promise<LeadScore> {
  try {
    // Load lead with all related data
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        sourceContent: true,
      },
    })

    if (!lead) {
      throw new Error('Lead not found')
    }

    // Load DM messages
    const dmMessages = await prisma.instagramMessage.findMany({
      where: {
        instagramHandle: lead.instagramHandle || undefined,
      },
      orderBy: { sentAt: 'asc' },
    })

    // Load Instagram comments
    const comments = await prisma.instagramComment.findMany({
      where: {
        username: lead.instagramHandle || undefined,
      },
      orderBy: { commentedAt: 'asc' },
    })

    // Extract engagement signals
    const signals = await extractEngagementSignals(lead, dmMessages)

    // Calculate score components
    const engagementScore = calculateEngagementScore(signals)
    const intentScore = calculateIntentScore(signals)
    const contactScore = calculateContactScore(signals)
    const behaviorScore = calculateBehaviorScore(signals)

    // Calculate rule-based score
    const ruleBasedScore = Math.min(100, Math.round(
      engagementScore + intentScore + contactScore + behaviorScore
    ))

    // Enhance with AI analysis (handles Malayalam + English)
    let finalScore = ruleBasedScore
    let aiBoost = 0
    let aiReasoning: string[] = []

    try {
      const aiAnalysis = await analyzeLeadWithAI({
        comments: comments.map(c => ({ text: c.text, createdAt: c.commentedAt })),
        messages: dmMessages
          .filter(m => m.direction === 'INCOMING')
          .map(m => ({ text: m.content, createdAt: m.sentAt })),
        notes: lead.notes,
      })

      const enhanced = enhanceScoreWithAI(ruleBasedScore, aiAnalysis)
      finalScore = enhanced.finalScore
      aiBoost = enhanced.aiBoost
      aiReasoning = enhanced.reasoning
    } catch (error) {
      console.error('AI enhancement error:', error)
      // Fall back to rule-based score if AI fails
      aiReasoning = ['AI analysis unavailable - using rule-based scoring']
    }

    // Determine quality tier (use AI-enhanced score)
    const quality = determineQuality(finalScore, signals)

    // Calculate confidence
    const confidence = calculateConfidence(signals, dmMessages.length)

    // Determine recommended action
    const { action, reasoning } = determineAction(finalScore, quality, signals)

    // Combine all reasoning
    const allReasoning = [...reasoning, ...aiReasoning]

    return {
      totalScore: finalScore,
      quality,
      confidence,
      breakdown: {
        engagementScore,
        intentScore,
        contactScore,
        behaviorScore,
      },
      signals,
      recommendedAction: action,
      reasoning: allReasoning,
    }
  } catch (error) {
    console.error('Error calculating lead score:', error)

    // Return safe default score on error
    return {
      totalScore: 0,
      quality: 'COLD',
      confidence: 0,
      breakdown: {
        engagementScore: 0,
        intentScore: 0,
        contactScore: 0,
        behaviorScore: 0,
      },
      signals: getDefaultSignals(),
      recommendedAction: 'low_priority',
      reasoning: ['Error calculating score - needs manual review'],
    }
  }
}

/**
 * Extract engagement signals from lead data
 */
async function extractEngagementSignals(
  lead: any,
  dmMessages: any[]
): Promise<EngagementSignals> {
  const incomingMessages = dmMessages.filter(m => m.direction === 'INCOMING')
  const outgoingMessages = dmMessages.filter(m => m.direction === 'OUTGOING')

  // DM metrics
  const dmCount = incomingMessages.length
  const dmRecency = incomingMessages.length > 0
    ? incomingMessages[incomingMessages.length - 1].sentAt
    : null

  // Response rate (what % of our messages did they reply to)
  const dmResponseRate = outgoingMessages.length > 0
    ? (incomingMessages.length / outgoingMessages.length) * 100
    : 100

  // Average response time
  let totalResponseTime = 0
  let responseCount = 0
  for (let i = 1; i < dmMessages.length; i++) {
    if (dmMessages[i].direction === 'INCOMING' && dmMessages[i-1].direction === 'OUTGOING') {
      const timeDiff = dmMessages[i].sentAt.getTime() - dmMessages[i-1].sentAt.getTime()
      totalResponseTime += timeDiff / (1000 * 60 * 60) // Convert to hours
      responseCount++
    }
  }
  const avgResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 24

  // Content engagement from socialEngagement JSON
  const social = (lead.socialEngagement as any) || {}
  const contentInteractions = (lead.contentInteractions as any) || {}

  // Intent detection from notes and messages
  const allText = [
    lead.notes || '',
    ...incomingMessages.map(m => m.content),
  ].join(' ').toLowerCase()

  const askedAboutPricing = /price|cost|fee|fees|how much|payment/.test(allText)
  const askedAboutSchedule = /schedule|timing|when|start date|batch|next batch/.test(allText)
  const askedAboutLevel = /level|a1|a2|b1|b2|beginner|intermediate/.test(allText)
  const mentionedEnrollment = /enroll|join|register|admission|sign up/.test(allText)
  const requestedTrialClass = /trial|demo|free class/.test(allText)

  // Behavioral signals
  const reelsViewed = Object.keys(contentInteractions).length
  const viewedMultipleReels = reelsViewed >= 3

  // Check if engaged across different days
  const uniqueDays = new Set(incomingMessages.map(m => m.sentAt.toDateString()))
  const engagedAcrossTime = uniqueDays.size >= 2

  const urgencyKeywords = /urgent|asap|immediately|soon|quickly|today|this week/.test(allText)

  // Negative signals
  const hasComplaint = /complaint|disappointed|poor|bad experience|refund|cancel/.test(allText)
  const hasNegativeSentiment = /not interested|no thanks|too expensive|costly/.test(allText)
  const unresponsiveAfterContact = lead.status === 'CONTACTED' &&
    lead.lastContactDate &&
    (Date.now() - new Date(lead.lastContactDate).getTime()) > 7 * 24 * 60 * 60 * 1000 &&
    dmCount < 2

  return {
    dmCount,
    dmRecency,
    dmResponseRate,
    avgResponseTime,
    reelsViewed,
    reelsLiked: social.likes_count || 0,
    reelsCommented: social.comments_count || 0,
    reelsSaved: social.saves_count || 0,
    askedAboutPricing,
    askedAboutSchedule,
    askedAboutLevel,
    mentionedEnrollment,
    requestedTrialClass,
    hasPhone: !!(lead.phone || lead.whatsapp),
    hasEmail: !!lead.email,
    hasWhatsApp: !!lead.whatsapp,
    viewedMultipleReels,
    engagedAcrossTime,
    urgencyKeywords,
    hasComplaint,
    hasNegativeSentiment,
    unresponsiveAfterContact,
  }
}

/**
 * Calculate engagement score (0-30 points)
 */
function calculateEngagementScore(signals: EngagementSignals): number {
  let score = 0

  // DM engagement (0-15 points)
  score += Math.min(signals.dmCount * 3, 12) // Up to 12 points for DMs
  if (signals.dmResponseRate > 80) score += 3 // Quick responder

  // Content engagement (0-15 points)
  score += Math.min(signals.reelsViewed * 2, 6) // Up to 6 points for views
  score += signals.reelsCommented * 3 // 3 points per comment
  score += signals.reelsSaved * 2 // 2 points per save
  score += signals.reelsLiked // 1 point per like

  return Math.min(score, 30)
}

/**
 * Calculate intent score (0-40 points)
 */
function calculateIntentScore(signals: EngagementSignals): number {
  let score = 0

  // High intent signals
  if (signals.mentionedEnrollment) score += 15
  if (signals.requestedTrialClass) score += 12
  if (signals.askedAboutPricing) score += 8
  if (signals.askedAboutSchedule) score += 8
  if (signals.askedAboutLevel) score += 5
  if (signals.urgencyKeywords) score += 7

  // Negative signals
  if (signals.hasNegativeSentiment) score -= 15
  if (signals.hasComplaint) score -= 10
  if (signals.unresponsiveAfterContact) score -= 20

  return Math.max(0, Math.min(score, 40))
}

/**
 * Calculate contact score (0-20 points)
 */
function calculateContactScore(signals: EngagementSignals): number {
  let score = 0

  if (signals.hasPhone) score += 8
  if (signals.hasEmail) score += 7
  if (signals.hasWhatsApp) score += 5

  return Math.min(score, 20)
}

/**
 * Calculate behavior score (0-10 points)
 */
function calculateBehaviorScore(signals: EngagementSignals): number {
  let score = 0

  if (signals.viewedMultipleReels) score += 3
  if (signals.engagedAcrossTime) score += 4
  if (signals.avgResponseTime < 2) score += 3 // Responds within 2 hours

  return Math.min(score, 10)
}

/**
 * Determine quality tier based on score
 */
function determineQuality(score: number, signals: EngagementSignals): LeadQuality {
  // Special cases override score
  if (signals.hasComplaint || signals.hasNegativeSentiment) {
    return 'COLD'
  }

  if (signals.mentionedEnrollment && signals.hasPhone) {
    return 'HOT' // Always hot if they want to enroll and gave contact
  }

  // Score-based tiers
  if (score >= 75) return 'HOT'
  if (score >= 45) return 'WARM'
  return 'COLD'
}

/**
 * Calculate confidence in score (0-1)
 */
function calculateConfidence(signals: EngagementSignals, messageCount: number): number {
  let confidence = 0.5 // Base confidence

  // More data = more confidence
  if (messageCount >= 5) confidence += 0.2
  if (signals.hasPhone || signals.hasEmail) confidence += 0.15
  if (signals.reelsViewed >= 2) confidence += 0.1
  if (signals.engagedAcrossTime) confidence += 0.1

  // Contradictory signals = less confidence
  if (signals.mentionedEnrollment && signals.hasNegativeSentiment) confidence -= 0.2

  return Math.max(0, Math.min(1, confidence))
}

/**
 * Determine recommended action
 */
function determineAction(
  score: number,
  quality: LeadQuality,
  signals: EngagementSignals
): { action: LeadScore['recommendedAction']; reasoning: string[] } {
  const reasoning: string[] = []

  // Disqualify conditions
  if (signals.hasComplaint) {
    reasoning.push('Has complaint - needs manager attention')
    return { action: 'disqualify', reasoning }
  }

  if (signals.unresponsiveAfterContact) {
    reasoning.push('Unresponsive after contact - low priority')
    return { action: 'low_priority', reasoning }
  }

  // Immediate followup conditions
  if (signals.requestedTrialClass) {
    reasoning.push('Requested trial class - book immediately')
    return { action: 'immediate_followup', reasoning }
  }

  if (signals.mentionedEnrollment && signals.askedAboutPricing) {
    reasoning.push('Ready to enroll, asked about pricing - send payment details')
    return { action: 'immediate_followup', reasoning }
  }

  if (quality === 'HOT') {
    reasoning.push('High intent signals - contact within 24 hours')
    return { action: 'immediate_followup', reasoning }
  }

  // Nurture conditions
  if (quality === 'WARM') {
    reasoning.push('Showing interest - add to nurture sequence')
    return { action: 'nurture', reasoning }
  }

  // Low priority
  reasoning.push('Low engagement - monitor for future activity')
  return { action: 'low_priority', reasoning }
}

/**
 * Default signals object
 */
function getDefaultSignals(): EngagementSignals {
  return {
    dmCount: 0,
    dmRecency: null,
    dmResponseRate: 0,
    avgResponseTime: 24,
    reelsViewed: 0,
    reelsLiked: 0,
    reelsCommented: 0,
    reelsSaved: 0,
    askedAboutPricing: false,
    askedAboutSchedule: false,
    askedAboutLevel: false,
    mentionedEnrollment: false,
    requestedTrialClass: false,
    hasPhone: false,
    hasEmail: false,
    hasWhatsApp: false,
    viewedMultipleReels: false,
    engagedAcrossTime: false,
    urgencyKeywords: false,
    hasComplaint: false,
    hasNegativeSentiment: false,
    unresponsiveAfterContact: false,
  }
}

/**
 * Update lead with calculated score
 */
export async function updateLeadScore(leadId: string): Promise<void> {
  try {
    const scoreResult = await calculateLeadScore(leadId)

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        leadScore: scoreResult.totalScore,
        quality: scoreResult.quality,
      },
    })

    console.log(`✅ Lead ${leadId} score updated: ${scoreResult.totalScore} (${scoreResult.quality})`)
  } catch (error) {
    console.error('Error updating lead score:', error)
  }
}

/**
 * Batch recalculate scores for all active leads
 */
export async function recalculateAllLeadScores(): Promise<void> {
  try {
    const activeLeads = await prisma.lead.findMany({
      where: {
        status: {
          in: ['NEW', 'CONTACTED', 'INTERESTED', 'TRIAL_SCHEDULED', 'TRIAL_ATTENDED'],
        },
      },
      select: { id: true },
    })

    console.log(`🔄 Recalculating scores for ${activeLeads.length} leads...`)

    for (const lead of activeLeads) {
      await updateLeadScore(lead.id)
      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log('✅ All lead scores recalculated')
  } catch (error) {
    console.error('Error recalculating lead scores:', error)
  }
}
