// Profile-targeted CTAs for blog posts.
//
// Marketing's rule (May 13 2026): every blog post must end with a CTA that
// matches the reader's profile, not a generic "View Courses / Contact Us".
// The shape returned here is consumed both by the blog detail page renderer
// and by the AI generator (the prompt is given the same set of profiles so
// the in-content mid-post CTA stays consistent with the closing banner).

export type ReaderProfile =
  | "nurse"
  | "engineer"
  | "it"
  | "student"
  | "visa-seeker"
  | "general"

export const READER_PROFILES: ReaderProfile[] = [
  "nurse",
  "engineer",
  "it",
  "student",
  "visa-seeker",
  "general",
]

import { marketingWhatsAppUrl } from "@/lib/marketing-constants"

const NURSE_WHATSAPP = marketingWhatsAppUrl(
  "Hi Plan Beta! I'm a nurse looking at opportunities in Germany. Can you share what's a fit for my profile?"
)

const GENERAL_WHATSAPP = marketingWhatsAppUrl(
  "Hi Plan Beta! I just read one of your blog posts and want to learn more about moving to Germany."
)

export interface BlogCta {
  eyebrow: string
  headline: string
  body: string
  primaryLabel: string
  primaryHref: string
  primaryExternal: boolean
  secondaryLabel?: string
  secondaryHref?: string
}

export function ctaForProfile(profile: ReaderProfile | string | null | undefined): BlogCta {
  switch (profile) {
    case "nurse":
      return {
        eyebrow: "For nurses",
        headline: "Ready for Germany as a nurse?",
        body: "We help BSc/GNM nurses reach B2 German and place them in verified German hospitals — no agent fees. Tell us about your profile on WhatsApp and we'll map your timeline.",
        primaryLabel: "Talk to Plan Beta on WhatsApp",
        primaryHref: NURSE_WHATSAPP,
        primaryExternal: true,
        secondaryLabel: "Or read the nursing program",
        secondaryHref: "/nurses",
      }
    case "engineer":
      return {
        eyebrow: "For engineers",
        headline: "Check your Blue Card eligibility in 60 seconds",
        body: "Engineers with a recognized degree and B1+ German have one of the fastest visa routes. Run our free eligibility check, then book a planning call.",
        primaryLabel: "Take the eligibility quiz",
        primaryHref: "/germany-pathway",
        primaryExternal: false,
        secondaryLabel: "Talk to us on WhatsApp",
        secondaryHref: GENERAL_WHATSAPP,
      }
    case "it":
      return {
        eyebrow: "For IT professionals",
        headline: "Get to a Berlin/Munich offer faster — with the right German level",
        body: "Most IT roles need B1 German even when the team works in English. Book a quick call and we'll plan the minimum German path for your target city and visa.",
        primaryLabel: "Plan my path on WhatsApp",
        primaryHref: GENERAL_WHATSAPP,
        primaryExternal: true,
        secondaryLabel: "See current courses",
        secondaryHref: "/courses",
      }
    case "student":
      return {
        eyebrow: "Studying in Germany",
        headline: "Start with the right A1 batch — not a YouTube playlist",
        body: "Our live A1–B2 courses are built for Indian students moving to Germany. Book a free consultation; we'll place you in the batch that matches your timeline.",
        primaryLabel: "View live batches",
        primaryHref: "/courses",
        primaryExternal: false,
        secondaryLabel: "Talk to a counsellor on WhatsApp",
        secondaryHref: GENERAL_WHATSAPP,
      }
    case "visa-seeker":
      return {
        eyebrow: "Visa & immigration",
        headline: "Not sure which German visa fits your profile?",
        body: "Blue Card, Skilled Worker, Job Seeker, Ausbildung — each has different German-level requirements and timelines. Take our free 60-second eligibility check.",
        primaryLabel: "Run the eligibility check",
        primaryHref: "/germany-pathway",
        primaryExternal: false,
        secondaryLabel: "Ask Plan Beta on WhatsApp",
        secondaryHref: GENERAL_WHATSAPP,
      }
    case "general":
    default:
      return {
        eyebrow: "Next step",
        headline: "Move from reading to planning",
        body: "Tell us where you are right now — your German level, your goal, your timeline. We'll map the next 90 days and the right Plan Beta batch for you.",
        primaryLabel: "Book a free consultation",
        primaryHref: "/contact",
        primaryExternal: false,
        secondaryLabel: "Quick chat on WhatsApp",
        secondaryHref: GENERAL_WHATSAPP,
      }
  }
}

// Heuristic fallback when readerProfile is missing (older posts written before
// the field was added). Looks at category, then tags, then title/keywords.
export function inferReaderProfile(post: {
  category: string
  tags: string[]
  title: string
  targetKeyword: string | null
}): ReaderProfile {
  const haystack = [
    post.category,
    ...post.tags,
    post.title,
    post.targetKeyword || "",
  ]
    .join(" ")
    .toLowerCase()

  if (/\bnurs(e|ing|es)\b|krankenpflege|altenpflege|gnm|bsc nursing/.test(haystack)) {
    return "nurse"
  }
  if (/\bengineer(ing)?\b|mechanical|electrical|blue card.*engineer/.test(haystack)) {
    return "engineer"
  }
  // NOTE: do NOT use /\bIT\b/i — against a lowercased haystack it matches the
  // pronoun "it" and miscategorises almost every post. Require IT in a compound
  // ("IT professional", "IT industry", "IT job") or rely on the other terms.
  if (/\bit (professional|industry|job|role|career|sector|company|companies|consultant|specialist)\b|software|developer|tech (hub|company|industry|job|role)|programming|coding|fullstack|frontend|backend|devops|saas/.test(haystack)) {
    return "it"
  }
  if (/visa|ausbildung|blue card|aufenthalt|immigration|chancenkarte/.test(haystack)) {
    return "visa-seeker"
  }
  if (/student|university|study|uni|sommersemester|wintersemester/.test(haystack)) {
    return "student"
  }
  return "general"
}
