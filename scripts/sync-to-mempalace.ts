/**
 * Sync dashboard data from Prisma models into MemPalace drawers.
 *
 * Run: npx tsx scripts/sync-to-mempalace.ts
 *
 * Models synced:
 *   - WhatsAppMessage    → wing_team / whatsapp-comms
 *   - ActionItem         → wing_decisions / action-items
 *   - ContentIdea        → wing_marketing / content-ideas
 *   - Lead (with notes)  → wing_marketing / leads
 *   - AuditLog (HIGH)    → wing_debugging / error-patterns
 *   - CfoConversation    → wing_decisions / cfo-insights
 *
 * Tracks last sync timestamp in .mempalace/sync-state.json.
 * First run syncs everything (epoch 0).
 */

import { prisma } from "../lib/prisma"
import { execSync } from "child_process"
import { writeFileSync, readFileSync, unlinkSync, existsSync, mkdirSync } from "fs"
import * as path from "path"

const PALACE_PATH = "/Users/deepak/plan-beta-dashboard/.mempalace/palace"
const SYNC_STATE_PATH = "/Users/deepak/plan-beta-dashboard/.mempalace/sync-state.json"
const BATCH_LIMIT = 100 // max records per model per sync

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadLastSyncedAt(): Date {
  try {
    if (existsSync(SYNC_STATE_PATH)) {
      const data = JSON.parse(readFileSync(SYNC_STATE_PATH, "utf-8"))
      if (data.lastSyncedAt) return new Date(data.lastSyncedAt)
    }
  } catch {
    // Corrupted file — start from epoch
  }
  return new Date(0)
}

function saveSyncState(timestamp: Date) {
  const dir = path.dirname(SYNC_STATE_PATH)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(SYNC_STATE_PATH, JSON.stringify({ lastSyncedAt: timestamp.toISOString() }, null, 2))
}

function addDrawer(wing: string, room: string, content: string) {
  const tmpFile = `/tmp/mempalace-sync-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.txt`
  writeFileSync(tmpFile, content)
  try {
    execSync(
      `python3 -c "
from pathlib import Path
from mempalace.layers import MemoryStack
stack = MemoryStack('${PALACE_PATH}')
content = Path('${tmpFile}').read_text()
stack.palace.add_drawer('${wing}', '${room}', content)
"`,
      { timeout: 10000, stdio: "pipe" }
    )
  } catch (e) {
    console.error(`Failed to add drawer to ${wing}/${room}:`, (e as Error).message)
  } finally {
    try {
      unlinkSync(tmpFile)
    } catch {}
  }
}

function truncate(s: string | null | undefined, max: number): string {
  if (!s) return ""
  return s.length > max ? s.slice(0, max) + "..." : s
}

// ---------------------------------------------------------------------------
// Sync functions
// ---------------------------------------------------------------------------

async function syncWhatsAppMessages(since: Date) {
  const messages = await prisma.whatsAppMessage.findMany({
    where: { updatedAt: { gt: since } },
    orderBy: { createdAt: "desc" },
    take: BATCH_LIMIT,
  })

  console.log(`  WhatsAppMessage: ${messages.length} record(s)`)

  for (const msg of messages) {
    const dir = msg.direction === "INBOUND" ? "FROM" : "TO"
    const lines = [
      `[WhatsApp ${dir} ${msg.phoneNumber}] ${msg.createdAt.toISOString()}`,
    ]
    if (msg.templateName) lines.push(`Template: ${msg.templateName}`)
    lines.push(`Status: ${msg.status}`)
    if (msg.messageText) lines.push(msg.messageText)

    addDrawer("wing_team", "whatsapp-comms", lines.join("\n"))
  }

  return messages.length
}

async function syncActionItems(since: Date) {
  const items = await prisma.actionItem.findMany({
    where: { updatedAt: { gt: since } },
    orderBy: { updatedAt: "desc" },
    take: BATCH_LIMIT,
  })

  console.log(`  ActionItem: ${items.length} record(s)`)

  for (const item of items) {
    const lines = [
      `[Action Item] ${item.title}`,
      `Status: ${item.status} | Priority: ${item.priority}`,
      `Source: ${item.source}`,
    ]
    if (item.description) lines.push(item.description)

    addDrawer("wing_decisions", "action-items", lines.join("\n"))
  }

  return items.length
}

