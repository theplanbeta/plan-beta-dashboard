import { generatePageMetadata } from "@/lib/seo"

export const metadata = generatePageMetadata({
  title: "Germany Eligibility Checker — Check If You Qualify to Work in Germany",
  description:
    "Free Germany eligibility checker. Get a personalized pathway to work in Germany — visa options, German level requirements, salary expectations, and a step-by-step timeline.",
  keywords: [
    "work in germany from india",
    "germany eligibility check",
    "can i work in germany",
    "germany visa for indian nurses",
    "germany job seeker visa",
    "blue card germany",
    "ausbildung germany",
    "germany pathway checker",
    "nursing in germany eligibility",
    "germany work visa requirements",
  ],
  path: "/germany-pathway",
})

export default function PathwayLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* FAQ Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "Can I work in Germany from India?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes! Germany has multiple visa pathways for Indian professionals including the Blue Card for qualified workers, Skilled Worker Visa, Job Seeker Visa, and Ausbildung (vocational training). Requirements vary by profession and qualification.",
                },
              },
              {
                "@type": "Question",
                name: "What German level do I need to work in Germany?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Most jobs require B1-B2 German. Nursing requires B1-B2, IT may start with B1, and healthcare requires C1. Some English-only IT positions exist but German greatly improves opportunities.",
                },
              },
              {
                "@type": "Question",
                name: "How long does it take to move to Germany from India?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Typically 8-18 months depending on your starting point. This includes learning German (4-12 months), document preparation (2-3 months), and visa processing (1-3 months).",
                },
              },
              {
                "@type": "Question",
                name: "What is the salary in Germany for Indian workers?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "German salaries are competitive and vary by profession, state, and experience. Beyond pay, Germany offers excellent benefits including comprehensive health insurance, pension contributions, and 30 days paid vacation — the overall package is what makes it attractive. Plan Beta walks you through what to expect for your profile.",
                },
              },
              {
                "@type": "Question",
                name: "What is the Blue Card for Germany?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "The EU Blue Card is a work permit for highly qualified professionals with a university degree. It requires a job offer with a minimum salary of approximately EUR 45,300/year (or EUR 41,000 for shortage occupations like IT and engineering).",
                },
              },
            ],
          }),
        }}
      />
      {/* WebApplication Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Germany Eligibility Checker",
            url: "https://theplanbeta.com/germany-pathway",
            applicationCategory: "UtilityApplication",
            operatingSystem: "Web",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "INR",
            },
            description:
              "Free tool to check your eligibility to work in Germany. Get personalized visa recommendations, German level requirements, and a step-by-step timeline.",
          }),
        }}
      />
      {children}
    </>
  )
}
