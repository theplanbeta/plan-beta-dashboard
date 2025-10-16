# Instagram DM Webhook Setup Guide

## Current Status

### ✅ What's Working

1. **Instagram Content Sync** - FULLY FUNCTIONAL
   - Successfully syncing 50 posts/reels from Instagram
   - Fetching likes, comments, and basic metrics
   - Data visible in Content Performance dashboard (`/dashboard/content`)
   - Auto-sync button working correctly

2. **Webhook Endpoint** - FULLY FUNCTIONAL
   - Webhook verification endpoint working (`GET /api/webhooks/instagram`)
   - Webhook processing endpoint working (`POST /api/webhooks/instagram`)
   - Successfully processes incoming DM messages
   - Stores messages in database
   - Parses message intent and lead scoring
   - **Verified with test**: Successfully received and processed test DM

3. **Database Schema** - COMPLETE
   - `ContentPerformance` model working
   - `InstagramMessage` model working
   - All migrations applied successfully

### ❌ What's NOT Working

**Instagram is NOT sending DM webhooks to your server**

When you sent real Instagram DMs from another account:
- No webhook requests were received by the server
- No entries in server logs
- No messages stored in database

## Root Cause

Instagram DM webhooks have **additional requirements** beyond basic Instagram Business Account webhooks:

### Current Setup (What You Have)
- ✅ Instagram Business Account
- ✅ Meta App created
- ✅ Instagram Graph API permissions
- ✅ User Access Token
- ✅ Webhook subscribed to Instagram fields

### Missing Requirements (What You Need)
- ❌ **Facebook Page** connected to Instagram Business Account
- ❌ **Page Access Token** (not just User Access Token)
- ❌ **Page-level webhook subscription** (not just Instagram-level)
- ❌ Additional permissions: `pages_messaging` and `instagram_manage_messages`
- ❌ Potentially Meta App Review for production use

## Why Instagram Requires a Facebook Page

Instagram DM webhooks are delivered through the **Facebook Messenger Platform**, not directly from Instagram. This means:

1. Your Instagram Business Account must be connected to a Facebook Page
2. Webhooks are sent via the Page's messaging system
3. You need Page-level permissions and tokens
4. The webhook subscription must be at the **Page level**, not just Instagram level

## How to Fix

### Step 1: Connect Instagram to Facebook Page

1. Go to [Facebook Business Suite](https://business.facebook.com/)
2. Navigate to **Settings** → **Instagram Accounts**
3. Connect your Instagram Business Account to a Facebook Page
4. If you don't have a Page, create one first

### Step 2: Get Page Access Token

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Select your app
3. Go to **Tools** → **Access Token Tool**
4. Generate a **Page Access Token** (not User Access Token)
5. Required permissions:
   - `pages_messaging`
   - `pages_manage_metadata`
   - `instagram_basic`
   - `instagram_manage_messages`
   - `instagram_manage_comments`

6. Add the Page Access Token to your `.env`:
   ```
   INSTAGRAM_PAGE_ACCESS_TOKEN=your_page_access_token_here
   ```

### Step 3: Subscribe Webhook to Facebook Page

1. In Meta App Dashboard, go to **Webhooks**
2. Select **Page** (not Instagram) from the dropdown
3. Click **Add Subscription**
4. Subscribe to these fields:
   - `messages`
   - `messaging_postbacks`
   - `message_echoes`
   - `message_reads`

5. Enter your Callback URL: `https://your-ngrok-url.ngrok-free.app/api/webhooks/instagram`
6. Enter Verify Token: `plan_beta_instagram_webhook_2024`

### Step 4: Update Code to Use Page Token

Update `/lib/instagram-api.ts` to use the Page Access Token for webhook-related requests:

```typescript
// Add this to INSTAGRAM_CONFIG
PAGE_ACCESS_TOKEN: process.env.INSTAGRAM_PAGE_ACCESS_TOKEN || '',
```

Update the webhook handler to use Page token when fetching user data:

```typescript
// In /app/api/webhooks/instagram/route.ts
const response = await fetch(
  `https://graph.facebook.com/v22.0/${senderId}?fields=username&access_token=${process.env.INSTAGRAM_PAGE_ACCESS_TOKEN}`
)
```

### Step 5: Test the Setup

1. Send a DM to your Instagram Business Account from another account
2. Check server logs for webhook delivery
3. Verify message appears in database:
   ```bash
   npx tsx scripts/check-instagram-messages.ts
   ```

## Alternative: Manual Lead Creation

If setting up Facebook Page integration is too complex, you can:

1. **Manually create leads from DMs** in the dashboard
2. **Use Instagram Basic Display API** to fetch messages periodically (polling instead of webhooks)
3. **Integrate with a third-party service** like ManyChat or MobileMonkey

## Testing Locally

To test the webhook with ngrok:

```bash
# Start ngrok
ngrok http 3001

# Send test webhook
curl -X POST http://localhost:3001/api/webhooks/instagram \
  -H "Content-Type: application/json" \
  -d '{
    "object":"instagram",
    "entry":[{
      "messaging":[{
        "sender":{"id":"test123"},
        "recipient":{"id":"your_account"},
        "timestamp":1234567890,
        "message":{"mid":"test_mid","text":"I want to learn German A1"}
      }]
    }]
  }'
```

Expected response: `{"success":true}`

Check if message was stored:
```bash
npx tsx scripts/check-instagram-messages.ts
```

## Lead Score Thresholds

Messages are evaluated for lead creation based on intent and keywords:

- **High Priority** (Score 25+): Creates lead automatically
  - Keywords: "enroll", "register", "join", "signup", "admission"

- **Medium Priority** (Score 15-24): May not create lead (threshold dependent)
  - Keywords: "interested", "price", "fees", "cost", "schedule"

- **Low Priority** (Score < 15): Stored but no lead created
  - General inquiries without clear intent

You can adjust thresholds in `/lib/dm-parser.ts`.

## Resources

- [Instagram Messaging API Documentation](https://developers.facebook.com/docs/messenger-platform/instagram)
- [Facebook Page Webhooks](https://developers.facebook.com/docs/messenger-platform/webhooks)
- [Instagram Graph API Reference](https://developers.facebook.com/docs/instagram-api)

## Summary

**What Works Now:**
- ✅ Instagram content sync (50 posts successfully synced)
- ✅ Content Performance dashboard
- ✅ Webhook endpoint code (tested and verified)
- ✅ Message parsing and lead scoring
- ✅ Database storage

**What Needs Configuration:**
- ❌ Facebook Page connection
- ❌ Page Access Token
- ❌ Page-level webhook subscription

The code is ready and working. You just need to complete the Facebook Page setup to enable real-time DM webhooks.