async function syncContentIdeas(since: Date) {
  const ideas = await prisma.contentIdea.findMany({
    where: { updatedAt: { gt: since } },
    orderBy: { updatedAt: "desc" },
    take: BATCH_LIMIT,
  })

  console.log(`  ContentIdea: ${ideas.length} record(s)`)

  for (const idea of ideas) {
    const lines = [
      `[Content Idea] ${idea.topic}`,
      `Status: ${idea.status}`,
    ]
    if (idea.hook) lines.push(`Hook: ${idea.hook}`)
    if (idea.script) lines.push(`Script: ${idea.script}`)
    if (idea.caption) lines.push(`Caption: ${idea.caption}`)
    if (idea.hashtags?.length) lines.push(`Hashtags: ${idea.hashtags.join(", ")}`)
    if (idea.notes) lines.push(`Notes: ${idea.notes}`)

    addDrawer("wing_marketing", "content-ideas", lines.join("\n"))
  }

  return ideas.length
}

async function syncLeads(since: Date) {
  const leads = await prisma.lead.findMany({
    where: {
      updatedAt: { gt: since },
      OR: [
        { notes: { not: null } },
        { followUpNotes: { not: null } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: BATCH_LIMIT,
  })

  console.log(`  Lead (with notes): ${leads.length} record(s)`)

  for (const lead of leads) {
    const lines = [
      `[Lead] ${lead.name} (${lead.source} / ${lead.status})`,
    ]
    if (lead.notes) lines.push(`Notes: ${lead.notes}`)
    if (lead.followUpNotes) lines.push(`Follow-up: ${lead.followUpNotes}`)

    addDrawer("wing_marketing", "leads", lines.join("\n"))
  }

  return leads.length
}

async function syncAuditLogs(since: Date) {
  const logs = await prisma.auditLog.findMany({
    where: {
      // AuditLog has no updatedAt — use createdAt
      createdAt: { gt: since },
      severity: { in: ["ERROR", "CRITICAL"] },
    },
    orderBy: { createdAt: "desc" },
    take: BATCH_LIMIT,
  })

  console.log(`  AuditLog (ERROR/CRITICAL): ${logs.length} record(s)`)

  for (const log of logs) {
    const lines = [
      `[Audit ${log.severity}] ${log.action} — ${log.createdAt.toISOString()}`,
    ]
    if (log.userEmail) lines.push(`User: ${log.userEmail}`)
    lines.push(log.description)
    if (log.errorMessage) lines.push(`Error: ${log.errorMessage}`)

    addDrawer("wing_debugging", "error-patterns", lines.join("\n"))
  }

  return logs.length
}

async function syncCfoConversations(since: Date) {
  const convos = await prisma.cfoConversation.findMany({
    where: { updatedAt: { gt: since } },
    orderBy: { updatedAt: "desc" },
    take: BATCH_LIMIT,
  })

  console.log(`  CfoConversation: ${convos.length} record(s)`)

  for (const convo of convos) {
    const lines = [
      `[CFO Chat] ${convo.title || "Untitled"} — ${convo.createdAt.toISOString()}`,
    ]

    // messages is a Json field: [{role, content, timestamp}]
    const messages = Array.isArray(convo.messages) ? convo.messages : []
    for (const msg of messages as Array<{ role?: string; content?: string }>) {
      if (!msg.role || !msg.content) continue
      const prefix = msg.role === "user" ? "Q" : "A"
      lines.push(`${prefix}: ${truncate(msg.content, 200)}`)
    }

    addDrawer("wing_decisions", "cfo-insights", lines.join("\n"))
  }

  return convos.length
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const lastSyncedAt = loadLastSyncedAt()
  const syncStart = new Date()

  console.log(`MemPalace sync starting...`)
  console.log(`  Last synced: ${lastSyncedAt.toISOString()}`)
  console.log(`  Palace path: ${PALACE_PATH}`)
  console.log()

  let totalRecords = 0

  totalRecords += await syncWhatsAppMessages(lastSyncedAt)
  totalRecords += await syncActionItems(lastSyncedAt)
  totalRecords += await syncContentIdeas(lastSyncedAt)
  totalRecords += await syncLeads(lastSyncedAt)
  totalRecords += await syncAuditLogs(lastSyncedAt)
  totalRecords += await syncCfoConversations(lastSyncedAt)

  saveSyncState(syncStart)

  console.log()
  console.log(`Sync complete. ${totalRecords} record(s) synced.`)
  console.log(`Timestamp saved: ${syncStart.toISOString()}`)
}

main()
  .catch((e) => {
    console.error("Sync failed:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
