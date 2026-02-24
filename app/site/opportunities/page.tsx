import Link from "next/link"
import { generatePageMetadata, TARGET_KEYWORDS } from "@/lib/seo"
import { BreadcrumbSchema } from "@/components/marketing/SEOStructuredData"

export const metadata = generatePageMetadata({
  title: "Opportunities in Germany | Plan Beta - Work & Study in Germany",
  description:
    "Discover career opportunities in Germany for nursing, engineering, IT, and medical professionals. Learn about visa requirements, salary expectations, and how to get started.",
  keywords: TARGET_KEYWORDS.opportunities,
  path: "/site/opportunities",
})

const sectors = [
  {
    id: "nursing",
    title: "Nursing & Healthcare",
    icon: "🏥",
    demand: "200,000+ unfilled positions",
    salary: "€2,800 - €4,500/month",
    requirements: "B1 German + Nursing degree",
    description: "Germany's healthcare sector faces a severe nursing shortage. Indian nurses with proper qualifications and B1 German are in high demand.",
    benefits: [
      "Fast-track visa processing",
      "Recognition of Indian nursing degrees",
      "Free language courses often provided by employers",
      "Clear path to permanent residency",
      "High job security",
    ],
    path: [
      "Complete B1 German certification",
      "Get your nursing degree recognized (Anerkennung)",
      "Apply for a visa to seek employment",
      "Complete adaptation training if required",
      "Start working as a recognized nurse",
    ],
  },
  {
    id: "engineering",
    title: "Engineering",
    icon: "⚙️",
    demand: "100,000+ engineers needed",
    salary: "€4,000 - €7,000/month",
    requirements: "B1 German + Engineering degree",
    description: "Germany's engineering sector needs skilled professionals in mechanical, electrical, automotive, and civil engineering.",
    benefits: [
      "EU Blue Card eligibility",
      "World-class work environment",
      "Innovation-driven companies",
      "Strong work-life balance",
      "Excellent career growth",
    ],
    path: [
      "Complete B1 German certification",
      "Get your degree recognized if needed",
      "Apply for EU Blue Card",
      "Job search via LinkedIn, StepStone, Indeed",
      "Relocate and start working",
    ],
  },
  {
    id: "it",
    title: "IT & Technology",
    icon: "💻",
    demand: "Growing tech ecosystem",
    salary: "€4,500 - €8,000/month",
    requirements: "B1 German (or English for some roles)",
    description: "Berlin, Munich, and Hamburg are major tech hubs. Many companies accept English, but German skills give you an edge.",
    benefits: [
      "Many English-speaking workplaces",
      "Startup culture in Berlin",
      "Established tech giants",
      "Remote work options",
      "Competitive global salaries",
    ],
    path: [
      "Build strong technical portfolio",
      "Learn at least basic German",
      "Apply via LinkedIn, Glassdoor, company websites",
      "Obtain EU Blue Card or skilled worker visa",
      "Join Germany's thriving tech scene",
    ],
  },
  {
    id: "medical",
    title: "Medical Professionals",
    icon: "👨‍⚕️",
    demand: "Shortage of doctors",
    salary: "€5,000 - €10,000/month",
    requirements: "B2/C1 German + Medical degree",
    description: "Germany needs doctors, especially in rural areas. Indian medical graduates can practice after recognition and language certification.",
    benefits: [
      "High earning potential",
      "Excellent healthcare system",
      "Research opportunities",
      "World-class facilities",
      "Respected profession",
    ],
    path: [
      "Complete B2/C1 German certification",
      "Apply for Approbation (medical license)",
      "Pass Kenntnisprüfung or Gleichwertigkeitsprüfung",
      "Complete any required practical training",
      "Begin practicing as a licensed doctor",
    ],
  },
]

const visaTypes = [
  {
    name: "EU Blue Card",
    for: "Highly qualified professionals",
    requirements: "University degree + job offer with minimum salary",
    duration: "Up to 4 years, leads to permanent residency",
  },
  {
    name: "Skilled Worker Visa",
    for: "Qualified professionals",
    requirements: "Recognized qualification + job offer + basic German",
    duration: "Up to 4 years, renewable",
  },
  {
    name: "Job Seeker Visa",
    for: "Those looking for employment",
    requirements: "University degree + sufficient funds + travel insurance",
    duration: "6 months to find a job",
  },
  {
    name: "Recognition Visa",
    for: "Those needing qualification recognition",
    requirements: "Proof of qualification + German language skills",
    duration: "18 months for recognition process",
  },
]

const faqs = [
  {
    question: "Do I need to know German to work in Germany?",
    answer: "For most professions, yes. B1 level is typically the minimum requirement for healthcare and engineering jobs. Some IT roles accept English, but German always improves your opportunities. Learning German also helps with daily life, integration, and career advancement.",
  },
  {
    question: "How long does it take to learn enough German?",
    answer: "With consistent effort, you can reach B1 level in 6-8 months. Our live courses cover A1 in 8 weeks, A2 in 10 weeks, and B1 in 12 weeks. Full-time students can progress faster.",
  },
  {
    question: "Is my Indian degree valid in Germany?",
    answer: "Most Indian degrees are recognized, but you may need to go through a formal recognition process (Anerkennung). For regulated professions like nursing and medicine, this is mandatory. For unregulated professions like IT, formal recognition is helpful but not always required.",
  },
  {
    question: "What's the cost of living in Germany?",
    answer: "Outside major cities, you can live comfortably on €1,500-2,000/month. In cities like Munich or Frankfurt, expect €2,000-3,000/month. With typical salaries, you can save significantly while enjoying a high quality of life.",
  },
  {
    question: "Can I bring my family?",
    answer: "Yes! Once you have a job and accommodation, your spouse and children can join you on a family reunion visa. Your spouse can also work in Germany.",
  },
]

