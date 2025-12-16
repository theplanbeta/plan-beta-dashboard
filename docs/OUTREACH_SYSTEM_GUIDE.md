# Founder Outreach System - User Guide

## Quick Start

### View Today's Calls
```bash
npx tsx scripts/view-scheduled-calls.ts today
```

### View This Week's Schedule
```bash
npx tsx scripts/view-scheduled-calls.ts week
```

### Run Scheduler Manually
```bash
npx tsx scripts/schedule-outreach-calls.ts
```

### Test Algorithm
```bash
npx tsx scripts/test-outreach-scheduling.ts
```

---

## Understanding Student Tiers

### PLATINUM (Score 35+)
**Contact every 30 days**

These are your VIP students:
- Made 3+ referrals (ambassadors)
- Created 5+ content posts
- Revenue of 5000+ EUR
- Long relationship with high engagement

**Example:** Student who refers friends regularly and posts German content weekly.

### GOLD (Score 25-34)
**Contact every 42 days (~6 weeks)**

Your high performers:
- 80%+ attendance
- 2 referrals or regular content creator
- 3000+ EUR revenue
- Engaged in community

**Example:** Student with excellent attendance who occasionally refers friends.

### SILVER (Score 15-24)
**Contact every 75 days (~2.5 months)**

Stable, moderate students:
- 50-80% attendance
- Consistent but not exceptional
- 2000+ EUR revenue or 1 referral
- Low need for intervention

**Example:** Regular student who shows up and does the work without issues.

### BRONZE (Score <15)
**Contact every 105 days (~3.5 months)**

New or low-engagement students:
- Just enrolled
- Low attendance (<50%)
- No referrals or content
- Minimal relationship history

**Example:** Brand new student or someone who rarely attends.

---

## Understanding Call Priorities

### HIGH Priority (Call ASAP)
🔴 **Urgent situations requiring immediate founder attention**

Triggers:
- Week 1-3 after enrollment (onboarding critical)
- 3+ consecutive absences
- HIGH churn risk flagged
- Payment overdue
- Attendance <50%

**What to do:** Call within 24-48 hours. Focus on retention and support.

### MEDIUM Priority (Call Soon)
🟡 **Important but not urgent**

Triggers:
- Not contacted in 2-3 months
- Partial payment pending
- New milestone reached
- MEDIUM churn risk

**What to do:** Call within 1-2 weeks. Check-in and relationship building.

### LOW Priority (Routine Check-in)
🟢 **Nice-to-have relationship maintenance**

Triggers:
- High performers doing well
- Not contacted in 3+ months
- Random selection for community building

**What to do:** Call when time permits. Celebrate wins, gather feedback.

---

## Daily Workflow

### Morning Routine (6 AM - Automatic)
The system runs automatically and:
1. Analyzes all 77 active students
2. Calculates tiers and priorities
3. Schedules calls for next 7 days
4. Creates 5 calls per day (balanced priorities)
5. Logs decisions to `logs/outreach-scheduler.log`

### Before Calls (Founder Action)
```bash
# View today's schedule
npx tsx scripts/view-scheduled-calls.ts today
```

You'll see:
- Priority (HIGH/MEDIUM/LOW)
- Student name and WhatsApp
- Call type (ONBOARDING, RETENTION, etc.)
- Purpose/reason for call
- Pre-call notes with context
- Warnings (churn risk, absences)

### During Call (Founder Action)
Use the dashboard to:
1. Navigate to student's profile
2. Click on scheduled OutreachCall
3. Mark as "In Progress"
4. Take notes during conversation

### After Call (Founder Action)
1. Mark call as "Completed"
2. Add call notes (detailed summary)
3. Set sentiment (VERY_POSITIVE to VERY_NEGATIVE)
4. System auto-schedules next call based on notes
5. Update student journey if needed

---

## Call Types Explained

### ONBOARDING
**When:** Week 1-3 after enrollment
**Purpose:** Welcome, set expectations, build relationship
**Key Topics:**
- How are classes going?
- Any questions about the platform?
- What are your German learning goals?
- Introduce yourself as founder

### RETENTION
**When:** High churn risk or multiple absences
**Purpose:** Prevent dropout, address issues
**Key Topics:**
- We noticed you've been absent - everything okay?
- Is the timing/level right for you?
- Any challenges we can help with?
- Do you want to continue?

### CHECK_IN
**When:** Routine tier-based contact
**Purpose:** Relationship maintenance, gather feedback
**Key Topics:**
- How's your German learning journey?
- Any feedback on teachers/classes?
- Would you recommend us to friends?
- Anything we can improve?

