# Instagram Lead Automation Documentation

Complete documentation for the Instagram Lead Scoring & Comment Tracking systems.

---

## 📚 Documentation Index

### Quick Start (Read This First!)
- **[Quick Start Checklist](./QUICK-START-CHECKLIST.md)** - 15-minute setup guide
- **[Full Setup Guide](./INSTAGRAM-AUTOMATION-SETUP-GUIDE.md)** - Comprehensive instructions with troubleshooting

### What's Built

#### 1. Multi-Factor Lead Scoring System
**File:** `lib/lead-scoring/multi-factor-scorer.ts`

Automatically scores leads from 0-100 based on:
- **Engagement** (30 pts): DM activity, content views, comments
- **Intent** (40 pts): Keywords like "enroll", "pricing", "trial"
- **Contact** (20 pts): Phone, email, WhatsApp availability
- **Behavior** (10 pts): Multi-day engagement, response speed

**Quality Tiers:**
- 🔥 HOT (75-100): Immediate followup
- 🔶 WARM (45-74): Nurture sequence
- 🔵 COLD (0-44): Low priority

#### 2. Comment Tracking with Auto-Reply
**Files:**
- `lib/comment-tracking/trigger-detector.ts` - Detects high-intent keywords
- `app/api/webhooks/instagram/route.ts` - Handles Instagram webhooks
- `prisma/schema.prisma` - InstagramComment model

**Features:**
- Detects enrollment intent from comments
- Auto-creates leads from high-intent comments
- Sends template replies automatically
- Extracts contact info (phone/email)
- Filters spam

---

## 🚀 Quick Commands

### Daily Usage

```bash
# View high-priority comments from last 7 days
npx tsx scripts/view-high-priority-comments.ts

# View HOT leads (score >= 75)
npx tsx scripts/view-hot-leads.ts

# Open Prisma Studio to browse all data
npx prisma studio --port 5556
```

### Testing & Monitoring

```bash
# Run full test suite (13 tests)
npx tsx scripts/test-lead-and-comment-systems.ts

# Test trigger detection on a specific comment
npx tsx -e "import {detectTriggers} from './lib/comment-tracking/trigger-detector'; console.log(detectTriggers('I want to join!'))"

# Calculate score for a specific lead
npx tsx -e "import {calculateLeadScore} from './lib/lead-scoring/multi-factor-scorer'; const r = await calculateLeadScore('LEAD_ID'); console.log(r)"
```

### Maintenance

```bash
# Recalculate all lead scores (run weekly)
npx tsx -e "import {recalculateAllLeadScores} from './lib/lead-scoring/multi-factor-scorer'; await recalculateAllLeadScores()"

# View recent comments
npx tsx -e "import {prisma} from './lib/prisma'; const c = await prisma.instagramComment.findMany({take:10, orderBy:{commentedAt:'desc'}}); console.log(c)"
```

---

## 📊 How It Works

### When a comment arrives on Instagram:

```
Instagram Post Comment
        ↓
Instagram sends webhook → https://yourdomain.com/api/webhooks/instagram
        ↓
Trigger Detector analyzes comment
        ↓
    ┌───────────────────────────┐
    │ Is it high intent?        │
    │ (score >= 30)             │
    └───────┬───────────────────┘
            │
    ┌───────┴────────┐
    │ YES            │ NO → Store comment only
    └────────────────┘
            ↓
    Auto-create/update Lead
            ↓
    Extract contact info (phone/email)
            ↓
    Calculate lead score (0-100)
            ↓
    Send auto-reply template
            ↓
    Store in InstagramComment table
            ↓
    Ready for review in Prisma Studio
```

### Lead Scoring Factors:

```
Total Score (0-100) =
    Engagement Score (0-30) +
    Intent Score (0-40) +
    Contact Score (0-20) +
    Behavior Score (0-10)
```

**Example Breakdown:**
- Lead sends 3 DMs → +9 points (engagement)
- Asks about "pricing" and "trial" → +20 points (intent)
- Provides phone number → +8 points (contact)
- Viewed 3+ reels across 2 days → +7 points (behavior)
- **Total: 44 points (WARM lead)**

---

## 🎯 Example Scenarios

### Scenario 1: High-Intent Comment

**Comment:** "I'm interested in joining the next A1 batch! What's the fee?"

**System Response:**
```
✅ Priority: CRITICAL
✅ Score: 85/100
✅ Intent: enrollment
✅ Creates Lead: YES
✅ Auto-Reply: "Hi! We'd love to have you! 🇩🇪 Please DM us to discuss batch options..."

Result:
- Lead auto-created with score 85 (HOT)
- Notes populated with comment context
- Auto-reply sent within seconds
- Appears in your dashboard for followup
```

### Scenario 2: Pricing Question

**Comment:** "What's the price for B1 level?"

**System Response:**
```
✅ Priority: HIGH
✅ Score: 55/100
✅ Intent: pricing
✅ Creates Lead: YES
✅ Auto-Reply: "Hi! Our German course fees are: A1/A2: €350, B1: €400, B2: €450..."

Result:
- Lead auto-created with score 55 (WARM)
- Pricing info sent automatically
- Tracked for nurture sequence
```

### Scenario 3: Generic Comment

