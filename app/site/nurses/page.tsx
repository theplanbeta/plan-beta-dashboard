import { generatePageMetadata } from "@/lib/seo"
import { BreadcrumbSchema, FAQSchema } from "@/components/marketing/SEOStructuredData"
import { NurseHero } from "@/components/marketing/sections/NurseHero"
import { NurseStats } from "@/components/marketing/sections/NurseStats"
import { NurseEligibility } from "@/components/marketing/sections/NurseEligibility"
import { NurseTimeline } from "@/components/marketing/sections/NurseTimeline"
import { NurseBenefits } from "@/components/marketing/sections/NurseBenefits"
import { NurseLifeInGermany } from "@/components/marketing/sections/NurseLifeInGermany"
import { NurseFAQ } from "@/components/marketing/sections/NurseFAQ"
import { NurseApplicationForm } from "@/components/marketing/sections/NurseApplicationForm"
import { NurseCTA } from "@/components/marketing/sections/NurseCTA"

export const metadata = generatePageMetadata({
  title: "Nursing in Germany | Plan Beta - B2 Training & Hospital Placement",
  description:
    "Free German training & hospital placement for B2 certified BSc/GNM nurses. Freshers welcome. Goethe certification. Altenpflege & Krankenpflege jobs in Germany.",
  keywords: [
    "german nursing program",
    "nurses germany",
    "german language for nurses",
    "nursing jobs germany",
    "bsc nursing germany",
    "gnm nursing germany",
    "altenpflege germany",
    "krankenpflege germany",
    "nurse recruitment germany",
    "indian nurses germany",
    "elderly care germany",
    "fresher nurse germany",
    "gnm nurse jobs abroad",
  ],
  path: "/site/nurses",
})

const faqs = [
  {
    question: "What qualifications do I need to apply?",
    answer: "You need a BSc Nursing or GNM Nursing degree. Both freshers and experienced nurses are welcome to apply. Additionally, you need to achieve B2 level German language proficiency for nursing recognition in Germany — we train you from any starting level.",
  },
  {
    question: "What is the security deposit?",
    answer: "A refundable security deposit is required based on your current German language level: B2 — no deposit, B1 — Rs. 20,000, A2 — Rs. 30,000, A1 — Rs. 40,000, No proficiency — Rs. 55,000. The full deposit is refunded upon successful issuance of your job contract.",
  },
  {
    question: "When do I get my deposit back?",
    answer: "The full security deposit is refunded once your job contract with a German employer is successfully issued. This policy ensures compliance with employer requirements and supports successful placement.",
  },
  {
    question: "What level of German do I need?",
    answer: "B2 is the language level required for nursing recognition in Germany. Our training covers all levels from beginner to B2 with dedicated exam preparation for Goethe or TELC certification.",
  },
  {
    question: "How long does the entire process take?",
    answer: "The language training duration depends on your starting level. From scratch to B2 takes approximately 12–14 months. If you already have some German, it's faster. After clearing the B2 exam, the visa and placement process takes another 3–6 months.",
  },
  {
    question: "Will I work in a hospital or care home?",
    answer: "Both options are available. We partner with Krankenhäuser (hospitals) and Altenpflegeheime (elderly care homes) across Germany. Your placement depends on your qualifications and preferences.",
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
    <div className="overflow-hidden">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://theplanbeta.com/site" },
          { name: "Nursing Program", url: "https://theplanbeta.com/site/nurses" },
        ]}
      />
      <FAQSchema faqs={faqs} />

      <NurseHero />
      <NurseStats />
      <NurseLifeInGermany />

      {/* Inline Apply CTA */}
      <section className="py-10 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-lg text-gray-600 mb-4">Ready to start your nursing career in Germany?</p>
          <a
            href="#apply"
            className="inline-flex items-center justify-center px-8 py-3.5 bg-primary text-white font-semibold rounded-full hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 hover:shadow-xl gap-2"
          >
            Apply Now — It&apos;s Free
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </a>
        </div>
      </section>

      <NurseBenefits />
      <NurseTimeline />

      {/* Inline Apply CTA */}
      <section className="py-10 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-lg text-gray-600 mb-4">Take the first step — upload your CV and we&apos;ll guide you through</p>
          <a
            href="#apply"
            className="inline-flex items-center justify-center px-8 py-3.5 bg-primary text-white font-semibold rounded-full hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 hover:shadow-xl gap-2"
          >
            Apply Now — It&apos;s Free
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </a>
        </div>
      </section>

      <NurseEligibility />
      <NurseFAQ faqs={faqs} />
      <NurseApplicationForm />
      <NurseCTA />
    </div>
  )
}
