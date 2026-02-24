import Link from "next/link"
import { generatePageMetadata } from "@/lib/seo"
import { FAQSchema, BreadcrumbSchema } from "@/components/marketing/SEOStructuredData"

export const metadata = generatePageMetadata({
  title: "Refer a Friend & Earn Rs.2,000 | Plan Beta",
  description:
    "Refer your friends to Plan Beta German courses and earn Rs.2,000 for each successful enrollment. Share your referral link and start earning today.",
  keywords: [
    "plan beta referral program",
    "german course referral",
    "earn by referring friends",
    "plan beta discount",
  ],
  path: "/site/refer",
})

const faqItems = [
  {
    question: "How does the referral program work?",
    answer:
      "Share your unique referral link or code with friends. When they enroll in any Plan Beta course, you earn Rs.2,000 as a referral reward.",
  },
  {
    question: "When do I get my referral reward?",
    answer:
      "You receive your reward after your friend completes their enrollment and makes their first payment. Rewards are credited within 7 days.",
  },
  {
    question: "Is there a limit to how many friends I can refer?",
    answer:
      "No limit! You can refer as many friends as you want and earn Rs.2,000 for each successful enrollment.",
  },
  {
    question: "Do I need to be a current student to refer?",
    answer:
      "Yes, the referral program is available to all current and past Plan Beta students. Each student gets a unique referral code.",
  },
]

export default function ReferPage() {
  return (
    <div>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://planbeta.in/site" },
          { name: "Refer a Friend", url: "https://planbeta.in/site/refer" },
        ]}
      />
      <FAQSchema faqs={faqItems} />

      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-50 via-white to-red-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-sm font-medium text-primary mb-3 uppercase tracking-wide">
              Referral Program
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Refer a Friend, <span className="text-primary">Earn Rs.2,000</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Love learning German with us? Share the experience with your friends and earn rewards for every successful enrollment.
            </p>
            <Link
              href="/site/contact"
              className="inline-flex items-center justify-center px-8 py-4 bg-primary text-white text-lg font-semibold rounded-xl hover:bg-primary-dark transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Share Your Code",
                description:
                  "Every Plan Beta student gets a unique referral code. Share it with friends who want to learn German.",
              },
              {
                step: "2",
                title: "Friend Enrolls",
                description:
                  "Your friend signs up using your referral code and enrolls in any Plan Beta course.",
              },
              {
                step: "3",
                title: "You Earn Rs.2,000",
                description:
                  "Once your friend completes enrollment, you receive Rs.2,000 as a reward. It's that simple!",
              },
            ].map((item) => (
              <div key={item.step} className="text-center p-8 rounded-xl bg-gray-50">
                <div className="w-12 h-12 bg-primary text-white text-xl font-bold rounded-full flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqItems.map((item) => (
              <details key={item.question} className="group rounded-xl bg-white p-5 shadow-sm">
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
            Don&apos;t Have a Referral Code?
          </h2>
          <p className="text-red-100 mb-8">
            Ask your friend who studies at Plan Beta for their referral code, or contact us to learn more about joining.
          </p>
          <Link
            href="/site/contact"
            className="inline-flex items-center justify-center px-8 py-4 bg-white text-primary text-lg font-semibold rounded-xl hover:bg-gray-100 transition-all"
          >
            Contact Us
          </Link>
        </div>
      </section>
    </div>
  )
}
