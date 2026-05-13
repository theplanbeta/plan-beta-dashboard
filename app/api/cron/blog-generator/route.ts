import { NextRequest, NextResponse } from "next/server"
import { verifyCronSecret } from "@/lib/api-permissions"
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"
import { validateBlogContent, formatWarningsAsNote } from "@/lib/blog-validator"

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

  // Get ALL existing post titles + targetKeywords to avoid repetition.
  // Was take:20 — but evergreen topics ("Blue Card 2026", "Chancenkarte")
  // get re-suggested every few weeks and slipped past the small window,
  // creating duplicate clusters that cannibalise each other in SERPs.
  const recentPosts = await prisma.blogPost.findMany({
    where: { published: true },
    select: { title: true, targetKeyword: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  })
  const recentTitles = recentPosts.map((p) => p.title).join("; ")
  const recentKeywords = Array.from(
    new Set(recentPosts.map((p) => p.targetKeyword).filter(Boolean))
  ).join(", ")

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

  const avoidance = `\n\nAvoid topics already covered (titles): ${recentTitles}\nAvoid these target keywords (already used): ${recentKeywords}\n\nPick a substantively different angle — not a re-phrasing of any of the above.`

  const topicPrompts: Record<string, string> = {
    Career: `career opportunities in Germany for Indian professionals${trendingProfession ? `, especially in ${trendingProfession}` : ""}${trendingLocation ? ` in ${trendingLocation}` : ""}.${avoidance}`,
    "Learning Tips": `practical tips for learning German efficiently.${avoidance}`,
    "Exam Prep": `preparing for German language exams (Goethe, telc).${avoidance}`,
    "Visa & Immigration": `German visa processes and immigration tips, ${seasonalContext}.${avoidance}`,
    "Student Life": `life in Germany for Indian students, ${seasonalContext}.${avoidance}`,
    "Job Market": `German job market trends${trendingProfession ? `, demand for ${trendingProfession}` : ""}${trendingLocation ? ` in ${trendingLocation}` : ""}.${avoidance}`,
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
2. Close the post with a direct CTA paragraph (NOT a bullet list) that names the reader's situation, the specific next step, and includes the funnel link. Use direct phrasings ("Book a free consultation", "Run the eligibility check", "Message us on WhatsApp") — NOT soft phrasings like "feel free to contact us".

## Voice & Tone
- Write like a knowledgeable friend talking over chai — conversational Indian English, not formal or slangy
- Include 1-2 student anecdotes ("One of our students from Kochi...", "A common thing we hear from our B1 batch...")
- Add rhetorical questions to break up text ("Sound familiar?", "So what does this actually look like?")
- Add honest opinions ("Honestly, most coaching centers get this wrong...", "Here's what nobody tells you...")
- Use concrete details (real timelines, specific German cities, named institutions). Do NOT quote salary ranges or income figures; if a topic calls for salary discussion, describe it qualitatively ("competitive", "varies by state and experience") and steer the reader toward consulting Plan Beta. Single legal thresholds (e.g. EU Blue Card minimum) are OK.
- NEVER use these phrases: "In this comprehensive guide", "It's important to note", "Let's dive in", "In conclusion", "Whether you're a...", "In today's world", "Look no further", "Navigate the complexities"

## Structure
- 800-1500 words in English
- Use ## and ### headings, bullet points, numbered lists
- Include target keyword "${targetKeyword}" naturally 3-5 times
- Internal links (use markdown):
  - [German courses](/courses) — learning German
  - [student jobs in Germany](/jobs/student-jobs) — student work
  - [nursing programs with Plan Beta](/nurses) — nursing careers (this is the consultation funnel, NOT a job board)
  - [contact us](/contact) — taking action
  - [German classes in Kerala](/german-classes/kochi) — local classes
  - [Germany eligibility quiz](/germany-pathway) — when discussing visas or pathways
- Reference real German institutions (Goethe-Institut, DAAD, etc.)

Respond with valid JSON only (no markdown code fences):
{
  "title": "SEO-optimized blog post title (60-70 chars ideal)",
  "slug": "url-friendly-slug-with-hyphens",
  "excerpt": "1-2 sentence compelling summary (150-160 chars)",
  "content": "Full markdown content — MUST include the mid-post blockquote CTA and a direct closing CTA paragraph",
  "category": "${category}",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "targetKeyword": "${targetKeyword}",
  "metaTitle": "SEO meta title (50-60 chars)",
  "metaDescription": "SEO meta description (150-160 chars)",
  "readTime": estimated_read_time_in_minutes_as_number,
  "readerProfile": "nurse | engineer | it | student | visa-seeker | general — the single profile this post converts for"
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

    // --- Dedup check: verify generated post doesn't overlap with ANY published post ---
    const recentForDedup = await prisma.blogPost.findMany({
      where: { published: true },
      select: { title: true, targetKeyword: true, slug: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    })

    // Pass A: exact targetKeyword match — strongest signal
    const normalize = (s: string | null) =>
      (s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim()
    const generatedKeyword = normalize(postData.targetKeyword || targetKeyword)
    const keywordCollision = recentForDedup.find(
      (p) => normalize(p.targetKeyword) === generatedKeyword && generatedKeyword.length > 0
    )
    if (keywordCollision) {
      console.log(`[BlogCron] Skipped — same targetKeyword as ${keywordCollision.slug}: "${postData.title}"`)
      return NextResponse.json({ skipped: true, reason: "targetKeyword already used", existing: keywordCollision.slug, title: postData.title })
    }

    // Pass B: fuzzy title overlap (against ALL published posts, not just last 20)
    const generatedTitle = postData.title.toLowerCase()
    const stopWords = new Set(["germany", "german", "india", "indian", "indians", "2026", "2027", "guide", "complete", "students", "your", "that", "with", "from", "this", "what", "about", "tips", "best", "plan", "beta", "work", "jobs", "life", "real", "know"])
    const titleWords = generatedTitle.split(/\s+/).filter((w: string) => w.length > 3 && !stopWords.has(w))

    const dupTitle = titleWords.length > 0 && recentForDedup.find((p) => {
      const existingTitle = p.title.toLowerCase()
      const matchCount = titleWords.filter((w: string) => existingTitle.includes(w)).length
      return matchCount >= Math.ceil(titleWords.length * 0.6)
    })

    if (dupTitle) {
      console.log(`[BlogCron] Skipped — fuzzy title dup of ${dupTitle.slug}: "${postData.title}"`)
      return NextResponse.json({ skipped: true, reason: "fuzzy title duplicate", existing: dupTitle.slug, title: postData.title })
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
        // Marketing now reviews every cron-generated post before it goes live.
        // Cron creates the draft; a human must approve in the dashboard.
        published: false,
        approvalStatus: "PENDING_REVIEW",
        submittedAt: new Date(),
        submittedBy: "cron@planbeta",
        readerProfile,
        reviewNotes,
        author: "Plan Beta",
      },
    })

    console.log(`Blog draft generated for review: "${blogPost.title}" [${blogPost.slug}]`)

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
