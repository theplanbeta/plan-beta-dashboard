/**
 * Test Instagram API Connection
 */

import 'dotenv/config'
import axios from 'axios'

async function testInstagramConnection() {
  const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN
  const INSTAGRAM_BUSINESS_ACCOUNT_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID

  if (!INSTAGRAM_ACCESS_TOKEN || !INSTAGRAM_BUSINESS_ACCOUNT_ID) {
    console.log('❌ Missing environment variables!')
    console.log('   INSTAGRAM_ACCESS_TOKEN:', INSTAGRAM_ACCESS_TOKEN ? '✓' : '✗')
    console.log('   INSTAGRAM_BUSINESS_ACCOUNT_ID:', INSTAGRAM_BUSINESS_ACCOUNT_ID ? '✓' : '✗')
    return
  }

  console.log('\n🧪 Testing Instagram Graph API Connection...\n')

  try {
    // Test 1: Get account info
    console.log('1️⃣ Getting Instagram account info...')
    const accountResponse = await axios.get(
      `https://graph.facebook.com/v22.0/${INSTAGRAM_BUSINESS_ACCOUNT_ID}`,
      {
        params: {
          fields: 'username,name,followers_count,media_count,profile_picture_url',
          access_token: INSTAGRAM_ACCESS_TOKEN,
        },
      }
    )

    console.log('✅ Account Info:')
    console.log(`   Username: @${accountResponse.data.username}`)
    console.log(`   Name: ${accountResponse.data.name}`)
    console.log(`   Followers: ${accountResponse.data.followers_count.toLocaleString()}`)
    console.log(`   Posts: ${accountResponse.data.media_count}`)
    console.log('')

    // Test 2: Get recent media
    console.log('2️⃣ Fetching recent posts...')
    const mediaResponse = await axios.get(
      `https://graph.facebook.com/v22.0/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/media`,
      {
        params: {
          fields: 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count',
          limit: 5,
          access_token: INSTAGRAM_ACCESS_TOKEN,
        },
      }
    )

    console.log(`✅ Found ${mediaResponse.data.data.length} recent posts:`)
    mediaResponse.data.data.forEach((post: any, index: number) => {
      const caption = post.caption ? post.caption.substring(0, 50) + '...' : 'No caption'
      console.log(`   ${index + 1}. ${post.media_type}`)
      console.log(`      Caption: ${caption}`)
      console.log(`      Likes: ${post.like_count || 0}, Comments: ${post.comments_count || 0}`)
      console.log(`      URL: ${post.permalink}`)
      console.log('')
    })

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎉 Instagram Graph API is fully configured!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log('✅ You can now:')
    console.log('   • Use the "Add Content" button in /dashboard/calendar')
    console.log('   • Manually log Instagram reels and track performance')
    console.log('   • In Phase 2, we\'ll add automatic syncing\n')

  } catch (error: any) {
    console.error('❌ Connection test failed!')
    console.error('   Error:', error.response?.data?.error?.message || error.message)
    console.error('')
    console.error('💡 Possible solutions:')
    console.error('   1. Token might have expired - generate a new one')
    console.error('   2. Missing permissions - regenerate with all required permissions')
    console.error('   3. Instagram account not properly linked to Facebook Page\n')
  }
}

testInstagramConnection()
