import Link from "next/link"
import { generatePageMetadata, TARGET_KEYWORDS } from "@/lib/seo"
import { BreadcrumbSchema } from "@/components/marketing/SEOStructuredData"
import { prisma } from "@/lib/prisma"

export const metadata = generatePageMetadata({
  title: "Blog | Plan Beta - German Learning Tips & Career Advice",
  description:
    "Read our latest articles on learning German, career opportunities in Germany, exam preparation tips, and success stories from our students.",
  keywords: TARGET_KEYWORDS.blog,
  path: "/blog",
})

export const revalidate = 300 // 5 min — new posts appear quickly

const CATEGORY_EMOJI: Record<string, string> = {
  Career: "💼",
  Healthcare: "🏥",
  Engineering: "⚙️",
  "Visa & Immigration": "✈️",
  "Learning Tips": "💡",
  "Exam Prep": "📝",
  "Student Life": "🎓",
  "Job Market": "📊",
}

export default async function BlogPage() {
  const [posts, categoryCounts] = await Promise.all([
    prisma.blogPost.findMany({
      where: { published: true },
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        category: true,
        readTime: true,
        published: true,
        featured: true,
        publishedAt: true,
        author: true,
      },
      orderBy: { publishedAt: { sort: "desc", nulls: "last" } },
    }),
    prisma.blogPost.groupBy({
      by: ["category"],
      where: { published: true },
      _count: { id: true },
    }),
  ])

  // Build category list
  const categoryMap: Record<string, number> = {}
  for (const c of categoryCounts) {
    categoryMap[c.category] = c._count.id
  }
  const categories = [
    { name: "All", count: posts.length },
    ...Object.entries(categoryMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count })),
  ]

  // Featured post: first featured post, or first post
  const featuredPost = posts.find((p) => p.featured) || posts[0]
  const gridPosts = posts.filter((p) => p.id !== featuredPost?.id)

  const formatDate = (date: Date | null) => {
    if (!date) return ""
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://theplanbeta.com" },
          { name: "Blog", url: "https://theplanbeta.com/blog" },
        ]}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#0a0a0a] py-16">
        <div className="blur-orb absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[80px]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              Plan Beta <span className="text-primary">Blog</span>
            </h1>
            <p className="text-xl text-gray-400">
              Tips for learning German, career advice, exam preparation
              strategies, and inspiring success stories.
            </p>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-8 bg-[#0a0a0a] border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((category, idx) => (
              <span
                key={category.name}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  idx === 0
                    ? "bg-primary text-white"
                    : "bg-white/[0.06] text-gray-400 hover:bg-white/[0.1]"
                }`}
              >
                {category.name} ({category.count})
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="py-16 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {posts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-400 text-lg">
                No blog posts yet. Check back soon!
              </p>
            </div>
          ) : (
            <>
              {/* Featured Post */}
              {featuredPost && (
                <div className="mb-16">
                  <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden">
                    <div className="grid lg:grid-cols-2 gap-8">
                      <div className="aspect-video lg:aspect-auto bg-gradient-to-br from-white/[0.06] to-white/[0.03] flex items-center justify-center">
                        <div className="text-6xl">
                          {CATEGORY_EMOJI[featuredPost.category] || "📚"}
                        </div>
                      </div>
                      <div className="p-8 lg:py-12">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
                            Featured
                          </span>
                          <span className="text-gray-500 text-sm">
                            {formatDate(featuredPost.publishedAt)}
                          </span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                          {featuredPost.title}
                        </h2>
                        <p className="text-gray-400 mb-6">
                          {featuredPost.excerpt}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">
                            {featuredPost.readTime} min read
                          </span>
                          <Link
                            href={`/blog/${featuredPost.slug}`}
                            className="inline-flex items-center text-primary font-semibold hover:underline"
                          >
                            Read More
                            <svg
                              className="w-4 h-4 ml-1"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 8l4 4m0 0l-4 4m4-4H3"
                              />
                            </svg>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Post Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {gridPosts.map((post) => (
                  <article
                    key={post.id}
                    className="bg-white/[0.04] border border-white/[0.08] rounded-xl overflow-hidden hover:border-primary/20 transition-colors"
                  >
                    <div className="aspect-video bg-gradient-to-br from-white/[0.06] to-white/[0.03] flex items-center justify-center">
                      <div className="text-4xl">
                        {CATEGORY_EMOJI[post.category] || "📄"}
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="px-2 py-1 bg-white/[0.06] text-gray-400 text-xs font-medium rounded">
                          {post.category}
                        </span>
                        <span className="text-gray-600 text-xs">
                          {formatDate(post.publishedAt)}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {post.readTime} min read
                        </span>
                        <Link
                          href={`/blog/${post.slug}`}
                          className="text-primary text-sm font-medium hover:underline"
                        >
                          Read More
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-16 bg-[#111]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Stay Updated</h2>
          <p className="text-gray-400 mb-8">
            Get the latest articles, learning tips, and course updates delivered
            to your inbox.
          </p>
          <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 bg-[#1a1a1a] border border-white/[0.1] rounded-lg text-white placeholder:text-gray-600 focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors"
            >
              Subscribe
            </button>
          </form>
          <p className="text-sm text-gray-500 mt-4">
            No spam. Unsubscribe anytime.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Ready to Start Learning?
          </h2>
          <p className="text-red-100 mb-8">
            Put what you&apos;ve learned into practice. Join our next batch and
            start speaking German.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center px-8 py-4 bg-white text-primary text-lg font-semibold rounded-xl hover:bg-gray-100 transition-all"
          >
            Contact Us
          </Link>
        </div>
      </section>
    </div>
  )
}