### MILESTONE
**When:** Completed level, 50 classes, etc.
**Purpose:** Celebrate success, encourage continuation
**Key Topics:**
- Congratulations on [milestone]!
- Ready for next level?
- Share success story on social media?
- Consider referring friends?

### SUPPORT
**When:** Payment issues, technical problems
**Purpose:** Resolve specific issues
**Key Topics:**
- Payment plan options
- Technical troubleshooting
- Batch transfer if needed
- Refund processing if required

### COMMUNITY
**When:** PLATINUM/GOLD tier students
**Purpose:** Build ambassador relationships
**Key Topics:**
- Thanks for being amazing!
- Would you mentor newer students?
- Join our alumni network?
- Create content for us?

### FEEDBACK
**When:** After batch completion or major changes
**Purpose:** Gather insights, improve program
**Key Topics:**
- How was your experience?
- What worked well?
- What could be better?
- Would you take another course?

---

## Smart Scheduling Rules

### The 3-Week Rule
**Students won't be called again within 21 days** (unless HIGH priority)

Why? Respect student space and avoid being annoying.

Exception: HIGH priority students can be called after 7 days if urgent.

### Weekend Skip
**No calls scheduled on Saturdays or Sundays**

The system automatically adjusts weekend dates to next Monday.

### Daily Cap
**Maximum 7 calls per day, target 5**

Prevents founder burnout. Sustainable workload.

### Priority Distribution
**Ideal balance: 50% HIGH, 30% MEDIUM, 20% LOW**

Ensures urgent situations get attention while maintaining relationships.

### No Double-Booking
**Students already scheduled for a date are excluded**

System checks existing OutreachCall records before scheduling.

---

## Next Call Auto-Scheduling

After completing a call, the system reads your notes and auto-schedules the next call.

### Keyword Detection

**If notes contain:** → **Next call in:**
- "urgent", "immediate", "asap" → 7 days
- "follow up", "check in" → 14 days
- "doing well", "happy", "satisfied" → 60+ days
- No special keywords → Tier-based frequency

### Example Scenarios

**Scenario 1: Struggling Student**
Notes: "Student struggling with grammar. Need to follow up soon."
→ System detects "follow up" → Schedules in 14 days

**Scenario 2: Happy Student**
Notes: "Everything going great! Student is very happy and engaged."
→ System detects "happy" → Schedules in 60+ days (tier-based)

**Scenario 3: Urgent Issue**
Notes: "Payment issue needs immediate resolution. Call ASAP."
→ System detects "immediate" and "asap" → Schedules in 7 days

**Scenario 4: Normal Check-in**
Notes: "Routine check-in. All good. No issues."
→ No keywords → Uses tier frequency (30-105 days)

---

## Troubleshooting

### "No calls scheduled today"
**Cause:** Either no eligible students or scheduler hasn't run yet.

**Solution:**
```bash
# Manually run scheduler
npx tsx scripts/schedule-outreach-calls.ts

# Then check again
npx tsx scripts/view-scheduled-calls.ts today
```

### "Same students keep appearing"
**Cause:** Those students have HIGH priority (urgent situations).

**Solution:** Complete their calls and resolve issues (absences, payments). Their priority will drop after issues are resolved.

### "Not enough HIGH priority calls"
**Good news!** This means students are doing well. The system will schedule MEDIUM and LOW priority calls to fill the daily quota.

### "Too many calls scheduled"
**Cause:** Manual scheduling conflicts with automatic scheduler.

**Solution:**
```bash
# View all pending calls
npx tsx scripts/view-scheduled-calls.ts pending

# Cancel duplicates via dashboard
# System will backfill with other students
```

### "Student tier seems wrong"
**Check their data:**
- Referrals given?
- Content posts created?
- Recent attendance?
- Payment status?

Tier is calculated from real data. If data is outdated, tier reflects that.

---

## Best Practices

### 1. Review Schedule Each Morning
Start your day by viewing today's calls. Plan your time accordingly.

### 2. Prepare Before Calls
Read pre-call notes. Check student's recent attendance and payments. Have context.

### 3. Take Detailed Notes
Your notes drive the next call scheduling. Be specific about what happened and what's needed.

### 4. Mark Sentiment Honestly
VERY_POSITIVE to VERY_NEGATIVE helps track relationship health over time.

### 5. Complete Calls Same Day
Don't let calls pile up as PENDING. Mark as COMPLETED or SNOOZED if you can't reach them.

### 6. Snooze When Needed
If student doesn't answer, SNOOZE the call for 2-3 days. System won't reschedule during snooze.

