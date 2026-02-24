import Link from "next/link"
import { generatePageMetadata, TARGET_KEYWORDS } from "@/lib/seo"
import { BreadcrumbSchema } from "@/components/marketing/SEOStructuredData"

export const metadata = generatePageMetadata({
  title: "Blog | Plan Beta - German Learning Tips & Career Advice",
  description:
    "Read our latest articles on learning German, career opportunities in Germany, exam preparation tips, and success stories from our students.",
  keywords: TARGET_KEYWORDS.blog,
  path: "/site/blog",
})

// Blog posts data (in a real app, this would come from a CMS or database)
const blogPosts = [
  {
    id: "impact-of-learning-german-tourism-hospitality",
    title: "The Impact of Learning German on Tourism and Hospitality Careers in Germany",
    excerpt: "Explore how German language proficiency enables career opportunities in Germany's tourism and hospitality sector, highlighting the nation's rich cultural heritage and world-renowned hospitality.",
    date: "June 4, 2024",
    category: "Career",
    readTime: "5 min read",
    image: "/blog/tourism.jpg",
  },
  {
    id: "healthcare-opportunities-germany",
    title: "Healthcare Opportunities in Germany: How Your Language Skills Can Make a Difference",
    excerpt: "Discover how medical professionals can leverage German language abilities to advance healthcare careers in Germany's renowned healthcare system.",
    date: "May 30, 2024",
    category: "Healthcare",
    readTime: "6 min read",
    image: "/blog/healthcare.jpg",
  },
  {
    id: "german-skills-engineering-career",
    title: "The Role of German Language Skills in Advancing Your Engineering Career in Germany",
    excerpt: "Learn how German language proficiency opens doors for engineers in one of the world's leading industrial nations.",
    date: "April 29, 2024",
    category: "Engineering",
    readTime: "5 min read",
    image: "/blog/engineering.jpg",
  },
  {
    id: "navigating-visa-requirements",
    title: "Navigating Visa Requirements: Your Guide to Working or Studying in Germany",
    excerpt: "A comprehensive guide to visa procedures for those planning to relocate to Germany for employment or education purposes.",
    date: "April 23, 2024",
    category: "Visa & Immigration",
    readTime: "8 min read",
    image: "/blog/visa.jpg",
  },
  {
    id: "power-of-persistence-language-learning",
    title: "The Power of Persistence: How Consistency Leads to Language Learning Success",
    excerpt: "Discover why dedication and consistent practice are essential for mastering German and achieving your language learning goals.",
    date: "March 30, 2024",
    category: "Learning Tips",
    readTime: "4 min read",
    image: "/blog/persistence.jpg",
  },
  {
    id: "goethe-zertifikat-preparation-strategies",
    title: "A Pathway to Success: Ace the Goethe-Zertifikat with These Preparation Strategies",
    excerpt: "Expert preparation techniques for the Goethe-Zertifikat exam, the gold standard for German language proficiency certification.",
    date: "March 19, 2024",
    category: "Exam Prep",
    readTime: "7 min read",
    image: "/blog/goethe.jpg",
  },
]

const categories = [
  { name: "All", count: blogPosts.length },
  { name: "Career", count: 3 },
  { name: "Learning Tips", count: 2 },
  { name: "Exam Prep", count: 1 },
  { name: "Visa & Immigration", count: 1 },
]

export default function BlogPage() {
  return (
    <div>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://planbeta.in/site" },
          { name: "Blog", url: "https://planbeta.in/site/blog" },
        ]}
      />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-50 via-white to-red-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Plan Beta <span className="text-primary">Blog</span>
            </h1>
            <p className="text-xl text-gray-600">
              Tips for learning German, career advice, exam preparation strategies, and inspiring success stories.
            </p>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-8 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((category) => (
              <button
                key={category.name}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  category.name === "All"
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {category.name} ({category.count})
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Featured Post */}
          <div className="mb-16">
            <div className="bg-gray-50 rounded-2xl overflow-hidden">
              <div className="grid lg:grid-cols-2 gap-8">
                <div className="aspect-video lg:aspect-auto bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                  <div className="text-6xl">📚</div>
                </div>
                <div className="p-8 lg:py-12">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
                      Featured
                    </span>
                    <span className="text-gray-500 text-sm">{blogPosts[0].date}</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                    {blogPosts[0].title}
                  </h2>
                  <p className="text-gray-600 mb-6">{blogPosts[0].excerpt}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{blogPosts[0].readTime}</span>
                    <Link
                      href={`/blog/${blogPosts[0].id}`}
                      className="inline-flex items-center text-primary font-semibold hover:underline"
                    >
                      Read More
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Post Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.slice(1).map((post) => (
              <article
                key={post.id}
                className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <div className="text-4xl">
                    {post.category === "Healthcare" && "🏥"}
                    {post.category === "Engineering" && "⚙️"}
                    {post.category === "Visa & Immigration" && "✈️"}
                    {post.category === "Learning Tips" && "💡"}
                    {post.category === "Exam Prep" && "📝"}
                    {post.category === "Career" && "💼"}
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                      {post.category}
                    </span>
                    <span className="text-gray-400 text-xs">{post.date}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{post.excerpt}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{post.readTime}</span>
                    <Link
                      href={`/blog/${post.id}`}
                      className="text-primary text-sm font-medium hover:underline"
                    >
                      Read More
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Load More */}
          <div className="text-center mt-12">
            <button className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors">
              Load More Articles
            </button>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Stay Updated</h2>
          <p className="text-gray-600 mb-8">
            Get the latest articles, learning tips, and course updates delivered to your inbox.
          </p>
          <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
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
            Put what you&apos;ve learned into practice. Join our next batch and start speaking German.
          </p>
          <Link
            href="/site/contact"
            className="inline-flex items-center justify-center px-8 py-4 bg-white text-primary text-lg font-semibold rounded-xl hover:bg-gray-100 transition-all"
          >
            Book Free Trial
          </Link>
        </div>
      </section>
    </div>
  )
}
