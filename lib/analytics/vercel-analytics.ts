const VERCEL_API = "https://vercel.com/api"

function getHeaders(): HeadersInit | null {
  if (!process.env.VERCEL_API_TOKEN) return null
  return { Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}` }
}

function getParams(): string {
  const teamId = process.env.VERCEL_TEAM_ID || ""
  const projectId = process.env.VERCEL_PROJECT_ID || ""
  return `teamId=${teamId}&projectId=${projectId}`
}

function getTimeRange(days: number): { from: string; to: string } {
  return {
    from: new Date(Date.now() - days * 86400000).toISOString(),
    to: new Date().toISOString(),
  }
}

// --- Types ---

interface VercelWebAnalytics {
  pageviews: number
  visitors: number
  bounceRate: number
  visitDuration: number
}

interface VercelTopPage {
  page: string
  views: number
}

interface VercelReferrer {
  referrer: string
  views: number
}

interface VercelCountry {
  country: string
  views: number
}

interface VercelWebVitals {
  lcp: number | null
  inp: number | null
  cls: number | null
  fcp: number | null
  ttfb: number | null
}

interface VercelAllData {
  webAnalytics: VercelWebAnalytics | null
  topPages: VercelTopPage[] | null
  topReferrers: VercelReferrer[] | null
  countries: VercelCountry[] | null
  webVitals: VercelWebVitals | null
}

// --- Functions ---

export async function getVercelWebAnalytics(
  days: number
): Promise<VercelWebAnalytics | null> {
  const headers = getHeaders()
  if (!headers) return null

  try {
    const { from, to } = getTimeRange(days)
    const url = `${VERCEL_API}/v1/web-analytics/overview?${getParams()}&from=${from}&to=${to}`
    const res = await fetch(url, { headers })

    if (!res.ok) {
      console.error("[Vercel] Web analytics error:", res.status, await res.text())
      return null
    }

    const data = await res.json()
    return {
      pageviews: data.pageviews ?? 0,
      visitors: data.visitors ?? 0,
      bounceRate: data.bounceRate ?? 0,
      visitDuration: data.visitDuration ?? 0,
    }
  } catch (error) {
    console.error("[Vercel] Error fetching web analytics:", error)
    return null
  }
}

export async function getVercelTopPages(
  days: number
): Promise<VercelTopPage[] | null> {
  const headers = getHeaders()
  if (!headers) return null

  try {
    const { from, to } = getTimeRange(days)
    const url = `${VERCEL_API}/v1/web-analytics/pages?${getParams()}&from=${from}&to=${to}&limit=20`
    const res = await fetch(url, { headers })

    if (!res.ok) {
      console.error("[Vercel] Top pages error:", res.status, await res.text())
      return null
    }

    const data = await res.json()
    return (
      data.data?.map((item: any) => ({
        page: item.key || item.page || "",
        views: item.total || item.views || 0,
      })) || []
    )
  } catch (error) {
    console.error("[Vercel] Error fetching top pages:", error)
    return null
  }
}

export async function getVercelTopReferrers(
  days: number
): Promise<VercelReferrer[] | null> {
  const headers = getHeaders()
  if (!headers) return null

  try {
    const { from, to } = getTimeRange(days)
    const url = `${VERCEL_API}/v1/web-analytics/referrers?${getParams()}&from=${from}&to=${to}&limit=20`
    const res = await fetch(url, { headers })

    if (!res.ok) {
      console.error("[Vercel] Top referrers error:", res.status, await res.text())
      return null
    }

    const data = await res.json()
    return (
      data.data?.map((item: any) => ({
        referrer: item.key || item.referrer || "",
        views: item.total || item.views || 0,
      })) || []
    )
  } catch (error) {
    console.error("[Vercel] Error fetching top referrers:", error)
    return null
  }
}

export async function getVercelCountries(
  days: number
): Promise<VercelCountry[] | null> {
  const headers = getHeaders()
  if (!headers) return null

  try {
    const { from, to } = getTimeRange(days)
    const url = `${VERCEL_API}/v1/web-analytics/countries?${getParams()}&from=${from}&to=${to}&limit=15`
    const res = await fetch(url, { headers })

    if (!res.ok) {
      console.error("[Vercel] Countries error:", res.status, await res.text())
      return null
    }

    const data = await res.json()
    return (
      data.data?.map((item: any) => ({
        country: item.key || item.country || "",
        views: item.total || item.views || 0,
      })) || []
    )
  } catch (error) {
    console.error("[Vercel] Error fetching countries:", error)
    return null
  }
}

export async function getVercelWebVitals(
  days: number
): Promise<VercelWebVitals | null> {
  const headers = getHeaders()
  if (!headers) return null

  try {
    const { from, to } = getTimeRange(days)
    const url = `${VERCEL_API}/v1/speed-insights/overview?${getParams()}&from=${from}&to=${to}`
    const res = await fetch(url, { headers })

    if (!res.ok) {
      console.error("[Vercel] Web vitals error:", res.status, await res.text())
      return null
    }

    const data = await res.json()

    // Extract p75 values from the response
    const getP75 = (metric: any): number | null => {
      if (!metric) return null
      return metric.p75 ?? metric.value ?? null
    }

    return {
      lcp: getP75(data.lcp),
      inp: getP75(data.inp),
      cls: getP75(data.cls),
      fcp: getP75(data.fcp),
      ttfb: getP75(data.ttfb),
    }
  } catch (error) {
    console.error("[Vercel] Error fetching web vitals:", error)
    return null
  }
}

export async function fetchAllVercelData(
  days: number
): Promise<VercelAllData | null> {
  const headers = getHeaders()
  if (!headers) return null

  const [webAnalytics, topPages, topReferrers, countries, webVitals] =
    await Promise.all([
      getVercelWebAnalytics(days),
      getVercelTopPages(days),
      getVercelTopReferrers(days),
      getVercelCountries(days),
      getVercelWebVitals(days),
    ])

  return {
    webAnalytics,
    topPages,
    topReferrers,
    countries,
    webVitals,
  }
}
