import { NextRequest, NextResponse } from "next/server"
import { verifyCronSecret } from "@/lib/api-permissions"
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"

export const maxDuration = 60

// Schema for Kimi Claw blog topic suggestions
interface TopicSuggestion {
  title: string
  targetKeyword: string
  searchIntent?: string
  competitionLevel?: string
  relevanceScore?: number
  outline?: string[]
  dataSources?: string[]
  whyNow?: string
}

interface BlogSuggestPayload {
  date?: string
  topicSuggestions: TopicSuggestion[]
  trendingQuestions?: string[]
  competitorContent?: Array<{ url: string; weakness: string }>
}

const HUMANIZE_PROMPT = `You are an editor who humanizes AI-written blog content for Plan Beta, a German language school for Indian students.

Your job is to take the draft blog post and rewrite it to feel authentic and human. Rules:

1. Add 1-2 personal anecdotes from student experiences ("One of our students from Kochi...", "A common thing we hear from our B1 batch...")
2. Use conversational Indian English — not overly formal, not slangy. Like talking to a friend over chai.
3. Replace vague claims with specific numbers (actual costs in INR and EUR, real timelines, specific cities)
4. Add rhetorical questions to break up text ("Sound familiar?", "So what does this actually look like?")
5. Add honest opinions ("Honestly, most coaching centers get this wrong...", "Here's what nobody tells you...")
6. REMOVE these AI-sounding phrases completely: "In this comprehensive guide", "It's important to note", "Let's dive in", "In conclusion", "Whether you're a...", "In today's world", "Look no further", "Navigate the complexities"
7. Keep all markdown formatting, internal links, headings, and structure intact
8. Keep the same length (800-1500 words) — don't pad or trim significantly
9. Make the CTA feel personal, not salesy ("Drop us a message — we'll help you figure out the right batch")

Return ONLY the rewritten markdown content. No JSON wrapper, no explanation — just the markdown.`

