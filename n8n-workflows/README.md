# n8n Churn Prevention Workflows

This directory contains importable n8n workflows for the Enhanced Churn Prevention System.

## Files

### 1. `daily-churn-check.json`
**Main scheduler workflow** - Runs daily at 10 PM Berlin time

**What it does:**
- Fetches students with consecutive absences from your API
- Categorizes them into 3 tiers based on absence count
- Triggers appropriate tier workflows for each student

**Schedule:** Daily at 22:00 (10 PM) Berlin time

**Dependencies:**
- Requires `TIER1_WORKFLOW_ID`, `TIER2_WORKFLOW_ID`, `TIER3_WORKFLOW_ID` in .env

---

### 2. `tier1-churn-prevention.json`
**Tier 1 intervention** - For students with 2 consecutive absences

**Flow:**
1. Create intervention record in database
2. Send WhatsApp message to student
3. Send email alert to teacher
4. Wait 24 hours
5. Check if student responded
6. If no response → Schedule follow-up call for admin

**Communication channels:**
- WhatsApp to student ✓
- Email to teacher ✓
- Admin task creation (if no response) ✓

---

### 3. `tier2-churn-prevention.json` *(TO BE CREATED)*
**Tier 2 intervention** - For students with 3+ consecutive absences

**Planned flow:**
1. Create intervention record
2. Send WhatsApp to student
3. Send WhatsApp to parent
4. Notify teacher (WhatsApp + Email)
5. Wait 2 hours
6. If WhatsApp unread → Send SMS backup
7. Offer makeup class (auto-schedule API call)
8. Create high-priority admin task

**Communication channels:**
- WhatsApp to student ✓
- WhatsApp to parent ✓
- WhatsApp to teacher ✓
- Email to teacher ✓
- SMS backup (conditional) ✓

---

### 4. `tier3-churn-prevention.json` *(TO BE CREATED)*
**Tier 3 intervention** - For students with 5+ consecutive absences

**Planned flow:**
1. Create intervention record
2. Send urgent WhatsApp to student + parent
3. Create critical task for founder call
4. Send retention offer (discount/free session)
5. If student confirms dropout → Send exit survey link
6. Notify admin team via multiple channels

**Communication channels:**
- WhatsApp to student (urgent) ✓
- WhatsApp to parent (urgent) ✓
- Founder notification (email + SMS) ✓
- Retention offer ✓
- Exit survey (conditional) ✓

---

## How to Import

### Step 1: Start n8n
```bash
cd /Users/deepak/plan-beta-dashboard
docker-compose -f docker-compose.n8n.yml up -d
```

Access n8n at: http://localhost:5678

### Step 2: Import Workflows

1. Open n8n web interface
2. Click **Workflows** in left sidebar
3. Click **Import from File** button
4. Select workflow JSON file
5. Click **Import**

**Import order:**
1. Import Tier 1, 2, 3 workflows first
2. Note down their workflow IDs from the URL (e.g., `http://localhost:5678/workflow/123`)
3. Add IDs to `.env`:
   ```
   TIER1_WORKFLOW_ID=123
   TIER2_WORKFLOW_ID=124
   TIER3_WORKFLOW_ID=125
   ```
4. Import `daily-churn-check.json` last
5. Activate all workflows

### Step 3: Configure Credentials

Each workflow requires credentials to be set up in n8n:

#### WhatsApp Business API
- **Type:** HTTP Request with custom auth
- **URL:** `https://graph.facebook.com/v18.0/...`
- **Headers:**
  - `Authorization: Bearer {{$env.WHATSAPP_ACCESS_TOKEN}}`
  - `Content-Type: application/json`

#### SMTP (for email)
- **Type:** Email Send
- **SMTP Host:** From your email provider
- **Username/Password:** Your SMTP credentials

#### Twilio (for SMS - Tier 2 & 3)
- **Type:** Twilio node
- **Account SID:** From Twilio dashboard
- **Auth Token:** From Twilio dashboard

#### API Authentication (for dashboard API calls)
- **Type:** HTTP Request
- **Headers:**
  - `x-n8n-api-key: {{$env.N8N_API_KEY}}`

---

## Testing Workflows

### Manual Test Execution

1. Open a workflow in n8n
2. Click **Execute Workflow** button (play icon)
3. View execution in **Executions** panel
4. Check each node for success/errors

### Test with Real Data

