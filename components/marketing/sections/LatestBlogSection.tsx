import Link from "next/link"
import { prisma } from "@/lib/prisma"

async function getLatestPosts() {
  try {
    return await prisma.blogPost.findMany({
      where: { published: true },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: {
        slug: true,
        title: true,
        excerpt: true,
        category: true,
        readTime: true,
        publishedAt: true,
      },
    })
  } catch {
    return []
  }
}

export async function LatestBlogSection() {
  const posts = await getLatestPosts()
  if (posts.length === 0) return null

  return (
    <section className="relative py-20 sm:py-24 bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">
              Blog
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Latest Guides & Tips
            </h2>
          </div>
          <Link
            href="/blog"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            View all &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 hover:bg-white/[0.04] hover:border-white/[0.15] transition-all"
            >
              <span className="inline-block px-2.5 py-0.5 text-[11px] font-medium rounded-full bg-white/[0.06] text-gray-400 mb-4">
                {post.category}
              </span>
              <h3 className="text-base font-semibold text-white mb-2 group-hover:text-primary transition-colors line-clamp-2">
                {post.title}
              </h3>
              <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                {post.excerpt}
              </p>
              <span className="text-xs text-gray-600">
                {post.readTime} min read
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
