import { BetaAnalyticsDataClient } from "@google-analytics/data"

function getClient(): BetaAnalyticsDataClient | null {
  if (
    !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    !process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    !process.env.GA4_PROPERTY_ID
  ) {
    return null
  }
  return new BetaAnalyticsDataClient({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n"),
    },
  })
}

function getPropertyId(): string {
  return `properties/${process.env.GA4_PROPERTY_ID || ""}`
}

// --- Types ---

interface GA4Overview {
  sessions: number
  users: number
  pageviews: number
  bounceRate: number
  avgSessionDuration: number
  newUsers: number
}

interface GA4SourceMedium {
  source: string
  medium: string
  sessions: number
  users: number
  bounceRate: number
}

interface GA4TopPage {
  pagePath: string
  pageviews: number
  avgDuration: number
  bounceRate: number
}

interface GA4Country {
  country: string
  users: number
  sessions: number
}

interface GA4Device {
  deviceCategory: string
  users: number
  sessions: number
}

interface GA4LandingPage {
  landingPage: string
  sessions: number
  users: number
  bounceRate: number
}

interface GA4Realtime {
  activeUsers: number
}

interface GA4AllData {
  overview: GA4Overview | null
  sourceMedium: GA4SourceMedium[] | null
  topPages: GA4TopPage[] | null
  countries: GA4Country[] | null
  devices: GA4Device[] | null
  landingPages: GA4LandingPage[] | null
}

// --- Helper ---

function parseNum(val: string | undefined | null): number {
  if (!val) return 0
  const n = parseFloat(val)
  return isNaN(n) ? 0 : n
}

// --- Functions ---

export async function getGA4Overview(days: number): Promise<GA4Overview | null> {
  const client = getClient()
  if (!client) return null

  try {
    const [response] = await client.runReport({
      property: getPropertyId(),
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
      metrics: [
        { name: "sessions" },
        { name: "totalUsers" },
        { name: "screenPageViews" },
        { name: "bounceRate" },
        { name: "averageSessionDuration" },
        { name: "newUsers" },
      ],
    })

    const row = response.rows?.[0]
    if (!row) return null

    return {
      sessions: parseNum(row.metricValues?.[0]?.value),
      users: parseNum(row.metricValues?.[1]?.value),
      pageviews: parseNum(row.metricValues?.[2]?.value),
      bounceRate: parseNum(row.metricValues?.[3]?.value),
      avgSessionDuration: parseNum(row.metricValues?.[4]?.value),
      newUsers: parseNum(row.metricValues?.[5]?.value),
    }
  } catch (error) {
    console.error("[GA4] Error fetching overview:", error)
    return null
  }
}

export async function getGA4SourceMedium(days: number): Promise<GA4SourceMedium[] | null> {
  const client = getClient()
  if (!client) return null

  try {
    const [response] = await client.runReport({
      property: getPropertyId(),
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
      metrics: [
        { name: "sessions" },
        { name: "totalUsers" },
        { name: "bounceRate" },
      ],
      dimensions: [
        { name: "sessionSource" },
        { name: "sessionMedium" },
      ],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 20,
    })

    return (
      response.rows?.map((row) => ({
        source: row.dimensionValues?.[0]?.value || "(not set)",
        medium: row.dimensionValues?.[1]?.value || "(not set)",
        sessions: parseNum(row.metricValues?.[0]?.value),
        users: parseNum(row.metricValues?.[1]?.value),
        bounceRate: parseNum(row.metricValues?.[2]?.value),
      })) || []
    )
  } catch (error) {
    console.error("[GA4] Error fetching source/medium:", error)
    return null
  }
}

