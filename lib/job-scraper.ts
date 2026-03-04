/**
 * Job Scraper — dual strategy:
 * 1. JSON API adapters for known sources (Arbeitnow, etc.) — fast, reliable, no AI
 * 2. Gemini fallback for unknown HTML sources — strips noise first, higher token limit
 */

import { prisma } from "@/lib/prisma"
import { generateContent } from "@/lib/gemini-client"

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
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      console.error(`[JobScraper:Arbeitsagentur] API returned ${res.status}`)
      return []
    }

    const data = await res.json()
    const jobs = data.stellenangebote || []
    if (!Array.isArray(jobs)) return []

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
        jobType: arbeitszeit.includes("tz") || arbeitszeit.includes("mj") ? "PART_TIME" : "FULL_TIME",
        requirements: [String(j.beruf || "")].filter(Boolean),
        applyUrl: j.externeUrl
          ? String(j.externeUrl)
          : `https://www.arbeitsagentur.de/jobsuche/jobdetail/${String(j.refnr || "")}`,
        externalId: j.refnr ? `ba-${j.refnr}` : null,
      }
    }).filter((j: ExtractedJob) => j.title)
  } catch (error) {
    console.error("[JobScraper:Arbeitsagentur] Fetch error:", error)
    return []
  }
}

/**
 * Infer German level from Beruf (profession) field — BA jobs in Germany
 * typically require at least B1/B2.
 */
function inferGermanLevelFromBeruf(beruf: string, title: string): string | null {
  const text = `${beruf} ${title}`.toLowerCase()
  // Nursing/healthcare in Germany typically requires B1-B2
  if (text.match(/pflege|kranken|alten|hebamme|rettung/)) return "B1"
  if (text.match(/arzt|ärztin|medizin|therap/)) return "B2"
  if (text.match(/ingenieur|engineer/)) return "B1"
  // Most jobs on BA require some German
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
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) {
      console.error(`[JobScraper:Arbeitnow] API returned ${res.status}`)
      return []
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
        jobType: mapJobType(jobTypes),
        requirements: extractRequirementsFromTags(tags),
        applyUrl: j.url ? String(j.url) : null,
        externalId: j.slug ? `arbeitnow-${j.slug}` : null,
      }
    }).filter((j: ExtractedJob) => j.title)
  } catch (error) {
    console.error("[JobScraper:Arbeitnow] Fetch error:", error)
    return []
  }
}

function inferGermanLevel(tags: string[], title: string, description: string): string | null {
  const text = [...tags, title, description].join(" ").toLowerCase()
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

function inferProfession(tags: string[], title: string): string {
  const text = [...tags, title].join(" ").toLowerCase()
  if (text.match(/nurs|pflege|krankenschwester/)) return "Nursing"
  if (text.match(/software|developer|engineer.*software|devops|frontend|backend|fullstack|data.*sci/)) return "IT"
  if (text.match(/engineer|ingenieur|mechanical|electrical|civil/)) return "Engineering"
  if (text.match(/doctor|arzt|physio|therap|medic|health|gesundheit|pharma/)) return "Healthcare"
  if (text.match(/hotel|restaurant|gastro|chef|cook|hospitality/)) return "Hospitality"
  if (text.match(/account|finance|buchhal|steuer|audit/)) return "Accounting"
  if (text.match(/teach|lehrer|tutor|professor|dozent/)) return "Teaching"
  return "Other"
}

function mapJobType(types: string[]): string | null {
  const t = types.join(" ").toLowerCase()
  if (t.includes("full")) return "FULL_TIME"
  if (t.includes("part")) return "PART_TIME"
  if (t.includes("contract") || t.includes("freelance")) return "CONTRACT"
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
      signal: AbortSignal.timeout(30000),
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
 */
export async function scrapeSource(sourceId: string): Promise<{ count: number; error?: string }> {
  const source = await prisma.jobSource.findUnique({ where: { id: sourceId } })
  if (!source || !source.active) {
    return { count: 0, error: "Source not found or inactive" }
  }

  console.log(`[JobScraper] Scraping source: ${source.name} (${source.url})`)

  const jobs = await fetchJobsFromSource(source.url)
  console.log(`[JobScraper] Extracted ${jobs.length} jobs from ${source.name}`)

  if (jobs.length === 0) {
    // Still update lastFetched so we know we tried
    await prisma.jobSource.update({
      where: { id: source.id },
      data: { lastFetched: new Date() },
    })
    return { count: 0, error: "No jobs extracted" }
  }

  let upsertCount = 0
  for (const job of jobs) {
    try {
      // Dedup key: externalId if available, otherwise hash of title+company
      const externalId = job.externalId || `${source.id}-${job.title}-${job.company}`.slice(0, 200)

      await prisma.jobPosting.upsert({
        where: { externalId },
        create: {
          sourceId: source.id,
          externalId,
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
 * Scrape all active sources.
 */
export async function scrapeAllSources(): Promise<{ total: number; results: { source: string; count: number; error?: string }[] }> {
  const sources = await prisma.jobSource.findMany({ where: { active: true } })
  const results: { source: string; count: number; error?: string }[] = []
  let total = 0

  for (const source of sources) {
    const result = await scrapeSource(source.id)
    results.push({ source: source.name, ...result })
    total += result.count
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
