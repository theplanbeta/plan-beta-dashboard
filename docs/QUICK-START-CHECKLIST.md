# Quick Start Checklist

Use this checklist to activate your Instagram automation systems in 15 minutes.

---

## Pre-Deployment Checklist

### ✅ Step 1: Verify Environment Variables
```bash
# Check your .env file has these:
INSTAGRAM_ACCESS_TOKEN=EAAZAbZCgSpUEgBPo...
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_id_here
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=plan_beta_instagram_webhook_2024
```

### ✅ Step 2: Run Tests Locally
```bash
npx tsx scripts/test-lead-and-comment-systems.ts
```
**Expected:** 13/13 tests pass ✅

### ✅ Step 3: Deploy to Production
```bash
# If using Vercel:
vercel --prod

# Or your deployment method:
npm run build
```

---

## Facebook Developer Portal Setup (5 minutes)

### ✅ Step 4: Add Webhook URL

1. Go to https://developers.facebook.com/apps
2. Select your app → **Webhooks** (left sidebar)
3. Click **Instagram** → **Edit Subscription**
4. Enter:
   - **Callback URL:** `https://yourdomain.com/api/webhooks/instagram`
   - **Verify Token:** `plan_beta_instagram_webhook_2024`
5. Click **Verify and Save**

### ✅ Step 5: Subscribe to Events

Check these boxes:
- ✅ `comments`
- ✅ `messages`

Click **Save**

### ✅ Step 6: Test Webhook

```bash
curl -X POST https://yourdomain.com/api/webhooks/instagram \
  -H "Content-Type: application/json" \
  -d '{
    "object": "instagram",
    "entry": [{
      "id": "test",
      "changes": [{
        "field": "comments",
        "value": {
          "id": "test_123",
          "text": "I want to join!",
          "from": {"username": "test_user"},
          "created_time": 1234567890
        }
      }]
    }]
  }'
```

**Expected:** `{"success":true}`

---

## Verification (3 minutes)

### ✅ Step 7: Test with Real Comment

1. Go to your Instagram Business Account
2. Post a reel/photo
3. Comment: **"I'm interested in joining the A1 batch!"**
4. Wait 5 seconds

### ✅ Step 8: Check Prisma Studio

```bash
npx prisma studio --port 5556
```

1. Open http://localhost:5556
2. Click **"InstagramComment"** in sidebar
3. Verify your test comment appears with:
   - `priority: "critical"`
   - `leadIntent: true`
   - `replied: true` (if auto-reply worked)

### ✅ Step 9: Check Auto-Created Lead

1. In Prisma Studio, click **"Lead"** table
2. Find lead with:
   - `instagramHandle: "your_username"`
   - `firstTouchpoint: "instagram_comment"`
   - `leadScore: 40-60` (depends on comment)

---

## Daily Usage (Ongoing)

### Monitor High-Priority Comments

```bash
# Open Prisma Studio
npx prisma studio --port 5556
```

**Filter for high-priority:**
1. Open **InstagramComment** table
2. Add filter: `priority` = `critical` OR `high`
3. Sort by `commentedAt` (newest first)

### Review HOT Leads

1. Open **Lead** table
2. Add filter: `leadScore` >= 75
3. Sort by `leadScore` (descending)

**Take action on:**
- **immediate_followup** → Contact within 24 hours
- **nurture** → Add to email sequence
- **low_priority** → Monitor

### Weekly Maintenance

```bash
# Recalculate all lead scores (run weekly)
npx tsx -e "import {recalculateAllLeadScores} from './lib/lead-scoring/multi-factor-scorer'; await recalculateAllLeadScores()"
```

---

## Troubleshooting Quick Fixes

### Comments not appearing in database?

**Check webhook logs:**
```bash
vercel logs --follow
```

**Look for:** `📨 Instagram webhook received`

### Auto-replies not sending?

**Verify token permissions:**
1. Facebook Developer Portal → Your App
2. **App Review** → **Permissions**
3. Ensure `instagram_manage_comments` is approved

### Lead scores are 0?

**Add engagement data:**
- Leads need DMs, comments, or content views
- Add notes with keywords: "pricing", "trial", "interested"

---

## Success Metrics

After 1 week, you should see:

- ✅ 10+ comments tracked
- ✅ 3-5 high-priority comments flagged
- ✅ 2-3 leads auto-created from comments
- ✅ 1-2 HOT leads (score 75+)
- ✅ Auto-replies sent to critical comments

---

## Next Steps

1. **Customize trigger words** (see `lib/comment-tracking/trigger-detector.ts`)
2. **Adjust auto-reply templates** to match your brand voice
3. **Create dashboard page** to view high-priority comments
4. **Set up email alerts** for critical comments
5. **A/B test different reply templates**

---

## Quick Command Reference

```bash
# Run tests
npx tsx scripts/test-lead-and-comment-systems.ts

# Open Prisma Studio
npx prisma studio --port 5556

# Test trigger detection
npx tsx -e "import {detectTriggers} from './lib/comment-tracking/trigger-detector'; console.log(detectTriggers('I want to enroll!'))"

# View recent comments
npx tsx -e "import {prisma} from './lib/prisma'; const c = await prisma.instagramComment.findMany({take:5, orderBy:{commentedAt:'desc'}}); console.log(c.map(x => ({user: x.username, text: x.text, priority: x.priority})))"

# Calculate lead score
npx tsx -e "import {calculateLeadScore} from './lib/lead-scoring/multi-factor-scorer'; const r = await calculateLeadScore('LEAD_ID_HERE'); console.log(r)"
```

---

**Estimated Setup Time:** 15 minutes
**Difficulty:** Easy
**Status:** Ready to deploy ✅