// POST /api/blog/suggest — Receives topic research from Kimi Claw and generates a blog post
export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 })
  }

  let payload: BlogSuggestPayload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!payload.topicSuggestions || payload.topicSuggestions.length === 0) {
    return NextResponse.json({ error: "No topic suggestions provided" }, { status: 400 })
  }

  // Pick the best topic: highest relevance score, or first one
  const sorted = [...payload.topicSuggestions].sort(
    (a, b) => (b.relevanceScore || 5) - (a.relevanceScore || 5)
  )

  // Check against recent posts to avoid duplicates
  const recentPosts = await prisma.blogPost.findMany({
    select: { title: true, targetKeyword: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  })
  const recentKeywords = recentPosts.map((p) => p.targetKeyword?.toLowerCase() || "")
  const recentTitles = recentPosts.map((p) => p.title.toLowerCase())

  // Find first topic that's not already covered
  const topic = sorted.find((t) => {
    const kw = t.targetKeyword.toLowerCase()
    const title = t.title.toLowerCase()
    // Check keyword overlap (exact or substring match)
    const keywordDupe = recentKeywords.some(
      (rk) => rk === kw || rk.includes(kw) || kw.includes(rk)
    )
    // Check title overlap (significant word overlap)
    const titleWords = title.split(/\s+/).filter((w) => w.length > 3)
    const titleDupe = recentTitles.some((rt) => {
      const matchCount = titleWords.filter((w) => rt.includes(w)).length
      return matchCount >= Math.ceil(titleWords.length * 0.5)
    })
    return !keywordDupe && !titleDupe
  })

  if (!topic) {
    return NextResponse.json(
      { error: "All suggested topics already covered recently", skipped: sorted.map((t) => t.title) },
      { status: 409 }
    )
  }

  // Map to a category
  const categoryMap: Record<string, string> = {
    career: "Career",
    job: "Job Market",
    visa: "Visa & Immigration",
    immigration: "Visa & Immigration",
    learn: "Learning Tips",
    study: "Learning Tips",
    exam: "Exam Prep",
    goethe: "Exam Prep",
    student: "Student Life",
    life: "Student Life",
    salary: "Job Market",
    blue: "Career",
    work: "Career",
    nurse: "Career",
    nursing: "Career",
    engineer: "Career",
  }

  let category = "Career"
  const titleLower = topic.title.toLowerCase()
  for (const [keyword, cat] of Object.entries(categoryMap)) {
    if (titleLower.includes(keyword) || topic.targetKeyword.toLowerCase().includes(keyword)) {
      category = cat
      break
    }
  }

  // Build extra context from Kimi Claw research
  const extraContext: string[] = []
  if (topic.outline && topic.outline.length > 0) {
    extraContext.push(`Suggested outline:\n${topic.outline.map((s, i) => `${i + 1}. ${s}`).join("\n")}`)
  }
  if (topic.whyNow) {
    extraContext.push(`Why this topic is timely: ${topic.whyNow}`)
  }
  if (payload.trendingQuestions && payload.trendingQuestions.length > 0) {
    extraContext.push(`Trending questions to address:\n${payload.trendingQuestions.slice(0, 5).map((q) => `- ${q}`).join("\n")}`)
  }
  if (payload.competitorContent && payload.competitorContent.length > 0) {
    extraContext.push(`Competitor gaps to exploit:\n${payload.competitorContent.slice(0, 3).map((c) => `- ${c.weakness}`).join("\n")}`)
  }

  const client = new Anthropic({ apiKey })

  try {
    // Step 1: Generate the blog post
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: `You are a blog content writer for Plan Beta, a German language school based in India that helps Indian students and professionals learn German (A1, A2, B1, B2 levels) before relocating to Germany.

Target audience: Indian professionals and students aged 20-35 interested in moving to Germany for work, study, or career growth.

Tone: Informative, encouraging, practical, and conversational. Write like a knowledgeable friend who has been through the process.

Guidelines:
- Write in English
- 800-1500 words
- Use H2 (##) and H3 (###) headings to structure the content
- Include bullet points and numbered lists for practical tips
- Include the target keyword "${topic.targetKeyword}" naturally 3-5 times
- Include internal links using markdown:
  - [German courses](/courses) — when mentioning learning German
  - [student jobs in Germany](/jobs/student-jobs) — when mentioning student work
  - [nursing jobs in Germany](/jobs/nursing) — when mentioning nursing careers
  - [engineering jobs in Germany](/jobs/engineering) — when mentioning engineering
  - [contact us](/contact) — when suggesting the reader take action
  - [German classes in Kerala](/german-classes/kochi) — when mentioning local classes
- End with a clear CTA encouraging the reader to contact Plan Beta or enroll
- Provide specific, actionable information with real numbers
- Reference real German institutions where relevant

You must respond with valid JSON only (no markdown code fences):
{
  "title": "SEO-optimized blog post title (60-70 chars ideal)",
  "slug": "url-friendly-slug-with-hyphens",
  "excerpt": "1-2 sentence compelling summary (150-160 chars)",
  "content": "Full markdown content",
  "category": "${category}",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "targetKeyword": "${topic.targetKeyword}",
  "metaTitle": "SEO meta title (50-60 chars)",
  "metaDescription": "SEO meta description (150-160 chars)",
  "readTime": estimated_read_time_in_minutes_as_number
}`,
      messages: [
        {
          role: "user",
          content: `Write a blog post based on this research:\n\nTitle: ${topic.title}\nTarget keyword: ${topic.targetKeyword}\nSearch intent: ${topic.searchIntent || "informational"}\n\n${extraContext.join("\n\n")}\n\nMake it highly relevant to Indian students and professionals looking to learn German and move to Germany.`,
        },
      ],
    })

    const textContent = message.content.find((c) => c.type === "text")
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json({ error: "No text from Claude" }, { status: 500 })
    }

    let jsonStr = textContent.text.trim()
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
    }
    const postData = JSON.parse(jsonStr)

    // Step 2: Humanize + slug check in parallel
    const [humanizeResponse, existingSlug] = await Promise.all([
      client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        system: HUMANIZE_PROMPT,
        messages: [{ role: "user", content: `Humanize this blog post:\n\n${postData.content}` }],
      }),
      prisma.blogPost.findUnique({ where: { slug: postData.slug } }),
    ])

    const humanized = humanizeResponse.content.find((c) => c.type === "text")
    if (humanized && humanized.type === "text") {
      postData.content = humanized.text.trim()
    }

    if (existingSlug) {
      postData.slug = `${postData.slug}-${Date.now().toString(36)}`
    }

    const blogPost = await prisma.blogPost.create({
      data: {
        slug: postData.slug,
        title: postData.title,
        excerpt: postData.excerpt,
        content: postData.content,
        category: postData.category || category,
        tags: postData.tags || [],
        metaTitle: postData.metaTitle,
        metaDescription: postData.metaDescription,
        targetKeyword: postData.targetKeyword || topic.targetKeyword,
        readTime: postData.readTime || 5,
        published: true,
        publishedAt: new Date(),
        author: "Plan Beta",
      },
    })

    console.log(`[BlogSuggest] Generated from Kimi Claw research: "${blogPost.title}" [${blogPost.slug}]`)

    return NextResponse.json({
      success: true,
      post: {
        id: blogPost.id,
        title: blogPost.title,
        slug: blogPost.slug,
        url: `/blog/${blogPost.slug}`,
      },
      topicUsed: topic.title,
    })
  } catch (error) {
    console.error("[BlogSuggest] Error:", error)
    return NextResponse.json({ error: "Failed to generate blog post", details: String(error) }, { status: 500 })
  }
}
