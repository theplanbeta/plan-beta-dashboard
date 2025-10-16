/**
 * Instagram Graph API Setup Helper
 * Run this script to get your Instagram Business Account ID
 */

import axios from 'axios'

interface FacebookPage {
  id: string
  name: string
  access_token: string
  instagram_business_account?: {
    id: string
  }
}

async function getInstagramBusinessAccountId(userAccessToken: string) {
  try {
    console.log('🔍 Finding your Instagram Business Account...\n')

    // Step 1: Get Facebook Pages
    const pagesResponse = await axios.get('https://graph.facebook.com/v22.0/me/accounts', {
      params: {
        access_token: userAccessToken,
      },
    })

    const pages: FacebookPage[] = pagesResponse.data.data

    if (pages.length === 0) {
      console.log('❌ No Facebook Pages found. Make sure you have a Facebook Page linked to your Instagram Business Account.')
      return
    }

    console.log(`✅ Found ${pages.length} Facebook Page(s):\n`)

    // Step 2: Check each page for Instagram Business Account
    for (const page of pages) {
      console.log(`📄 Page: ${page.name} (ID: ${page.id})`)

      try {
        const igResponse = await axios.get(`https://graph.facebook.com/v22.0/${page.id}`, {
          params: {
            fields: 'instagram_business_account',
            access_token: page.access_token,
          },
        })

        if (igResponse.data.instagram_business_account) {
          const igBusinessId = igResponse.data.instagram_business_account.id

          console.log(`   ✅ Instagram Business Account ID: ${igBusinessId}\n`)

          // Get Instagram account details
          const igDetailsResponse = await axios.get(`https://graph.facebook.com/v22.0/${igBusinessId}`, {
            params: {
              fields: 'username,name,profile_picture_url,followers_count,media_count',
              access_token: page.access_token,
            },
          })

          const igDetails = igDetailsResponse.data

          console.log('   📊 Instagram Account Details:')
          console.log(`      Username: @${igDetails.username}`)
          console.log(`      Name: ${igDetails.name}`)
          console.log(`      Followers: ${igDetails.followers_count}`)
          console.log(`      Posts: ${igDetails.media_count}\n`)

          // Generate long-lived token
          console.log('🔑 Generating long-lived access token...\n')

          const longLivedTokenResponse = await axios.get('https://graph.facebook.com/v22.0/oauth/access_token', {
            params: {
              grant_type: 'fb_exchange_token',
              client_id: process.env.INSTAGRAM_APP_ID,
              client_secret: process.env.INSTAGRAM_APP_SECRET,
              fb_exchange_token: userAccessToken,
            },
          })

          const longLivedToken = longLivedTokenResponse.data.access_token

          console.log('✅ Long-lived token generated!\n')
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
          console.log('📋 Add these to your .env file:')
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
          console.log(`INSTAGRAM_BUSINESS_ACCOUNT_ID=${igBusinessId}`)
          console.log(`INSTAGRAM_ACCESS_TOKEN=${longLivedToken}`)
          console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
          console.log(`⚠️  Note: Long-lived tokens expire after 60 days. You'll need to refresh them.`)
          console.log(`    We'll add auto-refresh logic in Phase 2.\n`)

          return {
            igBusinessId,
            longLivedToken,
            username: igDetails.username,
          }
        } else {
          console.log(`   ⚠️  No Instagram Business Account linked to this page\n`)
        }
      } catch (error: any) {
        console.log(`   ❌ Error checking page: ${error.message}\n`)
      }
    }

    console.log('\n❌ No Instagram Business Account found on any of your pages.')
    console.log('   Make sure your Instagram account is:')
    console.log('   1. Converted to a Business Account')
    console.log('   2. Linked to a Facebook Page')
    console.log('   3. The Facebook Page is managed by the same Meta Business account\n')
  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message)
    console.error('\n💡 Troubleshooting:')
    console.error('   1. Make sure your User Access Token is valid')
    console.error('   2. Check that your app has the required permissions:')
    console.error('      - instagram_basic')
    console.error('      - instagram_content_publish')
    console.error('      - pages_show_list')
    console.error('      - pages_read_engagement\n')
  }
}

async function testConnection(igBusinessId: string, accessToken: string) {
  try {
    console.log('\n🧪 Testing Instagram Graph API connection...\n')

    // Test 1: Get account info
    const accountResponse = await axios.get(`https://graph.facebook.com/v22.0/${igBusinessId}`, {
      params: {
        fields: 'username,name,followers_count,media_count',
        access_token: accessToken,
      },
    })

    console.log('✅ Connection successful!')
    console.log(`   Account: @${accountResponse.data.username}`)
    console.log(`   Followers: ${accountResponse.data.followers_count}\n`)

    // Test 2: Get recent media
    const mediaResponse = await axios.get(`https://graph.facebook.com/v22.0/${igBusinessId}/media`, {
      params: {
        fields: 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count',
        limit: 5,
        access_token: accessToken,
      },
    })

    console.log('📸 Recent Posts:')
    mediaResponse.data.data.forEach((post: any, index: number) => {
      console.log(`   ${index + 1}. ${post.media_type} - ${post.like_count || 0} likes, ${post.comments_count || 0} comments`)
      console.log(`      ${post.permalink}\n`)
    })

    console.log('🎉 Instagram Graph API is fully configured and working!\n')
  } catch (error: any) {
    console.error('❌ Connection test failed:', error.response?.data || error.message)
  }
}

// Main execution
async function main() {
  console.log('\n╔════════════════════════════════════════════════════════╗')
  console.log('║   Instagram Graph API Setup Helper                    ║')
  console.log('╚════════════════════════════════════════════════════════╝\n')

  // Check if running in test mode
  if (process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID && process.env.INSTAGRAM_ACCESS_TOKEN) {
    console.log('✅ Environment variables detected. Running connection test...\n')
    await testConnection(
      process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID,
      process.env.INSTAGRAM_ACCESS_TOKEN
    )
    return
  }

  // Setup mode - need user access token
  const userAccessToken = process.argv[2]

  if (!userAccessToken) {
    console.log('📝 SETUP MODE: Get your Instagram Business Account ID\n')
    console.log('Step 1: Get a User Access Token')
    console.log('   1. Go to: https://developers.facebook.com/tools/explorer')
    console.log('   2. Select your app from the dropdown')
    console.log('   3. Click "Generate Access Token"')
    console.log('   4. Select these permissions:')
    console.log('      ✓ instagram_basic')
    console.log('      ✓ instagram_content_publish')
    console.log('      ✓ instagram_manage_insights')
    console.log('      ✓ pages_show_list')
    console.log('      ✓ pages_read_engagement')
    console.log('   5. Copy the generated token\n')
    console.log('Step 2: Run this script with your token:')
    console.log('   npm run setup-instagram YOUR_USER_ACCESS_TOKEN\n')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    process.exit(0)
  }

  await getInstagramBusinessAccountId(userAccessToken)
}

main()
