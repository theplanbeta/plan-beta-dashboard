/**
 * Google Gemini API Client for Founder Outreach System
 * Handles AI initialization, error handling, and rate limiting
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'

// Rate limiting configuration
interface RateLimitConfig {
  requestsPerMinute: number
  requestQueue: number[]
}

const rateLimitConfig: RateLimitConfig = {
  requestsPerMinute: 15, // Conservative limit to avoid API throttling
  requestQueue: [],
}

/**
 * Initialize Gemini API client
 */
function initializeGemini(): GoogleGenerativeAI | null {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY

  if (!apiKey) {
    console.error('[Gemini Client] API key not found. Set GEMINI_API_KEY or GOOGLE_GEMINI_API_KEY in environment variables.')
    return null
  }

  return new GoogleGenerativeAI(apiKey)
}

const genAI = initializeGemini()

/**
 * Get Gemini model instance
 * Uses gemini-1.5-flash for fast, cost-effective responses
 */
export function getGeminiModel(modelName: string = 'gemini-1.5-flash'): GenerativeModel | null {
  if (!genAI) {
    console.error('[Gemini Client] Gemini AI not initialized. Check API key.')
    return null
  }

  return genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.7, // Balanced creativity
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 2048, // Limit output to control costs
    },
  })
}

/**
 * Check rate limit before making request
 */
function checkRateLimit(): boolean {
  const now = Date.now()
  const oneMinuteAgo = now - 60000

  // Clean old timestamps
  rateLimitConfig.requestQueue = rateLimitConfig.requestQueue.filter(
    (timestamp) => timestamp > oneMinuteAgo
  )

  // Check if under limit
  if (rateLimitConfig.requestQueue.length >= rateLimitConfig.requestsPerMinute) {
    console.warn('[Gemini Client] Rate limit reached. Request queued.')
    return false
  }

  // Add current request
  rateLimitConfig.requestQueue.push(now)
  return true
}

/**
 * Wait for rate limit to allow request
 */
async function waitForRateLimit(): Promise<void> {
  while (!checkRateLimit()) {
    // Wait 5 seconds before checking again
    await new Promise((resolve) => setTimeout(resolve, 5000))
  }
}

/**
 * Generate content with Gemini with error handling and rate limiting
 */
export async function generateContent(
  prompt: string,
  modelName: string = 'gemini-1.5-flash',
  options?: {
    retries?: number
    timeout?: number
  }
): Promise<{ success: boolean; content?: string; error?: string; tokenCount?: number }> {
  const { retries = 2, timeout = 30000 } = options || {}

  // Wait for rate limit
  await waitForRateLimit()

  const model = getGeminiModel(modelName)
  if (!model) {
    return {
      success: false,
      error: 'Gemini API not available. Please check configuration.',
    }
  }

  let lastError: Error | null = null

  // Retry logic
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      })

      // Race between actual request and timeout
      const result = await Promise.race([
        model.generateContent(prompt),
        timeoutPromise,
      ])

      const response = await result.response
      const text = response.text()

      // Estimate token count (rough approximation: 1 token ≈ 4 characters)
      const estimatedTokens = Math.ceil((prompt.length + text.length) / 4)

      return {
        success: true,
        content: text.trim(),
        tokenCount: estimatedTokens,
      }
    } catch (error) {
      lastError = error as Error
      console.error(`[Gemini Client] Attempt ${attempt + 1} failed:`, error)

      // If it's a rate limit error, wait longer
      if (error instanceof Error && error.message.includes('429')) {
        console.warn('[Gemini Client] API rate limit hit. Waiting 10 seconds...')
        await new Promise((resolve) => setTimeout(resolve, 10000))
      } else if (attempt < retries) {
        // Wait before retry (exponential backoff)
        const waitTime = Math.pow(2, attempt) * 1000
        await new Promise((resolve) => setTimeout(resolve, waitTime))
      }
    }
  }

  // All retries failed
  return {
    success: false,
    error: lastError?.message || 'Failed to generate content',
  }
}

/**
 * Generate content with streaming (for real-time responses)
 */
export async function generateContentStream(
  prompt: string,
  modelName: string = 'gemini-1.5-flash'
): Promise<{ success: boolean; stream?: AsyncIterable<string>; error?: string }> {
  await waitForRateLimit()

  const model = getGeminiModel(modelName)
  if (!model) {
    return {
      success: false,
      error: 'Gemini API not available. Please check configuration.',
    }
  }

  try {
    const result = await model.generateContentStream(prompt)

    const streamGenerator = async function* () {
      for await (const chunk of result.stream) {
        const text = chunk.text()
        yield text
      }
    }

    return {
      success: true,
      stream: streamGenerator(),
    }
  } catch (error) {
    console.error('[Gemini Client] Streaming failed:', error)
    return {
      success: false,
      error: (error as Error).message,
    }
  }
}

/**
 * Check if Gemini API is available
 */
export function isGeminiAvailable(): boolean {
  return genAI !== null
}

/**
 * Get current rate limit status
 */
export function getRateLimitStatus(): {
  requestsInLastMinute: number
  remainingRequests: number
  resetIn: number
} {
  const now = Date.now()
  const oneMinuteAgo = now - 60000

  // Clean old timestamps
  rateLimitConfig.requestQueue = rateLimitConfig.requestQueue.filter(
    (timestamp) => timestamp > oneMinuteAgo
  )

  const requestsInLastMinute = rateLimitConfig.requestQueue.length
  const remainingRequests = Math.max(
    0,
    rateLimitConfig.requestsPerMinute - requestsInLastMinute
  )

  // Calculate reset time
  const oldestRequest = rateLimitConfig.requestQueue[0]
  const resetIn = oldestRequest ? Math.max(0, oldestRequest + 60000 - now) : 0

  return {
    requestsInLastMinute,
    remainingRequests,
    resetIn,
  }
}

/**
 * Error types for better error handling
 */
export enum GeminiErrorType {
  API_KEY_MISSING = 'API_KEY_MISSING',
  RATE_LIMIT = 'RATE_LIMIT',
  TIMEOUT = 'TIMEOUT',
  INVALID_REQUEST = 'INVALID_REQUEST',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Parse error and return structured error info
 */
export function parseGeminiError(error: unknown): {
  type: GeminiErrorType
  message: string
  retryable: boolean
} {
  if (!error) {
    return {
      type: GeminiErrorType.UNKNOWN,
      message: 'Unknown error occurred',
      retryable: false,
    }
  }

  const errorMessage = (error as Error).message || String(error)

  if (errorMessage.includes('API key')) {
    return {
      type: GeminiErrorType.API_KEY_MISSING,
      message: 'API key not configured',
      retryable: false,
    }
  }

  if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
    return {
      type: GeminiErrorType.RATE_LIMIT,
      message: 'Rate limit exceeded',
      retryable: true,
    }
  }

  if (errorMessage.includes('timeout')) {
    return {
      type: GeminiErrorType.TIMEOUT,
      message: 'Request timed out',
      retryable: true,
    }
  }

  if (errorMessage.includes('400') || errorMessage.includes('invalid')) {
    return {
      type: GeminiErrorType.INVALID_REQUEST,
      message: 'Invalid request',
      retryable: false,
    }
  }

  if (errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED')) {
    return {
      type: GeminiErrorType.NETWORK_ERROR,
      message: 'Network error',
      retryable: true,
    }
  }

  return {
    type: GeminiErrorType.UNKNOWN,
    message: errorMessage,
    retryable: true,
  }
}
