import { google } from "googleapis"

function getSearchConsole() {
  if (
    !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    !process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    !process.env.GSC_SITE_URL
  ) {
    return null
  }
  // Handle private key: Vercel may store literal \n or actual newlines
  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  if (privateKey.includes("\\n")) {
    privateKey = privateKey.split("\\n").join("\n")
  }
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  })
  return google.searchconsole({ version: "v1", auth })
}

// --- Types ---

interface GSCOverview {
  impressions: number
  clicks: number
  ctr: number
  position: number
}

interface GSCQuery {
  query: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

interface GSCPage {
  page: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

interface GSCDevice {
  device: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

interface GSCAllData {
  overview: GSCOverview | null
  topQueries: GSCQuery[] | null
  topPages: GSCPage[] | null
  devices: GSCDevice[] | null
}

// --- Helpers ---

function getDateRange(days: number): { startDate: string; endDate: string } {
  const endDate = new Date()
  endDate.setDate(endDate.getDate() - 3) // GSC data delay
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  }
}

// --- Functions ---

export async function getGSCOverview(days: number): Promise<GSCOverview | null> {
  const sc = getSearchConsole()
  if (!sc) return null

  try {
    const { startDate, endDate } = getDateRange(days)

    const res = await sc.searchanalytics.query({
      siteUrl: process.env.GSC_SITE_URL!,
      requestBody: {
        startDate,
        endDate,
      },
    })

    const rows = res.data.rows
    if (!rows || rows.length === 0) {
      return { impressions: 0, clicks: 0, ctr: 0, position: 0 }
    }

    // Aggregate totals from the single row (no dimensions = aggregate)
    const row = rows[0]
    return {
      impressions: row.impressions || 0,
      clicks: row.clicks || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    }
  } catch (error) {
    console.error("[GSC] Error fetching overview:", error)
    return null
  }
}

export async function getGSCTopQueries(
  days: number,
  limit = 20
): Promise<GSCQuery[] | null> {
  const sc = getSearchConsole()
  if (!sc) return null

  try {
    const { startDate, endDate } = getDateRange(days)

    const res = await sc.searchanalytics.query({
      siteUrl: process.env.GSC_SITE_URL!,
      requestBody: {
        startDate,
        endDate,
        dimensions: ["query"],
        rowLimit: limit,
      },
    })

    return (
      res.data.rows?.map((row) => ({
        query: row.keys?.[0] || "",
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      })) || []
    )
  } catch (error) {
    console.error("[GSC] Error fetching top queries:", error)
    return null
  }
}

export async function getGSCTopPages(
  days: number,
  limit = 20
): Promise<GSCPage[] | null> {
  const sc = getSearchConsole()
  if (!sc) return null

  try {
    const { startDate, endDate } = getDateRange(days)

    const res = await sc.searchanalytics.query({
      siteUrl: process.env.GSC_SITE_URL!,
      requestBody: {
        startDate,
        endDate,
        dimensions: ["page"],
        rowLimit: limit,
      },
    })

    return (
      res.data.rows?.map((row) => ({
        page: row.keys?.[0] || "",
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      })) || []
    )
  } catch (error) {
    console.error("[GSC] Error fetching top pages:", error)
    return null
  }
}

export async function getGSCDevices(days: number): Promise<GSCDevice[] | null> {
  const sc = getSearchConsole()
  if (!sc) return null

  try {
    const { startDate, endDate } = getDateRange(days)

    const res = await sc.searchanalytics.query({
      siteUrl: process.env.GSC_SITE_URL!,
      requestBody: {
        startDate,
        endDate,
        dimensions: ["device"],
      },
    })

    return (
      res.data.rows?.map((row) => ({
        device: row.keys?.[0] || "",
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      })) || []
    )
  } catch (error) {
    console.error("[GSC] Error fetching devices:", error)
    return null
  }
}

export async function fetchAllGSCData(days: number): Promise<GSCAllData | null> {
  const sc = getSearchConsole()
  if (!sc) return null

  const [overview, topQueries, topPages, devices] = await Promise.all([
    getGSCOverview(days),
    getGSCTopQueries(days),
    getGSCTopPages(days),
    getGSCDevices(days),
  ])

  return {
    overview,
    topQueries,
    topPages,
    devices,
  }
}
