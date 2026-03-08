import Link from "next/link"

const SECTORS = [
  { name: "Nursing & Healthcare", salary: "EUR 2,800-3,800/mo", demand: "Very High", germanLevel: "B1-B2", link: "/jobs/nursing", color: "rose" },
  { name: "Engineering", salary: "EUR 4,200-6,000/mo", demand: "High", germanLevel: "B1-B2", link: "/jobs/engineering", color: "blue" },
  { name: "IT & Software", salary: "EUR 4,500-7,000/mo", demand: "High", germanLevel: "A2-B1", link: "/jobs/engineering", color: "violet" },
  { name: "Hospitality", salary: "EUR 2,200-3,000/mo", demand: "Medium", germanLevel: "A2-B1", link: "/jobs/student-jobs", color: "amber" },
]

const VISA_PATHWAYS = [
  { name: "EU Blue Card", who: "Engineers, IT pros, and skilled professionals with a degree", salary: "Min EUR 45,300/yr (EUR 41,000 for shortage occupations)", timeline: "2-4 weeks processing" },
  { name: "Skilled Worker Visa", who: "Professionals with recognized qualifications (incl. nursing)", salary: "No minimum, must have job offer", timeline: "4-8 weeks processing" },
  { name: "Job Seeker Visa", who: "Qualified professionals who want to search for jobs in Germany", salary: "Proof of EUR 12,000 in savings", timeline: "6 months to find a job" },
  { name: "Ausbildung (Vocational Training)", who: "Young professionals (18-35) wanting hands-on training + salary", salary: "EUR 800-1,200/mo during training", timeline: "2-3 year program" },
]

export default function IndiaJobsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/[0.08] via-transparent to-transparent" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <nav className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-8">
            <a href="/jobs" className="hover:text-white transition-colors">Jobs</a>
            <span>/</span>
            <span className="text-white">From India</span>
          </nav>
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-6">
            How to Get a Job in{" "}
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">Germany</span>
            {" "}from India
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
            Germany needs 400,000+ skilled workers every year. Indian nurses, engineers, and IT professionals are in high demand. Here&apos;s your complete guide.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/germany-pathway" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-full hover:bg-primary-dark transition-all shadow-lg shadow-primary/25">
              Check Your Eligibility
            </Link>
            <a
              href="https://wa.me/919028396035?text=Hi!%20I'm%20in%20India%20and%20interested%20in%20working%20in%20Germany.%20Can%20you%20help%20me%20plan%20my%20pathway?"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-full hover:bg-green-700 transition-all shadow-lg shadow-green-600/25"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
              Talk to Us on WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* Sector Overview */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <h2 className="text-2xl font-bold text-white mb-2 text-center">Top Sectors for Indian Professionals</h2>
        <p className="text-gray-400 text-sm text-center mb-10">These sectors actively recruit from India and offer visa sponsorship</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SECTORS.map((sector) => (
            <Link key={sector.name} href={sector.link} className="group bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-6 hover:border-white/[0.12] transition-all">
              <h3 className="text-lg font-bold text-white mb-3 group-hover:text-primary transition-colors">{sector.name}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Salary Range</span><span className="text-emerald-400 font-medium">{sector.salary}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Demand</span><span className="text-white">{sector.demand}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">German Required</span><span className="text-primary font-medium">{sector.germanLevel}</span></div>
              </div>
              <p className="mt-4 text-sm text-primary font-medium group-hover:underline">Browse real jobs &rarr;</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Visa Pathways */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <h2 className="text-2xl font-bold text-white mb-2 text-center">Visa Pathways to Germany</h2>
        <p className="text-gray-400 text-sm text-center mb-10">Germany offers multiple routes — find which one fits your profile</p>
        <div className="space-y-4">
          {VISA_PATHWAYS.map((visa) => (
            <div key={visa.name} className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-2">{visa.name}</h3>
              <p className="text-gray-400 text-sm mb-3">{visa.who}</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="text-emerald-400">{visa.salary}</span>
                <span className="text-gray-500">{visa.timeline}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link href="/germany-pathway" className="inline-flex items-center gap-2 text-primary hover:text-primary-light transition-colors font-medium">
            Take the eligibility quiz to find your best pathway &rarr;
          </Link>
        </div>
      </section>

      {/* German Language Requirement */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="bg-gradient-to-br from-primary/10 to-rose-500/10 border border-primary/20 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">German is Your Superpower</h2>
          <p className="text-gray-400 max-w-xl mx-auto mb-6">
            Almost every pathway to Germany requires German language skills. Plan Beta teaches you from A1 (complete beginner) to B2 (professional fluency) through live online classes. For nurses, we also handle Anerkennung and hospital placement.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/courses" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-full hover:bg-primary-dark transition-all">
              View German Courses
            </Link>
            <a
              href="https://wa.me/919028396035?text=Hi!%20I%20want%20to%20learn%20German%20to%20work%20in%20Germany.%20What%20course%20should%20I%20start%20with?"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-full hover:bg-green-700 transition-all"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
              Get Guidance on WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <h2 className="text-2xl font-bold text-white mb-8 text-center">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {[
            { q: "Can I get a job in Germany without knowing German?", a: "Some IT and engineering roles in international companies operate in English. However, even for these, basic German (A2-B1) significantly improves your chances and daily life. For nursing and healthcare, B2 German is mandatory." },
            { q: "What is the average salary in Germany for Indian professionals?", a: "IT/Software: EUR 4,500-7,000/mo, Engineering: EUR 4,200-6,000/mo, Nursing: EUR 2,800-3,800/mo, Hospitality: EUR 2,200-3,000/mo. Keep in mind Germany has free healthcare, 30 days vacation, and strong social security." },
            { q: "How long does the process take from India to Germany?", a: "Typically 12-18 months: 6-12 months for German language training (A1 to B1/B2), 2-4 months for visa processing, and 1-2 months for relocation. The exact timeline depends on your profession and pathway." },
            { q: "Does Plan Beta help with the entire process?", a: "Yes, especially for nurses. Plan Beta provides: German language training (A1→B2), Anerkennung support (qualification recognition), and hospital placement in Germany. For other professionals, we provide language training and pathway guidance." },
          ].map((faq, i) => (
            <details key={i} className="group bg-[#1a1a1a] border border-white/[0.06] rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between p-5 cursor-pointer text-white font-medium hover:text-primary transition-colors list-none">
                <span className="text-sm sm:text-base pr-4">{faq.q}</span>
                <svg className="w-5 h-5 flex-shrink-0 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-5 pb-5 text-sm text-gray-400 leading-relaxed">{faq.a}</div>
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
              mainEntity: [
                { q: "Can I get a job in Germany without knowing German?", a: "Some IT and engineering roles in international companies operate in English. However, even for these, basic German (A2-B1) significantly improves your chances and daily life. For nursing and healthcare, B2 German is mandatory." },
                { q: "What is the average salary in Germany for Indian professionals?", a: "IT/Software: EUR 4,500-7,000/mo, Engineering: EUR 4,200-6,000/mo, Nursing: EUR 2,800-3,800/mo, Hospitality: EUR 2,200-3,000/mo." },
                { q: "How long does the process take from India to Germany?", a: "Typically 12-18 months: 6-12 months for German language training, 2-4 months for visa processing, and 1-2 months for relocation." },
                { q: "Does Plan Beta help with the entire process?", a: "Yes. Plan Beta provides German language training (A1-B2), Anerkennung support, and hospital placement for nurses. For other professionals, language training and pathway guidance." },
              ].map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
            }),
          }}
        />
      </section>
    </div>
  )
}
