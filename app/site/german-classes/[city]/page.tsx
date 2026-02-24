import Link from "next/link"
import { notFound } from "next/navigation"
import { generatePageMetadata } from "@/lib/seo"
import { BreadcrumbSchema, FAQSchema } from "@/components/marketing/SEOStructuredData"
import { prisma } from "@/lib/prisma"
import { COURSE_PRICING, COURSE_INFO } from "@/lib/pricing"

const KERALA_CITIES: Record<string, { name: string; region: string }> = {
  kochi: { name: "Kochi", region: "Ernakulam" },
  thiruvananthapuram: { name: "Thiruvananthapuram", region: "Trivandrum" },
  trivandrum: { name: "Trivandrum", region: "Trivandrum" },
  kozhikode: { name: "Kozhikode", region: "Malabar" },
  calicut: { name: "Calicut", region: "Malabar" },
  thrissur: { name: "Thrissur", region: "Central Kerala" },
  kollam: { name: "Kollam", region: "South Kerala" },
  palakkad: { name: "Palakkad", region: "Central Kerala" },
  alappuzha: { name: "Alappuzha", region: "South Kerala" },
  kannur: { name: "Kannur", region: "North Kerala" },
  kottayam: { name: "Kottayam", region: "Central Kerala" },
  malappuram: { name: "Malappuram", region: "Malabar" },
  ernakulam: { name: "Ernakulam", region: "Central Kerala" },
}

export function generateStaticParams() {
  return Object.keys(KERALA_CITIES).map((city) => ({ city }))
}

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params
  const cityInfo = KERALA_CITIES[city]
  if (!cityInfo) return {}

  return generatePageMetadata({
    title: `German Language Classes in ${cityInfo.name} | Plan Beta`,
    description: `Learn German in ${cityInfo.name}, Kerala. A1, A2, B1, B2 online classes with live teachers. Affordable courses for students from ${cityInfo.name} planning to study, work, or settle in Germany.`,
    keywords: [
      `german classes ${cityInfo.name.toLowerCase()}`,
      `learn german ${cityInfo.name.toLowerCase()}`,
      `german language course ${cityInfo.name.toLowerCase()}`,
      `german tuition ${cityInfo.name.toLowerCase()}`,
      "german classes kerala",
      "learn german online kerala",
      "german A1 course kerala",
    ],
    path: `/site/german-classes/${city}`,
  })
}

