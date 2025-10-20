# Enable Instagram DM Webhooks

Currently, your system receives **comment webhooks** but not **DM webhooks**.

## Why DMs Don't Work Yet

Instagram DM webhooks require:
1. ✅ App published (you've done this)
2. ✅ Webhook URL configured (you have this)
3. ❌ **`instagram_manage_messages` permission** (requires Meta App Review)
4. ❌ **Subscription to `messages` field** (can only be done after permission granted)

## Steps to Enable DM Webhooks

### Step 1: Request App Review for DM Permission

1. Go to https://developers.facebook.com/apps
2. Select your app
3. Click **App Review** > **Permissions and Features** in left sidebar
4. Find **`instagram_manage_messages`**
5. Click **Request**
6. Fill out the form:

**Why do you need this permission?**
```
We run a German language school in Kerala, India. We need to manage Instagram DMs
to respond to student inquiries about course enrollment, pricing, and schedules.

Our system automatically:
- Tracks DM conversations with potential students
- Analyzes message content to identify high-intent leads
- Helps us respond faster to enrollment requests

We will only access messages sent to our own Instagram Business Account.
```

**How will you use it?**
```
- Read incoming DM messages to detect enrollment intent
- Track conversation history for lead scoring
- Identify pricing and schedule questions
- Store message metadata for analytics

We do NOT send automated DM replies (only comment replies).
```

7. Upload a **screencast video** showing:
   - Your Instagram Business Account
   - Example DM conversation with a student inquiry
   - Your dashboard where you track leads
   - How you manually respond to DMs

8. Submit for review

**Review time:** Usually 1-3 business days

### Step 2: After Permission is Approved

Once Meta approves `instagram_manage_messages`:

1. Go to **Webhooks** in your app
2. Under **Instagram**, click **Edit Subscription**
3. Check these fields:
   - ✅ `comments` (already checked)
   - ✅ **`messages`** (new - check this)
4. Click **Save**

### Step 3: Test DM Webhook

After subscribing to `messages` field:

1. Send a DM to your Instagram Business Account: "I want to enroll in A1"
2. Wait 10 seconds
3. Run: `npx tsx scripts/check-recent-instagram.ts`
4. You should see the DM in the "Recent Messages" section

## Alternative: Use Comments Until DM Access is Granted

While waiting for App Review, you can:

1. **Ask customers to comment instead of DM**
   - Add to your Instagram bio: "📝 Comment on our posts to inquire!"
   - Comments work immediately (no approval needed)

2. **Manually check DMs** in Instagram app
   - DM conversations will be visible in Instagram
   - You just won't have automatic webhook notifications

3. **Focus on comment-based lead capture**
   - Most high-intent users comment on posts anyway
   - Comments are public, so they often convert better

## What Works Right Now (Without DM Webhooks)

Your system currently supports:

✅ **Comment tracking** - All comments on your posts are captured
✅ **Comment-based lead scoring** - Creates leads from high-intent comments
✅ **Trigger word detection** - Detects "interested", "price", "enroll", etc.
✅ **Auto-replies to comments** - Replies to pricing/enrollment questions
✅ **AI-enhanced scoring** - Handles Malayalam + English comments
✅ **Lead quality tiers** - HOT/WARM/COLD based on comment intent

❌ **DM tracking** - Requires `instagram_manage_messages` permission
❌ **DM-based lead scoring** - Will work after permission granted
❌ **Auto-replies to DMs** - Not supported (violates Instagram policies)

## Timeline

| Action | Time | Who |
|--------|------|-----|
| Submit App Review | 15 minutes | You |
| Meta reviews submission | 1-3 business days | Meta |
| Permission granted | Instant | Meta |
| Subscribe to `messages` field | 2 minutes | You |
| DM webhooks active | Instant | Automatic |

## Important Notes

1. **You can only access DMs sent to your own Instagram account** (not others)
2. **Auto-replying to DMs is against Instagram policies** (don't do it)
3. **Comment webhooks continue to work** while waiting for DM approval
4. **Manual DM responses are fine** - you can still reply manually in Instagram app

---

**Current Status:**
🟢 Comment webhooks: **Active**
🟡 DM webhooks: **Pending App Review**

**Next Step:**
Submit App Review request for `instagram_manage_messages` permission
