# Instagram Automation Setup Guide

Complete guide to activate lead scoring and comment tracking systems.

---

## Part 1: Configure Instagram Webhooks in Facebook Developer Portal

### Prerequisites
- Facebook Developer account
- Instagram Business Account connected to Facebook Page
- Your app deployed to production (or ngrok for testing)

### Step-by-Step Instructions

#### 1. Access Facebook Developer Portal

1. Go to https://developers.facebook.com/
2. Click "My Apps" in top-right corner
3. Select your Instagram app (or create one if needed)

#### 2. Configure Webhooks

1. In left sidebar, click **"Webhooks"** under Products
2. If Webhooks is not added, click "Add Product" and select "Webhooks"

#### 3. Subscribe to Instagram Webhook Events

1. Find the **"Instagram"** dropdown in the Webhooks page
2. Click **"Edit"** or **"Add Page Subscription"**
3. You'll need to provide:

   **Callback URL:**
   ```
   https://yourdomain.com/api/webhooks/instagram
   ```
   Replace `yourdomain.com` with your actual domain (e.g., `plan-beta-dashboard.vercel.app`)

   **Verify Token:**
   ```
   plan_beta_instagram_webhook_2024
   ```
   (This is set in your `.env` as `INSTAGRAM_WEBHOOK_VERIFY_TOKEN`)

4. Click **"Verify and Save"**

   **Troubleshooting:** If verification fails:
   - Ensure your server is running and accessible
   - Check that the webhook endpoint `/api/webhooks/instagram` responds to GET requests
   - Verify the token in `.env` matches exactly
   - Check server logs for errors

#### 4. Subscribe to Comment Events

1. After successful verification, you'll see subscription fields
2. Check the following boxes:
   - ✅ `comments` - **REQUIRED** (detects new comments on your posts)
   - ✅ `messages` - Already configured (for DMs)
   - ✅ `messaging_postbacks` - Optional (for interactive messages)

3. Click **"Save"** to activate subscriptions

#### 5. Configure Page Subscription

1. Still in Webhooks section, scroll to **"Page Subscriptions"**
2. Click **"Add Subscription"**
3. Select your Facebook Page connected to Instagram
4. Ensure the same fields are checked:
   - ✅ `comments`
   - ✅ `messages`

5. Click **"Subscribe"**

#### 6. Test Webhook Connection

Run this test to verify webhook is receiving events:

```bash
# In your terminal
curl -X POST http://localhost:3001/api/webhooks/instagram \
  -H "Content-Type: application/json" \
  -d '{
    "object": "instagram",
    "entry": [{
      "id": "test",
      "time": 1234567890,
      "changes": [{
        "field": "comments",
        "value": {
          "id": "test_comment_123",
          "text": "I want to join the A1 batch!",
          "from": {"username": "test_user"},
          "created_time": 1234567890
        }
      }]
    }]
  }'
```

Expected response: `{"success":true}`

#### 7. Verify Permissions

1. Go to **"App Review"** in left sidebar
2. Under **"Permissions and Features"**, ensure you have:
   - ✅ `instagram_basic`
   - ✅ `instagram_manage_comments`
   - ✅ `instagram_manage_messages`
   - ✅ `pages_manage_metadata`

3. If any are missing, request them in App Review

---

## Part 2: Using ngrok for Local Testing (Optional)

If testing locally before production:

#### 1. Install ngrok
```bash
brew install ngrok  # macOS
# or download from https://ngrok.com/
```

#### 2. Start ngrok tunnel
```bash
ngrok http 3001
```

You'll get a URL like: `https://abc123.ngrok.io`

#### 3. Update webhook URL
Use ngrok URL in Facebook Developer Portal:
```
https://abc123.ngrok.io/api/webhooks/instagram
```

#### 4. Test with real Instagram comment
- Go to your Instagram Business Account
- Post a reel/photo
- Comment: "I'm interested in joining!"
- Check your terminal for webhook logs

---

## Part 3: Monitor Comments in Prisma Studio

#### 1. Open Prisma Studio

```bash
npx prisma studio --port 5556
```

Or visit: http://localhost:5556

#### 2. Navigate to InstagramComment Table

