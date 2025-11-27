# Churn Prevention Automation - Complete Setup Guide

## Overview

This guide walks you through setting up a **multi-tier churn prevention system** using n8n automation, WhatsApp Business API, and SMS services.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Set Up n8n](#step-1-set-up-n8n)
3. [Step 2: WhatsApp Business API Setup](#step-2-whatsapp-business-api-setup)
4. [Step 3: Database Schema Updates](#step-3-database-schema-updates)
5. [Step 4: Environment Variables](#step-4-environment-variables)
6. [Step 5: Import n8n Workflows](#step-5-import-n8n-workflows)
7. [Step 6: Testing](#step-6-testing)
8. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

- Docker and Docker Compose installed
- WhatsApp Business Account
- SMS provider account (Twilio recommended)
- Plan Beta Dashboard running with database access

---

## Step 1: Set Up n8n

### 1.1 Start n8n with Docker Compose

```bash
# Navigate to your project directory
cd /Users/deepak/plan-beta-dashboard

# Start n8n services
docker-compose -f docker-compose.n8n.yml up -d

# Check if services are running
docker ps | grep plan-beta-n8n
```

Expected output:
```
plan-beta-n8n         n8nio/n8n:latest    Up    0.0.0.0:5678->5678/tcp
plan-beta-n8n-db      postgres:16         Up    5432/tcp
plan-beta-n8n-redis   redis:7-alpine      Up    6379/tcp
```

### 1.2 Access n8n Interface

1. Open browser: `http://localhost:5678`
2. Login credentials:
   - **Username:** `admin`
   - **Password:** `planBeta2024!`

3. Change password immediately after first login

### 1.3 Generate n8n API Key

1. Go to **Settings** → **API**
2. Click **Create API Key**
3. Name it: `Plan Beta Dashboard Integration`
4. Copy the API key (you'll need it for `.env`)

---

## Step 2: WhatsApp Business API Setup

### Option A: WhatsApp Business Cloud API (Recommended - FREE)

#### 2.1 Create Meta Developer Account

1. Go to https://developers.facebook.com/
2. Create developer account (use your Plan Beta email)
3. Verify your business

#### 2.2 Create WhatsApp Business App

1. Go to **My Apps** → **Create App**
2. Select **Business** type
3. App Name: `Plan Beta Student Communication`
4. Add **WhatsApp** product to your app

#### 2.3 Configure WhatsApp

1. In WhatsApp section, click **Get Started**
2. Select or create a **Business Portfolio**
3. Create a **WhatsApp Business Account**
4. Add a phone number (can use test number initially)

#### 2.4 Get Access Token

1. In WhatsApp → **Getting Started**
2. Copy the **Temporary Access Token** (valid 24 hours)
3. For production, generate **Permanent Access Token**:
   - Go to **System Users** (in Business Settings)
   - Create system user: `n8n-automation`
   - Assign role: **Admin**
   - Generate token with permissions:
     - `whatsapp_business_messaging`
     - `whatsapp_business_management`
   - Copy and save the token securely

#### 2.5 Get Phone Number ID & WABA ID

1. In WhatsApp → **Getting Started**
2. Copy **Phone Number ID** (e.g., `109876543210`)
3. Copy **WhatsApp Business Account ID (WABA)** from top

#### 2.6 Set Up Webhooks (for delivery receipts)

1. In WhatsApp → **Configuration**
2. Click **Edit** under Webhooks
3. **Callback URL:** `https://your-domain.com/api/webhooks/whatsapp`
4. **Verify Token:** `planbeta_whatsapp_verify_2024` (set in .env)
5. Subscribe to fields:
   - `messages` (incoming messages)
   - `message_status` (delivery receipts)
6. Click **Verify and Save**

#### 2.7 Message Templates

WhatsApp requires pre-approved templates for business-initiated messages:

1. Go to **WhatsApp** → **Message Templates**
2. Click **Create Template**

**Template 1: Tier 1 Absence Alert**
- **Name:** `tier1_absence_alert`
- **Category:** `UTILITY`
- **Language:** `English`
- **Body:**
```
Hi {{1}}, we noticed you've missed {{2}} classes in a row. Is everything okay? We're here to help if you're facing any challenges. Reply YES if you'd like us to call you.
```
- Variables: `{{1}}` = Student name, `{{2}}` = Absence count

**Template 2: Tier 2 High Risk Alert**
- **Name:** `tier2_high_risk_alert`
- **Category:** `UTILITY`
- **Body:**
```
Hi {{1}}, you've missed {{2}} consecutive classes and we're concerned. Your learning progress is important to us. We'd like to offer you a free makeup class. Reply MAKEUP to schedule.
```

**Template 3: Tier 3 Urgent Alert**
- **Name:** `tier3_urgent_retention`
- **Category:** `UTILITY`
- **Body:**
```
Hi {{1}}, we truly value having you as a student. You've been absent for {{2}} classes. As a special gesture, we'd like to offer you {{3}}. Can we schedule a quick call with our founder?
```
- Variables: `{{1}}` = Name, `{{2}}` = Absences, `{{3}}` = Retention offer

3. Submit for approval (usually approved within 24-48 hours)

### Option B: Twilio WhatsApp API (Easier but Paid)

#### 2.1 Create Twilio Account

1. Sign up at https://www.twilio.com/try-twilio
2. Get $15 trial credit

#### 2.2 Set Up WhatsApp Sender

1. Go to **Messaging** → **Try it out** → **Send a WhatsApp message**
2. Follow Twilio's WhatsApp Sandbox setup
3. For production, apply for WhatsApp Business Profile

#### 2.3 Get Credentials

- **Account SID:** Found on Twilio Console
- **Auth Token:** Found on Twilio Console
- **WhatsApp Number:** `whatsapp:+14155238886` (sandbox) or your approved number

---

## Step 3: Database Schema Updates

### 3.1 Update Prisma Schema

Add the new `ChurnIntervention` model to your `schema.prisma`:

```bash
# Open schema file
nano prisma/schema.prisma

# Add content from schema-churn-prevention.prisma to the main schema
# Specifically:
# 1. Add ChurnIntervention model
# 2. Add ChurnInterventionStatus enum
# 3. Add new fields to Student model:
#    - parentWhatsapp
#    - parentName
#    - lastChurnInterventionAt
#    - totalChurnInterventions
#    - churnInterventions relation
```

### 3.2 Apply Database Changes

```bash
# Push schema changes to database
npx prisma db push

# Generate Prisma Client with new types
npx prisma generate
```

### 3.3 Add Parent Contact Info to Existing Students

```bash
# Create and run a script to add parent info
npx tsx scripts/add-parent-contacts.ts
```

Create `scripts/add-parent-contacts.ts`:
```typescript
import { prisma } from "../lib/prisma"

async function addParentContacts() {
  // You can manually update students with parent contact info
  // Or import from a CSV file

  const updates = [
    {
      studentId: "STU001",
      parentName: "Parent Name",
      parentWhatsapp: "+91XXXXXXXXXX",
    },
    // Add more...
  ]

  for (const update of updates) {
    await prisma.student.update({
      where: { studentId: update.studentId },
      data: {
        parentName: update.parentName,
        parentWhatsapp: update.parentWhatsapp,
      },
    })
    console.log(`Updated ${update.studentId}`)
  }
}

addParentContacts()
```

---

## Step 4: Environment Variables

### 4.1 Update `.env` File

Add these variables to your `.env`:

```bash
# n8n Configuration
N8N_API_KEY="n8n_xxxxxxxxxxxxxxxxxxxxxxxx"  # From n8n Settings → API
N8N_WEBHOOK_URL="http://localhost:5678/webhook"  # or your production URL

# WhatsApp Business Cloud API (Meta)
WHATSAPP_ACCESS_TOKEN="EAAxxxxxxxxxxxxxxxxxxxxxxxxxx"  # Permanent token from Meta
WHATSAPP_PHONE_NUMBER_ID="109876543210"  # From Meta WhatsApp setup
WHATSAPP_BUSINESS_ACCOUNT_ID="123456789012345"  # WABA ID
WHATSAPP_VERIFY_TOKEN="planbeta_whatsapp_verify_2024"  # For webhook verification

# OR use Twilio WhatsApp (if using Twilio instead)
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="xxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886"

# SMS Provider (Twilio recommended for India)
SMS_PROVIDER="twilio"  # or "msg91"
TWILIO_SMS_NUMBER="+1XXXXXXXXXX"  # For SMS fallback

# OR MSG91 (Popular in India)
MSG91_AUTH_KEY="xxxxxxxxxxxxxxxxxxxxxxxx"
MSG91_SENDER_ID="PLNBTA"  # 6-char sender ID

# WhatsApp Template IDs (from Meta approval)
WHATSAPP_TEMPLATE_TIER1="tier1_absence_alert"
WHATSAPP_TEMPLATE_TIER2="tier2_high_risk_alert"
WHATSAPP_TEMPLATE_TIER3="tier3_urgent_retention"
```

### 4.2 Restart Your App

```bash
# If running locally
npm run dev

# If running in production
vercel --prod
# Or
pm2 restart all
```

---

## Step 5: Import n8n Workflows

### 5.1 Download Workflow Files

The workflow JSON files are located in:
- `n8n-workflows/tier1-churn-prevention.json`
- `n8n-workflows/tier2-churn-prevention.json`
- `n8n-workflows/tier3-churn-prevention.json`
- `n8n-workflows/daily-churn-check.json` (scheduler)

### 5.2 Import into n8n

1. Open n8n: `http://localhost:5678`
2. Click **Workflows** (left sidebar)
3. Click **Import from File**
4. Select `daily-churn-check.json` first
5. Click **Import**
6. Repeat for tier1, tier2, tier3 workflows

### 5.3 Configure Credentials

For each workflow, set up credentials:

#### WhatsApp Credentials (Meta)
1. In workflow, click **WhatsApp** node
2. Create new credential
3. Enter:
   - **Access Token:** `{{$env.WHATSAPP_ACCESS_TOKEN}}`
   - **Phone Number ID:** `{{$env.WHATSAPP_PHONE_NUMBER_ID}}`

#### HTTP Request Credentials (for API calls)
1. Click **HTTP Request** node
2. Header: `x-n8n-api-key: {{$env.N8N_API_KEY}}`

#### Twilio Credentials (if using Twilio)
1. Click **Twilio** node
2. Create credential
3. Enter Account SID and Auth Token

### 5.4 Activate Workflows

1. Open **daily-churn-check** workflow
2. Click **Active** toggle (top right)
3. Set schedule: Daily at 10 PM Berlin time
4. Activate tier1, tier2, tier3 workflows (these are triggered by daily check)

---

## Step 6: Testing

### 6.1 Test WhatsApp Integration

```bash
# Create a test script
npx tsx scripts/test-whatsapp.ts
```

Create `scripts/test-whatsapp.ts`:
```typescript
async function testWhatsApp() {
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: "91XXXXXXXXXX", // Your test number
        type: "template",
        template: {
          name: "tier1_absence_alert",
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: "Test Student" },
                { type: "text", text: "2" },
              ],
            },
          ],
        },
      }),
    }
  )
  console.log(await response.json())
}

testWhatsApp()
```

### 6.2 Test API Endpoints

```bash
# Test fetching churn students
curl -X GET "http://localhost:3000/api/n8n/churn-students?tier=1" \
  -H "x-n8n-api-key: YOUR_N8N_API_KEY"

# Test creating intervention
curl -X POST "http://localhost:3000/api/n8n/churn-intervention" \
  -H "x-n8n-api-key: YOUR_N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "clxxxxxxxxxxxxxx",
    "consecutiveAbsences": 2,
    "tier": 1
  }'
```

### 6.3 Test n8n Workflow Manually

1. Open `daily-churn-check` workflow in n8n
2. Click **Execute Workflow** button (top right)
3. Check execution logs
4. Verify:
   - Students fetched correctly
   - Tier workflows triggered
   - WhatsApp messages sent
   - Database updated

---

## Monitoring & Maintenance

### Daily Checks

1. **n8n Execution Logs**
   - Go to n8n → **Executions**
   - Check for failed workflows
   - Review error messages

2. **WhatsApp Delivery Status**
   - Query `ChurnIntervention` table for delivery stats
   - Check `whatsappDelivered` and `whatsappRead` fields

3. **Database Monitoring**
```sql
-- Check intervention stats
SELECT
  tier,
  status,
  COUNT(*) as count
FROM "ChurnIntervention"
WHERE "createdAt" > NOW() - INTERVAL '7 days'
GROUP BY tier, status;

-- Check success rate
SELECT
  tier,
  SUM(CASE WHEN "resolutionType" = 'RETURNED' THEN 1 ELSE 0 END)::float / COUNT(*) * 100 as success_rate_percent
FROM "ChurnIntervention"
WHERE "resolved" = true
GROUP BY tier;
```

### Weekly Reports

Create automated report workflow in n8n:
- Total interventions created
- Success rate by tier
- Students returned vs dropped
- WhatsApp delivery rate
- Average response time

### Monthly Optimization

1. Review retention offer effectiveness
2. A/B test WhatsApp message templates
3. Adjust tier thresholds if needed
4. Update parent contact information

---

## Troubleshooting

### Issue: WhatsApp Messages Not Sending

**Check:**
1. Access token not expired (Meta tokens expire)
2. Phone number verified in Meta Business
3. Message template approved
4. Recipient has WhatsApp installed

**Solution:**
```bash
# Regenerate access token in Meta Developer Console
# Update .env with new token
# Restart n8n: docker-compose -f docker-compose.n8n.yml restart n8n
```

### Issue: n8n Workflow Fails

**Check n8n logs:**
```bash
docker logs plan-beta-n8n --tail 100 -f
```

**Common fixes:**
- Verify API key in headers
- Check database connection
- Ensure credentials are set correctly

### Issue: SMS Not Sending

**Check:**
- Twilio account balance
- SMS number verified
- Recipient number in correct format (`+91XXXXXXXXXX`)

---

## Cost Estimation

### WhatsApp Business Cloud API (Meta)
- **Free tier:** 1,000 conversations/month
- **Paid:** $0.005-0.09 per conversation (India)
- **Estimated:** ~500 conversations/month = $2.50-45/month

### Twilio SMS (Fallback)
- **India SMS:** $0.0062 per message
- **Estimated:** ~100 SMS/month = $0.62/month

### n8n Self-Hosted
- **Cost:** FREE (using your own server)
- **Alternative n8n Cloud:** $20-50/month (if you don't want to self-host)

**Total Monthly Cost:** ~$3-50/month (depending on volume)

---

## Next Steps

1. ✅ Complete this setup guide
2. Test with 5-10 students first
3. Monitor results for 1 week
4. Gradually roll out to all students
5. Set up automated reporting
6. Consider adding: Instagram DM integration, Voice call automation

---

## Support

For issues:
1. Check n8n community: https://community.n8n.io/
2. WhatsApp API docs: https://developers.facebook.com/docs/whatsapp/
3. Plan Beta internal docs: `/docs/`

**Last Updated:** 2024
**Version:** 1.0
