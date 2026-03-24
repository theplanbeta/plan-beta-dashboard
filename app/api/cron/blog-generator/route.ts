import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { verifyCronSecret } from "@/lib/api-permissions"
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"

export const maxDuration = 300

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

    const systemPrompt = `You are a blog writer for Plan Beta, a German language school in India helping Indian students and professionals learn German (A1–B2) and move to Germany.

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
- Include target keyword "${targetKeyword}" naturally 3-5 times
- Internal links (use markdown):
  - [German courses](/courses) — learning German
  - [student jobs in Germany](/jobs/student-jobs) — student work
  - [nursing jobs in Germany](/jobs/nursing) — nursing careers
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

    // Ensure slug uniqueness
    const existingSlug = await prisma.blogPost.findUnique({
      where: { slug: postData.slug },
    })
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

    // Bust cache so new post appears immediately
    revalidatePath("/blog", "page")
    revalidatePath(`/blog/${blogPost.slug}`, "page")
    revalidatePath("/", "page")

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
