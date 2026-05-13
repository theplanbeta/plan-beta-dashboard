// Post-generation validator for AI-written blog content. The prompts forbid
// salary ranges and require a mid-post blockquote CTA, but the model can
// (and sometimes does) ignore those instructions. This is the regex layer
// that catches violations after the fact so reviewers see them flagged
// instead of approving a post that quietly violates marketing's rules.

export interface ValidationWarning {
  rule: "salary_range" | "missing_mid_post_cta" | "weak_closing_cta"
  detail: string
}

// Salary-range detector. Matches things like:
//   €2,800-4,500/month
//   €2,800 – €4,500 per month
//   EUR 4,500-7,000/mo
//   €2,800-4,500/year
// Deliberately does NOT match single values like "€45,300" (Blue Card minimum)
// or "€538/month" (Minijob ceiling) — those are legal thresholds and allowed.
const SALARY_RANGE = /(?:€|eur)\s*[\d,]+\s*[-–—]\s*(?:€|eur)?\s*[\d,]+\s*(?:\/|per)?\s*(?:month|mo|mth|year|yr|annum)/i

// Mid-post CTA detector. Must be:
//   - a markdown blockquote line (starts with `>`)
//   - containing bold text (**...**)
//   - containing a markdown link [text](url)
// Multi-line check so the blockquote can be anywhere in the post.
const MID_POST_CTA = /^>\s*.*\*\*[^*\n]+\*\*[^\n]*\[[^\]]+\]\([^)]+\)/m

// Weak closing-CTA detector. The prompt asks reviewers to ban soft phrasings.
// If the LAST ~500 chars of content match these patterns, the closing CTA is
// likely too soft for conversion.
const WEAK_CLOSING_PATTERNS = [
  /\bfeel free to (?:contact|reach out|message)/i,
  /\b(?:get|stay) in touch\b/i,
  /\blet us know if/i,
  /\bdon't hesitate\b/i,
]

export function validateBlogContent(content: string): ValidationWarning[] {
  const warnings: ValidationWarning[] = []

  const salaryMatch = content.match(SALARY_RANGE)
  if (salaryMatch) {
    warnings.push({
      rule: "salary_range",
      detail: `Found salary range "${salaryMatch[0]}". Marketing rule: no salary ranges; use qualitative language and funnel to consultation.`,
    })
  }

  if (!MID_POST_CTA.test(content)) {
    warnings.push({
      rule: "missing_mid_post_cta",
      detail:
        'No mid-post blockquote CTA found. Expected format: `> **Question?** [Direct next step](funnel-url)` somewhere in the post.',
    })
  }

  const tail = content.slice(-800)
  const weakMatch = WEAK_CLOSING_PATTERNS.find((p) => p.test(tail))
  if (weakMatch) {
    warnings.push({
      rule: "weak_closing_cta",
      detail: `Closing CTA uses soft phrasing matching ${weakMatch}. Rewrite as a direct next step ("Book a free consultation", "Run the eligibility check", "Message us on WhatsApp").`,
    })
  }

  return warnings
}

// Formats validator warnings as a single review-notes string. Prefixed so
// reviewers can tell auto-flagged content apart from human comments.
export function formatWarningsAsNote(warnings: ValidationWarning[]): string {
  if (warnings.length === 0) return ""
  const lines = warnings.map((w) => `[auto-validator:${w.rule}] ${w.detail}`)
  return lines.join("\n")
}
