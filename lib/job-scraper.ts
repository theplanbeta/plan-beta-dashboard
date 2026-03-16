/**
 * Job Scraper — dual strategy:
 * 1. JSON API adapters for known sources (Arbeitsagentur, Arbeitnow) — fast, reliable, no AI
 * 2. Gemini fallback for unknown HTML sources — strips noise first, higher token limit
 */

import { prisma } from "@/lib/prisma"
import { generateContent } from "@/lib/gemini-client"

// Timeout for API fetches — must be well within Vercel's function timeout
const FETCH_TIMEOUT_MS = 9_000

function isUrlAllowed(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return false
    const hostname = parsed.hostname
    // Block private/internal IPs
    if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|0\.|169\.254\.|localhost|host\.docker\.internal)/i.test(hostname)) return false
    // Block common cloud metadata endpoints
    if (hostname === 'metadata.google.internal') return false
    return true
  } catch { return false }
}

interface ExtractedJob {
  title: string
  company: string
  location?: string | null
  salaryMin?: number | null
  salaryMax?: number | null
  currency?: string
  germanLevel?: string | null
  profession?: string | null
  jobType?: string | null
  requirements?: string[]
  applyUrl?: string | null
  externalId?: string | null
}

// ─── Known API Adapters ──────────────────────────────────────────────────────

/**
 * Bundesagentur für Arbeit (Agentur für Arbeit) Jobsuche API.
 * Public REST API — requires X-API-Key header (no OAuth needed).
 * Docs: https://github.com/bundesAPI/jobsuche-api
 *
 * Searches for nursing/healthcare/skilled worker jobs in Germany.
 * The URL can include query params to customize the search.
 */