```bash
# Trigger daily check manually
curl -X POST "http://localhost:5678/webhook/daily-churn-check" \
  -H "Content-Type: application/json"

# Or use n8n Test Execution feature
```

### Verify Results

Check your database:
```sql
SELECT * FROM "ChurnIntervention"
ORDER BY "createdAt" DESC
LIMIT 10;
```

---

## Monitoring

### View Execution Logs

1. In n8n, go to **Executions** (left sidebar)
2. Click on an execution to see details
3. Check for errors (red nodes)
4. View data flowing through each node

### Common Issues

**Workflow not triggering:**
- Check if workflow is **Active** (toggle at top)
- Verify schedule cron expression
- Check n8n logs: `docker logs plan-beta-n8n --tail 100 -f`

**WhatsApp not sending:**
- Verify `WHATSAPP_ACCESS_TOKEN` not expired
- Check template name matches approved template
- Ensure phone number format is correct (no +, no spaces)

**API calls failing:**
- Verify `N8N_API_KEY` set in .env
- Check API endpoint URLs are correct
- Ensure dashboard is running and accessible

---

## Customization

### Adjust Timing

**Change daily schedule:**
Edit `daily-churn-check.json` → Schedule node → Cron expression
- Current: `0 22 * * *` (10 PM daily)
- Change to 9 PM: `0 21 * * *`

**Change wait times:**
Edit tier workflows → Wait node → Duration
- Tier 1: Currently 24 hours
- Tier 2: Currently 2 hours for SMS backup

### Modify Messages

**WhatsApp templates:**
Must be changed in Meta Business Manager (requires approval)

**Email content:**
Edit in workflow → Email Send node → Message field

### Add Notifications

**Add Slack notification:**
1. Add Slack node after any step
2. Connect to your Slack workspace
3. Send message on success/failure

**Add Discord webhook:**
1. Add HTTP Request node
2. POST to Discord webhook URL
3. Send formatted message

---

## Workflow Variables

These environment variables must be set:

### Required (in .env)
```bash
# Dashboard API
NEXT_PUBLIC_APP_URL="https://your-dashboard.vercel.app"
N8N_API_KEY="your-n8n-api-key"

# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN="EAAxxxx..."
WHATSAPP_PHONE_NUMBER_ID="123456789"
WHATSAPP_TEMPLATE_TIER1="tier1_absence_alert"
WHATSAPP_TEMPLATE_TIER2="tier2_high_risk_alert"
WHATSAPP_TEMPLATE_TIER3="tier3_urgent_retention"

# SMS (optional - for Tier 2 & 3)
TWILIO_ACCOUNT_SID="ACxxxx..."
TWILIO_AUTH_TOKEN="xxxx..."
TWILIO_SMS_NUMBER="+1234567890"

# Workflow IDs (set after importing)
TIER1_WORKFLOW_ID="123"
TIER2_WORKFLOW_ID="124"
TIER3_WORKFLOW_ID="125"
```

---

## Performance Tips

1. **Use webhook waits** instead of polling for better performance
2. **Batch process** students if volume is high (>100/day)
3. **Set execution timeout** to 5 minutes in n8n settings
4. **Enable retry** on failed HTTP requests (n8n node settings)
5. **Monitor memory usage** of n8n container

---

## Backup & Version Control

### Export Workflows Regularly

```bash
# From n8n UI: Workflow → Download
# Save to this directory with version in filename
# Example: tier1-churn-prevention-v2.json
```

### Git Versioning

```bash
git add n8n-workflows/
git commit -m "Update churn prevention workflows"
git push
```

---

## Advanced Features (Future)

- **A/B Testing:** Create variant workflows and split traffic
- **AI Personalization:** Use GPT to customize messages
- **Voice Calls:** Integrate with voice API for Tier 3
- **Predictive Analytics:** Trigger before absences occur
- **Parent Portal Integration:** Real-time updates to parents

---

## Support

**Documentation:**
- Main setup guide: `../docs/CHURN_PREVENTION_SETUP.md`
- Implementation guide: `../docs/CHURN_PREVENTION_IMPLEMENTATION_GUIDE.md`

**Community:**
- n8n community: https://community.n8n.io/
- WhatsApp API docs: https://developers.facebook.com/docs/whatsapp/

**Issues:**
Create GitHub issue with:
- Workflow name
- Error message
- Execution ID from n8n
- Steps to reproduce

---

**Created:** January 2025
**Version:** 1.0
**Status:** Tier 1 ready, Tier 2 & 3 in progress
