#!/bin/bash

# Daily database backup script
# This script is executed by cron

# Change to project directory
cd /Users/deepak/plan-beta-dashboard

# Load environment variables safely
set -a
source .env
set +a

# Run backup using npm
npm run backup >> /Users/deepak/plan-beta-dashboard/logs/backup.log 2>&1

# Keep only last 30 backups
find /Users/deepak/plan-beta-dashboard/backups -name "backup-*.json" -type f -mtime +30 -delete
