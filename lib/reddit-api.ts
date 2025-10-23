/**
 * Reddit API Integration
 * Fetches public posts from subreddits using Reddit's JSON API
 * No authentication required for public posts
 */

export interface RedditPost {
  id: string
  title: string
  selftext: string
  author: string
  subreddit: string
  url: string
  permalink: string
  ups: number // upvotes
  num_comments: number
  created_utc: number
  thumbnail?: string
}

export interface RedditAPIResponse {
  data: {
    children: Array<{
      data: RedditPost
    }>
  }
}

/**
 * Fetch hot posts from a subreddit
 */
export async function fetchSubredditPosts(
  subreddit: string,
  limit: number = 25
): Promise<RedditPost[]> {
  try {
    const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PlanBeta Content Lab v1.0',
      },
    })

    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status} ${response.statusText}`)
    }

    const data: RedditAPIResponse = await response.json()

    // Filter out stickied posts and ads
    const posts = data.data.children
      .map((child) => child.data)
      .filter((post) => !post.stickied && !post.promoted)

    return posts
  } catch (error) {
    console.error(`Error fetching posts from r/${subreddit}:`, error)
    throw error
  }
}

/**
 * Fetch posts from multiple subreddits
 */
export async function fetchMultipleSubreddits(
  subreddits: string[],
  limit: number = 25
): Promise<Map<string, RedditPost[]>> {
  const results = new Map<string, RedditPost[]>()

  // Fetch sequentially to avoid rate limiting
  for (const subreddit of subreddits) {
    try {
      const posts = await fetchSubredditPosts(subreddit, limit)
      results.set(subreddit, posts)

      // Small delay to avoid rate limiting (60 req/min = 1 req/sec)
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error(`Failed to fetch r/${subreddit}:`, error)
      results.set(subreddit, [])
    }
  }

  return results
}

/**
 * Format Reddit post for storage
 */
export function formatPostForStorage(post: RedditPost) {
  return {
    redditId: post.id,
    subredditName: post.subreddit,
    title: post.title,
    selftext: post.selftext || null,
    author: post.author,
    url: post.url,
    permalink: `https://reddit.com${post.permalink}`,
    upvotes: post.ups,
    numComments: post.num_comments,
    postedAt: new Date(post.created_utc * 1000),
  }
}

/**
 * Check if a subreddit exists and is accessible
 */
export async function validateSubreddit(subreddit: string): Promise<boolean> {
  try {
    const url = `https://www.reddit.com/r/${subreddit}/about.json`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PlanBeta Content Lab v1.0',
      },
    })

    return response.ok
  } catch (error) {
    console.error(`Error validating r/${subreddit}:`, error)
    return false
  }
}

/**
 * Get subreddit metadata
 */
export async function getSubredditInfo(subreddit: string) {
  try {
    const url = `https://www.reddit.com/r/${subreddit}/about.json`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PlanBeta Content Lab v1.0',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch subreddit info: ${response.statusText}`)
    }

    const data = await response.json()

    return {
      name: data.data.display_name,
      title: data.data.title,
      description: data.data.public_description,
      subscribers: data.data.subscribers,
    }
  } catch (error) {
    console.error(`Error getting info for r/${subreddit}:`, error)
    throw error
  }
}
