/**
 * Gemini AI Content Analyzer
 * Generates Instagram Reel ideas from Reddit posts
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export interface ContentIdeaOutput {
  hook: string
  script: string
  visualSuggestions: string
  caption: string
  hashtags: string[]
  topic: string
}

/**
 * Generate Instagram Reel content idea from Reddit post
 */
export async function generateContentIdea(
  title: string,
  content: string | null,
  upvotes: number,
  subreddit: string
): Promise<ContentIdeaOutput> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const prompt = `You are a content strategist for a German language school targeting Indians who want to learn German and move to Germany.

Analyze this Reddit post from r/${subreddit} and create an engaging Instagram Reel idea:

Title: "${title}"
Content: "${content || 'No additional content'}"
Upvotes: ${upvotes}

Generate a content idea that will:
1. Capture attention of Indians interested in Germany
2. Provide valuable information about life in Germany or learning German
3. Be authentic and relatable
4. Drive engagement and potentially generate leads

Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks, just pure JSON):
{
  "hook": "An 8-10 word attention-grabbing opening line",
  "script": "A complete 30-45 second reel script in conversational tone, broken into clear segments",
  "visualSuggestions": "Detailed description of what to show on screen during the reel",
  "caption": "A 50-80 word caption with call-to-action to learn German",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5", "hashtag6", "hashtag7", "hashtag8"],
  "topic": "One of: CultureShock, Bureaucracy, LanguageTips, JobMarket, Education, DailyLife, Immigration, StudentLife, General"
}`

  try {
    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    // Clean up response - remove markdown code blocks if present
    let cleanedText = text.trim()
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/```\n?/g, '')
    }

    const parsed = JSON.parse(cleanedText)

    // Validate required fields
    if (!parsed.hook || !parsed.script || !parsed.visualSuggestions || !parsed.caption || !parsed.hashtags || !parsed.topic) {
      throw new Error('Missing required fields in Gemini response')
    }

    return {
      hook: parsed.hook,
      script: parsed.script,
      visualSuggestions: parsed.visualSuggestions,
      caption: parsed.caption,
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
      topic: parsed.topic,
    }
  } catch (error) {
    console.error('Error generating content idea:', error)
    throw new Error('Failed to generate content idea from Gemini AI')
  }
}

/**
 * Analyze multiple posts and generate batch ideas (optional for future)
 */
export async function generateBatchIdeas(
  posts: Array<{ title: string; content: string | null; upvotes: number; subreddit: string }>
): Promise<ContentIdeaOutput[]> {
  const ideas: ContentIdeaOutput[] = []

  for (const post of posts) {
    try {
      const idea = await generateContentIdea(post.title, post.content, post.upvotes, post.subreddit)
      ideas.push(idea)

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error(`Failed to generate idea for post: ${post.title}`, error)
    }
  }

  return ideas
}
