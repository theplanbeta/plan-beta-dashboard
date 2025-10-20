import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

export interface AILeadAnalysis {
  intentStrength: number // 0-100
  sentiment: 'positive' | 'neutral' | 'negative'
  conversionProbability: number // 0-100
  urgency: 'high' | 'medium' | 'low'
  reasoning: string
  detectedLanguages: string[]
  keySignals: string[]
}

/**
 * Analyze lead conversation using Gemini AI
 * Handles multilingual content (Malayalam + English mix)
 */
export async function analyzeLeadWithAI(input: {
  comments: Array<{ text: string; createdAt: Date }>
  messages: Array<{ text: string; createdAt: Date }>
  notes?: string | null
}): Promise<AILeadAnalysis | null> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('Gemini API key not configured, skipping AI analysis')
      return null
    }

    // Combine all conversation data
    const allTexts = [
      ...input.comments.map(c => c.text),
      ...input.messages.map(m => m.text),
      input.notes || ''
    ].filter(Boolean)

    if (allTexts.length === 0) {
      return null
    }

    const conversationText = allTexts.join('\n')

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" })

    const prompt = `You are an expert lead analyzer for a German language school in Kerala, India.
Analyze the following conversation and determine the lead's intent and conversion potential.

CONTEXT:
- The school offers German language courses (A1, A2, B1, B2 levels)
- Users often mix Malayalam and English (Manglish)
- Common Malayalam words: "ethra" (how much), "eppo" (when), "undo" (is there), "aavum" (will be), "cheyyan" (to do)

CONVERSATION:
"""
${conversationText}
"""

Analyze the conversation and return ONLY a valid JSON object (no markdown, no backticks):
{
  "intentStrength": <number 0-100>,
  "sentiment": "<positive|neutral|negative>",
  "conversionProbability": <number 0-100>,
  "urgency": "<high|medium|low>",
  "reasoning": "<brief explanation of your analysis>",
  "detectedLanguages": ["<language codes like 'en', 'ml'>"],
  "keySignals": ["<array of key phrases or signals you detected>"]
}

SCORING GUIDE:
Intent Strength (0-100):
- 80-100: Clear enrollment intent ("join", "enroll", "interested", "cheyyan interested")
- 60-79: Strong inquiry ("fee ethra", "when start", "eppo start", asking about pricing/schedule)
- 40-59: Moderate interest ("trial class undo", "details venam", general questions)
- 20-39: Weak interest (casual questions, comparisons)
- 0-19: No clear intent (generic comments like "nice", "ok")

Sentiment:
- positive: Enthusiastic, complimentary, ready to proceed
- neutral: Factual questions, neutral tone
- negative: Complaints, concerns, price objections

Conversion Probability (0-100):
Consider:
- Intent strength
- Sentiment
- Number of interactions
- Specificity of questions
- Mention of pricing/timeline/enrollment
- Urgency indicators

Urgency:
- high: Asking for immediate enrollment, mentions deadlines, time-sensitive
- medium: Interested but comparing options, needs more info
- low: Just browsing, unclear timeline

Key Signals:
Extract important phrases that indicate intent, even if in Malayalam
Examples: "fee ethra", "join cheyyan", "eppo start", "trial class", "interested", "enroll"

Return the JSON object now:`

    const result = await model.generateContent(prompt)
    const response = result.response
    const aiText = response.text()

    // Clean the response
    let cleanedText = aiText.trim()
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.replace(/```json\n?/g, "").replace(/```\n?/g, "")
    } else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/```\n?/g, "")
    }

    // Parse the JSON
    const analysis: AILeadAnalysis = JSON.parse(cleanedText)

    // Validate the response
    if (
      typeof analysis.intentStrength !== 'number' ||
      typeof analysis.conversionProbability !== 'number' ||
      !['positive', 'neutral', 'negative'].includes(analysis.sentiment) ||
      !['high', 'medium', 'low'].includes(analysis.urgency)
    ) {
      console.error('Invalid AI response format:', analysis)
      return null
    }

    return analysis
  } catch (error) {
    console.error('AI analysis error:', error)
    return null
  }
}

/**
 * Enhance rule-based score with AI insights
 */
export function enhanceScoreWithAI(
  ruleBasedScore: number,
  aiAnalysis: AILeadAnalysis | null
): {
  finalScore: number
  aiBoost: number
  reasoning: string[]
} {
  if (!aiAnalysis) {
    return {
      finalScore: ruleBasedScore,
      aiBoost: 0,
      reasoning: ['Using rule-based scoring only (AI unavailable)']
    }
  }

  const reasoning: string[] = []

  // Calculate AI boost (-15 to +15 points)
  let aiBoost = 0

  // Intent strength adjustment (-10 to +10)
  const intentDiff = aiAnalysis.intentStrength - 50 // Normalize around 50
  aiBoost += (intentDiff / 50) * 10 // Scale to -10 to +10

  if (aiAnalysis.intentStrength >= 80) {
    reasoning.push(`🔥 AI detected very high intent (${aiAnalysis.intentStrength}/100)`)
  } else if (aiAnalysis.intentStrength >= 60) {
    reasoning.push(`✅ AI detected strong inquiry signals`)
  }

  // Sentiment adjustment (-5 to +5)
  if (aiAnalysis.sentiment === 'positive') {
    aiBoost += 5
    reasoning.push(`😊 Positive sentiment detected`)
  } else if (aiAnalysis.sentiment === 'negative') {
    aiBoost -= 5
    reasoning.push(`⚠️ Negative sentiment detected`)
  }

  // Urgency adjustment (0 to +3)
  if (aiAnalysis.urgency === 'high') {
    aiBoost += 3
    reasoning.push(`⏰ High urgency detected`)
  } else if (aiAnalysis.urgency === 'medium') {
    aiBoost += 1
  }

  // Multilingual bonus (+2 for engaging in local language)
  if (aiAnalysis.detectedLanguages.includes('ml')) {
    aiBoost += 2
    reasoning.push(`🌏 Communicating in Malayalam (higher engagement)`)
  }

  // Add AI reasoning
  if (aiAnalysis.reasoning) {
    reasoning.push(`💡 AI insight: ${aiAnalysis.reasoning}`)
  }

  // Add key signals
  if (aiAnalysis.keySignals.length > 0) {
    reasoning.push(`🔑 Key signals: ${aiAnalysis.keySignals.slice(0, 3).join(', ')}`)
  }

  // Calculate final score (capped at 0-100)
  const finalScore = Math.max(0, Math.min(100, ruleBasedScore + aiBoost))

  reasoning.push(`📊 Score: ${ruleBasedScore} (rule-based) + ${aiBoost.toFixed(1)} (AI) = ${finalScore}`)
  reasoning.push(`🎯 Conversion probability: ${aiAnalysis.conversionProbability}%`)

  return {
    finalScore: Math.round(finalScore),
    aiBoost: Math.round(aiBoost),
    reasoning
  }
}