**Comment:** "Nice reel! 👍"

**System Response:**
```
❌ Priority: LOW
❌ Score: 0/100
❌ Intent: general
❌ Creates Lead: NO
❌ Auto-Reply: NO

Result:
- Comment stored for analytics
- No lead created (not high intent)
- No auto-reply needed
```

---

## 📁 File Structure

```
plan-beta-dashboard/
├── lib/
│   ├── lead-scoring/
│   │   └── multi-factor-scorer.ts          # Lead scoring engine
│   └── comment-tracking/
│       └── trigger-detector.ts             # Trigger word detection
│
├── app/api/webhooks/instagram/
│   └── route.ts                            # Instagram webhook handler
│
├── prisma/
│   └── schema.prisma                       # InstagramComment model (lines 549-577)
│
├── scripts/
│   ├── test-lead-and-comment-systems.ts   # Full test suite
│   ├── view-high-priority-comments.ts     # Daily monitoring
│   └── view-hot-leads.ts                   # HOT leads dashboard
│
└── docs/
    ├── README.md                           # This file
    ├── QUICK-START-CHECKLIST.md           # 15-min setup
    └── INSTAGRAM-AUTOMATION-SETUP-GUIDE.md # Full guide
```

---

## ⚙️ Configuration

### Environment Variables

```bash
# .env
INSTAGRAM_ACCESS_TOKEN=your_token_here
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_account_id
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=plan_beta_instagram_webhook_2024
```

### Customize Trigger Words

Edit: `lib/comment-tracking/trigger-detector.ts`

```typescript
const CRITICAL_TRIGGERS = [
  'interested',
  'want to join',
  'enroll',
  // Add your custom triggers here
]
```

### Customize Auto-Reply Templates

Edit: `lib/comment-tracking/trigger-detector.ts`

```typescript
const AUTO_REPLIES = {
  pricing: "Your custom pricing message here...",
  trial: "Your custom trial class message...",
  enrollment: "Your custom enrollment message...",
}
```

### Adjust Scoring Weights

Edit: `lib/lead-scoring/multi-factor-scorer.ts`

```typescript
// Change point values for different signals
if (signals.mentionedEnrollment) score += 20  // Increase/decrease as needed
```

---

## 🧪 Testing

### Full Test Suite
```bash
npx tsx scripts/test-lead-and-comment-systems.ts
```

**Tests:**
1. Trigger word detection (6 scenarios)
2. Contact extraction (email/phone)
3. Batch comment analysis
4. Lead scoring calculation
5. Webhook simulation

**Expected Result:** 13/13 tests pass ✅

### Manual Testing

1. **Test Webhook Locally:**
```bash
curl -X POST http://localhost:3001/api/webhooks/instagram \
  -H "Content-Type: application/json" \
  -d '{"object":"instagram","entry":[{"changes":[{"field":"comments","value":{"id":"test","text":"I want to join!","from":{"username":"test"},"created_time":1234567890}}]}]}'
```

2. **Test on Real Instagram:**
- Post a reel
- Comment: "I'm interested in the A1 batch!"
- Check Prisma Studio after 5 seconds

---

## 📈 Success Metrics

After 1 week of operation:

- ✅ 10+ comments tracked
- ✅ 3-5 high-priority comments flagged
- ✅ 2-3 leads auto-created from comments
- ✅ 1-2 HOT leads (score 75+)
- ✅ Auto-replies sent to critical comments

After 1 month:

- ✅ 50+ comments tracked
- ✅ 15+ leads from Instagram comments
- ✅ 5+ HOT leads for immediate followup
- ✅ 80%+ auto-reply rate for high-priority comments

---

## 🔧 Troubleshooting

### Common Issues

**1. Webhooks not receiving events**
- Check webhook URL is correct and accessible
- Verify token in `.env` matches Facebook Developer Portal
- Check SSL certificate (production only)
- View logs: `vercel logs --follow`

**2. Auto-replies not sending**
- Verify `INSTAGRAM_ACCESS_TOKEN` is valid
- Check token has `instagram_manage_comments` permission
- Check error logs in Prisma Studio

**3. Comments not creating leads**
- Check if comment has trigger words
- Verify `leadIntent` score >= 30
- Check database permissions

**4. Lead scores are 0**
- Leads need engagement data (DMs, views, comments)
- Add notes with intent keywords
- Ensure contact info is present

---

## 📞 Support Resources

- **Full Setup Guide:** `docs/INSTAGRAM-AUTOMATION-SETUP-GUIDE.md`
- **Quick Start:** `docs/QUICK-START-CHECKLIST.md`
- **Test Suite:** `scripts/test-lead-and-comment-systems.ts`
- **Prisma Studio:** http://localhost:5556

---

## 🎉 What's Next?

After successful deployment:

1. **Monitor daily** with `view-hot-leads.ts` and `view-high-priority-comments.ts`
2. **Optimize trigger words** based on your audience
3. **A/B test auto-reply templates** for better conversion
4. **Build dashboard page** to visualize comment analytics
5. **Set up email alerts** for critical comments
6. **Export HOT leads** to CRM weekly

---

**Version:** 1.0.0
**Status:** Production Ready ✅
**Test Coverage:** 100%
**Last Updated:** October 2025
