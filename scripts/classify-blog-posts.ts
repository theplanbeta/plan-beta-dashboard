/**
 * Bulk-classify existing blog posts into one of the 6 reader profiles so the
 * profile-matched conversion CTAs in /blog/[slug] start working on the back
 * catalog (instead of falling through to the "general" CTA).
 *
 * Usage:
 *   npx tsx scripts/classify-blog-posts.ts                 # dry run, prints diff
 *   npx tsx scripts/classify-blog-posts.ts --apply         # writes updates
 *   npx tsx scripts/classify-blog-posts.ts --apply --all   # re-classifies even non-general posts
 *
 * Preflight: requires `npx prisma db push` to have run so the readerProfile
 * column exists, and ANTHROPIC_API_KEY in the local env.
 *
 * The script is resumable: every successful classification is written to
 * .classify-checkpoint.json. Re-running picks up where it left off.
 */
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"
import { readFileSync, writeFileSync, existsSync } from "fs"

const CHECKPOINT_FILE = ".classify-checkpoint.json"
const RATE_LIMIT_MS = 1000

type ProfileResult = {
  profile: "nurse" | "engineer" | "it" | "student" | "visa-seeker" | "general"
  confidence: "low" | "medium" | "high"
  rationale: string
}

const VALID_PROFILES = new Set([
  "nurse",
  "engineer",
  "it",
  "student",
  "visa-seeker",
  "general",
])

function loadCheckpoint(): Record<string, ProfileResult> {
  if (!existsSync(CHECKPOINT_FILE)) return {}
  try {
    return JSON.parse(readFileSync(CHECKPOINT_FILE, "utf-8"))
  } catch {
    return {}
  }
}

function saveCheckpoint(data: Record<string, ProfileResult>) {
  writeFileSync(CHECKPOINT_FILE, JSON.stringify(data, null, 2))
}

async function preflight(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY not set. Put it in .env.local and re-run.")
    process.exit(1)
  }
  try {
    // Probe that the readerProfile column exists. Throws if `db push` hasn't run.
    await prisma.blogPost.findFirst({ select: { readerProfile: true } })
  } catch (err) {
    console.error(
      "readerProfile column missing. Run `npx prisma db push` first, then retry."
    )
    console.error(err)
    process.exit(1)
  }
}

async function classifyOne(
  client: Anthropic,
  post: {
    id: string
    slug: string
    title: string
    excerpt: string
    tags: string[]
    category: string
    targetKeyword: string | null
  }
): Promise<ProfileResult> {
  const userMsg = `Classify this Plan Beta blog post into ONE reader profile.

Title: ${post.title}
Category: ${post.category}
Target keyword: ${post.targetKeyword || "(none)"}
Tags: ${post.tags.join(", ") || "(none)"}
Excerpt: ${post.excerpt}

Profiles:
- nurse: BSc/GNM nurses considering Germany. Funnels to WhatsApp consultation about hospital placement.
- engineer: Mechanical/electrical/civil engineers eyeing the EU Blue Card. Funnels to eligibility quiz.
- it: Software developers, IT professionals targeting Berlin/Munich tech roles. Funnels to WhatsApp planning call.
- student: University students preparing for or already in German studies. Funnels to live A1-B2 batches.
- visa-seeker: Readers researching German visa types/processes broadly (not profession-specific). Funnels to eligibility quiz.
- general: None of the above clearly applies — broad audience like "learning German tips".

Respond ONLY with JSON: {"profile":"...","confidence":"low|medium|high","rationale":"one short sentence"}`

  const resp = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 256,
    messages: [{ role: "user", content: userMsg }],
  })

  const text = resp.content.find((c) => c.type === "text")
  if (!text || text.type !== "text") {
    throw new Error("No text in Claude response")
  }

  // Strip code fences if Claude added them despite instruction
  const cleaned = text.text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")

  const parsed = JSON.parse(cleaned) as ProfileResult
  if (!VALID_PROFILES.has(parsed.profile)) {
    throw new Error(`Invalid profile from model: ${parsed.profile}`)
  }
  if (!["low", "medium", "high"].includes(parsed.confidence)) {
    parsed.confidence = "low"
  }
  return parsed
}

async function main() {
  const args = process.argv.slice(2)
  const apply = args.includes("--apply")
  const reclassifyAll = args.includes("--all")

  await preflight()

  const where = reclassifyAll
    ? { published: true }
    : { published: true, readerProfile: "general" }

  const posts = await prisma.blogPost.findMany({
    where,
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      tags: true,
      category: true,
      targetKeyword: true,
      readerProfile: true,
    },
    orderBy: { publishedAt: "desc" },
  })

  console.log(
    `\nFound ${posts.length} post(s) to classify${apply ? " (will WRITE)" : " (dry-run)"}.\n`
  )
  if (posts.length === 0) {
    process.exit(0)
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  const checkpoint = loadCheckpoint()
  const results: Array<{ post: typeof posts[number]; result: ProfileResult }> =
    []

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i]
    const cached = checkpoint[post.id]
    let result: ProfileResult

    if (cached) {
      result = cached
      process.stdout.write(`[${i + 1}/${posts.length}] (cached) ${post.slug}\n`)
    } else {
      try {
        result = await classifyOne(client, post)
      } catch (err) {
        console.error(`[${i + 1}/${posts.length}] FAILED: ${post.slug}`, err)
        continue
      }
      checkpoint[post.id] = result
      saveCheckpoint(checkpoint)
      process.stdout.write(
        `[${i + 1}/${posts.length}] ${result.profile.padEnd(12)} ${result.confidence.padEnd(6)} ${post.slug}\n`
      )
      await new Promise((r) => setTimeout(r, RATE_LIMIT_MS))
    }
    results.push({ post, result })
  }

  console.log("\n=== Summary ===")
  const counts: Record<string, number> = {}
  for (const { result } of results) {
    const key = `${result.profile}/${result.confidence}`
    counts[key] = (counts[key] || 0) + 1
  }
  for (const [k, v] of Object.entries(counts).sort()) {
    console.log(`  ${k.padEnd(20)} ${v}`)
  }

  const writable = results.filter(({ result }) => result.confidence !== "low")
  console.log(
    `\n${writable.length}/${results.length} classifications meet confidence threshold (medium+).`
  )

  if (!apply) {
    console.log("\nDry run complete. Re-run with --apply to write changes.")
    process.exit(0)
  }

  console.log(`\nApplying ${writable.length} updates...`)
  let updated = 0
  for (const { post, result } of writable) {
    if (post.readerProfile === result.profile) continue
    try {
      await prisma.blogPost.update({
        where: { id: post.id },
        data: { readerProfile: result.profile },
      })
      updated++
    } catch (err) {
      console.error(`Update failed for ${post.slug}:`, err)
    }
  }
  console.log(`Done. ${updated} posts updated.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
