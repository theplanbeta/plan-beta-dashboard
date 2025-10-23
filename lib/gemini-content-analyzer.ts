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

export interface RedditCommentWithVotes {
  body: string
  upvotes: number
}

/**
 * Generate Instagram Reel content idea by mining discussion gems
 */
export async function generateContentIdea(
  title: string,
  content: string | null,
  upvotes: number,
  subreddit: string,
  comments: RedditCommentWithVotes[] = []
): Promise<ContentIdeaOutput> {
  // Use model that works with our API
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

  // Format comments with upvote data (gems first!)
  const commentsSection = comments.length > 0
    ? `\n\n📊 COMMUNITY DISCUSSION (${comments.length} comments, sorted by upvotes):\n${comments.map((c, i) =>
        `\n💎 Comment #${i + 1} (${c.upvotes} upvotes):\n"${c.body}"`
      ).join('\n')}`
    : '\n\n(No significant comments available)'

  const prompt = `You are a CONTENT GEM MINER - an expert at finding golden insights from Reddit discussions and transforming them into viral Instagram Reels for Indians wanting to move to Germany.

🎯 YOUR MISSION: Mine this Reddit discussion for GEMS - surprising insights, counterintuitive truths, specific examples, emotional stories that Indians NEED to know about Germany.

📊 REDDIT DISCUSSION TO MINE:
Subreddit: r/${subreddit}
Post Title: "${title}"
Post Content: "${content || 'See comments for details'}"
Post Engagement: ${upvotes} upvotes${commentsSection}

🔍 STEP 1: RELEVANCE CHECK
FIRST, determine if this post is HELPFUL for Indians wanting to move to Germany:
✅ YES: Visa tips, job market, culture, language, education, bureaucracy, expat experiences, living costs, integration challenges
❌ NO: Local crime news, German politics, irrelevant local events, fear-mongering
If NO → SKIP this post (return null or throw error)

🔍 STEP 2: IDENTIFY THE GEMS
Read through the ENTIRE discussion above. Look for:
- 💎 HIGH-UPVOTE insights (community validated truths)
- 💎 Specific numbers, examples, anecdotes (concrete facts)
- 💎 Counterintuitive or surprising information
- 💎 Emotional stories that resonate
- 💎 Practical advice that people actually used
- 💎 Common misconceptions being corrected

🎬 STEP 3: CREATE A REEL THAT SHARES THESE GEMS

Your reel must:

1. **HOOK** (First 3 seconds) - Use the MOST surprising gem:
   - Direct, specific, shocking or relatable
   - Examples: "Germans earn €50K but feel poor - here's why" / "Moving to Germany? This mistake cost me €10,000"
   - Must make Indians stop scrolling

2. **SCRIPT** (30-45 seconds) - CLEAR STRUCTURE REQUIRED:

   **Part 1: CONTEXT (5-10 seconds)** - Explain what the post is about:
   - What situation, question, or topic is being discussed?
   - Give enough context so viewer understands the scenario
   - Example: "A Reddit user asked about rent prices in Berlin, and the responses were eye-opening..."

   **Part 2: GEMS (20-30 seconds)** - Share 2-3 specific insights from comments:
   - Use specific details, numbers, examples from comments
   - Cite upvotes: "One comment with 500 upvotes revealed..."
   - Connect each gem to why it matters for Indians moving to Germany

   **Part 3: TAKEAWAY (5-10 seconds)** - End with actionable insight:
   - What should viewers do with this information?
   - How does this help their Germany journey?

   ⚠️ CRITICAL: Viewer must understand WHAT happened/was discussed AND WHY it matters

3. **VISUAL SUGGESTIONS** - How to show the gems:
   - When to show comment text on screen
   - When to use numbers/stats as overlays
   - Specific b-roll that matches the gems
   - Keep it simple and filmable

4. **CAPTION** - Expand on gems not covered in video:
   - Share 1-2 additional insights from comments
   - Cite upvote counts for credibility ("Top comment with 300 upvotes...")
   - Ask question that continues the discussion
   - 50-80 words

5. **HASHTAGS** - 6-8 relevant tags

6. **TOPIC** - Choose ONE: CultureShock, Bureaucracy, LanguageTips, JobMarket, Education, DailyLife, Immigration, StudentLife, General

🎯 QUALITY REQUIREMENTS:
✅ MUST explain what the post is about FIRST (context before gems!)
✅ MUST use specific gems from comments (cite upvotes!)
✅ MUST connect gems to Indians moving to Germany (why does this matter?)
✅ MUST be educational with concrete takeaways
✅ MUST feel authentic, not promotional
❌ NO jumping straight to comments without explaining the topic
❌ NO generic advice that could apply anywhere
❌ NO sales pitch for German classes
❌ NO making up information
❌ NO creating content from crime news or fear-based posts

Return ONLY valid JSON:
{
  "hook": "Specific, shocking hook using a gem from the discussion",
  "script": "30-45 second script telling the story of the gems you found. Use specific details, numbers, quotes. Cite upvotes for credibility.",
  "visualSuggestions": "How to visually present the gems - when to show comments, stats, examples",
  "caption": "Share additional gems not in video. Cite upvotes. Ask engaging question.",
  "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8"],
  "topic": "Choose one topic"
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

    // Convert arrays to strings if needed (Gemini sometimes returns arrays)
    const scriptText = Array.isArray(parsed.script) ? parsed.script.join('\n\n') : parsed.script
    const visualText = Array.isArray(parsed.visualSuggestions) ? parsed.visualSuggestions.join('\n\n') : parsed.visualSuggestions

    return {
      hook: parsed.hook,
      script: scriptText,
      visualSuggestions: visualText,
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
