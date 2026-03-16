import { generatePageMetadata } from "@/lib/seo"
import { InstagramEmbed } from "@/components/marketing/InstagramEmbed"
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
    "No-fee German training & hospital placement for B2 certified BSc/GNM nurses. Freshers welcome. Goethe certification. Altenpflege & Krankenpflege jobs in Germany.",
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
  path: "/nurses",
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
          { name: "Home", url: "https://theplanbeta.com" },
          { name: "Nursing Program", url: "https://theplanbeta.com/nurses" },
        ]}
      />
      <FAQSchema faqs={faqs} />

      <NurseHero />

      {/* Deposit Transparency — compact trust signal above the fold */}
      <section className="py-10 bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl px-6 py-6 sm:px-8 sm:py-7">
            <div className="flex items-start gap-4">
              <div className="hidden sm:flex w-10 h-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 mt-0.5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-white mb-2">
                  Transparent Investment Policy
                </h2>
                <p className="text-sm sm:text-base text-gray-400 leading-relaxed mb-3">
                  <span className="text-emerald-400 font-medium">B2 certified nurses pay no deposit.</span>{" "}
                  Others: Rs. 20,000–55,000 based on current language level — <span className="text-white font-medium">100% refundable</span> upon job contract issuance.
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  This refundable deposit ensures commitment from both sides and is returned in full when your German employer issues your job contract.
                </p>
                <a
                  href="#eligibility"
                  className="inline-flex items-center text-sm text-primary hover:text-primary-light transition-colors gap-1.5 font-medium"
                >
                  View full deposit breakdown
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <NurseStats />

      {/* Recruitment Reel */}
      <section className="py-12 bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              See How We Help Nurses Get to Germany
            </h2>
            <p className="text-gray-400">
              Watch how our recruitment process works — from language training to hospital placement.
            </p>
          </div>
          <div className="flex justify-center">
            <InstagramEmbed
              url="https://www.instagram.com/reel/DUI3c0okhnL/"
              title="Watch: How we help nurses get to Germany"
              thumbnail="/instagram/nursing-recruitment.jpg"
            />
          </div>
        </div>
      </section>

      <NurseLifeInGermany />

      {/* Inline Apply CTA */}
      <section className="py-10 bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-lg text-gray-400 mb-4">Ready to start your nursing career in Germany?</p>
          <a
            href="#apply"
            className="inline-flex items-center justify-center px-8 py-3.5 bg-primary text-white font-semibold rounded-full hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 hover:shadow-xl gap-2"
          >
            Apply Now — No Fees
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </a>
        </div>
      </section>

      <NurseBenefits />
      <NurseTimeline />

      {/* Inline Apply CTA */}
      <section className="py-10 bg-[#111]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-lg text-gray-400 mb-4">Take the first step — upload your CV and we&apos;ll guide you through</p>
          <a
            href="#apply"
            className="inline-flex items-center justify-center px-8 py-3.5 bg-primary text-white font-semibold rounded-full hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 hover:shadow-xl gap-2"
          >
            Apply Now — No Fees
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </a>
        </div>
      </section>

      <NurseEligibility />
      <NurseFAQ faqs={faqs} />

      {/* Cross-link to nursing job board */}
      <section className="py-12 bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-br from-rose-500/10 to-blue-500/10 border border-rose-500/20 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-3">Browse Real Nursing Jobs in Germany</h2>
            <p className="text-gray-400 text-sm mb-6 max-w-lg mx-auto">
              See what hospitals are hiring right now. Live job listings from across Germany, updated daily.
            </p>
            <a
              href="/jobs/nursing"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-full hover:bg-primary-dark transition-all"
            >
              View Nursing Jobs
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      <NurseApplicationForm />
      <NurseCTA />
    </div>
  )
}
