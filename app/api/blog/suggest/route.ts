import { NextRequest, NextResponse } from "next/server"
import { verifyCronSecret } from "@/lib/api-permissions"
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"

export const maxDuration = 300

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

  // Check against recent published posts to avoid duplicates
  const recentPosts = await prisma.blogPost.findMany({
    where: { published: true },
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
    // Exact keyword match only — substring causes false positives
    const keywordDupe = recentKeywords.some((rk) => rk === kw)
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
      system: `You are a blog writer for Plan Beta, a German language school in India helping Indian students and professionals learn German (A1–B2) and move to Germany.

Audience: Indian professionals and students aged 20-35 planning to work or study in Germany.

## Voice & Tone
- Write like a knowledgeable friend talking over chai — conversational Indian English, not formal or slangy
- Include 1-2 student anecdotes ("One of our students from Kochi...", "A common thing we hear from our B1 batch...")
- Add rhetorical questions to break up text ("Sound familiar?", "So what does this actually look like?")
- Add honest opinions ("Honestly, most coaching centers get this wrong...", "Here's what nobody tells you...")
- Use specific numbers: costs in INR and EUR, real timelines, specific German cities
- NEVER use these phrases: "In this comprehensive guide", "It's important to note", "Let's dive in", "In conclusion", "Whether you're a...", "In today's world", "Look no further", "Navigate the complexities"
- End with a personal CTA, not salesy ("Drop us a message — we'll help you figure out the right batch")

## Structure
- 800-1500 words in English
- Use ## and ### headings, bullet points, numbered lists
- Include target keyword "${topic.targetKeyword}" naturally 3-5 times
- Internal links (use markdown):
  - [German courses](/courses) — learning German
  - [student jobs in Germany](/jobs/student-jobs) — student work
  - [nursing jobs in Germany](/jobs/nursing) — nursing careers
  - [engineering jobs in Germany](/jobs/engineering) — engineering
  - [contact us](/contact) — taking action
  - [German classes in Kerala](/german-classes/kochi) — local classes
- Reference real German institutions (Goethe-Institut, DAAD, etc.)

Respond with valid JSON only (no markdown code fences):
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

    // Ensure slug uniqueness
    const existingSlug = await prisma.blogPost.findUnique({ where: { slug: postData.slug } })
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
