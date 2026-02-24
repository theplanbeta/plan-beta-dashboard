import Link from "next/link"
import { generatePageMetadata } from "@/lib/seo"
import { BreadcrumbSchema, FAQSchema } from "@/components/marketing/SEOStructuredData"

export const metadata = generatePageMetadata({
  title: "German Nursing Program | Plan Beta - Free Language Training & Hospital Placement",
  description:
    "Free German language training for nurses. We connect Indian nurses to hospitals and elderly care homes in Germany. No fees charged. B1 certification included.",
  keywords: [
    "german nursing program",
    "nurses germany",
    "german language for nurses",
    "nursing jobs germany",
    "free german training nurses",
    "altenpflege germany",
    "krankenpflege germany",
    "nurse recruitment germany",
    "indian nurses germany",
    "elderly care germany",
  ],
  path: "/site/nurses",
})

const WHATSAPP_NUMBER = "919028396035"

function whatsappUrl(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}

const stats = [
  { value: "200,000+", label: "Nursing vacancies in Germany" },
  { value: "€2,800–4,500", label: "Monthly salary" },
  { value: "0", label: "Fees charged to you" },
  { value: "B1", label: "Language level required" },
]

const steps = [
  {
    step: "01",
    title: "Apply",
    description: "Submit your details. We assess your qualifications and eligibility for the German nursing program.",
  },
  {
    step: "02",
    title: "Learn German",
    description: "Free German language training from A1 to B1 — the level required for nursing recognition in Germany.",
  },
  {
    step: "03",
    title: "Get Certified",
    description: "Prepare for and clear the B1 Goethe/TELC exam. We guide you through the entire certification process.",
  },
  {
    step: "04",
    title: "Start Working",
    description: "We connect you with hospitals and elderly care homes in Germany. Visa support and relocation assistance included.",
  },
]

