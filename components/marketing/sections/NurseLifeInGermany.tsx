"use client"

import { AnimateInView } from "@/components/marketing/AnimateInView"

const sections = [
  {
    title: "Salary & Benefits",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
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
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
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
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    items: [
      "Modern hospital infrastructure",
      "Regulated work hours (38-40 hrs/week)",
      "Strong worker protection laws",
      "Multicultural teams",
      "Excellent work-life balance",
    ],
  },
]

export function NurseLifeInGermany() {
  return (
    <section className="relative py-20 overflow-hidden bg-slate-900">
      {/* Background accents */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[150px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.03)_1px,_transparent_1px)] bg-[size:32px_32px]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimateInView className="text-center mb-14">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            What Awaits You
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Life as a Nurse in Germany
          </h2>
        </AnimateInView>

        <div className="grid md:grid-cols-3 gap-6">
          {sections.map((section, i) => (
            <AnimateInView key={section.title} delay={i * 0.12}>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 h-full hover:bg-white/10 transition-colors">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4">
                  {section.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-4">{section.title}</h3>
                <ul className="space-y-3">
                  {section.items.map((item, j) => (
                    <AnimateInView key={item} delay={i * 0.12 + j * 0.05} direction="none">
                      <li className="flex items-start text-sm text-gray-300">
                        <svg className="w-4 h-4 text-green-400 mr-2.5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {item}
                      </li>
                    </AnimateInView>
                  ))}
                </ul>
              </div>
            </AnimateInView>
          ))}
        </div>
      </div>
    </section>
  )
}
