import fs from 'fs'
import path from 'path'

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b'

// Load business context from file
let businessContext: string | null = null

function getBusinessContext(): string {
  if (businessContext) return businessContext

  try {
    const contextPath = path.join(process.cwd(), 'BUSINESS_CONTEXT.md')
    businessContext = fs.readFileSync(contextPath, 'utf-8')
    return businessContext
  } catch (error) {
    console.error('Failed to load BUSINESS_CONTEXT.md:', error)
    return 'You are a business analyst for an online German language school.'
  }
}

export type OllamaResponse = {
  model: string
  response: string
  done: boolean
  context?: number[]
  total_duration?: number
  load_duration?: number
  prompt_eval_duration?: number
  eval_duration?: number
}

export type InsightType = 'daily_digest' | 'deep_analysis' | 'question'

export type GenerateOptions = {
  model?: string
  temperature?: number
  maxTokens?: number
  includeContext?: boolean
}

/**
 * Check if Ollama server is running
 */
export async function isOllamaAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * List available models
 */
export async function listModels(): Promise<string[]> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`)
    if (!response.ok) return []

    const data = await response.json()
    return data.models?.map((m: { name: string }) => m.name) || []
  } catch {
    return []
  }
}

/**
 * Generate a response from Ollama
 */
export async function generate(
  prompt: string,
  options: GenerateOptions = {}
): Promise<string> {
  const {
    model = DEFAULT_MODEL,
    temperature = 0.7,
    maxTokens = 2048,
    includeContext = true,
  } = options

  const fullPrompt = includeContext
    ? `${getBusinessContext()}\n\n---\n\n${prompt}`
    : prompt

  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt: fullPrompt,
      stream: false,
      options: {
        temperature,
        num_predict: maxTokens,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Ollama error: ${error}`)
  }

  const data: OllamaResponse = await response.json()
  return data.response
}

/**
 * Generate streaming response from Ollama
 */
export async function* generateStream(
  prompt: string,
  options: GenerateOptions = {}
): AsyncGenerator<string> {
  const {
    model = DEFAULT_MODEL,
    temperature = 0.7,
    maxTokens = 2048,
    includeContext = true,
  } = options

  const fullPrompt = includeContext
    ? `${getBusinessContext()}\n\n---\n\n${prompt}`
    : prompt

  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt: fullPrompt,
      stream: true,
      options: {
        temperature,
        num_predict: maxTokens,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Ollama error: ${error}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    const lines = chunk.split('\n').filter(Boolean)

    for (const line of lines) {
      try {
        const data: OllamaResponse = JSON.parse(line)
        if (data.response) {
          yield data.response
        }
      } catch {
        // Skip invalid JSON lines
      }
    }
  }
}

/**
 * Generate business insights from aggregated data
 */
export async function generateInsights(
  data: Record<string, unknown>,
  type: InsightType = 'daily_digest'
): Promise<string> {
  const prompts: Record<InsightType, string> = {
    daily_digest: `
CURRENT BUSINESS DATA:
${JSON.stringify(data, null, 2)}

Based on this data, provide a brief daily digest with:
1. Top 3 things going well (with specific numbers)
2. Top 3 concerns that need attention (with urgency level)
3. One key action to take today

Keep it concise and actionable. Use bullet points.
`,
    deep_analysis: `
CURRENT BUSINESS DATA:
${JSON.stringify(data, null, 2)}

Provide a comprehensive analysis covering:

## Revenue & Financial Health
- Current performance vs targets
- Trends and projections
- Payment collection status

## Student Metrics
- Enrollment trends
- Attendance patterns
- Churn risk assessment

## Marketing & Leads
- Lead quality by source
- Conversion funnel analysis
- ROI assessment

## Operational Insights
- Batch performance
- Teacher utilization
- Capacity planning

## Recommendations
List 5 prioritized actions with expected impact.

Be specific with numbers and reference the targets from the business context.
`,
    question: `
CURRENT BUSINESS DATA:
${JSON.stringify(data, null, 2)}

Answer the following question using the data provided. Be specific and reference actual numbers.
`,
  }

  return generate(prompts[type], {
    temperature: type === 'daily_digest' ? 0.5 : 0.7,
    maxTokens: type === 'deep_analysis' ? 3000 : 1500,
  })
}

/**
 * Answer a specific question about the business
 */
export async function askQuestion(
  question: string,
  data: Record<string, unknown>
): Promise<string> {
  const prompt = `
CURRENT BUSINESS DATA:
${JSON.stringify(data, null, 2)}

QUESTION: ${question}

Provide a clear, data-driven answer. Reference specific numbers from the data.
If the data doesn't contain enough information to answer, say so.
`

  return generate(prompt, {
    temperature: 0.6,
    maxTokens: 1000,
  })
}
