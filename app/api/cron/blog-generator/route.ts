import { NextRequest, NextResponse } from "next/server"
import { verifyCronSecret } from "@/lib/api-permissions"
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"

export const maxDuration = 60

const BLOG_CATEGORIES = [
  "Career",
  "Learning Tips",
  "Exam Prep",
  "Visa & Immigration",
  "Student Life",
  "Job Market",
]

async function getAutoTopic(): Promise<{
  topic: string
  category: string
  targetKeyword: string
}> {
  const categoryCounts = await prisma.blogPost.groupBy({
    by: ["category"],
    _count: { id: true },
  })

  const countMap: Record<string, number> = {}
  for (const c of categoryCounts) {
    countMap[c.category] = c._count.id
  }

  let minCategory = BLOG_CATEGORIES[0]
  let minCount = Infinity
  for (const cat of BLOG_CATEGORIES) {
    const count = countMap[cat] || 0
    if (count < minCount) {
      minCount = count
      minCategory = cat
    }
  }

  // Get recent existing post titles to avoid repetition
  const recentPosts = await prisma.blogPost.findMany({
    select: { title: true, targetKeyword: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  })
  const recentTitles = recentPosts.map((p) => p.title).join(", ")

  let trendingProfession = ""
  let trendingLocation = ""
  try {
    const recentJobs = await prisma.jobPosting.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      select: { profession: true, location: true },
      take: 50,
    })

    if (recentJobs.length > 0) {
      const professionCounts: Record<string, number> = {}
      const locationCounts: Record<string, number> = {}
      for (const job of recentJobs) {
        if (job.profession) {
          professionCounts[job.profession] =
            (professionCounts[job.profession] || 0) + 1
        }
        if (job.location) {
          locationCounts[job.location] =
            (locationCounts[job.location] || 0) + 1
        }
      }
      trendingProfession =
        Object.entries(professionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
        ""
      trendingLocation =
        Object.entries(locationCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
        ""
    }
  } catch {
    // JobPosting table may not exist
  }

  const month = new Date().getMonth()
  let seasonalContext = ""
  if (month >= 2 && month <= 4) {
    seasonalContext =
      "spring semester, university admissions opening, Sommersemester applications"
  } else if (month >= 5 && month <= 7) {
    seasonalContext =
      "summer internships, work experience, Wintersemester planning"
  } else if (month >= 8 && month <= 10) {
    seasonalContext =
      "Wintersemester starts, new batch enrollments, settling in Germany"
  } else {
    seasonalContext =
      "new year career planning, German language resolutions, Sommersemester preparation"
  }

  const topicPrompts: Record<string, string> = {
    Career: `career opportunities in Germany for Indian professionals${trendingProfession ? `, especially in ${trendingProfession}` : ""}${trendingLocation ? ` in ${trendingLocation}` : ""}. Avoid topics already covered: ${recentTitles}`,
    "Learning Tips": `practical tips for learning German efficiently. Avoid topics already covered: ${recentTitles}`,
    "Exam Prep": `preparing for German language exams (Goethe, telc). Avoid topics already covered: ${recentTitles}`,
    "Visa & Immigration": `German visa processes and immigration tips, ${seasonalContext}. Avoid topics already covered: ${recentTitles}`,
    "Student Life": `life in Germany for Indian students, ${seasonalContext}. Avoid topics already covered: ${recentTitles}`,
    "Job Market": `German job market trends${trendingProfession ? `, demand for ${trendingProfession}` : ""}${trendingLocation ? ` in ${trendingLocation}` : ""}. Avoid topics already covered: ${recentTitles}`,
  }

  const keywordMap: Record<string, string> = {
    Career: "career in germany for indians",
    "Learning Tips": "learn german tips",
    "Exam Prep": "goethe exam preparation",
    "Visa & Immigration": "germany work visa",
    "Student Life": "student life in germany",
    "Job Market": "jobs in germany",
  }

  return {
    topic: topicPrompts[minCategory] || topicPrompts["Career"],
    category: minCategory,
    targetKeyword: keywordMap[minCategory] || "learn german",
  }
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    )
  }

  try {
    const { topic, category, targetKeyword } = await getAutoTopic()

    const client = new Anthropic({ apiKey })

    const systemPrompt = `You are a blog content writer for Plan Beta, a German language school based in India that helps Indian students and professionals learn German (A1, A2, B1, B2 levels) before relocating to Germany.

Target audience: Indian professionals and students aged 20-35 interested in moving to Germany for work, study, or career growth.

Tone: Informative, encouraging, practical, and conversational.

Guidelines:
- Write in English
- 800-1500 words
- Use H2 (##) and H3 (###) headings to structure the content
- Include bullet points and numbered lists for practical tips
- Include the target keyword "${targetKeyword}" naturally 3-5 times
- Include internal links using markdown:
  - [German courses](/courses) — when mentioning learning German
  - [student jobs in Germany](/jobs/student-jobs) — when mentioning student work
  - [nursing jobs in Germany](/jobs/nursing) — when mentioning nursing careers
  - [contact us](/contact) — when suggesting the reader take action
  - [German classes in Kerala](/german-classes/kochi) — when mentioning local classes
- End with a clear CTA encouraging the reader to contact Plan Beta or enroll
- Provide specific, actionable information
- Reference real German institutions where relevant (Goethe-Institut, DAAD, etc.)
- Mention specific German language levels (A1, A2, B1, B2) where relevant

You must respond with valid JSON only (no markdown code fences). The JSON must have these fields:
{
  "title": "SEO-optimized blog post title (60-70 chars ideal)",
  "slug": "url-friendly-slug-with-hyphens",
  "excerpt": "1-2 sentence compelling summary (150-160 chars)",
  "content": "Full markdown content",
  "category": "${category}",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "targetKeyword": "${targetKeyword}",
  "metaTitle": "SEO meta title (50-60 chars)",
  "metaDescription": "SEO meta description (150-160 chars)",
  "readTime": estimated_read_time_in_minutes_as_number
}`

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `Write a blog post about: ${topic}\n\nCategory: ${category}\nTarget keyword: ${targetKeyword}\n\nMake it highly relevant to Indian students and professionals looking to learn German and move to Germany.`,
        },
      ],
      system: systemPrompt,
    })

    const textContent = message.content.find((c) => c.type === "text")
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json(
        { error: "No text content in Claude response" },
        { status: 500 }
      )
    }

    const postData = JSON.parse(textContent.text)

    // --- Dedup check: verify generated post doesn't overlap with recent published posts ---
    const recentForDedup = await prisma.blogPost.findMany({
      where: { published: true },
      select: { title: true, targetKeyword: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    })
    const generatedKw = (postData.targetKeyword || targetKeyword).toLowerCase()
    const generatedTitle = postData.title.toLowerCase()
    const titleWords = generatedTitle.split(/\s+/).filter((w: string) => w.length > 3)

    const isDuplicate = recentForDedup.some((p) => {
      const existingKw = (p.targetKeyword || "").toLowerCase()
      const existingTitle = p.title.toLowerCase()
      // Exact keyword match only — substring matching causes too many false positives
      const keywordOverlap = existingKw === generatedKw
      const matchCount = titleWords.filter((w: string) => existingTitle.includes(w)).length
      const titleOverlap = matchCount >= Math.ceil(titleWords.length * 0.5)
      return keywordOverlap || titleOverlap
    })

    if (isDuplicate) {
      console.log(`[BlogCron] Skipped duplicate topic: "${postData.title}"`)
      return NextResponse.json({ skipped: true, reason: "Topic already covered recently", title: postData.title })
    }

    // --- Humanizing Pass + slug check in parallel ---
    const [humanizeResponse, existingSlug] = await Promise.all([
      client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        system: `You are an editor who humanizes AI-written blog content for Plan Beta, a German language school for Indian students.

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

Return ONLY the rewritten markdown content. No JSON wrapper, no explanation — just the markdown.`,
        messages: [
          {
            role: "user",
            content: `Humanize this blog post:\n\n${postData.content}`,
          },
        ],
      }),
      prisma.blogPost.findUnique({
        where: { slug: postData.slug },
      }),
    ])

    const humanizedContent = humanizeResponse.content.find((c) => c.type === "text")
    if (humanizedContent && humanizedContent.type === "text") {
      postData.content = humanizedContent.text.trim()
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
        targetKeyword: postData.targetKeyword || targetKeyword,
        readTime: postData.readTime || 5,
        published: true,
        publishedAt: new Date(),
        author: "Plan Beta",
      },
    })

    console.log(`Blog post generated: "${blogPost.title}" [${blogPost.slug}]`)

    return NextResponse.json({
      success: true,
      post: { id: blogPost.id, title: blogPost.title, slug: blogPost.slug },
    })
  } catch (error) {
    console.error("Blog cron generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate blog post" },
      { status: 500 }
    )
  }
}