### 7. Monitor Weekly Trends
```bash
npx tsx scripts/view-scheduled-calls.ts week
```

See if workload is balanced or if one day has too many calls.

### 8. Trust the Algorithm
It's designed to be fair and sustainable. Don't manually override unless necessary.

---

## Advanced Usage

### Manual Priority Override
If you need to call a student urgently outside the scheduler:

1. Go to student profile in dashboard
2. Create new OutreachCall manually
3. Set priority to HIGH
4. Set scheduledDate to today
5. System will respect this and not double-book

### Bulk Rescheduling
If you're on vacation and need to postpone all calls:

```sql
-- Move all pending calls forward by 7 days
UPDATE "OutreachCall"
SET "scheduledDate" = "scheduledDate" + INTERVAL '7 days'
WHERE status = 'PENDING' AND "scheduledDate" >= CURRENT_DATE;
```

### Custom Scheduling for VIPs
For your top 3-5 VIP students who deserve monthly calls:

1. Ensure they have PLATINUM tier (check tier calculation)
2. System automatically schedules them every 30 days
3. Or create recurring manual OutreachCalls

### Analytics Queries

**Students never contacted:**
```sql
SELECT name, "enrollmentDate", "churnRisk"
FROM "Student"
WHERE id NOT IN (
  SELECT DISTINCT "studentId" FROM "OutreachCall"
)
AND "completionStatus" = 'ACTIVE';
```

**Average calls per student:**
```sql
SELECT AVG(call_count) as avg_calls_per_student
FROM (
  SELECT "studentId", COUNT(*) as call_count
  FROM "OutreachCall"
  WHERE status = 'COMPLETED'
  GROUP BY "studentId"
) subquery;
```

---

## Cron Job Setup

### Linux/Mac

1. Edit crontab:
```bash
crontab -e
```

2. Add this line:
```
0 6 * * * cd /Users/deepak/plan-beta-dashboard && npx tsx scripts/schedule-outreach-calls.ts >> logs/outreach-scheduler.log 2>&1
```

3. Save and exit

### Verify Cron Job
```bash
# List cron jobs
crontab -l

# Check logs
tail -f logs/outreach-scheduler.log
```

### Windows (Task Scheduler)

1. Open Task Scheduler
2. Create Basic Task
3. Trigger: Daily at 6:00 AM
4. Action: Start a program
   - Program: `npx`
   - Arguments: `tsx scripts/schedule-outreach-calls.ts`
   - Start in: `C:\path\to\plan-beta-dashboard`
5. Save

---

## Monitoring & Logs

### Daily Scheduler Log
```bash
tail -f logs/outreach-scheduler.log
```

Shows:
- Students scheduled for each day
- Priority and tier distribution
- Any errors or issues
- Summary statistics

### Database Monitoring
```bash
npx tsx scripts/view-scheduled-calls.ts stats
```

Shows:
- Total calls (all time)
- Pending vs completed
- Priority breakdown
- Next 7 days preview

---

## FAQ

**Q: Why is a new student marked BRONZE tier?**
A: New students have low relationship depth and no engagement history yet. They'll move up tiers as they attend classes and engage with community.

**Q: Can I change the daily call target?**
A: Yes! Edit `scripts/schedule-outreach-calls.ts` and change `TARGET_CALLS_PER_DAY = 5` to your preferred number (max 7).

**Q: What if I want to skip scheduling for a few days?**
A: Disable the cron job temporarily:
```bash
crontab -e
# Comment out the line with #
# 0 6 * * * cd /path/...
```

**Q: How do I add a student to "Do Not Call" list?**
A: Once `outreachOptOut` field is added to schema, mark student with `outreachOptOut = true`. They'll be excluded from scheduling.

**Q: Why do HIGH priority students keep appearing?**
A: Because they have urgent issues (absences, churn risk, payment). Resolve the underlying issues and their priority will drop.

**Q: Can I schedule calls on weekends?**
A: Not recommended, but you can manually create OutreachCall records for weekend dates. The automatic scheduler skips weekends.

**Q: How does the system know my availability?**
A: Currently it doesn't. It schedules calls and you complete them when you have time that day. Future enhancement: integrate calendar availability.

---

## Support

For issues or questions:
1. Check logs: `logs/outreach-scheduler.log`
2. Run test: `npx tsx scripts/test-outreach-scheduling.ts`
3. View stats: `npx tsx scripts/view-scheduled-calls.ts stats`
4. Contact system administrator

---

**Last Updated:** December 16, 2025
**System Version:** 1.0
**Status:** Production Ready ✅
