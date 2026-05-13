import { NextRequest, NextResponse } from "next/server"
import { checkPermission } from "@/lib/api-permissions"
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import { validateBlogContent, formatWarningsAsNote } from "@/lib/blog-validator"

const aiLimiter = rateLimit(RATE_LIMITS.AI)

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
  // Check which categories have fewer posts
  const categoryCounts = await prisma.blogPost.groupBy({
    by: ["category"],
    _count: { id: true },
  })

  const countMap: Record<string, number> = {}
  for (const c of categoryCounts) {
    countMap[c.category] = c._count.id
  }

  // Find least-covered category
  let minCategory = BLOG_CATEGORIES[0]
  let minCount = Infinity
  for (const cat of BLOG_CATEGORIES) {
    const count = countMap[cat] || 0
    if (count < minCount) {
      minCount = count
      minCategory = cat
    }
  }

  // Check recent job postings for trending topics
  let trendingProfession = ""
  let trendingLocation = ""
  try {
    const recentJobs = await prisma.jobPosting.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      select: { profession: true, location: true },
      take: 50,
    })

    if (recentJobs.length > 0) {
      const professionCounts: Record<string, number> = {}
      const locationCounts: Record<string, number> = {}
      for (const job of recentJobs) {
        if (job.profession) {
          professionCounts[job.profession] = (professionCounts[job.profession] || 0) + 1
        }
        if (job.location) {
          locationCounts[job.location] = (locationCounts[job.location] || 0) + 1
        }
      }
      trendingProfession =
        Object.entries(professionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || ""
      trendingLocation =
        Object.entries(locationCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || ""
    }
  } catch {
    // JobPosting table may not exist; proceed without trending data
  }

  // Seasonal relevance
  const month = new Date().getMonth()
  let seasonalContext = ""
  if (month >= 2 && month <= 4) {
    seasonalContext = "spring semester, university admissions opening, Sommersemester applications"
  } else if (month >= 5 && month <= 7) {
    seasonalContext = "summer internships, work experience, Wintersemester planning"
  } else if (month >= 8 && month <= 10) {
    seasonalContext = "Wintersemester starts, new batch enrollments, settling in Germany"
  } else {
    seasonalContext = "new year career planning, German language resolutions, Sommersemester preparation"
  }

  // Topic selection based on category
  const topicPrompts: Record<string, string> = {
    Career: `career opportunities in Germany for Indian professionals${trendingProfession ? `, especially in ${trendingProfession}` : ""}${trendingLocation ? ` in ${trendingLocation}` : ""}`,
    "Learning Tips": "practical tips for learning German efficiently, study methods, common mistakes to avoid",
    "Exam Prep": "preparing for Goethe-Zertifikat or telc exams, test strategies, practice resources",
    "Visa & Immigration": `German visa processes, Blue Card, work permits, Aufenthaltstitel, ${seasonalContext}`,
    "Student Life": `life in Germany for Indian students, cultural tips, practical advice, ${seasonalContext}`,
    "Job Market": `German job market trends${trendingProfession ? `, demand for ${trendingProfession}` : ""}${trendingLocation ? ` in ${trendingLocation}` : ""}, career outlook`,
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

export async function POST(request: NextRequest) {
  const rateLimited = await aiLimiter(request)
  if (rateLimited) return rateLimited

  const auth = await checkPermission("content", "create")
  if (!auth.authorized) return auth.response

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    )
  }

  let body: { topic?: string; category?: string; targetKeyword?: string } = {}
  try {
    body = await request.json()
  } catch {
    // Empty body is fine — auto-select topic
  }

  const autoTopic = await getAutoTopic()
  const topic = body.topic || autoTopic.topic
  const category = body.category || autoTopic.category
  const targetKeyword = body.targetKeyword || autoTopic.targetKeyword

  const client = new Anthropic({ apiKey })

  const systemPrompt = `You are a blog content writer for Plan Beta, a German language school based in India that helps Indian students and professionals learn German (A1, A2, B1, B2 levels) before relocating to Germany.

Target audience: Indian professionals and students aged 20-35 interested in moving to Germany for work, study, or career growth.

Tone: Informative, encouraging, practical, and conversational. Write like a knowledgeable friend who has been through the process.

## Conversion focus (non-negotiable)

Every post is a conversion funnel for ONE specific reader profile. Decide who this post is for and tailor every CTA to that person. Pick exactly one:
- "nurse"        → funnel: WhatsApp to Plan Beta's nursing pipeline → https://wa.me/919028396035
- "engineer"    → funnel: free eligibility quiz at /germany-pathway
- "it"          → funnel: WhatsApp planning call → https://wa.me/919028396035
- "student"     → funnel: live A1–B2 batches at /courses
- "visa-seeker" → funnel: eligibility quiz at /germany-pathway
- "general"     → funnel: free consultation at /contact

You MUST:
1. Embed a mid-post CTA after the second H2 section, formatted as a blockquote with bold text and a markdown link to the profile's funnel URL. Example for a nurse-targeted post:
   > **Are you a BSc/GNM nurse?** Plan Beta places nurses in German hospitals with no agent fees. [Tell us about your profile on WhatsApp →](https://wa.me/919028396035)
2. Close the post with a final CTA paragraph (NOT a bullet list) that names the reader's situation, the specific next step, and includes the funnel link. Avoid soft phrasings like "feel free to contact us" — be direct: "Book a free consultation", "Run the eligibility check", "Reply to this on WhatsApp".

## Guidelines
- Write in English
- 800-1500 words
- Use H2 (##) and H3 (###) headings to structure the content
- Include bullet points and numbered lists for practical tips
- Include the target keyword "${targetKeyword}" naturally 3-5 times in the content
- Include internal links using markdown:
  - [German courses](/courses) — when mentioning learning German
  - [student jobs in Germany](/jobs/student-jobs) — when mentioning student work
  - [nursing programs with Plan Beta](/nurses) — when mentioning nursing careers (this is the consultation funnel, NOT a job board)
  - [contact us](/contact) — when suggesting the reader take action
  - [German classes in Kerala](/german-classes/kochi) — when mentioning local classes
  - [Germany eligibility quiz](/germany-pathway) — when discussing visas or pathways
- Do NOT use generic filler content — provide specific, actionable information
- Reference real German institutions, programs, or processes where relevant (Goethe-Institut, DAAD, Auslanderamt, etc.)
- Mention specific German language levels (A1, A2, B1, B2) where relevant
- IMPORTANT: Do NOT quote specific salary ranges (e.g. "€2,800-4,500/month") or income figures. Speak about salaries qualitatively ("competitive", "varies by state and experience") and direct readers to consult Plan Beta for specifics. Legal thresholds like the EU Blue Card minimum are acceptable as single figures.

You must respond with valid JSON only (no markdown code fences). The JSON must have these fields:
{
  "title": "SEO-optimized blog post title (60-70 chars ideal)",
  "slug": "url-friendly-slug-with-hyphens",
  "excerpt": "1-2 sentence compelling summary for blog listing cards (150-160 chars)",
  "content": "Full markdown content of the blog post — MUST include the mid-post blockquote CTA and a direct closing CTA paragraph",
  "category": "${category}",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "targetKeyword": "${targetKeyword}",
  "metaTitle": "SEO meta title (50-60 chars, include target keyword)",
  "metaDescription": "SEO meta description (150-160 chars, include target keyword and CTA)",
  "readTime": estimated_read_time_in_minutes_as_number,
  "readerProfile": "nurse | engineer | it | student | visa-seeker | general — the single profile this post converts for"
}`

  try {
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

    let postData: {
      title: string
      slug: string
      excerpt: string
      content: string
      category: string
      tags: string[]
      targetKeyword: string
      metaTitle: string
      metaDescription: string
      readTime: number
      readerProfile?: string
    }

    try {
      postData = JSON.parse(textContent.text)
    } catch {
      return NextResponse.json(
        { error: "Failed to parse Claude response as JSON", raw: textContent.text },
        { status: 500 }
      )
    }

    // --- Humanizing Pass ---
    const humanizeResponse = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: `You are an editor who humanizes AI-written blog content for Plan Beta, a German language school for Indian students.

Your job is to take the draft blog post and rewrite it to feel authentic and human. Rules:

1. Add 1-2 personal anecdotes from student experiences ("One of our students from Kochi...", "A common thing we hear from our B1 batch...")
2. Use conversational Indian English — not overly formal, not slangy. Like talking to a friend over chai.
3. Replace vague claims with concrete details — real timelines, specific cities, named programs/institutions. Do NOT add salary numbers or money ranges; if the draft has them, replace with qualitative language and a nudge to consult Plan Beta.
4. Add rhetorical questions to break up text ("Sound familiar?", "So what does this actually look like?")
5. Add honest opinions ("Honestly, most coaching centers get this wrong...", "Here's what nobody tells you...")
6. REMOVE these AI-sounding phrases completely: "In this comprehensive guide", "It's important to note", "Let's dive in", "In conclusion", "Whether you're a...", "In today's world", "Look no further", "Navigate the complexities"
7. Keep all markdown formatting, internal links, headings, and structure intact
8. Keep the same length (800-1500 words) — don't pad or trim significantly
9. The CTAs (mid-post blockquote + closing paragraph) must stay in place and must keep their funnel link. Make them feel personal, but DO NOT soften them into "feel free to contact us" — keep a direct next step ("Book a free consultation", "Run the eligibility check", "Message us on WhatsApp")
10. Do NOT remove or relocate the mid-post blockquote CTA or change its funnel URL.

Return ONLY the rewritten markdown content. No JSON wrapper, no explanation — just the markdown.`,
      messages: [
        {
          role: "user",
          content: `Humanize this blog post:\n\n${postData.content}`,
        },
      ],
    })

    const humanizedContent = humanizeResponse.content.find((c) => c.type === "text")
    if (humanizedContent && humanizedContent.type === "text") {
      postData.content = humanizedContent.text.trim()
    }

    // Ensure slug uniqueness
    const existingSlug = await prisma.blogPost.findUnique({
      where: { slug: postData.slug },
    })
    if (existingSlug) {
      postData.slug = `${postData.slug}-${Date.now().toString(36)}`
    }

    const validProfiles = new Set([
      "nurse",
      "engineer",
      "it",
      "student",
      "visa-seeker",
      "general",
    ])
    const readerProfile =
      postData.readerProfile && validProfiles.has(postData.readerProfile)
        ? postData.readerProfile
        : "general"

    // Post-generation validator. Catches AI drift from the prompt rules
    // (salary ranges, missing mid-post CTA, weak closing CTA). Non-blocking —
    // we save the draft with warnings attached so reviewers see them.
    const warnings = validateBlogContent(postData.content)
    const reviewNotes = formatWarningsAsNote(warnings) || null

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
        published: false,
        approvalStatus: "DRAFT",
        readerProfile,
        reviewNotes,
        author: "Plan Beta",
      },
    })

    return NextResponse.json({
      success: true,
      post: blogPost,
      warnings: warnings.length > 0 ? warnings : undefined,
    })
  } catch (error) {
    console.error("Blog generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate blog post" },
      { status: 500 }
    )
  }
}
