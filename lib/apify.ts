import { ApifyClient } from "apify-client"

const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN })

export async function scrapeInstagramProfile(username: string) {
  const run = await client.actor("apify/instagram-profile-scraper").call({
    usernames: [username],
  })
  const { items } = await client.dataset(run.defaultDatasetId).listItems()
  return items[0] as
    | {
        fullName: string
        username: string
        postsCount: number
        followersCount: number
        followsCount: number
        biography: string
        profilePicUrl: string
        isBusinessAccount: boolean
      }
    | undefined
}

export async function scrapeInstagramPosts(username: string, limit = 50) {
  const run = await client.actor("apify/instagram-post-scraper").call({
    username: [username],
    resultsLimit: limit,
  })
  const { items } = await client.dataset(run.defaultDatasetId).listItems()
  return items as Array<{
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
  }>
}
