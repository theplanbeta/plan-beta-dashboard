import Link from "next/link"
import { generatePageMetadata } from "@/lib/seo"
import { BreadcrumbSchema, OrganizationSchema } from "@/components/marketing/SEOStructuredData"

export const metadata = generatePageMetadata({
  title: "About Us | Plan Beta - Kerala's Premier German Language Institute",
  description:
    "Learn about Plan Beta's mission to help Keralites achieve their German dreams. Discover our story, our team, and what makes us different.",
  path: "/site/about",
})

const team = [
  {
    name: "Founder & Lead Instructor",
    role: "German Language Expert",
    bio: "With years of experience teaching German and helping students transition to life in Germany, our founder started Plan Beta with a simple mission: make quality German education accessible to everyone in Kerala.",
    image: "/team/founder.jpg",
  },
]

const values = [
  {
    icon: "heart",
    title: "Student-First Approach",
    description: "Every decision we make starts with one question: Will this help our students succeed?",
  },
  {
    icon: "target",
    title: "Results-Oriented",
    description: "We measure our success by your success. Our 95% exam pass rate speaks for itself.",
  },
  {
    icon: "users",
    title: "Community",
    description: "Join a supportive community of learners, all working towards similar goals.",
  },
  {
    icon: "globe",
    title: "Global Perspective",
    description: "We don't just teach German - we prepare you for life and work in Germany.",
  },
]

const milestones = [
  { year: "2020", event: "Plan Beta founded with just 10 students" },
  { year: "2021", event: "First batch of students move to Germany" },
  { year: "2022", event: "Launched self-paced courses in Malayalam" },
  { year: "2023", event: "Reached 1,000 students milestone" },
  { year: "2024", event: "Introduced mentorship program with Germany-based professionals" },
  { year: "2025", event: "2,500+ students trained, 500+ now in Germany" },
]

