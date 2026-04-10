const APIFY_BASE = "https://api.apify.com/v2"

function getToken() {
  const token = process.env.APIFY_API_TOKEN
  if (!token) throw new Error("APIFY_API_TOKEN not configured")
  return token
}

async function runActor(actorId: string, input: Record<string, unknown>) {
  const token = getToken()
  const res = await fetch(
    `${APIFY_BASE}/acts/${actorId}/runs?token=${token}&waitForFinish=120`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  )
  if (!res.ok) throw new Error(`Apify run failed: ${res.status} ${await res.text()}`)
  const run = await res.json()
  const data = run.data || run
  if (data.status !== "SUCCEEDED") throw new Error(`Apify run status: ${data.status}`)
  return data.defaultDatasetId as string
}

async function getDatasetItems<T>(datasetId: string): Promise<T[]> {
  const token = getToken()
  const res = await fetch(`${APIFY_BASE}/datasets/${datasetId}/items?token=${token}`)
  if (!res.ok) throw new Error(`Apify dataset fetch failed: ${res.status}`)
  return res.json()
}

export async function scrapeInstagramProfile(username: string) {
  const datasetId = await runActor("apify~instagram-profile-scraper", {
    usernames: [username],
  })
  const items = await getDatasetItems<{
    fullName: string
    username: string
    postsCount: number
    followersCount: number
    followsCount: number
    biography: string
    profilePicUrl: string
    isBusinessAccount: boolean
  }>(datasetId)
  return items[0] || undefined
}

export async function scrapeInstagramPosts(username: string, limit = 50) {
  const datasetId = await runActor("apify~instagram-post-scraper", {
    username: [username],
    resultsLimit: limit,
  })
  return getDatasetItems<{
    shortCode: string
    type: string
    caption: string | null
    url: string
    displayUrl: string
    likesCount: number
    commentsCount: number
    videoPlayCount?: number
    hashtags: string[]
    mentions: string[]
    isPinned: boolean
    ownerUsername: string
    timestamp: string
  }>(datasetId)
}