export default function OpportunitiesPage() {
  return (
    <div>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://planbeta.in/site" },
          { name: "Opportunities", url: "https://planbeta.in/site/opportunities" },
        ]}
      />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-900 to-gray-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center px-4 py-2 bg-primary/20 rounded-full text-primary text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-primary rounded-full mr-2 animate-pulse"></span>
              High Demand for Skilled Workers
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">
              Germany Needs <span className="text-primary">You</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Germany is facing its biggest skilled worker shortage in history. With the right qualifications
              and German language skills, you can build a new life in Europe&apos;s economic powerhouse.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/site/contact"
                className="inline-flex items-center px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-all"
              >
                Start Learning German
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <a
                href="#sectors"
                className="inline-flex items-center px-6 py-3 border border-gray-600 text-white rounded-lg font-semibold hover:bg-gray-800 transition-all"
              >
                Explore Opportunities
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Key Stats */}
      <section className="py-12 bg-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            <div>
              <div className="text-4xl font-bold">400,000+</div>
              <div className="text-red-100">Skilled Workers Needed Annually</div>
            </div>
            <div>
              <div className="text-4xl font-bold">€4,500</div>
              <div className="text-red-100">Average Monthly Salary</div>
            </div>
            <div>
              <div className="text-4xl font-bold">30</div>
              <div className="text-red-100">Days Paid Leave/Year</div>
            </div>
            <div>
              <div className="text-4xl font-bold">#1</div>
              <div className="text-red-100">Economy in Europe</div>
            </div>
          </div>
        </div>
      </section>

      {/* Sectors */}
      <section id="sectors" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">High-Demand Sectors</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              These industries are actively seeking skilled workers from abroad.
            </p>
          </div>

          <div className="space-y-8">
            {sectors.map((sector) => (
              <div
                key={sector.id}
                id={sector.id}
                className="bg-gray-50 rounded-2xl overflow-hidden"
              >
                <div className="p-8">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-8">
                    {/* Header */}
                    <div className="lg:w-1/3">
                      <div className="text-5xl mb-4">{sector.icon}</div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">{sector.title}</h3>
                      <p className="text-gray-600 mb-4">{sector.description}</p>

                      <div className="space-y-2">
                        <div className="flex items-center text-sm">
                          <span className="text-gray-500 w-24">Demand:</span>
                          <span className="font-semibold text-primary">{sector.demand}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <span className="text-gray-500 w-24">Salary:</span>
                          <span className="font-semibold text-gray-900">{sector.salary}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <span className="text-gray-500 w-24">Required:</span>
                          <span className="font-semibold text-gray-900">{sector.requirements}</span>
                        </div>
                      </div>
                    </div>

                    {/* Benefits */}
                    <div className="lg:w-1/3">
                      <h4 className="font-semibold text-gray-900 mb-4">Benefits</h4>
                      <ul className="space-y-2">
                        {sector.benefits.map((benefit, i) => (
                          <li key={i} className="flex items-start text-sm text-gray-600">
                            <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Path */}
                    <div className="lg:w-1/3">
                      <h4 className="font-semibold text-gray-900 mb-4">Your Path</h4>
                      <ol className="space-y-3">
                        {sector.path.map((step, i) => (
                          <li key={i} className="flex items-start text-sm">
                            <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-semibold mr-3 flex-shrink-0">
                              {i + 1}
                            </span>
                            <span className="text-gray-600">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Visa Types */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Visa Options</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Germany offers several visa pathways for skilled workers.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {visaTypes.map((visa, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{visa.name}</h3>
                <p className="text-primary text-sm mb-4">{visa.for}</p>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Requirements: </span>
                    <span className="text-gray-700">{visa.requirements}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Duration: </span>
                    <span className="text-gray-700">{visa.duration}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Germany */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Germany?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Beyond job opportunities, Germany offers an exceptional quality of life.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Strong Economy</h3>
              <p className="text-gray-600">Europe&apos;s largest economy with stable employment and strong social security.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Healthcare</h3>
              <p className="text-gray-600">Universal healthcare coverage. One of the best healthcare systems in the world.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Free Education</h3>
              <p className="text-gray-600">Public universities are tuition-free, even for international students.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Work-Life Balance</h3>
              <p className="text-gray-600">30 days paid vacation, reasonable working hours, strong worker protections.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Travel Freedom</h3>
              <p className="text-gray-600">Live in the heart of Europe. Easy travel to 26 Schengen countries.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Indian Community</h3>
              <p className="text-gray-600">Growing Indian diaspora. Indian stores, restaurants, and cultural events.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Common Questions</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <details key={index} className="group bg-white rounded-xl shadow-sm">
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                  <h3 className="font-semibold text-gray-900 pr-4">{faq.question}</h3>
                  <svg
                    className="w-5 h-5 text-gray-500 transition-transform group-open:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-6 pb-6 text-gray-600">{faq.answer}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Your German Journey Starts with Language
          </h2>
          <p className="text-xl text-red-100 mb-8">
            Whether you&apos;re a nurse, engineer, IT professional, or doctor - the first step is always the same: learn German.
          </p>
          <Link
            href="/site/contact"
            className="inline-flex items-center justify-center px-8 py-4 bg-white text-primary text-lg font-semibold rounded-xl hover:bg-gray-100 transition-all"
          >
            Book Free Trial Class
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  )
}