export async function getGA4TopPages(days: number): Promise<GA4TopPage[] | null> {
  const client = getClient()
  if (!client) return null

  try {
    const [response] = await client.runReport({
      property: getPropertyId(),
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
      metrics: [
        { name: "screenPageViews" },
        { name: "averageSessionDuration" },
        { name: "bounceRate" },
      ],
      dimensions: [{ name: "pagePath" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 20,
    })

    return (
      response.rows?.map((row) => ({
        pagePath: row.dimensionValues?.[0]?.value || "/",
        pageviews: parseNum(row.metricValues?.[0]?.value),
        avgDuration: parseNum(row.metricValues?.[1]?.value),
        bounceRate: parseNum(row.metricValues?.[2]?.value),
      })) || []
    )
  } catch (error) {
    console.error("[GA4] Error fetching top pages:", error)
    return null
  }
}

export async function getGA4Countries(days: number): Promise<GA4Country[] | null> {
  const client = getClient()
  if (!client) return null

  try {
    const [response] = await client.runReport({
      property: getPropertyId(),
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
      metrics: [
        { name: "totalUsers" },
        { name: "sessions" },
      ],
      dimensions: [{ name: "country" }],
      orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
      limit: 15,
    })

    return (
      response.rows?.map((row) => ({
        country: row.dimensionValues?.[0]?.value || "(not set)",
        users: parseNum(row.metricValues?.[0]?.value),
        sessions: parseNum(row.metricValues?.[1]?.value),
      })) || []
    )
  } catch (error) {
    console.error("[GA4] Error fetching countries:", error)
    return null
  }
}

export async function getGA4Devices(days: number): Promise<GA4Device[] | null> {
  const client = getClient()
  if (!client) return null

  try {
    const [response] = await client.runReport({
      property: getPropertyId(),
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
      metrics: [
        { name: "totalUsers" },
        { name: "sessions" },
      ],
      dimensions: [{ name: "deviceCategory" }],
      orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
    })

    return (
      response.rows?.map((row) => ({
        deviceCategory: row.dimensionValues?.[0]?.value || "(not set)",
        users: parseNum(row.metricValues?.[0]?.value),
        sessions: parseNum(row.metricValues?.[1]?.value),
      })) || []
    )
  } catch (error) {
    console.error("[GA4] Error fetching devices:", error)
    return null
  }
}

export async function getGA4LandingPages(days: number): Promise<GA4LandingPage[] | null> {
  const client = getClient()
  if (!client) return null

  try {
    const [response] = await client.runReport({
      property: getPropertyId(),
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
      metrics: [
        { name: "sessions" },
        { name: "totalUsers" },
        { name: "bounceRate" },
      ],
      dimensions: [{ name: "landingPage" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 15,
    })

    return (
      response.rows?.map((row) => ({
        landingPage: row.dimensionValues?.[0]?.value || "/",
        sessions: parseNum(row.metricValues?.[0]?.value),
        users: parseNum(row.metricValues?.[1]?.value),
        bounceRate: parseNum(row.metricValues?.[2]?.value),
      })) || []
    )
  } catch (error) {
    console.error("[GA4] Error fetching landing pages:", error)
    return null
  }
}

export async function getGA4Realtime(): Promise<GA4Realtime | null> {
  const client = getClient()
  if (!client) return null

  try {
    const [response] = await client.runRealtimeReport({
      property: getPropertyId(),
      metrics: [{ name: "activeUsers" }],
    })

    const row = response.rows?.[0]
    return {
      activeUsers: parseNum(row?.metricValues?.[0]?.value),
    }
  } catch (error) {
    console.error("[GA4] Error fetching realtime:", error)
    return null
  }
}

export async function fetchAllGA4Data(days: number): Promise<GA4AllData | null> {
  const client = getClient()
  if (!client) return null

  const [overview, sourceMedium, topPages, countries, devices, landingPages] =
    await Promise.all([
      getGA4Overview(days),
      getGA4SourceMedium(days),
      getGA4TopPages(days),
      getGA4Countries(days),
      getGA4Devices(days),
      getGA4LandingPages(days),
    ])

  return {
    overview,
    sourceMedium,
    topPages,
    countries,
    devices,
    landingPages,
  }
}
