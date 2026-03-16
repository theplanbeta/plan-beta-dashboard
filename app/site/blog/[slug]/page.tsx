import { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { generatePageMetadata } from "@/lib/seo"
import {
  ArticleSchema,
  BreadcrumbSchema,
} from "@/components/marketing/SEOStructuredData"
import { marked } from "marked"

// ISR: revalidate every hour
export const revalidate = 3600

export async function generateStaticParams() {
  const posts = await prisma.blogPost.findMany({
    where: { published: true },
    select: { slug: true },
  })
  return posts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await prisma.blogPost.findUnique({
    where: { slug },
    select: {
      title: true,
      excerpt: true,
      metaTitle: true,
      metaDescription: true,
      publishedAt: true,
      updatedAt: true,
      tags: true,
    },
  })

  if (!post) {
    return generatePageMetadata({
      title: "Blog Post Not Found",
      description: "The blog post you are looking for does not exist.",
      path: `/blog/${slug}`,
    })
  }

  return generatePageMetadata({
    title: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt,
    keywords: post.tags,
    path: `/blog/${slug}`,
    type: "article",
  })
}

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

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await prisma.blogPost.findUnique({
    where: { slug, published: true },
  })

  if (!post) {
    notFound()
  }

  // Convert markdown to HTML
  const htmlContent = await marked(post.content)

  // Get related posts (same category, max 3)
  const relatedPosts = await prisma.blogPost.findMany({
    where: {
      published: true,
      category: post.category,
      id: { not: post.id },
    },
    select: {
      slug: true,
      title: true,
      excerpt: true,
      category: true,
      readTime: true,
      publishedAt: true,
    },
    orderBy: { publishedAt: "desc" },
    take: 3,
  })

  const publishedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : ""

  return (
    <div className="bg-[#0a0a0a] min-h-screen">
      <ArticleSchema
        title={post.title}
        description={post.excerpt}
        url={`https://theplanbeta.com/blog/${post.slug}`}
        datePublished={
          post.publishedAt?.toISOString() || post.createdAt.toISOString()
        }
        dateModified={post.updatedAt.toISOString()}
        author={post.author}
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://theplanbeta.com" },
          { name: "Blog", url: "https://theplanbeta.com/blog" },
          {
            name: post.title,
            url: `https://theplanbeta.com/blog/${post.slug}`,
          },
        ]}
      />

      {/* Header */}
      <section className="relative overflow-hidden py-16 border-b border-white/[0.06]">
        <div className="blur-orb absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[80px]" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          <nav className="mb-8 text-sm text-gray-500">
            <Link href="/" className="hover:text-gray-300">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link href="/blog" className="hover:text-gray-300">
              Blog
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-400">{post.title}</span>
          </nav>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
              {CATEGORY_EMOJI[post.category] || "📄"} {post.category}
            </span>
            {publishedDate && (
              <span className="text-gray-500 text-sm">{publishedDate}</span>
            )}
            <span className="text-gray-500 text-sm">
              {post.readTime} min read
            </span>
            <span className="text-gray-500 text-sm">By {post.author}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
            {post.title}
          </h1>
          <p className="mt-6 text-lg text-gray-400">{post.excerpt}</p>
        </div>
      </section>

      {/* Content */}
      <article className="py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="blog-content"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="mt-12 pt-8 border-t border-white/[0.08]">
              <h3 className="text-sm font-medium text-gray-500 mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-white/[0.06] text-gray-400 text-sm rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="py-12 border-t border-white/[0.06]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-white mb-8">
              Related Articles
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {relatedPosts.map((related) => (
                <article
                  key={related.slug}
                  className="bg-white/[0.04] border border-white/[0.08] rounded-xl overflow-hidden hover:border-primary/20 transition-colors"
                >
                  <div className="aspect-video bg-gradient-to-br from-white/[0.06] to-white/[0.03] flex items-center justify-center">
                    <div className="text-4xl">
                      {CATEGORY_EMOJI[related.category] || "📄"}
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="px-2 py-1 bg-white/[0.06] text-gray-400 text-xs font-medium rounded">
                        {related.category}
                      </span>
                      <span className="text-gray-600 text-xs">
                        {related.readTime} min read
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                      {related.title}
                    </h3>
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                      {related.excerpt}
                    </p>
                    <Link
                      href={`/blog/${related.slug}`}
                      className="text-primary text-sm font-medium hover:underline"
                    >
                      Read More
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-16 bg-primary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Ready to Start Your German Journey?
          </h2>
          <p className="text-red-100 mb-8">
            Join thousands of Indian students who have successfully learned
            German with Plan Beta. Start speaking German today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/courses"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-primary text-lg font-semibold rounded-xl hover:bg-gray-100 transition-all"
            >
              View Courses
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white text-lg font-semibold rounded-xl hover:bg-white/10 transition-all"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