const benefits = [
  {
    title: "Zero Cost to You",
    description: "We charge no fees for language training or placement. The entire program is funded by German employers.",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "Structured Language Training",
    description: "Live online classes from A1 to B1, 5 days a week. Small batches with experienced German teachers.",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    title: "Hospital & Care Home Placement",
    description: "Direct connections to German hospitals (Krankenhäuser) and elderly care homes (Altenpflegeheime) looking for qualified nurses.",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    title: "Visa & Relocation Support",
    description: "Complete assistance with visa applications, document attestation, and relocation logistics to Germany.",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "Recognized Certification",
    description: "Prepare for Goethe-Zertifikat or TELC B1 — internationally recognized certifications required for nursing in Germany.",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
  {
    title: "Earn in Euros",
    description: "German nurses earn €2,800–4,500/month with health insurance, paid holidays, pension benefits, and a path to permanent residency.",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
]

const faqs = [
  {
    question: "Is this program really free for nurses?",
    answer: "Yes, completely free. We charge zero fees for language training and placement. The program is funded by German employers who are looking for qualified nursing professionals.",
  },
  {
    question: "What qualifications do I need?",
    answer: "You need a BSc Nursing or GNM degree. Having some work experience is preferred but not mandatory. We assess each application individually.",
  },
  {
    question: "How long does the entire process take?",
    answer: "The language training from A1 to B1 takes approximately 8–10 months. After clearing the B1 exam, the visa and placement process takes another 3–6 months. Total timeline is roughly 12–16 months.",
  },
  {
    question: "What level of German do I need?",
    answer: "B1 is the minimum requirement for nursing recognition in Germany. Our training covers A1 through B1 with dedicated exam preparation for Goethe or TELC certification.",
  },
  {
    question: "Will I work in a hospital or care home?",
    answer: "Both options are available. We partner with Krankenhäuser (hospitals) and Altenpflegeheime (elderly care homes) across Germany. Your placement depends on your qualifications and preferences.",
  },
  {
    question: "What about my Indian nursing degree?",
    answer: "Your Indian nursing degree (BSc/GNM) needs to be recognized in Germany through a process called Anerkennung. We guide you through the entire document attestation and recognition process.",
  },
  {
    question: "What salary can I expect?",
    answer: "Starting salaries for nurses in Germany range from €2,800 to €4,500 per month depending on the federal state, facility, and your specialization. This includes benefits like health insurance, pension, and 24–30 paid vacation days.",
  },
  {
    question: "Can my family come with me?",
    answer: "Yes. Once you have a work visa and stable employment in Germany, you can apply for family reunification to bring your spouse and children.",
  },
]

export default function NursesPage() {
  return (
    <div>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://theplanbeta.com/site" },
          { name: "Nursing Program", url: "https://theplanbeta.com/site/nurses" },
        ]}
      />
      <FAQSchema faqs={faqs} />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-24 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,_rgba(220,38,38,0.1)_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,_rgba(59,130,246,0.08)_0%,_transparent_50%)]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-flex items-center px-4 py-1.5 bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium rounded-full mb-6">
              100% Free for Nurses
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Your Nursing Career in{" "}
              <span className="text-primary">Germany</span>{" "}
              Starts Here
            </h1>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              Free German language training. Direct placement in German hospitals and elderly care homes. We handle everything — from A1 to your first day at work.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href={whatsappUrl("Hi Plan Beta! I'm a nurse interested in the Germany nursing program. I'd like to know more.")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-8 py-4 bg-primary text-white text-lg font-semibold rounded-full hover:bg-primary-dark transition-all shadow-lg shadow-primary/25 hover:shadow-xl gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Apply Now via WhatsApp
              </a>
              <Link
                href="/site/contact"
                className="inline-flex items-center justify-center px-8 py-4 border border-white/20 text-white text-lg font-semibold rounded-full hover:bg-white/5 transition-all"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-gray-100">
            {stats.map((stat) => (
              <div key={stat.label} className="py-10 px-6 text-center">
                <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              From application to your first day in a German hospital — a clear, supported journey.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={step.step} className="relative">
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[60%] w-[80%] h-px bg-gray-200" />
                )}
                <div className="relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="w-12 h-12 bg-primary/10 text-primary font-bold text-lg rounded-xl flex items-center justify-center mb-4">
                    {step.step}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Why Choose Plan Beta
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need for a successful nursing career in Germany — at zero cost.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="bg-gray-50 rounded-2xl p-6 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4">
                  {benefit.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Life in Germany */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Life as a Nurse in Germany
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Salary & Benefits",
                items: [
                  "€2,800–4,500/month starting salary",
                  "Health insurance for you & family",
                  "24–30 paid vacation days",
                  "Pension & retirement benefits",
                  "Overtime pay & shift allowances",
                ],
              },
              {
                title: "Career Growth",
                items: [
                  "Specialization opportunities",
                  "Path to permanent residency",
                  "Family reunification visa",
                  "EU-wide work mobility",
                  "Continuing education support",
                ],
              },
              {
                title: "Work Environment",
                items: [
                  "Modern hospital infrastructure",
                  "Regulated work hours (38-40 hrs/week)",
                  "Strong worker protection laws",
                  "Multicultural teams",
                  "Excellent work-life balance",
                ],
              },
            ].map((section) => (
              <div key={section.title} className="bg-white rounded-2xl p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{section.title}</h3>
                <ul className="space-y-3">
                  {section.items.map((item) => (
                    <li key={item} className="flex items-start text-sm text-gray-600">
                      <svg className="w-4 h-4 text-green-500 mr-2.5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group bg-gray-50 rounded-xl border border-gray-100 overflow-hidden"
              >
                <summary className="flex items-center justify-between px-6 py-4 cursor-pointer list-none">
                  <span className="font-semibold text-gray-900 pr-4">{faq.question}</span>
                  <svg
                    className="w-5 h-5 text-gray-400 flex-shrink-0 group-open:rotate-180 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-6 pb-4 text-sm text-gray-600 leading-relaxed">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-flex items-center px-4 py-1.5 bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium rounded-full mb-6">
            No Fees. No Catch.
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Start Your Nursing Career in Germany?
          </h2>
          <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto">
            Take the first step today. Send us a message on WhatsApp and our team will guide you through the entire process.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={whatsappUrl("Hi Plan Beta! I'm a nurse interested in the Germany nursing program. I'd like to know more about eligibility and next steps.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-8 py-4 bg-primary text-white text-lg font-semibold rounded-full hover:bg-primary-dark transition-all shadow-lg shadow-primary/25 gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Apply Now via WhatsApp
            </a>
            <Link
              href="/site/contact"
              className="inline-flex items-center justify-center px-8 py-4 border border-white/20 text-white text-lg font-semibold rounded-full hover:bg-white/5 transition-all"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