export default function AboutPage() {
  return (
    <div>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://planbeta.in/site" },
          { name: "About", url: "https://planbeta.in/site/about" },
        ]}
      />
      <OrganizationSchema />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-50 via-white to-red-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Helping Keralites Build Their <span className="text-primary">German Dream</span>
            </h1>
            <p className="text-xl text-gray-600">
              We started Plan Beta because we believe that language shouldn&apos;t be a barrier to opportunity.
              Today, we&apos;re Kerala&apos;s most trusted German language institute.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            <div>
              <div className="text-4xl font-bold">2,500+</div>
              <div className="text-red-100">Students Trained</div>
            </div>
            <div>
              <div className="text-4xl font-bold">500+</div>
              <div className="text-red-100">Now in Germany</div>
            </div>
            <div>
              <div className="text-4xl font-bold">95%</div>
              <div className="text-red-100">Exam Pass Rate</div>
            </div>
            <div>
              <div className="text-4xl font-bold">5</div>
              <div className="text-red-100">Years of Excellence</div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Story</h2>
              <div className="space-y-4 text-gray-600">
                <p>
                  Plan Beta was born from a simple observation: talented, hardworking people in Kerala
                  were missing out on life-changing opportunities in Germany simply because they
                  couldn&apos;t access quality German language education.
                </p>
                <p>
                  Traditional language institutes were expensive, inflexible, and often ineffective.
                  Self-study apps lacked the personal touch needed to truly master a new language.
                  There had to be a better way.
                </p>
                <p>
                  In 2020, we launched Plan Beta with our first batch of just 10 students. Our approach
                  was different: small batch sizes, instructors who understood the specific challenges
                  Malayalam speakers face when learning German, and a curriculum designed around real
                  exam requirements.
                </p>
                <p>
                  Five years later, over 2,500 students have trusted us with their German journey.
                  More than 500 of our alumni are now living and working in Germany - as nurses,
                  engineers, IT professionals, and more.
                </p>
                <p className="font-medium text-gray-900">
                  But we&apos;re just getting started. Our mission remains the same: to help every
                  determined Keralite unlock opportunities in Germany through quality German education.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="text-8xl mb-4">🎓</div>
                  <p className="text-xl font-semibold text-gray-900">Transforming Lives</p>
                  <p className="text-gray-600 mt-2">One student at a time</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What We Stand For</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our values guide everything we do at Plan Beta.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div key={index} className="bg-white rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  {value.icon === "heart" && (
                    <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  )}
                  {value.icon === "target" && (
                    <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  )}
                  {value.icon === "users" && (
                    <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  )}
                  {value.icon === "globe" && (
                    <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{value.title}</h3>
                <p className="text-gray-600 text-sm">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Journey</h2>
            <p className="text-xl text-gray-600">
              From a small beginning to Kerala&apos;s leading German institute.
            </p>
          </div>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 md:left-1/2 md:-ml-0.5" />

            <div className="space-y-12">
              {milestones.map((milestone, index) => (
                <div
                  key={index}
                  className={`relative flex items-center ${
                    index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                  }`}
                >
                  {/* Dot */}
                  <div className="absolute left-4 md:left-1/2 w-4 h-4 bg-primary rounded-full -ml-2 md:-ml-2" />

                  {/* Content */}
                  <div
                    className={`ml-12 md:ml-0 md:w-1/2 ${
                      index % 2 === 0 ? "md:pr-12 md:text-right" : "md:pl-12"
                    }`}
                  >
                    <div className="bg-gray-50 rounded-xl p-6">
                      <div className="text-primary font-bold text-lg mb-1">{milestone.year}</div>
                      <div className="text-gray-700">{milestone.event}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* What Makes Us Different */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Why Students Choose Plan Beta</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              We&apos;re not just another language school. Here&apos;s what makes us different.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-800 rounded-xl p-8">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold mb-3">Exam-Focused Curriculum</h3>
              <p className="text-gray-400">
                Our courses are designed specifically to help you pass Goethe-Institut exams.
                95% of our students pass on their first attempt.
              </p>
            </div>
            <div className="bg-gray-800 rounded-xl p-8">
              <div className="text-4xl mb-4">🗣️</div>
              <h3 className="text-xl font-semibold mb-3">Malayalam Support</h3>
              <p className="text-gray-400">
                We understand the specific challenges Malayalam speakers face when learning German.
                Our instructors explain complex concepts in your native language.
              </p>
            </div>
            <div className="bg-gray-800 rounded-xl p-8">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-xl font-semibold mb-3">Small Batch Sizes</h3>
              <p className="text-gray-400">
                Maximum 15 students per batch ensures personal attention and more speaking practice
                for everyone.
              </p>
            </div>
            <div className="bg-gray-800 rounded-xl p-8">
              <div className="text-4xl mb-4">📹</div>
              <h3 className="text-xl font-semibold mb-3">Recorded Classes</h3>
              <p className="text-gray-400">
                Miss a class? No problem. All live classes are recorded and available within
                24 hours for you to review.
              </p>
            </div>
            <div className="bg-gray-800 rounded-xl p-8">
              <div className="text-4xl mb-4">🌍</div>
              <h3 className="text-xl font-semibold mb-3">Beyond Language</h3>
              <p className="text-gray-400">
                We prepare you for life in Germany, not just the language. Our mentorship program
                connects you with professionals already there.
              </p>
            </div>
            <div className="bg-gray-800 rounded-xl p-8">
              <div className="text-4xl mb-4">💪</div>
              <h3 className="text-xl font-semibold mb-3">Proven Results</h3>
              <p className="text-gray-400">
                500+ of our alumni are now living and working in Germany. Their success is our
                greatest achievement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready to Start Your Journey?
          </h2>
          <p className="text-xl text-red-100 mb-8">
            Join the 2,500+ students who have trusted Plan Beta with their German dreams.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/site/contact"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-primary text-lg font-semibold rounded-xl hover:bg-gray-100 transition-all"
            >
              Book Free Trial
            </Link>
            <Link
              href="/site/courses"
              className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white text-lg font-semibold rounded-xl hover:bg-white/10 transition-all"
            >
              Explore Courses
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
