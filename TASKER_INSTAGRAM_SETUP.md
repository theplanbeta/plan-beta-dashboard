# Tasker Instagram Notification Webhook Setup

This guide will help you configure Tasker on your Android phone to capture Instagram notifications and automatically create leads in your Plan Beta dashboard.

## Prerequisites

- Android phone with Tasker app installed ([Download Tasker](https://play.google.com/store/apps/details?id=net.dinglisch.android.taskerm))
- Instagram app installed and logged in
- Phone connected to internet (WiFi or mobile data)

## Webhook Details

**Webhook URL (Production):** `https://planbeta.app/api/webhooks/tasker-instagram`

**Webhook URL (Testing):** `http://localhost:3001/api/webhooks/tasker-instagram`

**Secret Token:** `planbeta_tasker_instagram_2024_secure`

---

## Step-by-Step Setup

### 1. Create a New Profile in Tasker

1. Open **Tasker** app
2. Tap the **+** button to create a new Profile
3. Select **Event** → **UI** → **Notification**
4. Configure notification settings:
   - **Owner Application:** Instagram
   - **Title:** Leave blank (to capture all)
   - Leave other fields blank

### 2. Create the Webhook Task

1. After creating the profile, tap **New Task**
2. Name it: **"Instagram to Plan Beta"**
3. Tap **+** to add actions

### 3. Add Actions to Extract Notification Data

#### Action 1: Extract Sender Name
1. Tap **+** → **Variables** → **Variable Set**
2. Name: `%sender_name`
3. To: `%evtprm2` (This is the notification title, usually contains sender name)

#### Action 2: Extract Message Preview
1. Tap **+** → **Variables** → **Variable Set**
2. Name: `%message_preview`
3. To: `%evtprm3` (This is the notification text/message content)

#### Action 3: Get Current Timestamp
1. Tap **+** → **Variables** → **Variable Set**
2. Name: `%timestamp`
3. To: `%TIMES` (Current timestamp)

#### Action 4: Determine Notification Type
1. Tap **+** → **Variables** → **Variable Set**
2. Name: `%notification_type`
3. To: `MESSAGE` (You can make this dynamic later)

### 4. Send Data to Webhook

#### Action 5: HTTP Request
1. Tap **+** → **Net** → **HTTP Request**
2. Configure the request:
   - **Method:** POST
   - **URL:** `https://planbeta.app/api/webhooks/tasker-instagram`
   - **Headers:**
     ```
     Content-Type: application/json
     ```
   - **Body:**
     ```json
     {
       "senderName": "%sender_name",
       "messagePreview": "%message_preview",
       "notificationType": "%notification_type",
       "timestamp": "%timestamp",
       "secret": "planbeta_tasker_instagram_2024_secure"
     }
     ```
   - **Timeout:** 30 seconds
   - **Trust Any Certificate:** ON (if using HTTPS)

#### Action 6: Show Success Notification (Optional)
1. Tap **+** → **Alert** → **Flash**
2. Text: `Lead sent to Plan Beta: %sender_name`
3. This will show a brief toast message

### 5. Save and Enable

1. Tap the **✓** checkmark to save the task
2. Tap the **←** back button to save the profile
3. Make sure the profile is **ENABLED** (toggle switch on the right should be ON)

---

## Advanced Configuration (Optional)

### Filtering by App
To capture only Instagram Business/Messenger notifications:
1. Edit your profile
2. Add a condition:
   - **Event** → **UI** → **Notification**
   - **Owner Application:** com.instagram.android

### Capturing Different Notification Types
You can create separate profiles for:
- **Direct Messages:** Title contains "message"
- **Comments:** Title contains "comment"
- **Mentions:** Title contains "mention"

For each, change the `notificationType` in the JSON body accordingly.

### Battery Optimization
1. Go to **Android Settings** → **Apps** → **Tasker**
2. **Battery** → Disable battery optimization
3. This ensures Tasker runs in the background

---

## Testing the Setup

### Test with Production URL

1. Send yourself a test Instagram message from another account
2. Check if the notification appears on your phone
3. Tasker should automatically trigger
4. Check your Plan Beta dashboard → Leads page
5. You should see a new lead created with the sender's name

### Test with cURL (Manual Testing)

You can also test the webhook manually:

```bash
curl -X POST https://planbeta.app/api/webhooks/tasker-instagram \
  -H "Content-Type: application/json" \
  -d '{
    "senderName": "Test User",
    "messagePreview": "Hey, I am interested in German classes",
    "notificationType": "MESSAGE",
    "timestamp": "2025-10-25T10:00:00Z",
    "secret": "planbeta_tasker_instagram_2024_secure"
  }'
```

### Check Webhook Status

Visit this URL in your browser to verify the webhook is active:
```
https://planbeta.app/api/webhooks/tasker-instagram
```

You should see:
```json
{
  "status": "active",
  "endpoint": "/api/webhooks/tasker-instagram",
  "message": "Tasker Instagram webhook is ready"
}
```

---

## Troubleshooting

### Webhook Not Triggered
1. Check if Tasker profile is enabled
2. Verify notification permissions for Instagram
3. Check internet connection
4. Look at Tasker logs: Tasker → Menu → More → Run Log

### Wrong Data Captured
1. Use **Flash** action to debug:
   - Add `Flash: %sender_name` to see what's captured
   - Add `Flash: %message_preview` to verify message
2. Adjust variable mappings based on what you see

### 401 Unauthorized Error
- Check if the secret token in Tasker matches: `planbeta_tasker_instagram_2024_secure`
- Make sure there are no extra spaces in the JSON body

### Lead Not Created
1. Check Plan Beta server logs (if accessible)
2. Verify the JSON body format is correct
3. Test with the cURL command above to isolate Tasker vs server issues

---

## What Happens When a Notification Arrives

1. Instagram notification appears on your phone
2. Tasker detects the notification
3. Extracts sender name and message preview
4. Sends HTTP POST request to Plan Beta
5. Plan Beta creates/updates lead record
6. Lead appears in your dashboard immediately
7. You can then manually update contact details and follow up

---

## Limitations & Workarounds

### Truncated Messages
- Instagram notifications only show ~50 characters
- **Workaround:** Add notes manually after checking Instagram

### Missing Phone Numbers
- Notifications don't include WhatsApp/phone
- **Workaround:** Update lead manually with contact details

### Battery Drain
- Constant monitoring uses battery
- **Workaround:** Only enable during business hours using Time context

### Multiple Devices
- This setup works on one phone only
- **Workaround:** Set up same profile on multiple phones (all send to same webhook)

---

## Next Steps

1. Set up Tasker as described above
2. Test with a few Instagram messages
3. Verify leads are created in dashboard
4. Configure follow-up workflow for new leads
5. (Optional) Add email/Slack notifications for urgent leads

---

## Support

If you run into issues:
1. Check Tasker Run Log
2. Test with cURL command
3. Verify webhook URL is accessible
4. Check server logs for errors

---

**Last Updated:** October 25, 2025
**Webhook Version:** 1.0
**Compatible with:** Android 8.0+ with Tasker 6.0+
