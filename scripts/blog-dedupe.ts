/**
 * Blog post deduplication tool.
 *
 * Identifies duplicate clusters of published BlogPost rows (same target
 * keyword OR fuzzy title overlap), picks a canonical per cluster, and
 * unpublishes the rest. Defaults to dry-run; pass --apply to actually
 * write to the DB.
 *
 * Usage:
 *   npx tsx scripts/blog-dedupe.ts            # dry-run, prints clusters
 *   npx tsx scripts/blog-dedupe.ts --apply    # unpublish duplicates
 *
 * Canonical pick within a cluster (in order of preference):
 *   1. Slug WITHOUT the random `-[a-z0-9]{8}$` suffix (cleaner URL)
 *   2. Newer createdAt (latest content iteration)
 *   3. Longer content (more comprehensive)
 *
 * Unpublished posts are NOT deleted — flip `published: true` to restore.
 */

import "dotenv/config"
import { prisma } from "@/lib/prisma"

const RANDOM_SUFFIX = /-[a-z0-9]{8}$/i

const STOP_WORDS = new Set([
  "germany","german","india","indian","indians","2026","2027","guide","complete",
  "students","your","that","with","from","this","what","about","tips","best",
  "plan","beta","work","jobs","life","real","know","new","the","and","for",
  "course","courses",
])

type Post = {
  id: string
  slug: string
  title: string
  targetKeyword: string | null
  content: string
  createdAt: Date
}

function normalizeKeyword(kw: string | null): string {
  if (!kw) return ""
  return kw.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim()
}

function fuzzyTitleKey(title: string): string {
  const norm = title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
  return norm
    .split(" ")
    .filter((t) => t.length > 3 && !STOP_WORDS.has(t))
    .sort()
    .slice(0, 3)
    .join(" ")
}

function pickCanonical(posts: Post[]): { canonical: Post; losers: Post[] } {
  const sorted = [...posts].sort((a, b) => {
    const aSuffix = RANDOM_SUFFIX.test(a.slug) ? 1 : 0
    const bSuffix = RANDOM_SUFFIX.test(b.slug) ? 1 : 0
    if (aSuffix !== bSuffix) return aSuffix - bSuffix
    if (a.createdAt.getTime() !== b.createdAt.getTime()) {
      return b.createdAt.getTime() - a.createdAt.getTime()
    }
    return b.content.length - a.content.length
  })
  return { canonical: sorted[0], losers: sorted.slice(1) }
}

async function main() {
  const apply = process.argv.includes("--apply")
  const all = await prisma.blogPost.findMany({
    where: { published: true },
    select: { id: true, slug: true, title: true, targetKeyword: true, content: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  })

  console.log(`\n${all.length} published posts loaded\n`)

  const toUnpublish = new Map<string, { post: Post; reason: string }>()

  // Pass A — exact targetKeyword duplicates
  const kwGroups: Record<string, Post[]> = {}
  for (const p of all) {
    const k = normalizeKeyword(p.targetKeyword)
    if (!k) continue
    kwGroups[k] = kwGroups[k] || []
    kwGroups[k].push(p)
  }
  for (const [key, posts] of Object.entries(kwGroups)) {
    if (posts.length < 2) continue
    const { canonical, losers } = pickCanonical(posts)
    console.log(`\n[targetKeyword] "${key}" (${posts.length} posts)`)
    console.log(`  KEEP:      ${canonical.slug}`)
    for (const l of losers) {
      console.log(`  UNPUBLISH: ${l.slug}`)
      toUnpublish.set(l.id, { post: l, reason: `same targetKeyword as ${canonical.slug}` })
    }
  }

  // Pass B — fuzzy title (catches dups where Claude varied targetKeyword strings)
  const titleGroups: Record<string, Post[]> = {}
  for (const p of all) {
    if (toUnpublish.has(p.id)) continue
    const k = fuzzyTitleKey(p.title)
    if (!k) continue
    titleGroups[k] = titleGroups[k] || []
    titleGroups[k].push(p)
  }
  for (const [key, posts] of Object.entries(titleGroups)) {
    if (posts.length < 2) continue
    const { canonical, losers } = pickCanonical(posts)
    console.log(`\n[fuzzy title] "${key}" (${posts.length} posts)`)
    console.log(`  KEEP:      ${canonical.slug} (target=${canonical.targetKeyword})`)
    for (const l of losers) {
      console.log(`  UNPUBLISH: ${l.slug} (target=${l.targetKeyword})`)
      toUnpublish.set(l.id, { post: l, reason: `fuzzy title dup of ${canonical.slug}` })
    }
  }

  console.log(`\n=== ${toUnpublish.size} posts to unpublish ===`)

  if (!apply) {
    console.log("\n(dry run — pass --apply to execute)")
    await prisma.$disconnect()
    return
  }

  for (const [id, { post, reason }] of toUnpublish) {
    await prisma.blogPost.update({ where: { id }, data: { published: false } })
    console.log(`UNPUBLISHED ${post.slug} — ${reason}`)
  }
  console.log(`\nDone. ${toUnpublish.size} posts unpublished. To restore: UPDATE "BlogPost" SET published = true WHERE slug IN (...).`)

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