1. In left sidebar, click **"InstagramComment"**
2. You'll see all tracked comments with these columns:

   **Key Fields:**
   - `text` - The comment content
   - `username` - Who commented
   - `priority` - **critical**, **high**, **medium**, or **low**
   - `leadIntent` - ✅ if comment shows enrollment intent
   - `triggerWords` - Array of detected trigger words
   - `replied` - ✅ if auto-reply was sent
   - `replyText` - The auto-reply message sent
   - `leadId` - Link to auto-created lead (if applicable)
   - `mediaUrl` - Link to the Instagram post

#### 3. Filter High-Priority Comments

In Prisma Studio:
1. Click "Add filter"
2. Select `priority`
3. Choose `equals` → `critical` or `high`
4. Click "Apply"

**You'll see:**
- Comments with enrollment keywords ("interested", "join", "enroll")
- Pricing questions
- Trial class requests

#### 4. View Auto-Created Leads

1. Click on a comment row with `leadCreated` = ✅
2. Note the `leadId` value
3. Navigate to **"Lead"** table in left sidebar
4. Find the lead by ID
5. View:
   - Auto-extracted contact info (phone/email)
   - Lead score (0-100)
   - Notes with comment context
   - `firstTouchpoint` = "instagram_comment"

#### 5. Monitor Auto-Replies

Comments with auto-replies show:
- `replied` = ✅
- `replyText` = The template message sent
- `repliedAt` = Timestamp

**Example auto-reply for pricing:**
```
Hi! Our German course fees are:
• A1/A2: €350
• B1: €400
• B2: €450

We also offer combo packages! DM us for details 📚
```

---

## Part 4: Review Lead Scores in Dashboard

#### 1. Understanding Lead Quality Tiers

| Score | Quality | Color | Recommended Action |
|-------|---------|-------|-------------------|
| 75-100 | 🔥 HOT | Red | Immediate followup (within 24 hours) |
| 45-74 | 🔶 WARM | Orange | Add to nurture sequence |
| 0-44 | 🔵 COLD | Blue | Low priority monitoring |

#### 2. Access Leads in Prisma Studio

1. Open Prisma Studio: http://localhost:5556
2. Click **"Lead"** in left sidebar
3. Sort by `leadScore` (descending) to see HOT leads first

#### 3. View Lead Score Breakdown

Use the test script to see detailed scoring:

```bash
npx tsx scripts/test-lead-and-comment-systems.ts
```

Or calculate score for specific lead:

```typescript
import { calculateLeadScore } from '@/lib/lead-scoring/multi-factor-scorer'

const result = await calculateLeadScore('lead_id_here')

console.log(result)
// {
//   totalScore: 85,
//   quality: 'HOT',
//   confidence: 0.8,
//   breakdown: {
//     engagementScore: 24,  // DM count, response rate, content views
//     intentScore: 35,       // Keywords: pricing, trial, enrollment
//     contactScore: 15,      // Has phone + email
//     behaviorScore: 8       // Viewed multiple reels, fast responses
//   },
//   recommendedAction: 'immediate_followup',
//   reasoning: [
//     'Mentioned enrollment and asked about pricing - send payment details'
//   ]
// }
```

#### 4. Check Recommended Actions

Each lead has a `recommendedAction` field:

**immediate_followup:**
- Contact within 24 hours
- They requested trial class, or
- They asked about enrollment + pricing, or
- Quality = HOT

**nurture:**
- Add to email/WhatsApp nurture sequence
- Showing interest but not ready to enroll
- Quality = WARM

**low_priority:**
- Monitor for future activity
- Low engagement
- Quality = COLD

**disqualify:**
- Has complaint - needs manager attention
- Negative sentiment
- Unresponsive after contact

#### 5. Find HOT Leads in Your Dashboard

If you want to add a filter to your existing dashboard:

1. Navigate to `/dashboard/leads`
2. Add filter: `leadScore >= 75`
3. Sort by `lastContactDate` (most recent first)

**Or use Prisma Studio filter:**
```
leadScore >= 75 AND quality = 'HOT'
```

---

## Part 5: Running Tests & Monitoring

#### 1. Run Comprehensive Test Suite

```bash
npx tsx scripts/test-lead-and-comment-systems.ts
```

**What it tests:**
- ✅ Trigger word detection (6 scenarios)
- ✅ Contact extraction (phone/email)
- ✅ Batch comment analysis
- ✅ Lead scoring system
- ✅ Webhook simulation