export default async function CityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params
  const cityInfo = KERALA_CITIES[city]
  if (!cityInfo) notFound()

  const batches = await prisma.batch.findMany({
    where: { status: { in: ["FILLING", "RUNNING"] } },
    select: {
      id: true,
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
    orderBy: { startDate: "asc" },
  })

  const faqItems = [
    {
      question: `Can I learn German online from ${cityInfo.name}?`,
      answer: `Yes! Plan Beta offers live online German classes that students from ${cityInfo.name} can join from home. All classes are conducted via Google Meet with experienced teachers.`,
    },
    {
      question: `How much do German classes cost in ${cityInfo.name}?`,
      answer: `Our German A1 course starts at Rs.10,000 for self-paced learning and Rs.14,000 for live classes. This is significantly more affordable than physical institutes in ${cityInfo.name}.`,
    },
    {
      question: `What German levels do you offer for students in ${cityInfo.name}?`,
      answer: "We offer A1 (Beginner), A2 (Elementary), B1 (Intermediate), and B2 (Upper Intermediate) levels, following the Goethe Institute curriculum.",
    },
    {
      question: `Do I need to travel to attend German classes from ${cityInfo.name}?`,
      answer: `No. All our classes are 100% online. Students from ${cityInfo.name} and across Kerala attend from home. You just need a laptop/phone and internet connection.`,
    },
  ]

  return (
    <div>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://planbeta.in/site" },
          { name: `German Classes in ${cityInfo.name}`, url: `https://planbeta.in/site/german-classes/${city}` },
        ]}
      />
      <FAQSchema faqs={faqItems} />

      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-50 via-white to-red-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-sm font-medium text-primary mb-3 uppercase tracking-wide">
              Online German Classes from {cityInfo.name}
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Learn German in{" "}
              <span className="text-primary">{cityInfo.name}</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Live online German language courses for students from {cityInfo.name}, {cityInfo.region}.
              From beginner A1 to advanced B2 — prepare for your German journey without leaving home.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/site/contact"
                className="inline-flex items-center justify-center px-8 py-4 bg-primary text-white text-lg font-semibold rounded-xl hover:bg-primary-dark transition-all"
              >
                Book Free Trial Class
              </Link>
              <Link
                href="/site/courses"
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-gray-300 text-gray-700 text-lg font-semibold rounded-xl hover:bg-gray-50 transition-all"
              >
                View All Courses
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why Learn German */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Why Students from {cityInfo.name} Are Learning German
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Work in Germany",
                description: `Many professionals from ${cityInfo.name} are moving to Germany for nursing, IT, and engineering jobs. German language skills are essential for visa and integration.`,
                icon: "💼",
              },
              {
                title: "Study at German Universities",
                description: "Germany offers tuition-free education at public universities. A1/B1 German certification is required for most study programs.",
                icon: "🎓",
              },
              {
                title: "Better Career Prospects",
                description: "German is the most spoken language in the EU. Companies in Kerala with German clients actively seek German-speaking professionals.",
                icon: "📈",
              },
            ].map((item) => (
              <div key={item.title} className="text-center p-6 rounded-xl bg-gray-50">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Courses */}
      {batches.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">
              Available German Courses
            </h2>
            <p className="text-gray-600 text-center mb-10">
              Live online classes you can join from {cityInfo.name}
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {batches.map((batch) => {
                const levelKey = batch.level as keyof typeof COURSE_PRICING
                const pricing = COURSE_PRICING[levelKey]
                const info = COURSE_INFO[levelKey]
                const enrolled = batch._count.students
                const available = Math.max(0, batch.totalSeats - enrolled)

                return (
                  <div
                    key={batch.id}
                    className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: info?.color || "#6b7280" }}
                      />
                      <span className="text-sm font-medium text-gray-500">
                        {batch.status === "FILLING" ? "Enrolling Now" : "In Progress"}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {info?.label || batch.level}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      {batch.schedule || "Mon–Fri"} {batch.timing ? `| ${batch.timing}` : ""}
                    </p>

                    {pricing && (
                      <p className="text-2xl font-bold text-gray-900 mb-1">
                        ₹{pricing.INR.toLocaleString()}
                      </p>
                    )}

                    {batch.status === "FILLING" && (
                      <p className="text-sm text-green-600 mb-4">
                        {available} {available === 1 ? "seat" : "seats"} left
                      </p>
                    )}

                    {batch.startDate && (
                      <p className="text-xs text-gray-400 mb-4">
                        Starts {new Date(batch.startDate).toLocaleDateString("en-IN", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    )}

                    <Link
                      href="/site/contact"
                      className="block text-center w-full px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors"
                    >
                      Enquire Now
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqItems.map((item) => (
              <details key={item.question} className="group rounded-xl bg-gray-50 p-5">
                <summary className="cursor-pointer text-lg font-medium text-gray-900 list-none flex items-center justify-between">
                  {item.question}
                  <svg
                    className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <p className="mt-3 text-gray-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Start Learning German from {cityInfo.name}?
          </h2>
          <p className="text-red-100 mb-8">
            Book a free trial class and experience our teaching method. No payment required.
          </p>
          <Link
            href="/site/contact"
            className="inline-flex items-center justify-center px-8 py-4 bg-white text-primary text-lg font-semibold rounded-xl hover:bg-gray-100 transition-all"
          >
            Book Free Trial Class
          </Link>
        </div>
      </section>
    </div>
  )
}
