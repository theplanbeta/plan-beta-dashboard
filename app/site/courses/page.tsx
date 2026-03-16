import Link from "next/link"
import { headers } from "next/headers"
import { generatePageMetadata, TARGET_KEYWORDS } from "@/lib/seo"
import { BreadcrumbSchema, CourseSchema } from "@/components/marketing/SEOStructuredData"
import { InstagramEmbed } from "@/components/marketing/InstagramEmbed"
import { prisma } from "@/lib/prisma"
import { COURSE_INFO } from "@/lib/pricing"
import { getCurrencyFromCountry, getMarketingPrice, type MarketingLevel } from "@/lib/geo-pricing"

export const metadata = generatePageMetadata({
  title: "German Language Courses | Plan Beta - A1, A2, B1, B2 Levels",
  description:
    "German A1 to B2 live online classes via Google Meet. Mon-Fri morning & evening batches. Goethe & TELC exam prep included.",
  keywords: TARGET_KEYWORDS.courses,
  path: "/courses",
})

const WHATSAPP_NUMBER = "919028396035"
const THINKIFIC_LOGIN = "https://courses.planbeta.in/users/sign_in"
const SHOPIFY_BASE = "https://theplanbeta.com"

function whatsappEnrollUrl(courseName: string) {
  const message = `Hi Plan Beta! I'm interested in enrolling for the ${courseName} course. Could you share more details?`
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}

const liveCourses = [
  {
    id: "a1",
    level: "A1" as const,
    title: "A1 — Your Foundation for Germany",
    subtitle: "Beginner",
    description:
      "The first step to your German life. Build the basics you need for visa applications, simple conversations, and your Goethe A1 exam.",
    sessions: 40,
    sessionDuration: "1.5 hours",
    color: "from-emerald-500 to-green-600",
    features: [
      "40 live sessions (1.5 hrs each)",
      "Mon–Fri schedule",
      "Morning & evening batches",
      "Live via Google Meet",
      "Recordings of all sessions",
      "Certificate on completion",
    ],
  },
  {
    id: "a2",
    level: "A2" as const,
    title: "A2 — Everyday Life in Germany",
    subtitle: "Elementary",
    description:
      "Handle daily life in Germany with confidence. From grocery shopping to doctor visits — the language skills you need to settle in.",
    sessions: 40,
    sessionDuration: "1.5 hours",
    color: "from-blue-500 to-indigo-600",
    features: [
      "40 live sessions (1.5 hrs each)",
      "Mon–Fri schedule",
      "Morning & evening batches",
      "Live via Google Meet",
      "Speaking practice focus",
      "A2 exam preparation",
    ],
  },
  {
    id: "b1",
    level: "B1" as const,
    title: "B1 — The Level That Opens German Jobs",
    subtitle: "Intermediate",
    description:
      "The gateway to German work visas. B1 is required for most jobs — clear it and unlock nursing, IT, and engineering careers in Germany.",
    sessions: 60,
    sessionDuration: "1.5 hours",
    color: "from-purple-500 to-violet-600",
    features: [
      "60 live sessions (1.5 hrs each)",
      "Mon–Fri schedule",
      "Morning & evening batches",
      "Live via Google Meet",
      "Business German module",
      "Goethe/TELC B1 exam prep",
    ],
  },
  {
    id: "b2",
    level: "B2" as const,
    title: "B2 — Professional Recognition in Germany",
    subtitle: "Upper Intermediate",
    description:
      "The level that gets your qualifications recognised. Required for nursing registration, medical practice, and senior professional roles in Germany.",
    sessions: 60,
    sessionDuration: "1.5 hours",
    color: "from-rose-500 to-red-600",
    features: [
      "60 live sessions (1.5 hrs each)",
      "Mon–Fri schedule",
      "Morning & evening batches",
      "Live via Google Meet",
      "Professional German",
      "Goethe/TELC B2 exam prep",
    ],
  },
]