async function fetchArbeitsagentur(url: string): Promise<ExtractedJob[]> {
  // Parse any custom params from the source URL, or use defaults
  const parsed = new URL(url)
  const was = parsed.searchParams.get("was") || "Krankenpfleger" // default: nurses
  const wo = parsed.searchParams.get("wo") || ""
  const size = parsed.searchParams.get("size") || "50"
  const angebotsart = parsed.searchParams.get("angebotsart") || "1" // 1=employment
  const arbeitszeit = parsed.searchParams.get("arbeitszeit") || "" // vz=full, tz=part, mj=mini-job

  const apiUrl = new URL("https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs")
  apiUrl.searchParams.set("was", was)
  if (wo) apiUrl.searchParams.set("wo", wo)
  apiUrl.searchParams.set("size", size)
  apiUrl.searchParams.set("page", "1")
  apiUrl.searchParams.set("angebotsart", angebotsart)
  if (arbeitszeit) apiUrl.searchParams.set("arbeitszeit", arbeitszeit)

  try {
    const res = await fetch(apiUrl.toString(), {
      headers: {
        "X-API-Key": "jobboerse-jobsuche",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })

    if (!res.ok) {
      const msg = `[JobScraper:Arbeitsagentur] API returned ${res.status} ${res.statusText}`
      console.error(msg)
      throw new Error(msg)
    }

    const data = await res.json()
    const jobs = data.stellenangebote || []
    if (!Array.isArray(jobs)) {
      console.error("[JobScraper:Arbeitsagentur] Unexpected response shape:", Object.keys(data))
      return []
    }

    console.log(`[JobScraper:Arbeitsagentur] Found ${data.maxErgebnisse || 0} total, fetched ${jobs.length}`)

    return jobs.map((j: Record<string, unknown>) => {
      const arbeitsort = j.arbeitsort as Record<string, unknown> | null
      const location = arbeitsort
        ? [arbeitsort.ort, arbeitsort.region].filter(Boolean).join(", ")
        : null

      return {
        title: String(j.titel || ""),
        company: String(j.arbeitgeber || "Unknown"),
        location: location || null,
        salaryMin: null,
        salaryMax: null,
        currency: "EUR",
        germanLevel: inferGermanLevelFromBeruf(String(j.beruf || ""), String(j.titel || "")),
        profession: inferProfession([String(j.beruf || "")], String(j.titel || "")),
        jobType: mapJobType(
          [arbeitszeit.includes("tz") || arbeitszeit.includes("mj") ? "Teilzeit" : ""],
          String(j.titel || "")
        ) || "FULL_TIME",
        requirements: [String(j.beruf || "")].filter(Boolean),
        applyUrl: j.externeUrl
          ? String(j.externeUrl)
          : `https://www.arbeitsagentur.de/jobsuche/jobdetail/${String(j.refnr || "")}`,
        externalId: j.refnr ? `ba-${j.refnr}` : null,
      }
    }).filter((j: ExtractedJob) => j.title)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[JobScraper:Arbeitsagentur] Fetch error:", msg)
    throw new Error(`Arbeitsagentur API failed: ${msg}`)
  }
}

/**
 * Infer German level from Beruf (profession) field — BA jobs in Germany
 * typically require at least B1/B2.
 */
function inferGermanLevelFromBeruf(beruf: string, title: string): string | null {
  const text = `${beruf} ${title}`.toLowerCase()
  // Healthcare/nursing — B1 for recognition, B2 for full license
  if (text.match(/pflege|kranken|alten|hebamme|rettung|pflegefach/)) return "B1"
  if (text.match(/arzt|ärztin|medizin|therap|pharma/)) return "B2"
  // Engineering — B1 typically, B2 for client-facing
  if (text.match(/ingenieur|engineer/)) return "B1"
  // IT — often English-friendly
  if (text.match(/software|developer|entwickler|devops|data|IT|programm/i)) return "A2"
  // Hospitality — A2-B1
  if (text.match(/gastro|hotel|koch|küche|restaurant|kellner/)) return "A2"
  // Student jobs — A2 minimum
  if (text.match(/werkstudent|minijob|nebenjob|aushilfe|praktik|studentisch/)) return "A2"
  // Teaching — C1 typically
  if (text.match(/lehrer|dozent|professor|pädagog/)) return "C1"
  // Default for professional jobs on BA
  return "B1"
}

/**
 * Arbeitnow public JSON API — returns 100 jobs per page, structured data.
 * Docs: https://www.arbeitnow.com/api
 */
async function fetchArbeitnow(url: string): Promise<ExtractedJob[]> {
  if (!isUrlAllowed(url)) throw new Error('URL not allowed: blocked by security policy')

  const apiUrl = url.replace(/\/?$/, "").includes("/api/")
    ? url
    : "https://www.arbeitnow.com/api/job-board-api"

  try {
    const res = await fetch(apiUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) {
      const msg = `[JobScraper:Arbeitnow] API returned ${res.status} ${res.statusText}`
      console.error(msg)
      throw new Error(msg)
    }

    const data = await res.json()
    const jobs = data.data || data
    if (!Array.isArray(jobs)) return []

    return jobs.slice(0, 50).map((j: Record<string, unknown>) => {
      const tags = (j.tags as string[]) || []
      const jobTypes = (j.job_types as string[]) || []

      return {
        title: String(j.title || ""),
        company: String(j.company_name || "Unknown"),
        location: j.location ? String(j.location) : null,
        salaryMin: null,
        salaryMax: null,
        currency: "EUR",
        germanLevel: inferGermanLevel(tags, String(j.title || ""), String(j.description || "")),
        profession: inferProfession(tags, String(j.title || "")),
        jobType: mapJobType(jobTypes, String(j.title || "")),
        requirements: extractRequirementsFromTags(tags),
        applyUrl: j.url ? String(j.url) : null,
        externalId: j.slug ? `arbeitnow-${j.slug}` : null,
      }
    }).filter((j: ExtractedJob) => j.title)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[JobScraper:Arbeitnow] Fetch error:", msg)
    throw new Error(`Arbeitnow API failed: ${msg}`)
  }
}

function inferGermanLevel(tags: string[], title: string, description: string): string | null {
  const text = [...tags, title, description].join(" ").toLowerCase()

  // German-language proficiency descriptions (check BEFORE simple level codes)
  // These patterns are more specific and should take priority
  const germanPatterns: { pattern: RegExp; level: string }[] = [
    // Explicit CEFR level mentions with context
    { pattern: /deutschkenntnisse.*?(c2|c1|b2|b1|a2|a1)/i, level: "" }, // extract from match
    { pattern: /deutsch.*?niveau.*?(c2|c1|b2|b1|a2|a1)/i, level: "" },
    { pattern: /sprachniveau.*?(c2|c1|b2|b1|a2|a1)/i, level: "" },
    // Qualitative German descriptions → level mapping
    { pattern: /deutsch.*?muttersprach/i, level: "C2" },
    { pattern: /deutsch.*?(verhandlungssicher|perfekt)/i, level: "C2" },
    { pattern: /deutsch.*?fließend/i, level: "C1" },
    { pattern: /fließend.*?deutsch/i, level: "C1" },
    { pattern: /sehr gute.*?deutschkenntnisse/i, level: "B2" },
    { pattern: /sehr gute.*?deutsch.*?kenntnisse/i, level: "B2" },
    { pattern: /gute.*?deutschkenntnisse/i, level: "B1" },
    { pattern: /gute.*?deutsch.*?kenntnisse/i, level: "B1" },
    { pattern: /grundkenntnisse.*?deutsch/i, level: "A2" },
    { pattern: /deutsch.*?grundkenntnisse/i, level: "A2" },
    { pattern: /basiskenntnisse.*?deutsch/i, level: "A1" },
  ]

  for (const { pattern, level } of germanPatterns) {
    const match = text.match(pattern)
    if (match) {
      if (level === "") {
        // Extract CEFR level from the regex capture group
        const extracted = match[1]?.toUpperCase()
        if (extracted) return extracted
      }
      return level
    }
  }

  // Simple CEFR level code detection (existing logic)
  if (text.includes("c2")) return "C2"
  if (text.includes("c1")) return "C1"
  if (text.includes("b2")) return "B2"
  if (text.includes("b1")) return "B1"
  if (text.includes("a2")) return "A2"
  if (text.includes("a1")) return "A1"
  // "german required" / "deutsch" without level → B1 default
  if (text.includes("german required") || text.includes("deutschkenntnisse")) return "B1"
  // English-only jobs
  if (text.includes("english only") || text.includes("no german")) return "None"
  return null
}

export function inferProfession(tags: string[], title: string): string {
  const text = [...tags, title].join(" ").toLowerCase()
  if (text.match(/nurs|pflege|krankenschwester|krankenpfleger|altenpflege|hebamme|pflegefach|pflegehilf/)) return "Nursing"
  if (text.match(/software|developer|entwickler|devops|frontend|backend|fullstack|data.*sci|programm|web.*dev|java|python|react|angular/i)) return "IT"
  if (text.match(/ingenieur|engineer|maschinenbau|mechanical|electrical|elektro|civil|bauingenieur|fahrzeug|verfahren/)) return "Engineering"
  if (text.match(/arzt|ärztin|doctor|physio|therap|medizin|health|gesundheit|pharma|labor|rettung|sanitäter/)) return "Healthcare"
  if (text.match(/hotel|restaurant|gastro|chef|cook|koch|küche|hospitality|kellner|rezeption|housekeep/)) return "Hospitality"
  if (text.match(/account|finance|buchhal|steuer|audit|controlling|rechnungswesen|finanzbuchhal/)) return "Accounting"
  if (text.match(/teach|lehrer|tutor|professor|dozent|pädagog|erzieh|erzieher/)) return "Teaching"
  // Expanded student jobs patterns
  if (text.match(/werkstudent|studentisch|minijob|nebenjob|aushilfe|student.*job|praktik|studentische\s*hilfskraft|hiwi|450\s*euro|520\s*euro|538\s*euro|teilzeit.*student/)) return "Student Jobs"
  return "Other"
}

/**
 * Generate a URL-friendly slug from job details
 */
export function generateJobSlug(title: string, company: string, location: string | null): string {
  return [title, company, location]
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
}

function mapJobType(types: string[], title?: string): string | null {
  const t = [...types, title || ""].join(" ").toLowerCase()
  // Part-time checks (German + English)
  if (t.includes("teilzeit") || t.includes("part-time") || t.includes("part time") || t.includes("minijob") || t.includes("mini-job") || t.includes("geringfügig")) return "PART_TIME"
  // Working student
  if (t.includes("werkstudent") || t.includes("working student")) return "WORKING_STUDENT"
  // Internship
  if (t.includes("praktik") || t.includes("internship")) return "INTERNSHIP"
  // Full-time checks
  if (t.includes("vollzeit") || t.includes("full-time") || t.includes("full time") || types.some(v => v.toLowerCase() === "full-time")) return "FULL_TIME"
  // Contract/freelance
  if (t.includes("contract") || t.includes("freelance") || t.includes("freiberuf") || t.includes("befristet")) return "CONTRACT"
  return null
}

function extractRequirementsFromTags(tags: string[]): string[] {
  // Return up to 5 meaningful tags as requirements
  return tags
    .filter((t) => t.length > 2 && !["remote", "hybrid", "onsite"].includes(t.toLowerCase()))
    .slice(0, 5)
}

// ─── HTML + Gemini Fallback ──────────────────────────────────────────────────

/**
 * Strip scripts, styles, nav, footer, and collapse whitespace from HTML.
 * Returns text-heavy content that Gemini can parse efficiently.
 */
function cleanHtml(html: string): string {
  return html
    // Remove script and style blocks entirely
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    // Remove nav, footer, header (common noise)
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    // Remove SVG content
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, "")
    // Remove all tag attributes except href (keeps links useful)
    .replace(/<(\w+)\s+(?!href)[^>]*?>/gi, "<$1>")
    // Collapse whitespace
    .replace(/\s{2,}/g, " ")
    .trim()
}

