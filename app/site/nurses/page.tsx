import { generatePageMetadata } from "@/lib/seo"
import { InstagramEmbed } from "@/components/marketing/InstagramEmbed"
import { BreadcrumbSchema, FAQSchema } from "@/components/marketing/SEOStructuredData"
import { SocialProofBar } from "@/components/marketing/SocialProofBar"
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
    answer: "Nursing salaries in Germany are competitive and depend on the federal state, facility type, and your specialization. Beyond the base pay, you receive comprehensive health insurance, pension contributions, and 24–30 paid vacation days. We discuss specific offers once you reach the placement stage.",
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

      <SocialProofBar variant="nurse" />

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

      {/* Cross-link → WhatsApp consultation funnel */}
      <section className="py-12 bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-br from-rose-500/10 to-blue-500/10 border border-rose-500/20 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-3">Talk to Plan Beta About Nursing Roles</h2>
            <p className="text-gray-400 text-sm mb-6 max-w-lg mx-auto">
              We match qualified nurses with verified German hospital openings. Tell us about your profile on WhatsApp — we&apos;ll guide you through eligibility, timeline, and next steps.
            </p>
            <a
              href="https://wa.me/919028396035?text=Hi%20Plan%20Beta!%20I%27m%20a%20nurse%20looking%20at%20opportunities%20in%20Germany.%20Can%20you%20share%20what%27s%20a%20fit%20for%20my%20profile%3F"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-full hover:bg-green-700 transition-all shadow-lg shadow-green-600/25"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </section>

      <NurseApplicationForm />
      <NurseCTA />
    </div>
  )
}
