# Google Meet Automated Recording System

Automated system to record Google Meet classes for Plan Beta batches.

## 🎯 Overview

This system automatically:
1. **Joins Google Meet** at scheduled class times (7 AM & 5 PM CET)
2. **Starts recording** (leverages auto-record in Google Workspace)
3. **Verifies recording** is active
4. **Logs everything** for monitoring
5. **Runs in parallel** for multiple batches

## 📋 Components

### 1. Database Schema
- **Batch Model**: Added `meetLink`, `timing`, `autoRecord` fields
- **RecordingLog Model**: Tracks all recording attempts with status

### 2. Recording Script
- **File**: `scripts/google-meet-recorder.ts`
- Opens headless Chrome, joins meet, verifies recording
- Uses persistent Chrome profile (login once, stays logged in)

### 3. API Endpoints

#### `/api/recordings/trigger` (POST)
Trigger recording for a specific batch
```json
{
  "batchId": "batch_id_here"
}
```

#### `/api/recordings/trigger-scheduled` (POST)
Triggers all batches scheduled at current time
- Requires `Authorization: Bearer <CRON_SECRET>` header
- Called by cron job at 6:55 AM & 4:55 PM CET

### 4. Cron Job
- **File**: `scripts/trigger-recordings-cron.sh`
- Runs Monday-Friday at 6:55 AM & 4:55 PM CET
- Logs to `logs/recordings-cron.log`

## 🚀 Setup Instructions

### Step 1: Database Configuration (DONE ✅)
Schema has been updated and pushed to database.

### Step 2: First-Time Chrome Login

You need to log in to Google once so the bot can reuse the session:

```bash
# Run this script with a test meeting link
npx tsx scripts/google-meet-recorder.ts "https://meet.google.com/YOUR-TEST-LINK" "Test Class"
```

**What will happen:**
1. Chrome window opens (not headless)
2. You'll see Google login page
3. **Log in with:** `aparnasbose1991@gmail.com`
4. Complete any 2FA if required
5. Credentials are saved in `.chrome-profile/` directory
6. After login, the script will join the meeting and verify recording

**Important:** Keep the `.chrome-profile/` directory - it contains your saved session!

### Step 3: Configure Batches in Dashboard

For each batch that needs recording:
1. Go to Batch edit page
2. Set **Timing**: "MORNING" or "EVENING"
3. Add **Meet Link**: Full Google Meet URL
4. Enable **Auto Record**: ☑️ checked
5. Set **Status**: "ACTIVE"
6. Save batch

### Step 4: Set Up Cron Job

**Option A: Mac/Linux (Local)**

```bash
# Open crontab editor
crontab -e

# Add this line (runs Monday-Friday at 6:55 AM & 4:55 PM CET):
MAILTO=""
TZ=Europe/Berlin
55 6,16 * * 1-5 /Users/deepak/plan-beta-dashboard/scripts/trigger-recordings-cron.sh
```

**Option B: Vercel Cron (Recommended for Production)**

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/recordings/trigger-scheduled",
      "schedule": "55 6,16 * * 1-5"
    }
  ]
}
```

**Option C: EasyCron or similar service**
- Create cron job hitting: `https://your-domain.com/api/recordings/trigger-scheduled`
- Method: POST
- Header: `Authorization: Bearer planbeta_meet_recording_cron_2024_secure`
- Schedule: `55 6,16 * * 1-5` (CET timezone)

### Step 5: Testing

**Test manual trigger:**
```bash
curl -X POST http://localhost:3001/api/recordings/trigger \
  -H "Content-Type: application/json" \
  -d '{"batchId": "YOUR_BATCH_ID"}'
```

**Test scheduled trigger:**
```bash
curl -X POST http://localhost:3001/api/recordings/trigger-scheduled \
  -H "Authorization: Bearer planbeta_meet_recording_cron_2024_secure"
```

**Check logs:**
```bash
# Cron logs
tail -f logs/recordings-cron.log

# Recording database logs
# View in dashboard or query RecordingLog table
```

## 📊 Monitoring

### View Recording Logs

Query the database to see all recording attempts:
```sql
SELECT * FROM "RecordingLog"
ORDER BY "scheduledTime" DESC
LIMIT 20;
```

### Status Values
- `PENDING`: Scheduled but not started
- `STARTED`: Script initiated
- `RECORDING`: Successfully verified recording active
- `COMPLETED`: Recording finished
- `FAILED`: Failed to start
- `VERIFICATION_FAILED`: Started but couldn't verify recording

### Screenshot Debugging
If `recordingVerified` is false, check the `screenshot` field for a saved screenshot path.

## 🔧 Troubleshooting

### Recording not starting?
1. Check batch has `autoRecord = true`
2. Check batch has `meetLink` configured
3. Check batch `status = ACTIVE`
4. Check batch `timing` matches (MORNING/EVENING)
5. Check cron logs: `tail logs/recordings-cron.log`

### Chrome session expired?
Re-run the setup with a test link:
```bash
npx tsx scripts/google-meet-recorder.ts "https://meet.google.com/test" "Test"
```
Log in again when prompted.

### Multiple batches not recording?
The system triggers all batches in parallel. Check individual batch logs in `RecordingLog` table.

## 🎓 How It Works

### Morning Classes (7 AM CET)
1. **6:55 AM**: Cron job triggers
2. API finds all batches with `timing = "MORNING"`, `autoRecord = true`, `status = "ACTIVE"`
3. For each batch, spawns Puppeteer process
4. Each process joins its meeting, waits 5 seconds (auto-record triggers)
5. Verifies recording is active
6. Keeps session alive for 90 minutes (configurable)

### Evening Classes (5 PM CET)
Same as morning but at 4:55 PM for `timing = "EVENING"` batches.

## 📝 Notes

- **Auto-recording must be enabled** in your Google Workspace settings
- Recordings save to Google Drive automatically
- Bot joins with **camera/mic off** (no disruption)
- Bot account: `aparnasbose1991@gmail.com`
- System handles multiple parallel recordings
- Each recording gets a unique log entry for auditing

## 🔒 Security

- Cron endpoint protected with `CRON_SECRET` in `.env`
- Chrome profile stored locally (never committed to git)
- All credentials in environment variables

## 📈 Future Enhancements

- [ ] Email/Slack notifications on recording failures
- [ ] Automatic retry on failure
- [ ] Integration with class attendance tracking
- [ ] Recording duration based on actual class schedule
- [ ] WhatsApp notifications to admin when recording starts/stops

---

**Created:** November 2024
**Maintained by:** Plan Beta Tech Team