**Expected output:**
```
🧪 Testing Lead Scoring & Comment Tracking Systems
======================================================================

📝 TEST 1: Comment Trigger Detection
✅ PASS: "I'm interested in joining the A1 batch!..."
✅ PASS: "What's the price for B1 level?..."
...

📊 FINAL TEST RESULTS
✅ Total Passed: 13
❌ Total Failed: 0
📈 Success Rate: 100.0%
🎉 All tests passed! Both systems are working correctly.
```

#### 2. Monitor Webhook Events in Real-Time

Check server logs when Instagram sends events:

```bash
# View logs in production
vercel logs --follow

# Or locally
tail -f /path/to/logs
```

**What to look for:**
```
📨 Instagram webhook received: {...}
💬 Processing comment from: @username
🔍 Trigger analysis: { priority: 'critical', intent: 'enrollment', ... }
🎯 Creating lead from comment...
✅ Lead created from comment: { id: '...', score: 85 }
🤖 Auto-replying to comment...
✅ Auto-reply sent to comment
```

#### 3. Test Specific Trigger Words

You can test trigger detection programmatically:

```typescript
import { detectTriggers } from '@/lib/comment-tracking/trigger-detector'

const result = detectTriggers("I want to join the next batch! What's the fee?")

console.log(result)
// {
//   hasTriggers: true,
//   triggerWords: ['want to join', 'next batch', 'fee'],
//   priority: 'critical',
//   leadIntent: true,
//   shouldAutoReply: true,
//   suggestedReply: 'Hi! We'd love to have you! 🇩🇪\n\nPlease DM us...',
//   intent: 'enrollment',
//   score: 75
// }
```

#### 4. Recalculate All Lead Scores

If you want to refresh scores for all existing leads:

```typescript
import { recalculateAllLeadScores } from '@/lib/lead-scoring/multi-factor-scorer'

await recalculateAllLeadScores()
// 🔄 Recalculating scores for 45 leads...
// ✅ Lead abc123 score updated: 82 (HOT)
// ✅ Lead def456 score updated: 56 (WARM)
// ...
// ✅ All lead scores recalculated
```

Or create a script:

```bash
npx tsx -e "
import { recalculateAllLeadScores } from './lib/lead-scoring/multi-factor-scorer';
await recalculateAllLeadScores();
"
```

---

## Part 6: Customization & Configuration

#### 1. Customize Trigger Words

Edit: `lib/comment-tracking/trigger-detector.ts`

Add more trigger words:

```typescript
const CRITICAL_TRIGGERS = [
  'interested',
  'want to join',
  'how to enroll',
  'enroll',
  'register',
  'admission',
  'sign up',
  // Add your custom triggers:
  'apply',
  'seat available',
  'book my spot',
]
```

#### 2. Customize Auto-Reply Templates

Edit: `lib/comment-tracking/trigger-detector.ts`

Modify reply templates:

```typescript
const AUTO_REPLIES: Record<string, string> = {
  pricing: "Hi! Our German course fees are:\n• A1/A2: €350\n• B1: €400\n• B2: €450\n\nWe also offer combo packages! DM us for details 📚",

  // Customize or add new templates:
  schedule: "Hi! Our next batch starts on [DATE]. DM us to reserve your spot!",
  trial: "Hi! Book your FREE trial class now! DM us with your preferred time.",
}
```

#### 3. Adjust Scoring Weights

Edit: `lib/lead-scoring/multi-factor-scorer.ts`

Change point values:

```typescript
// Current weights:
// Engagement: 0-30 points
// Intent: 0-40 points
// Contact: 0-20 points
// Behavior: 0-10 points

// Example: Increase intent weight
if (signals.mentionedEnrollment) score += 20  // was 15
if (signals.requestedTrialClass) score += 15  // was 12
```

#### 4. Change Quality Tier Thresholds

Edit: `lib/lead-scoring/multi-factor-scorer.ts`

Adjust score ranges:

```typescript
function determineQuality(score: number, signals: EngagementSignals): LeadQuality {
  // Current thresholds:
  if (score >= 75) return 'HOT'   // Change to 80 for stricter
  if (score >= 45) return 'WARM'  // Change to 50 for stricter
  return 'COLD'
}
```

---

## Part 7: Troubleshooting

