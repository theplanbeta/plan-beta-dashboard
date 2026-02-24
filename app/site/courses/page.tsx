import Link from "next/link"
import { generatePageMetadata, TARGET_KEYWORDS } from "@/lib/seo"
import { BreadcrumbSchema, CourseSchema } from "@/components/marketing/SEOStructuredData"
import { prisma } from "@/lib/prisma"
import { COURSE_PRICING, COURSE_INFO } from "@/lib/pricing"

export const metadata = generatePageMetadata({
  title: "German Language Courses | Plan Beta - A1, A2, B1 Levels",
  description:
    "Explore our German language courses for all levels. From beginner A1 to intermediate B1, find the perfect course to achieve your German language goals.",
  keywords: TARGET_KEYWORDS.courses,
  path: "/site/courses",
})

// External links
const SHOPIFY_BASE = "https://planbeta.in"
const THINKIFIC_LOGIN = "https://courses.planbeta.in/users/sign_in"

const a1Foundation = {
  id: "a1-foundation",
  title: "German A1 Foundation",
  subtitle: "Self-Paced Learning in Malayalam",
  description: "Learn at your own pace with our comprehensive A1 course designed for Malayalam speakers. Perfect if you prefer flexibility over fixed schedules.",
  price: 10000,
  originalPrice: 12500,
  duration: "3 months access",
  level: "Beginner",
  features: [
    "50+ video lessons",
    "Downloadable materials",
    "Practice exercises",
    "Malayalam explanations",
    "Lifetime access to updates",
    "Certificate on completion",
  ],
  shopifyUrl: `${SHOPIFY_BASE}/products/clear-german-a1-the-foundation-malayalam`,
}

export default async function CoursesPage() {
  // Fetch live batch data from database (Server Component — no API call needed)
  // Only show FILLING batches with future start dates
  const now = new Date()
  const batches = await prisma.batch.findMany({
    where: {
      status: "FILLING",
      startDate: { gt: now },
    },
    select: {
      id: true,
      batchCode: true,
      level: true,
      status: true,
      totalSeats: true,
      startDate: true,
      schedule: true,
      timing: true,
      _count: {
        select: {
          students: { where: { completionStatus: { in: ["ACTIVE", "COMPLETED"] } } },
        },
      },
    },
    orderBy: [{ status: "asc" }, { startDate: "asc" }],
  })

  const liveBatches = batches.map((batch) => {
    const levelKey = batch.level as keyof typeof COURSE_PRICING
    const pricing = COURSE_PRICING[levelKey]
    const info = COURSE_INFO[levelKey]
    const enrolled = batch._count.students
    const available = Math.max(0, batch.totalSeats - enrolled)

    return { ...batch, pricing, info, enrolled, available }
  })

  return (
    <div>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://planbeta.in/site" },
          { name: "Courses", url: "https://planbeta.in/site/courses" },
        ]}
      />
      <CourseSchema
        name="German A1 Foundation - Self-Paced in Malayalam"
        description="Comprehensive beginner German course with 50+ video lessons in Malayalam. Learn at your own pace."
        url="https://planbeta.in/site/courses"
        duration="3 months"
        level="Beginner"
        rating={4.8}
        reviewCount={500}
      />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-50 via-white to-red-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Find Your Perfect <span className="text-primary">German Course</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Whether you&apos;re a complete beginner or looking to advance, we have the right course for your goals and schedule.
            </p>

            <a
              href={THINKIFIC_LOGIN}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
            >
              Already enrolled? Log in
            </a>
          </div>
        </div>
      </section>

      {/* Live Batch Courses — Dynamic from Dashboard */}
      {liveBatches.length > 0 && (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Live Batch Courses
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Join a live class with experienced teachers. Small groups of max 10 students for personalized attention. Mon–Fri schedule.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {liveBatches.map((batch) => (
                <div
                  key={batch.id}
                  className="relative bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                >
                  {/* Status badge */}
                  <div className="absolute top-4 right-4">
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                      Enrolling Now
                    </span>
                  </div>

                  <div className="p-6">
                    {/* Level indicator */}
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: batch.info?.color || "#6b7280" }}
                      />
                      <span className="text-sm text-gray-500">{batch.batchCode}</span>
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {batch.info?.label || batch.level}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      {batch.info?.description || "German Language Course"}
                    </p>

                    {/* Schedule */}
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {batch.schedule || "Mon–Fri"} {batch.timing ? `| ${batch.timing}` : ""}
                    </div>

                    {batch.startDate && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Starts {new Date(batch.startDate).toLocaleDateString("en-IN", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                    )}

                    {/* Seats */}
                    {batch.status === "FILLING" && (
                      <div className="mb-6">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">
                            {batch.available} of {batch.totalSeats} seats left
                          </span>
                          <span className="text-gray-400">
                            {Math.round((batch.enrolled / batch.totalSeats) * 100)}% full
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-primary rounded-full h-2 transition-all"
                            style={{ width: `${Math.min(100, (batch.enrolled / batch.totalSeats) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <Link
                      href="/site/contact"
                      className="block text-center w-full px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors"
                    >
                      Enroll Now
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* A1 Foundation — Self-Paced */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                  Malayalam
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                  Self-Paced
                </span>
              </span>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{a1Foundation.title}</h2>
              <p className="text-gray-500 text-sm mb-3">{a1Foundation.subtitle}</p>
              <p className="text-gray-600 mb-6">{a1Foundation.description}</p>

              <p className="text-sm text-gray-500 mb-6">{a1Foundation.duration}</p>

              <ul className="space-y-3 mb-8">
                {a1Foundation.features.map((feature, i) => (
                  <li key={i} className="flex items-center text-gray-600">
                    <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href={a1Foundation.shopifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-8 py-4 bg-primary text-white text-lg font-semibold rounded-xl hover:bg-primary-dark transition-all"
              >
                Get A1 Foundation Course
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>

            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-orange-50 to-primary/5 rounded-2xl flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="text-7xl mb-4">📚</div>
                  <p className="text-xl font-semibold text-gray-900">Learn at Your Own Pace</p>
                  <p className="text-gray-600 mt-2">50+ lessons in Malayalam</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Not Sure Which Course is Right for You?
          </h2>
          <p className="text-red-100 mb-8">
            Get in touch with our team. We&apos;ll help you find the perfect learning path.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/site/contact"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-primary text-lg font-semibold rounded-xl hover:bg-gray-100 transition-all"
            >
              Contact Us
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <a
              href={THINKIFIC_LOGIN}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white text-lg font-semibold rounded-xl hover:bg-white/10 transition-all"
            >
              Student Login
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
