# Instagram Graph API Setup Guide

Complete guide to connect your Instagram Business Account to the Plan Beta Dashboard.

## Prerequisites

✅ You already have:
- Meta Business verification (confirmed)
- Instagram Business Account
- Facebook Page linked to Instagram

## Step-by-Step Setup

### 1. Create/Access Meta App

1. Go to [Meta for Developers](https://developers.facebook.com/apps)
2. Click **"Create App"** (or select existing app)
3. Choose **"Business"** as app type
4. Fill in:
   - **App Name**: Plan Beta Dashboard (or your choice)
   - **Contact Email**: Your email
   - **Business Account**: Select your verified business
5. Click **"Create App"**
6. Note your **App ID** and **App Secret** (you'll need these)

### 2. Add Instagram Products

In your app dashboard:

1. Scroll to **"Add Products"**
2. Find **"Instagram Graph API"** → Click **"Set Up"**
3. Also add **"Instagram Basic Display"** for backup
4. Configure App Settings:
   - Go to **Settings** → **Basic**
   - Add **App Domains**: `yourdomain.com`
   - **Privacy Policy URL**: Your privacy policy URL
   - **Terms of Service URL**: Your terms URL
   - Click **"Save Changes"**

### 3. Configure Permissions

1. Go to **App Review** → **Permissions and Features**
2. Request these permissions (if not already granted):
   - ✅ `instagram_basic` - Basic access to Instagram account
   - ✅ `instagram_content_publish` - Publish content
   - ✅ `instagram_manage_insights` - Read insights and metrics
   - ✅ `instagram_manage_messages` - Read and send DMs
   - ✅ `pages_show_list` - List Facebook Pages
   - ✅ `pages_read_engagement` - Read page engagement

3. For each permission:
   - Click **"Request"**
   - Explain use case (e.g., "Track content performance for language school")
   - Submit for review (usually approved within 24 hours)

### 4. Get Your Credentials

#### 4a. Get App ID and App Secret

1. Go to **Settings** → **Basic** in your app
2. Copy:
   - **App ID**: `xxxxxxxxxxxxx`
   - **App Secret**: Click **"Show"** → Copy

Add to your `.env` file:
```bash
INSTAGRAM_APP_ID=your_app_id_here
INSTAGRAM_APP_SECRET=your_app_secret_here
```

#### 4b. Get User Access Token

1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer)
2. Select your app from dropdown (top right)
3. Click **"Generate Access Token"**
4. In the permissions dialog, select:
   - `instagram_basic`
   - `instagram_content_publish`
   - `instagram_manage_insights`
   - `instagram_manage_messages`
   - `pages_show_list`
   - `pages_read_engagement`
5. Click **"Generate Access Token"**
6. Copy the token (looks like: `EAABwzLix...`)

### 5. Run Setup Script

Now run our setup script to get your Instagram Business Account ID and generate a long-lived token:

```bash
npm run setup-instagram YOUR_USER_ACCESS_TOKEN
```

Replace `YOUR_USER_ACCESS_TOKEN` with the token from step 4b.

**Example:**
```bash
npm run setup-instagram EAABwzLixnjYBO4fqZC8ZAl...
```

The script will:
- ✅ Find your Facebook Pages
- ✅ Find Instagram Business Accounts linked to those pages
- ✅ Display your Instagram account details
- ✅ Generate a long-lived access token (valid for 60 days)
- ✅ Give you the exact environment variables to add

### 6. Add Credentials to .env

Copy the output from the setup script and add to your `.env` file:

```bash
# Instagram Graph API Configuration
INSTAGRAM_APP_ID=123456789012345
INSTAGRAM_APP_SECRET=abcdef1234567890abcdef1234567890
INSTAGRAM_ACCESS_TOKEN=EAAB... (long token)
INSTAGRAM_BUSINESS_ACCOUNT_ID=17841405309211844
```

### 7. Test the Connection

Run the script again without arguments to test:

```bash
npm run setup-instagram
```

This will verify your credentials are working and show:
- ✅ Your Instagram account details
- ✅ Your recent posts
- ✅ Connection status

## Webhook Setup (Optional - for real-time DMs)

### 1. Configure Webhook in Meta App

1. Go to your app → **Products** → **Webhooks**
2. Click **"Instagram"** tab
3. Click **"Subscribe to this object"**
4. Add webhook URL:
   ```
   https://yourdomain.com/api/webhooks/instagram
   ```
5. Verify Token: `plan_beta_webhook_secret_2024` (or choose your own)
6. Subscribe to fields:
   - `messages` - Get notified of new DMs
   - `mentions` - Get notified when mentioned
   - `comments` - Get notified of comments

### 2. Add Webhook Secret to .env

```bash
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=plan_beta_webhook_secret_2024
```

## Token Refresh (Important!)

⚠️ **Long-lived tokens expire after 60 days!**

You have two options:

### Option A: Manual Refresh (Quick)
Every 60 days, re-run:
```bash
npm run setup-instagram YOUR_NEW_USER_ACCESS_TOKEN
```

### Option B: Auto-Refresh (Recommended - Coming in Phase 2)
We'll add a cron job that automatically refreshes your token before it expires.

## Troubleshooting

### "No Instagram Business Account found"
**Solution:**
1. Make sure your Instagram account is a **Business Account** (not Creator or Personal)
2. Check Instagram Settings → Account → Switch to Professional Account
3. Ensure it's linked to a Facebook Page
4. The Facebook Page must be managed by the same Meta Business account

### "Invalid OAuth access token"
**Solution:**
1. Generate a new User Access Token from Graph API Explorer
2. Make sure all required permissions are selected
3. Run setup script again with new token

### "API rate limit exceeded"
**Solution:**
- Instagram Graph API has rate limits:
  - 200 calls per hour per user
  - This is plenty for your use case
- If you hit limits, wait an hour and try again

### "Permission denied"
**Solution:**
1. Go to App Review in your Meta app
2. Check if permissions are approved
3. If pending, wait for approval (usually 1-2 days)
4. If rejected, update your submission with better use case explanation

## What You'll Be Able to Do

Once connected:

✅ **Automated Content Sync**
- Daily sync of all your Instagram reels/posts
- Auto-fetch views, likes, comments, shares, saves
- No more manual entry!

✅ **DM Lead Capture**
- When someone DMs you on Instagram
- System reads the message
- Auto-creates a lead in your dashboard
- Links the lead to the reel they came from

✅ **Performance Analytics**
- See which reels drive the most leads
- Track conversion rates per content piece
- Calculate ROI for each post
- Identify best-performing topics

✅ **Attribution Tracking**
- Know exactly which Instagram reel led to each enrollment
- Track the full funnel: View → DM → Lead → Trial → Enrollment
- Prove content marketing ROI

## Need Help?

If you run into issues:
1. Run `npm run setup-instagram` without arguments for guidance
2. Check the Meta for Developers documentation
3. Review the troubleshooting section above

## Security Notes

🔒 **Keep your credentials secure:**
- Never commit `.env` to git (already in `.gitignore`)
- Don't share your access tokens
- Rotate tokens if exposed
- Use environment variables for all secrets

## Next Steps After Setup

Once your credentials are in `.env`:

1. **Test the connection**: Run `npm run setup-instagram`
2. **Sync your content**: We'll add a "Sync Instagram" button in Phase 2
3. **Set up webhooks**: For real-time DM notifications
4. **Create automation workflows**: DM → Lead → WhatsApp → Enrollment

Ready to transform your Instagram into an enrollment machine! 🚀