export default async function CoursesPage() {
  // Detect visitor country for pricing
  const headersList = await headers()
  const country = headersList.get("x-vercel-ip-country")
  const currency = getCurrencyFromCountry(country)

  // Fetch upcoming batches from database
  const now = new Date()
  const upcomingBatches = await prisma.batch.findMany({
    where: {
      status: "FILLING",
      startDate: { gt: now },
    },
    select: {
      id: true,
      batchCode: true,
      level: true,
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
    orderBy: { startDate: "asc" },
  })

  return (
    <div>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://theplanbeta.com" },
          { name: "Courses", url: "https://theplanbeta.com/courses" },
        ]}
      />
      <CourseSchema
        name="German Language Courses - A1 to B2"
        description="Live online German courses via Google Meet. 40-60 sessions per level, Mon-Fri, morning and evening batches available."
        url="https://theplanbeta.com/courses"
        duration="8-12 weeks"
        level="All levels"
        rating={4.8}
        reviewCount={500}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#0a0a0a] py-20">
        <div className="blur-orb absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[80px]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              Your Path to a <span className="text-primary">Career in Germany</span>
            </h1>
            <p className="text-xl text-gray-400 mb-4">
              Each level is a milestone on your journey to Germany. Live online classes via Google Meet, small batches, and a structured pathway from A1 to B2.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500 mb-8">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Mon–Fri classes
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Morning &amp; evening batches
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Live via Google Meet
              </span>
            </div>

            <a
              href={THINKIFIC_LOGIN}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-5 py-2.5 text-sm font-medium text-gray-400 border border-white/[0.1] rounded-full hover:bg-white/[0.04] transition-colors"
            >
              Already enrolled? Log in
            </a>
          </div>
        </div>
      </section>

      {/* A1 Foundation — Self-Paced */}
      <section className="py-20 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-orange-500/15 text-orange-400 text-xs font-medium rounded-full border border-orange-500/20">
                  Malayalam
                </span>
                <span className="px-3 py-1 bg-white/[0.06] text-gray-400 text-xs font-medium rounded-full border border-white/[0.08]">
                  Self-Paced
                </span>
              </span>
              <h2 className="text-3xl font-bold text-white mb-2">German A1 Foundation</h2>
              <p className="text-gray-500 text-sm mb-3">Self-Paced Learning in Malayalam</p>
              <p className="text-gray-400 mb-6">
                Learn at your own pace with our comprehensive A1 course designed for Malayalam speakers. 100+ video lessons with native speaker audio, exercises, and lifetime access. Perfect for working professionals and shift workers.
              </p>

              <ul className="space-y-3 mb-8">
                {[
                  "100+ video lessons",
                  "Practice exercises",
                  "Native speaker audio",
                  "Malayalam explanations",
                  "Taught by Aparna Bose (Founder)",
                  "Lifetime access to updates",
                ].map((feature, i) => (
                  <li key={i} className="flex items-center text-gray-300">
                    <svg className="w-5 h-5 text-primary mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href={whatsappEnrollUrl("A1 Foundation (Self-Paced, Malayalam)")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-8 py-4 bg-primary text-white text-lg font-semibold rounded-xl hover:bg-primary-dark transition-all gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Enroll via WhatsApp
              </a>
            </div>

            <div className="flex justify-center">
              <InstagramEmbed
                url="https://www.instagram.com/reel/DM5Dc3VyjPv/"
                title="A1 Foundation Course — Taught by Aparna Bose"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Live Courses */}
      <section className="py-20 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white mb-3">
              Live Batch Courses
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Structured courses with experienced teachers. 1.5-hour sessions, Monday to Friday, with both morning and evening batches to fit your schedule.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {liveCourses.map((course) => (
              <div
                key={course.id}
                className="relative bg-white/[0.04] border border-white/[0.08] rounded-2xl hover:border-primary/20 transition-colors overflow-hidden"
              >
                {/* Level badge header */}
                <div className={`bg-gradient-to-r ${course.color} px-6 py-4`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-white">{course.title}</h3>
                      <p className="text-white/80 text-sm">{course.subtitle}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold text-2xl">
                        {getMarketingPrice(course.level, currency) || `${course.sessions} Sessions`}
                      </div>
                      <div className="text-white/70 text-xs">{course.sessions} sessions &middot; {course.sessionDuration} each</div>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-gray-400 mb-5">{course.description}</p>

                  <ul className="space-y-2.5 mb-6">
                    {course.features.map((feature) => (
                      <li key={feature} className="flex items-center text-sm text-gray-400">
                        <svg className="w-4 h-4 text-primary mr-2.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <a
                    href={whatsappEnrollUrl(course.title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-full px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors gap-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Enroll via WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Batches — Dynamic from Dashboard */}
      {upcomingBatches.length > 0 && (
        <section className="py-20 bg-[#111]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
                Starting Soon
              </p>
              <h2 className="text-3xl font-bold text-white mb-3">
                Upcoming Batches
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Limited seats available. Enroll now to secure your spot in the next batch.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingBatches.map((batch) => {
                const info = COURSE_INFO[batch.level as keyof typeof COURSE_INFO]
                const enrolled = batch._count.students
                const available = Math.max(0, batch.totalSeats - enrolled)
                const fillPercent = Math.min(100, Math.round((enrolled / batch.totalSeats) * 100))
                const startsIn = Math.ceil((new Date(batch.startDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

                return (
                  <div
                    key={batch.id}
                    className="bg-white/[0.04] border border-white/[0.08] rounded-2xl hover:border-primary/20 transition-colors p-6"
                  >
                    {/* Status & timing */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: info?.color || "#6b7280" }}
                        />
                        <span className="text-sm font-medium text-white">{batch.batchCode}</span>
                      </div>
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                        {startsIn <= 14 ? "Starting Soon" : "Enrolling"}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-1">
                      {info?.label || batch.level}
                    </h3>

                    {/* Details */}
                    <div className="space-y-1.5 text-sm text-gray-500 mb-4">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Starts {new Date(batch.startDate!).toLocaleDateString("en-IN", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {batch.schedule || "Mon–Fri"} {batch.timing ? `| ${batch.timing}` : ""}
                      </div>
                    </div>

                    {/* Seats progress */}
                    <div className="mb-5">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-gray-400">
                          {available} of {batch.totalSeats} seats left
                        </span>
                        <span className="text-gray-400">{fillPercent}% full</span>
                      </div>
                      <div className="w-full bg-white/[0.1] rounded-full h-1.5">
                        <div
                          className="bg-primary rounded-full h-1.5 transition-all"
                          style={{ width: `${fillPercent}%` }}
                        />
                      </div>
                    </div>

                    <a
                      href={whatsappEnrollUrl(`${info?.label || batch.level} (${batch.batchCode})`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-full px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors gap-2"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      Enroll Now
                    </a>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Exam Preparation */}
      <section className="py-20 bg-[#111]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-amber-500/15 text-amber-400 text-xs font-medium rounded-full border border-amber-500/20">
                  TELC
                </span>
                <span className="px-3 py-1 bg-blue-500/15 text-blue-400 text-xs font-medium rounded-full border border-blue-500/20">
                  Goethe
                </span>
              </span>
              <h2 className="text-3xl font-bold text-white mb-3">
                Exam Preparation
              </h2>
              <p className="text-gray-400 mb-6">
                Prepare for internationally recognized German exams. Our courses include dedicated exam prep modules with mock tests, exam strategies, and targeted practice for both TELC and Goethe certifications.
              </p>

              <ul className="space-y-3 mb-8">
                {[
                  "TELC exam preparation (A1–B2)",
                  "Goethe-Zertifikat preparation (A1–B2)",
                  "Mock exams & timed practice",
                  "Reading, writing, listening & speaking modules",
                  "Exam strategies & tips from experienced trainers",
                  "95%+ first-attempt pass rate",
                ].map((feature) => (
                  <li key={feature} className="flex items-center text-gray-400">
                    <svg className="w-5 h-5 text-primary mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href={whatsappEnrollUrl("Exam Preparation (TELC/Goethe)")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-8 py-4 bg-primary text-white text-lg font-semibold rounded-xl hover:bg-primary-dark transition-all gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Enquire About Exam Prep
              </a>
            </div>

            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-amber-500/10 to-blue-500/5 border border-white/[0.08] rounded-2xl flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="text-7xl mb-4">📝</div>
                  <p className="text-xl font-semibold text-white">TELC &amp; Goethe Certified</p>
                  <p className="text-gray-400 mt-2">Internationally recognized exams</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Speaking Improvement */}
      <section className="py-20 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="aspect-square bg-gradient-to-br from-rose-500/10 to-primary/5 border border-white/[0.08] rounded-2xl flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="text-7xl mb-4">🗣️</div>
                  <p className="text-xl font-semibold text-white">Speak German Fluently</p>
                  <p className="text-gray-400 mt-2">With Aparna Bose</p>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <span className="inline-flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-rose-500/15 text-rose-400 text-xs font-medium rounded-full border border-rose-500/20">
                  Fluency
                </span>
                <span className="px-3 py-1 bg-white/[0.06] text-gray-400 text-xs font-medium rounded-full border border-white/[0.08]">
                  Specialized
                </span>
              </span>
              <h2 className="text-3xl font-bold text-white mb-3">
                German Speaking Improvement
              </h2>
              <p className="text-sm text-gray-500 mb-3">By Aparna Bose</p>
              <p className="text-gray-400 mb-6">
                A dedicated course focused entirely on spoken German fluency. Go beyond textbook learning with conversation practice, pronunciation coaching, and real-world speaking scenarios. Perfect for students who want to sound natural and confident.
              </p>

              <ul className="space-y-3 mb-8">
                {[
                  "Focused on spoken fluency & confidence",
                  "Pronunciation & accent coaching",
                  "Real-world conversation practice",
                  "Discussion-based learning",
                  "Small group for maximum speaking time",
                  "Taught by Aparna Bose",
                ].map((feature) => (
                  <li key={feature} className="flex items-center text-gray-400">
                    <svg className="w-5 h-5 text-primary mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href={whatsappEnrollUrl("German Speaking Improvement")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-8 py-4 bg-primary text-white text-lg font-semibold rounded-xl hover:bg-primary-dark transition-all gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Enquire About Speaking Classes
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* What Happens Next */}
      <section className="py-20 bg-[#111]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
              After You Enroll
            </p>
            <h2 className="text-3xl font-bold text-white mb-3">
              What Happens Next
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              From enrollment to your first class — here&apos;s exactly what to expect.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {[
              {
                step: "1",
                title: "WhatsApp Confirmation",
                description: "You'll receive an instant confirmation with your batch details, schedule, and payment receipt.",
                icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
              },
              {
                step: "2",
                title: "Class Group Access",
                description: "You'll be added to your batch's WhatsApp group and receive the Google Meet link for all sessions.",
                icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
              },
              {
                step: "3",
                title: "Study Materials & Schedule",
                description: "Get your complete course materials, textbook recommendations, and your Mon–Fri class schedule.",
                icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
              },
              {
                step: "4",
                title: "Regular Progress Tracking",
                description: "Attendance tracking, periodic assessments, and direct feedback from your teacher throughout the course.",
                icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 hover:border-primary/20 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{item.title}</h3>
                    <p className="text-sm text-gray-400">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
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
              href="/contact"
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
