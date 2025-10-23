/**
 * Instagram/Facebook Webhook Diagnostic Tool
 *
 * This script helps diagnose webhook configuration issues
 *
 * Usage: npx tsx scripts/diagnose-instagram-webhook.ts
 */

import { config } from 'dotenv'

// Load environment variables from .env file
config()

console.log('\n🔍 Instagram/Facebook Webhook Diagnostic Tool\n')
console.log('=' .repeat(60))

// Check environment variables
console.log('\n📋 Environment Variables:')
console.log('=' .repeat(60))

const requiredEnvVars = [
  'INSTAGRAM_APP_ID',
  'INSTAGRAM_APP_SECRET',
  'INSTAGRAM_ACCESS_TOKEN',
  'INSTAGRAM_PAGE_ACCESS_TOKEN',
  'INSTAGRAM_BUSINESS_ACCOUNT_ID',
  'INSTAGRAM_WEBHOOK_VERIFY_TOKEN',
]

const envStatus: Record<string, boolean> = {}

requiredEnvVars.forEach((varName) => {
  const value = process.env[varName]
  const isSet = !!value
  envStatus[varName] = isSet

  console.log(`  ${isSet ? '✅' : '❌'} ${varName}: ${isSet ? '(set)' : '(MISSING)'}`)
  if (isSet && varName.includes('TOKEN')) {
    console.log(`     Preview: ${value?.substring(0, 20)}...`)
  }
})

const allEnvVarsSet = Object.values(envStatus).every(Boolean)

// Check webhook subscription status
console.log('\n\n📡 Webhook Configuration Check:')
console.log('=' .repeat(60))

async function checkWebhookSubscription() {
  const appId = process.env.INSTAGRAM_APP_ID
  const appSecret = process.env.INSTAGRAM_APP_SECRET

  if (!appId || !appSecret) {
    console.log('❌ Cannot check - missing app ID or app secret')
    return
  }

  try {
    // Use app access token format: app_id|app_secret
    const appAccessToken = `${appId}|${appSecret}`

    // Check current subscriptions
    const response = await fetch(
      `https://graph.facebook.com/v22.0/${appId}/subscriptions?access_token=${appAccessToken}`
    )

    const data = await response.json()

    if (data.error) {
      console.log(`❌ Error checking subscriptions: ${data.error.message}`)
      return
    }

    console.log('\n Current Webhook Subscriptions:')

    if (!data.data || data.data.length === 0) {
      console.log('  ⚠️  NO SUBSCRIPTIONS FOUND')
      console.log('  This means webhooks are not configured!')
      return
    }

    data.data.forEach((sub: any) => {
      console.log(`\n  Object: ${sub.object}`)
      console.log(`  Callback URL: ${sub.callback_url}`)
      console.log(`  Fields: ${sub.fields?.map((f: any) => f.name).join(', ') || 'none'}`)
      console.log(`  Active: ${sub.active ? '✅' : '❌'}`)
    })
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`)
  }
}

// Run diagnostic
;(async () => {
  await checkWebhookSubscription()

// Expected webhook URL
console.log('\n\n🌐 Expected Webhook URL:')
console.log('=' .repeat(60))
console.log('  Production: https://your-domain.vercel.app/api/webhooks/instagram')
console.log('  Development: Use ngrok to expose localhost:3001')
console.log('\n  Verify Token: plan_beta_instagram_webhook_2024')

// Instructions
console.log('\n\n📚 How to Fix Webhook Issues:')
console.log('=' .repeat(60))
console.log(`
1. Go to Facebook App Dashboard:
   https://developers.facebook.com/apps/${process.env.INSTAGRAM_APP_ID || 'YOUR_APP_ID'}

2. Navigate to Webhooks in left sidebar

3. For Instagram, subscribe to these fields:
   - messages
   - messaging_postbacks
   - messaging_handovers
   - comments

4. For Facebook Pages, subscribe to:
   - feed (for comments)
   - messages

5. Set Callback URL to:
   https://your-production-url.vercel.app/api/webhooks/instagram

6. Set Verify Token to:
   plan_beta_instagram_webhook_2024

7. Click "Verify and Save"

8. Test with this command:
   curl -X POST https://your-url.vercel.app/api/webhooks/instagram \\
     -H "Content-Type: application/json" \\
     -d '{"object": "instagram", "entry": [{"messaging": [{"sender": {"id": "test"}, "recipient": {"id": "me"}, "timestamp": 1234567890, "message": {"mid": "test", "text": "Test"}}]}]}'
`)

console.log('\n\n🔧 Quick Webhook Setup Commands:')
console.log('=' .repeat(60))

const pageToken = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN || process.env.INSTAGRAM_ACCESS_TOKEN
const appId = process.env.INSTAGRAM_APP_ID

if (pageToken && appId) {
  console.log('\nSubscribe to Instagram webhooks:')
  console.log(`
curl -X POST "https://graph.facebook.com/v22.0/${appId}/subscriptions" \\
  -d "object=instagram" \\
  -d "callback_url=https://YOUR_DOMAIN.vercel.app/api/webhooks/instagram" \\
  -d "fields=messages,messaging_postbacks,messaging_handovers,comments" \\
  -d "verify_token=plan_beta_instagram_webhook_2024" \\
  -d "access_token=${pageToken.substring(0, 20)}..."
  `)

  console.log('\nSubscribe to Facebook Page webhooks:')
  console.log(`
curl -X POST "https://graph.facebook.com/v22.0/${appId}/subscriptions" \\
  -d "object=page" \\
  -d "callback_url=https://YOUR_DOMAIN.vercel.app/api/webhooks/instagram" \\
  -d "fields=feed,messages" \\
  -d "verify_token=plan_beta_instagram_webhook_2024" \\
  -d "access_token=${pageToken.substring(0, 20)}..."
  `)
}

console.log('\n\n' + '='.repeat(60))
console.log('✅ Diagnostic complete!\n')

process.exit(0)
})()  // End async function