### Issue: Webhooks not receiving events

**Check:**
1. Webhook URL is correct and accessible
2. Verify token matches in `.env`
3. Server is running on correct port
4. SSL certificate valid (production)
5. Check Facebook Developer Portal logs

**Debug:**
```bash
# Test webhook endpoint
curl https://yourdomain.com/api/webhooks/instagram?hub.mode=subscribe&hub.verify_token=plan_beta_instagram_webhook_2024&hub.challenge=test

# Should return: test
```

### Issue: Auto-replies not sending

**Check:**
1. `INSTAGRAM_ACCESS_TOKEN` is valid
2. Token has `instagram_manage_comments` permission
3. Instagram Business Account is active
4. Check logs for API errors

**Debug:**
Check `InstagramComment` table in Prisma Studio:
- If `replied` = false → Check error logs
- If `replied` = true → Reply was sent successfully

### Issue: Lead scores are 0 or very low

**Check:**
1. Lead has engagement data (DM count, content views)
2. Notes contain intent keywords
3. Contact info (phone/email) is present

**Debug:**
```bash
npx tsx -e "
import { calculateLeadScore } from './lib/lead-scoring/multi-factor-scorer';
const result = await calculateLeadScore('lead_id_here');
console.log('Breakdown:', result.breakdown);
console.log('Reasoning:', result.reasoning);
"
```

### Issue: Comments not creating leads

**Check:**
1. Comment has trigger words ("interested", "price", etc.)
2. `leadIntent` threshold is met (score >= 30)
3. Database permissions are correct

**Debug:**
Test trigger detection:
```typescript
import { detectTriggers } from '@/lib/comment-tracking/trigger-detector'
const result = detectTriggers("Your comment text here")
console.log('Lead Intent:', result.leadIntent)  // Should be true
console.log('Score:', result.score)              // Should be >= 30
```

---

## Part 8: Best Practices

### 1. Regular Monitoring
- Check Prisma Studio daily for new high-priority comments
- Review HOT leads within 24 hours
- Monitor webhook logs for errors

### 2. Performance Optimization
- Run `recalculateAllLeadScores()` weekly (not daily - can be slow)
- Archive old comments (> 90 days) to keep database fast
- Use indexes for common queries

### 3. Data Privacy
- Don't store sensitive payment info in notes
- Encrypt phone/email if required by GDPR
- Delete spam comments regularly

### 4. A/B Testing
- Test different auto-reply templates
- Track conversion rates for each template
- Adjust trigger words based on performance

### 5. Backup Strategy
- Export high-value leads weekly
- Save webhook payloads for debugging
- Keep audit log of score changes

---

## Part 9: Quick Reference

### Important Files

| File | Purpose |
|------|---------|
| `lib/lead-scoring/multi-factor-scorer.ts` | Lead scoring logic |
| `lib/comment-tracking/trigger-detector.ts` | Trigger word detection |
| `app/api/webhooks/instagram/route.ts` | Webhook handler |
| `scripts/test-lead-and-comment-systems.ts` | Test suite |
| `prisma/schema.prisma` | Database schema (InstagramComment model) |

### Environment Variables

```bash
INSTAGRAM_ACCESS_TOKEN=your_token_here
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_account_id
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=plan_beta_instagram_webhook_2024
```

### Useful Commands

```bash
# Run tests
npx tsx scripts/test-lead-and-comment-systems.ts

# Open Prisma Studio
npx prisma studio --port 5556

# Recalculate all lead scores
npx tsx -e "import {recalculateAllLeadScores} from './lib/lead-scoring/multi-factor-scorer'; await recalculateAllLeadScores()"

# Test trigger detection
npx tsx -e "import {detectTriggers} from './lib/comment-tracking/trigger-detector'; console.log(detectTriggers('I want to join!'))"

# View recent comments
npx tsx -e "import {prisma} from './lib/prisma'; const comments = await prisma.instagramComment.findMany({take: 10, orderBy: {commentedAt: 'desc'}}); console.log(comments)"
```

---

## Support

If you encounter issues:
1. Check troubleshooting section above
2. Review webhook logs in Facebook Developer Portal
3. Run test suite to isolate issue
4. Check Prisma Studio for data consistency

---

**Last Updated:** October 2025
**System Version:** 1.0.0
**Status:** Production Ready ✅