/**
 * Use Gemini to extract job listings from cleaned HTML.
 */
async function extractJobsWithGemini(html: string): Promise<ExtractedJob[]> {
  const cleaned = cleanHtml(html)
  // Take first 60KB of cleaned HTML — much more useful than raw 100KB
  const truncated = cleaned.slice(0, 60_000)

  console.log(`[JobScraper:Gemini] Sending ${truncated.length} chars to Gemini (cleaned from ${html.length})`)

  const prompt = `Extract all job listings from this HTML. Return a JSON array.

For each job:
- title (string, required)
- company (string, required — "Unknown" if not found)
- location (string or null — city in Germany)
- salaryMin (number or null — monthly gross EUR)
- salaryMax (number or null — monthly gross EUR)
- germanLevel (one of: "None","A1","A2","B1","B2","C1","C2", or null)
- profession (one of: "Nursing","IT","Engineering","Healthcare","Hospitality","Accounting","Teaching","Other")
- jobType (one of: "FULL_TIME","PART_TIME","CONTRACT", or null)
- requirements (array of 3-5 strings)
- applyUrl (string or null)
- externalId (string or null)

Return ONLY a valid JSON array. No markdown, no explanation.
If no jobs found, return: []

Limit to the first 20 jobs you find.

HTML:
${truncated}`

  const result = await generateContent(prompt, "gemini-2.0-flash", {
    retries: 2,
    timeout: 60000,
  })

  if (!result.success || !result.content) {
    console.error("[JobScraper:Gemini] Extraction failed:", result.error)
    return []
  }

  try {
    let content = result.content.trim()
    // Strip markdown code fences
    if (content.startsWith("```")) {
      content = content.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?\s*```$/, "")
    }
    const jobs = JSON.parse(content)
    if (!Array.isArray(jobs)) {
      console.error("[JobScraper:Gemini] Response is not an array")
      return []
    }
    const valid = jobs.filter((j: ExtractedJob) => j.title && j.company)
    console.log(`[JobScraper:Gemini] Parsed ${valid.length} valid jobs from response`)
    return valid
  } catch (e) {
    // Log first 500 chars of response for debugging
    console.error("[JobScraper:Gemini] JSON parse failed. Response preview:", result.content.slice(0, 500))
    return []
  }
}

/**
 * Fetch raw HTML from a URL.
 */
async function fetchHtml(url: string): Promise<string | null> {
  if (!isUrlAllowed(url)) throw new Error('URL not allowed: blocked by security policy')

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })

    if (!res.ok) {
      console.error(`[JobScraper] Failed to fetch ${url}: ${res.status}`)
      return null
    }

    return await res.text()
  } catch (error) {
    console.error(`[JobScraper] Error fetching ${url}:`, error)
    return null
  }
}

// ─── Source Router ────────────────────────────────────────────────────────────

/** Known API sources — map URL patterns to their JSON adapter */
const API_ADAPTERS: { pattern: RegExp; fetch: (url: string) => Promise<ExtractedJob[]> }[] = [
  { pattern: /arbeitnow\.com/i, fetch: fetchArbeitnow },
  { pattern: /arbeitsagentur\.de/i, fetch: fetchArbeitsagentur },
]

/**
 * Fetch jobs from a source — uses JSON API if available, Gemini fallback otherwise.
 */
async function fetchJobsFromSource(url: string): Promise<ExtractedJob[]> {
  // Check for known API adapters first
  for (const adapter of API_ADAPTERS) {
    if (adapter.pattern.test(url)) {
      console.log(`[JobScraper] Using API adapter for ${url}`)
      return adapter.fetch(url)
    }
  }

  // Fallback: HTML + Gemini
  console.log(`[JobScraper] Using HTML+Gemini fallback for ${url}`)
  const html = await fetchHtml(url)
  if (!html) return []
  return extractJobsWithGemini(html)
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Scrape a single source: fetch → extract → upsert to DB.
 * Throws on fetch errors so callers get actionable error messages.
 */
export async function scrapeSource(sourceId: string): Promise<{ count: number; error?: string }> {
  const source = await prisma.jobSource.findUnique({ where: { id: sourceId } })
  if (!source || !source.active) {
    return { count: 0, error: "Source not found or inactive" }
  }

  console.log(`[JobScraper] Scraping source: ${source.name} (${source.url})`)

  let jobs: ExtractedJob[]
  try {
    jobs = await fetchJobsFromSource(source.url)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`[JobScraper] Failed to fetch from ${source.name}:`, msg)
    // Update lastFetched so we know we tried, but return the error
    await prisma.jobSource.update({
      where: { id: source.id },
      data: { lastFetched: new Date() },
    })
    return { count: 0, error: msg }
  }

  console.log(`[JobScraper] Extracted ${jobs.length} jobs from ${source.name}`)

  if (jobs.length === 0) {
    await prisma.jobSource.update({
      where: { id: source.id },
      data: { lastFetched: new Date() },
    })
    return { count: 0, error: "No jobs found in response" }
  }

  let upsertCount = 0
  for (const job of jobs) {
    try {
      const externalId = job.externalId || `${source.id}-${job.title}-${job.company}`.slice(0, 200)
      const slug = generateJobSlug(job.title, job.company, job.location || null)

      // Check if slug already exists (to avoid unique constraint violation)
      const existingSlug = await prisma.jobPosting.findUnique({ where: { slug }, select: { id: true, externalId: true } })
      const finalSlug = existingSlug && existingSlug.externalId !== externalId
        ? `${slug}-${externalId?.slice(-6) || Date.now().toString(36)}`
        : slug

      await prisma.jobPosting.upsert({
        where: { externalId },
        create: {
          sourceId: source.id,
          externalId,
          slug: finalSlug,
          title: job.title,
          company: job.company,
          location: job.location || null,
          salaryMin: job.salaryMin || null,
          salaryMax: job.salaryMax || null,
          currency: job.currency || "EUR",
          germanLevel: job.germanLevel || null,
          profession: job.profession || null,
          jobType: job.jobType || null,
          requirements: job.requirements || [],
          applyUrl: job.applyUrl || null,
          postedAt: new Date(),
          active: true,
        },
        update: {
          title: job.title,
          company: job.company,
          location: job.location || null,
          salaryMin: job.salaryMin || null,
          salaryMax: job.salaryMax || null,
          germanLevel: job.germanLevel || null,
          profession: job.profession || null,
          jobType: job.jobType || null,
          requirements: job.requirements || [],
          applyUrl: job.applyUrl || null,
          active: true,
          updatedAt: new Date(),
          // Only set slug if not already set
          ...(!existingSlug ? { slug: finalSlug } : {}),
        },
      })
      upsertCount++
    } catch (error) {
      console.error(`[JobScraper] Failed to upsert job "${job.title}":`, error)
    }
  }

  // Update source metadata
  await prisma.jobSource.update({
    where: { id: source.id },
    data: {
      lastFetched: new Date(),
      jobCount: await prisma.jobPosting.count({ where: { sourceId: source.id, active: true } }),
    },
  })

  console.log(`[JobScraper] Upserted ${upsertCount} jobs for ${source.name}`)
  return { count: upsertCount }
}

/**
 * Scrape all active sources in parallel (up to 3 at a time).
 */
export async function scrapeAllSources(): Promise<{ total: number; results: { source: string; count: number; error?: string }[] }> {
  const allSources = await prisma.jobSource.findMany({ where: { active: true } })
  // Skip push-only sources (kimi-claw, test) — they push via /api/jobs/ingest, not scraped
  const sources = allSources.filter(s => !s.name.includes("(kimi-claw)") && !s.name.includes("(test)"))
  const results: { source: string; count: number; error?: string }[] = []
  let total = 0

  // Process in batches of 3 to avoid overwhelming APIs
  const BATCH_SIZE = 3
  for (let i = 0; i < sources.length; i += BATCH_SIZE) {
    const batch = sources.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.allSettled(
      batch.map(async (source) => {
        const result = await scrapeSource(source.id)
        return { source: source.name, ...result }
      })
    )
    for (const r of batchResults) {
      if (r.status === "fulfilled") {
        results.push(r.value)
        total += r.value.count
      } else {
        const sourceName = batch[batchResults.indexOf(r)]?.name || "Unknown"
        results.push({ source: sourceName, count: 0, error: r.reason?.message || "Unknown error" })
      }
    }
  }

  // Mark old jobs as inactive (posted > 30 days ago)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  await prisma.jobPosting.updateMany({
    where: {
      postedAt: { lt: thirtyDaysAgo },
      active: true,
    },
    data: { active: false },
  })

  return { total, results }
}
