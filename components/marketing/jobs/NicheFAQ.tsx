interface NicheFAQProps {
  niche: "nursing" | "engineering" | "student-jobs"
}

const NICHE_FAQS: Record<string, Array<{ q: string; a: string }>> = {
  nursing: [
    { q: "What German level do I need for nursing in Germany?", a: "Most hospitals require B1-B2 German. You'll need B1 for the recognition process (Anerkennung) and B2 for full professional registration. Plan Beta trains you from A1 to B2." },
    { q: "What is Anerkennung and how does it work?", a: "Anerkennung is the process of getting your nursing qualification recognized in Germany. It involves document verification, a knowledge test, and German language proof. Plan Beta handles the entire process for you." },
    { q: "How much do nurses earn in Germany?", a: "Nurses in Germany earn EUR 2,800-3,800/month gross, with experienced nurses earning more. You also get free healthcare, 30 days paid vacation, and social security benefits." },
    { q: "Does Plan Beta charge placement fees?", a: "No. Plan Beta does not charge any placement fees for nurses. You pay only for the German language training. Hospital placement is included as part of the pathway." },
  ],
  engineering: [
    { q: "What German level do engineering jobs require?", a: "Most engineering positions require B1-B2 German, though some international companies accept B1. IT roles sometimes start with A2-B1 if the team language is English." },
    { q: "What is the Blue Card and am I eligible?", a: "The EU Blue Card is a work permit for qualified professionals. Engineers with a recognized degree and a job offer above EUR 45,300/year (or EUR 41,000 for shortage occupations) qualify." },
    { q: "How long does it take to learn German for engineering jobs?", a: "With Plan Beta's intensive live classes, you can reach B1 in 6-8 months and B2 in 10-14 months, depending on your study pace." },
    { q: "Are engineering degrees from India recognized in Germany?", a: "Most Indian engineering degrees from recognized universities are accepted for the Blue Card. Some may need partial recognition through anabin database verification." },
  ],
  "student-jobs": [
    { q: "How many hours can international students work in Germany?", a: "International students can work up to 120 full days or 240 half days per year. Mini-jobs (up to EUR 520/month) and Werkstudent positions are the most common options." },
    { q: "What is a Werkstudent position?", a: "A Werkstudent (working student) position allows you to work up to 20 hours/week during semester and full-time during breaks. These jobs are typically in your field of study and pay EUR 12-20/hour." },
    { q: "Do I need German for student jobs?", a: "Basic German (A2-B1) significantly expands your options. English-only jobs exist in IT and hospitality, but German-speaking students access better-paying positions and more opportunities." },
    { q: "What is a mini-job?", a: "A mini-job pays up to EUR 520/month and is tax-free for the employee. Common in retail, gastronomy, and delivery. No German required for many positions." },
  ],
}

export function NicheFAQ({ niche }: NicheFAQProps) {
  const faqs = NICHE_FAQS[niche]
  if (!faqs) return null

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h2 className="text-2xl font-bold text-white mb-8 text-center">Frequently Asked Questions</h2>
      <div className="space-y-4">
        {faqs.map((faq, i) => (
          <details key={i} className="group bg-[#1a1a1a] border border-white/[0.06] rounded-xl overflow-hidden">
            <summary className="flex items-center justify-between p-5 cursor-pointer text-white font-medium hover:text-primary transition-colors list-none">
              <span className="text-sm sm:text-base pr-4">{faq.q}</span>
              <svg className="w-5 h-5 flex-shrink-0 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="px-5 pb-5 text-sm text-gray-400 leading-relaxed">
              {faq.a}
            </div>
          </details>
        ))}
      </div>

      {/* FAQ Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({
              "@type": "Question",
              name: faq.q,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.a,
              },
            })),
          }),
        }}
      />
    </section>
  )
}
