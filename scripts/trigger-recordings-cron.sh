#!/bin/bash

#
# Cron job script to trigger Google Meet recordings
# This should run at 6:55 AM and 4:55 PM CET
#
# Add to crontab (CET timezone):
# 55 6,16 * * 1-5 /Users/deepak/plan-beta-dashboard/scripts/trigger-recordings-cron.sh
#
# Explanation:
# - 55: Run at minute 55
# - 6,16: Run at hours 6 (AM) and 16 (4 PM)
# - * * 1-5: Every day, every month, Monday-Friday only
#

# Load environment variables
source /Users/deepak/plan-beta-dashboard/.env

# App URL (use production URL if deployed, localhost for local)
APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3001}"

# Log file
LOG_FILE="/Users/deepak/plan-beta-dashboard/logs/recordings-cron.log"

# Create logs directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Current timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TIMESTAMP] Starting automated recording trigger..." >> "$LOG_FILE"

# Call the API endpoint
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  "${APP_URL}/api/recordings/trigger-scheduled")

# Extract HTTP status and body
HTTP_BODY=$(echo "$RESPONSE" | sed -e 's/HTTP_STATUS\:.*//g')
HTTP_STATUS=$(echo "$RESPONSE" | tr -d '\n' | sed -e 's/.*HTTP_STATUS://')

echo "[$TIMESTAMP] HTTP Status: $HTTP_STATUS" >> "$LOG_FILE"
echo "[$TIMESTAMP] Response: $HTTP_BODY" >> "$LOG_FILE"

if [ "$HTTP_STATUS" -eq 200 ]; then
  echo "[$TIMESTAMP] ✅ Recordings triggered successfully" >> "$LOG_FILE"
  exit 0
else
  echo "[$TIMESTAMP] ❌ Failed to trigger recordings (Status: $HTTP_STATUS)" >> "$LOG_FILE"
  exit 1
fi
